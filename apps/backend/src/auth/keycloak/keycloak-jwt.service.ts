import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { createPublicKey, createVerify } from 'node:crypto';

import { getKeycloakConfig } from '../../config/runtime-config';
import { JsonLogger } from '../../logging/json-logger.service';
import { ExternalIdentityProfile } from './keycloak-types';

interface JwtHeader {
  alg?: unknown;
  kid?: unknown;
  typ?: unknown;
}

interface JwtPayload {
  iss?: unknown;
  sub?: unknown;
  exp?: unknown;
  nbf?: unknown;
  azp?: unknown;
  email?: unknown;
  name?: unknown;
  preferred_username?: unknown;
}

interface JsonWebKeyWithMetadata extends JsonWebKey {
  kid?: string;
  alg?: string;
  use?: string;
}

@Injectable()
export class KeycloakJwtService {
  private jwksCache:
    | {
        expiresAt: number;
        keys: JsonWebKeyWithMetadata[];
      }
    | undefined;

  constructor(private readonly logger: JsonLogger) {}

  async verifyAccessToken(token: string): Promise<ExternalIdentityProfile> {
    const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');

    if (!encodedHeader || !encodedPayload || !encodedSignature) {
      this.logger.warning('Rejected malformed bearer token', 'KeycloakJwtService');
      throw new UnauthorizedException('Invalid access token');
    }

    const header = this.decodeSegment<JwtHeader>(encodedHeader, 'header');
    const payload = this.decodeSegment<JwtPayload>(encodedPayload, 'payload');

    if (header.alg !== 'RS256' || typeof header.kid !== 'string' || !header.kid) {
      this.logger.warning('Rejected token with unsupported algorithm or missing key id', 'KeycloakJwtService', {
        alg: header.alg,
      });
      throw new UnauthorizedException('Unsupported access token');
    }

    await this.assertSignatureIsValid(token, header.kid);
    this.assertClaims(payload);

    const config = getKeycloakConfig();
    const authSubject = typeof payload.sub === 'string' ? payload.sub.trim() : '';

    if (!authSubject) {
      this.logger.warning('Rejected token without subject claim', 'KeycloakJwtService');
      throw new UnauthorizedException('Invalid access token subject');
    }

    this.logger.info('JWT token validated successfully', 'KeycloakJwtService', {
      authSubject,
      issuer: payload.iss,
    });

    return {
      authSubject,
      issuer: config.issuerUrl,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      name:
        typeof payload.name === 'string'
          ? payload.name
          : typeof payload.preferred_username === 'string'
            ? payload.preferred_username
            : undefined,
    };
  }

  private decodeSegment<T>(segment: string, label: string): T {
    try {
      return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')) as T;
    } catch (error) {
      this.logger.warning(`Rejected token with invalid ${label} segment`, 'KeycloakJwtService', {
        error,
      });
      throw new UnauthorizedException('Invalid access token');
    }
  }

  private async assertSignatureIsValid(token: string, kid: string): Promise<void> {
    const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');
    const jwk = await this.getJwkByKid(kid);
    const key = createPublicKey({
      key: jwk as any,
      format: 'jwk',
    });
    const verifier = createVerify('RSA-SHA256');

    verifier.update(`${encodedHeader}.${encodedPayload}`);
    verifier.end();

    const isValid = verifier.verify(key, Buffer.from(encodedSignature, 'base64url'));

    if (!isValid) {
      this.logger.warning('Rejected token with invalid signature', 'KeycloakJwtService', {
        kid,
      });
      throw new UnauthorizedException('Invalid access token signature');
    }
  }

  private assertClaims(payload: JwtPayload): void {
    const config = getKeycloakConfig();
    const nowInSeconds = Math.floor(Date.now() / 1000);

    if (payload.iss !== config.issuerUrl) {
      this.logger.warning('Rejected token with unexpected issuer', 'KeycloakJwtService', {
        issuer: payload.iss,
        expectedIssuer: config.issuerUrl,
      });
      throw new UnauthorizedException('Invalid token issuer');
    }

    if (typeof payload.exp !== 'number' || payload.exp <= nowInSeconds) {
      this.logger.warning('Rejected expired token', 'KeycloakJwtService', {
        exp: payload.exp,
      });
      throw new UnauthorizedException('Access token expired');
    }

    if (typeof payload.nbf === 'number' && payload.nbf > nowInSeconds) {
      this.logger.warning('Rejected token that is not active yet', 'KeycloakJwtService', {
        nbf: payload.nbf,
      });
      throw new UnauthorizedException('Access token is not active yet');
    }

    if (typeof payload.azp === 'string' && payload.azp !== config.clientId) {
      this.logger.warning('Rejected token issued for unexpected client', 'KeycloakJwtService', {
        clientId: payload.azp,
        expectedClientId: config.clientId,
      });
      throw new UnauthorizedException('Invalid token audience');
    }
  }

  private async getJwkByKid(kid: string): Promise<JsonWebKeyWithMetadata> {
    const keys = await this.getJwks();
    const jwk = keys.find((candidate) => candidate.kid === kid);

    if (!jwk) {
      this.logger.warning('Unable to find signing key for token', 'KeycloakJwtService', {
        kid,
      });
      throw new UnauthorizedException('Signing key was not found');
    }

    return jwk;
  }

  private async getJwks(): Promise<JsonWebKeyWithMetadata[]> {
    if (this.jwksCache && this.jwksCache.expiresAt > Date.now()) {
      return this.jwksCache.keys;
    }

    const config = getKeycloakConfig();
    const jwksUrl = `${config.issuerUrl}/protocol/openid-connect/certs`;
    let response: Response;

    try {
      response = await fetch(jwksUrl);
    } catch (error) {
      this.logger.error('Failed to fetch Keycloak JWKS', 'KeycloakJwtService', {
        jwksUrl,
        error,
      });
      throw new InternalServerErrorException('Unable to load Keycloak signing keys');
    }

    if (!response.ok) {
      const body = await safeReadBody(response);
      this.logger.error('Keycloak JWKS endpoint returned an error', 'KeycloakJwtService', {
        jwksUrl,
        statusCode: response.status,
        body,
      });
      throw new InternalServerErrorException('Unable to load Keycloak signing keys');
    }

    const payload = (await response.json()) as { keys?: JsonWebKeyWithMetadata[] };

    if (!Array.isArray(payload.keys)) {
      this.logger.error('Keycloak JWKS response is invalid', 'KeycloakJwtService', {
        jwksUrl,
      });
      throw new InternalServerErrorException('Invalid Keycloak JWKS response');
    }

    this.jwksCache = {
      expiresAt: Date.now() + 5 * 60 * 1000,
      keys: payload.keys,
    };

    return payload.keys;
  }
}

async function safeReadBody(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

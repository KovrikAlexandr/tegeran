import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';

import { getKeycloakConfig } from '../../config/runtime-config';
import { JsonLogger } from '../../logging/json-logger.service';
import { KeycloakLoginInput, KeycloakLoginResult } from './keycloak-types';

@Injectable()
export class KeycloakTokenService {
  constructor(private readonly logger: JsonLogger) {}

  async login(input: KeycloakLoginInput): Promise<KeycloakLoginResult> {
    const config = getKeycloakConfig();
    const response = await this.safeFetch(`${config.baseUrl}/realms/${config.realm}/protocol/openid-connect/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        grant_type: 'password',
        username: input.email,
        password: input.password,
      }).toString(),
    });

    if (response.status === 400 || response.status === 401) {
      const body = await safeReadBody(response);
      this.logger.warning('Keycloak login rejected invalid credentials', 'KeycloakTokenService', {
        email: input.email,
        statusCode: response.status,
        body,
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!response.ok) {
      const body = await safeReadBody(response);
      this.logger.error('Keycloak login request failed', 'KeycloakTokenService', {
        email: input.email,
        statusCode: response.status,
        body,
      });
      throw new InternalServerErrorException('Failed to login via Keycloak');
    }

    const payload = (await response.json()) as {
      access_token?: unknown;
      token_type?: unknown;
      expires_in?: unknown;
    };

    if (
      typeof payload.access_token !== 'string' ||
      typeof payload.token_type !== 'string' ||
      typeof payload.expires_in !== 'number'
    ) {
      this.logger.error('Keycloak login response is missing token fields', 'KeycloakTokenService', {
        email: input.email,
      });
      throw new InternalServerErrorException('Invalid Keycloak token response');
    }

    this.logger.info('Keycloak login succeeded', 'KeycloakTokenService', {
      email: input.email,
    });

    return {
      accessToken: payload.access_token,
      tokenType: payload.token_type,
      expiresIn: payload.expires_in,
    };
  }

  private async safeFetch(input: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(input, init);
    } catch (error) {
      this.logger.error('Keycloak login request failed before response', 'KeycloakTokenService', {
        url: input,
        error,
      });
      throw new InternalServerErrorException('Unable to reach Keycloak');
    }
  }
}

async function safeReadBody(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

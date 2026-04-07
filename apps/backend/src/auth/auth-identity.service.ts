import { Injectable, UnauthorizedException } from '@nestjs/common';

import { KeycloakAuthService } from './keycloak/keycloak-auth.service';
import { JsonLogger } from '../logging/json-logger.service';
import { CurrentUser } from '../domain/current-user';
import { UsersService } from '../services/users.service';
import { getMockUserConfig, isAuthEnabled } from '../config/runtime-config';

interface CurrentUserProfile {
  currentUser: CurrentUser;
  name: string;
  email: string;
}

@Injectable()
export class AuthIdentityService {
  constructor(
    private readonly usersService: UsersService,
    private readonly keycloakAuthService: KeycloakAuthService,
    private readonly logger: JsonLogger,
  ) {}

  isAuthEnabled(): boolean {
    return isAuthEnabled();
  }

  async resolveCurrentUser(authorizationHeader?: string): Promise<CurrentUser> {
    const profile = this.isAuthEnabled()
      ? await this.resolveAuthenticatedProfile(authorizationHeader)
      : this.resolveMockProfile();

    if (this.isAuthEnabled()) {
      const existingUser = await this.usersService.getByAuthSubject(profile.currentUser.authSubject);

      if (!existingUser) {
        this.logger.warning('Rejected authenticated request because local user is not provisioned', 'AuthIdentityService', {
          authSubject: profile.currentUser.authSubject,
        });
        throw new UnauthorizedException('Local user is not provisioned');
      }
    } else {
      await this.usersService.getOrCreateCurrentUser({
        currentUser: profile.currentUser,
        name: profile.name,
        email: profile.email,
      });
    }

    this.logger.debug('Current user resolved', 'AuthIdentityService', {
      authSubject: profile.currentUser.authSubject,
      authEnabled: this.isAuthEnabled(),
    });

    return profile.currentUser;
  }

  private resolveMockProfile(): CurrentUserProfile {
    const mockUser = getMockUserConfig();

    this.logger.info('Using mock current user because AUTH_ENABLED=false', 'AuthIdentityService', {
      authSubject: mockUser.authSubject,
    });

    return {
      currentUser: {
        authSubject: mockUser.authSubject,
      },
      name: mockUser.name,
      email: mockUser.email,
    };
  }

  private async resolveAuthenticatedProfile(authorizationHeader?: string): Promise<CurrentUserProfile> {
    if (!authorizationHeader) {
      this.logger.warning('Missing Authorization header', 'AuthIdentityService');
      throw new UnauthorizedException('Authorization header is required');
    }

    const [scheme, token] = authorizationHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      this.logger.warning('Invalid Authorization header format', 'AuthIdentityService', {
        scheme,
      });
      throw new UnauthorizedException('Authorization header must use Bearer token');
    }

    const identity = await this.keycloakAuthService.verifyAccessToken(token);
    const authSubject = identity.authSubject;

    this.logger.info('Identity extracted from Authorization header', 'AuthIdentityService', {
      authSubject,
    });

    return {
      currentUser: { authSubject },
      name: identity.name ?? authSubject,
      email: identity.email ?? this.buildSyntheticEmail(authSubject),
    };
  }

  private buildSyntheticEmail(authSubject: string): string {
    const suffix = Buffer.from(authSubject).toString('hex').slice(0, 32) || 'user';
    return `user-${suffix}@auth.local`;
  }
}

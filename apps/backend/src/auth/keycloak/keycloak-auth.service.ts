import { ConflictException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';

import { User } from '../../domain/models';
import { JsonLogger } from '../../logging/json-logger.service';
import { UsersService } from '../../services/users.service';
import { KeycloakAdminService } from './keycloak-admin.service';
import { KeycloakJwtService } from './keycloak-jwt.service';
import { KeycloakTokenService } from './keycloak-token.service';
import {
  ExternalIdentityProfile,
  KeycloakLoginInput,
  KeycloakLoginResult,
  KeycloakRegisterUserInput,
} from './keycloak-types';

@Injectable()
export class KeycloakAuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly keycloakAdminService: KeycloakAdminService,
    private readonly keycloakTokenService: KeycloakTokenService,
    private readonly keycloakJwtService: KeycloakJwtService,
    private readonly logger: JsonLogger,
  ) {}

  async register(input: KeycloakRegisterUserInput): Promise<User> {
    const existingUser = await this.usersService.getByEmail(input.email);

    if (existingUser) {
      this.logger.warning('Rejected registration because local user already exists', 'KeycloakAuthService', {
        email: input.email,
      });
      throw new ConflictException('User with this email already exists');
    }

    const externalUser = await this.keycloakAdminService.registerUser(input);

    try {
      const localUser = await this.usersService.createLocalUser({
        authSubject: externalUser.authSubject,
        name: externalUser.name,
        email: externalUser.email,
      });

      this.logger.info('User registered via Keycloak and synchronized locally', 'KeycloakAuthService', {
        email: localUser.email,
        authSubject: localUser.authSubject,
        userId: localUser.id,
      });

      return localUser;
    } catch (error) {
      await this.keycloakAdminService.deleteUser(externalUser.authSubject);

      if (this.isUniqueConstraintError(error)) {
        this.logger.warning('Rejected registration because local user creation conflicted', 'KeycloakAuthService', {
          email: input.email,
          authSubject: externalUser.authSubject,
        });
        throw new ConflictException('User with this email already exists');
      }

      this.logger.error('Failed to synchronize local user after Keycloak registration', 'KeycloakAuthService', {
        email: input.email,
        authSubject: externalUser.authSubject,
        error,
      });
      throw new InternalServerErrorException('Failed to synchronize local user');
    }
  }

  login(input: KeycloakLoginInput): Promise<KeycloakLoginResult> {
    return this.keycloakTokenService.login(input);
  }

  async verifyAccessToken(token: string): Promise<ExternalIdentityProfile> {
    try {
      return await this.keycloakJwtService.verifyAccessToken(token);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error('JWT validation failed because Keycloak integration is unavailable', 'KeycloakAuthService', {
        error,
      });
      throw error;
    }
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 'P2002'
    );
  }
}

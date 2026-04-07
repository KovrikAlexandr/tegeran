import { ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';

import { getKeycloakConfig } from '../../config/runtime-config';
import { JsonLogger } from '../../logging/json-logger.service';
import { KeycloakRegisterUserInput } from './keycloak-types';

interface KeycloakCreatedUser {
  authSubject: string;
  name: string;
  email: string;
}

@Injectable()
export class KeycloakAdminService {
  constructor(private readonly logger: JsonLogger) {}

  async registerUser(input: KeycloakRegisterUserInput): Promise<KeycloakCreatedUser> {
    const adminToken = await this.getAdminAccessToken();
    const config = getKeycloakConfig();

    const response = await this.safeFetch(`${config.baseUrl}/admin/realms/${config.realm}/users`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: input.email,
        email: input.email,
        firstName: input.name,
        lastName: input.name,
        enabled: true,
        emailVerified: true,
        requiredActions: [],
        credentials: [
          {
            type: 'password',
            value: input.password,
            temporary: false,
          },
        ],
      }),
    });

    if (response.status === 409) {
      this.logger.warning('Keycloak registration rejected because user already exists', 'KeycloakAdminService', {
        email: input.email,
      });
      throw new ConflictException('User with this email already exists');
    }

    if (!response.ok) {
      const body = await safeReadBody(response);
      this.logger.error('Keycloak registration request failed', 'KeycloakAdminService', {
        statusCode: response.status,
        email: input.email,
        body,
      });
      throw new InternalServerErrorException('Failed to register user in Keycloak');
    }

    const locationHeader = response.headers.get('location');
    const authSubject = locationHeader?.split('/').at(-1)?.trim();

    if (!authSubject) {
      this.logger.error('Keycloak registration succeeded without user id in Location header', 'KeycloakAdminService', {
        email: input.email,
      });
      throw new InternalServerErrorException('Keycloak did not return created user id');
    }

    return {
      authSubject,
      name: input.name,
      email: input.email,
    };
  }

  async deleteUser(authSubject: string): Promise<void> {
    const adminToken = await this.getAdminAccessToken();
    const config = getKeycloakConfig();

    const response = await this.safeFetch(`${config.baseUrl}/admin/realms/${config.realm}/users/${authSubject}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    if (response.ok || response.status === 404) {
      return;
    }

    const body = await safeReadBody(response);
    this.logger.error('Failed to rollback Keycloak user', 'KeycloakAdminService', {
      authSubject,
      statusCode: response.status,
      body,
    });
  }

  private async getAdminAccessToken(): Promise<string> {
    const config = getKeycloakConfig();
    const response = await this.safeFetch(
      `${config.baseUrl}/realms/${config.adminRealm}/protocol/openid-connect/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: toFormUrlEncoded({
          client_id: 'admin-cli',
          grant_type: 'password',
          username: config.adminUsername,
          password: config.adminPassword,
        }),
      },
    );

    if (!response.ok) {
      const body = await safeReadBody(response);
      this.logger.error('Failed to obtain Keycloak admin token', 'KeycloakAdminService', {
        statusCode: response.status,
        body,
      });
      throw new InternalServerErrorException('Failed to authenticate against Keycloak admin API');
    }

    const payload = (await response.json()) as { access_token?: unknown };

    if (typeof payload.access_token !== 'string' || !payload.access_token) {
      this.logger.error('Keycloak admin token response is missing access token', 'KeycloakAdminService');
      throw new InternalServerErrorException('Invalid Keycloak admin token response');
    }

    return payload.access_token;
  }

  private async safeFetch(input: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(input, init);
    } catch (error) {
      this.logger.error('Keycloak admin request failed', 'KeycloakAdminService', {
        url: input,
        error,
      });
      throw new InternalServerErrorException('Unable to reach Keycloak');
    }
  }
}

function toFormUrlEncoded(values: Record<string, string>): string {
  return new URLSearchParams(values).toString();
}

async function safeReadBody(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

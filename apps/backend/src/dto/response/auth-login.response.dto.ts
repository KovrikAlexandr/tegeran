import { KeycloakLoginResult } from '../../auth/keycloak/keycloak-types';

export class AuthLoginResponseDto {
  accessToken!: string;
  tokenType!: string;
  expiresIn!: number;

  static fromResult(result: KeycloakLoginResult): AuthLoginResponseDto {
    return {
      accessToken: result.accessToken,
      tokenType: result.tokenType,
      expiresIn: result.expiresIn,
    };
  }
}

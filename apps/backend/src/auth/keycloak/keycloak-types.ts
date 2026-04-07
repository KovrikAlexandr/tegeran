export interface KeycloakRegisterUserInput {
  name: string;
  email: string;
  password: string;
}

export interface KeycloakLoginInput {
  email: string;
  password: string;
}

export interface KeycloakLoginResult {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface ExternalIdentityProfile {
  authSubject: string;
  issuer: string;
  email?: string;
  name?: string;
}

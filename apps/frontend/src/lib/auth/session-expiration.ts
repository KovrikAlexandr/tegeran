import { clearStoredToken } from './storage';

const AUTH_ERROR_PATTERNS = [
  /unauthorized/i,
  /invalid token/i,
  /invalid jwt/i,
  /jwt expired/i,
  /access token expired/i,
  /authorization/i,
  /token.*expired/i,
];

export class AuthSessionExpiredError extends Error {
  constructor() {
    super('AUTH_SESSION_EXPIRED');
    this.name = 'AuthSessionExpiredError';
  }
}

export function isAuthSessionError(error: unknown): error is AuthSessionExpiredError {
  return error instanceof AuthSessionExpiredError;
}

export function handleAuthSessionExpired(): never {
  clearStoredToken();

  if (typeof window !== 'undefined') {
    window.location.replace('/login');
  }

  throw new AuthSessionExpiredError();
}

export function shouldExpireSession(message: string, statusCode?: number): boolean {
  if (statusCode === 401) {
    return true;
  }

  return AUTH_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

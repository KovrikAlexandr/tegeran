import { loadEnvironment } from './load-environment';

loadEnvironment();

export interface MockUserConfig {
  authSubject: string;
  name: string;
  email: string;
}

export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';

export interface KeycloakConfig {
  baseUrl: string;
  issuerUrl: string;
  realm: string;
  clientId: string;
  adminRealm: string;
  adminUsername: string;
  adminPassword: string;
}

export function isAuthEnabled(): boolean {
  return process.env.AUTH_ENABLED === 'true';
}

export function getPort(): number {
  const value = Number(process.env.PORT ?? 3000);
  return Number.isFinite(value) && value > 0 ? value : 3000;
}

export function getMockUserConfig(): MockUserConfig {
  return {
    authSubject: process.env.MOCK_AUTH_SUBJECT ?? 'mock-user',
    name: process.env.MOCK_USER_NAME ?? 'Mock User',
    email: process.env.MOCK_USER_EMAIL ?? 'mock-user@local.test',
  };
}

export function getLogLevel(): LogLevel {
  const rawValue = process.env.LOG_LEVEL?.trim().toUpperCase();

  if (rawValue === 'DEBUG' || rawValue === 'INFO' || rawValue === 'WARNING' || rawValue === 'ERROR') {
    return rawValue;
  }

  return 'INFO';
}

export function getKeycloakConfig(): KeycloakConfig {
  return {
    baseUrl: normalizeBaseUrl(process.env.KEYCLOAK_BASE_URL ?? 'http://localhost:8081'),
    issuerUrl: normalizeBaseUrl(
      process.env.KEYCLOAK_ISSUER_URL ?? `${process.env.KEYCLOAK_BASE_URL ?? 'http://localhost:8081'}/realms/${process.env.KEYCLOAK_REALM ?? 'tegeran'}`,
    ),
    realm: process.env.KEYCLOAK_REALM ?? 'tegeran',
    clientId: process.env.KEYCLOAK_CLIENT_ID ?? 'tegeran-backend',
    adminRealm: process.env.KEYCLOAK_ADMIN_REALM ?? 'master',
    adminUsername: process.env.KEYCLOAK_ADMIN_USERNAME ?? 'admin',
    adminPassword: process.env.KEYCLOAK_ADMIN_PASSWORD ?? 'admin',
  };
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

import { loadEnvironment } from './load-environment';

loadEnvironment();

export interface MockUserConfig {
  authSubject: string;
  name: string;
  email: string;
}

export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';

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

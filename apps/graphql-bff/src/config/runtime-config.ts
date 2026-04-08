import { loadEnvironment } from './load-environment';

loadEnvironment();

export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';

export function getPort(): number {
  const value = Number(process.env.PORT ?? 3001);
  return Number.isFinite(value) && value > 0 ? value : 3001;
}

export function getBackendApiUrl(): string {
  return normalizeUrl(process.env.BACKEND_API_URL ?? 'http://localhost:3000/api/v1');
}

export function getLogLevel(): LogLevel {
  const rawValue = process.env.LOG_LEVEL?.trim().toUpperCase();

  if (rawValue === 'DEBUG' || rawValue === 'INFO' || rawValue === 'WARNING' || rawValue === 'ERROR') {
    return rawValue;
  }

  return 'INFO';
}

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

import { Injectable, LoggerService } from '@nestjs/common';

import { LogLevel, getLogLevel } from '../config/runtime-config';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 10,
  INFO: 20,
  WARNING: 30,
  ERROR: 40,
};

type LogMetadata = Record<string, unknown>;

@Injectable()
export class JsonLogger implements LoggerService {
  debug(message: string, context?: string, metadata?: LogMetadata): void {
    this.write('DEBUG', message, context, metadata);
  }

  info(message: string, context?: string, metadata?: LogMetadata): void {
    this.write('INFO', message, context, metadata);
  }

  warning(message: string, context?: string, metadata?: LogMetadata): void {
    this.write('WARNING', message, context, metadata);
  }

  error(message: string, ...optionalParams: unknown[]): void {
    const [first, second] = optionalParams;

    if (typeof first === 'string' && typeof second === 'string') {
      this.write('ERROR', message, second, { trace: first });
      return;
    }

    if (typeof first === 'string' && (second === undefined || typeof second === 'object')) {
      this.write('ERROR', message, first, second as LogMetadata | undefined);
      return;
    }

    this.write('ERROR', message, undefined, first as LogMetadata | undefined);
  }

  log(message: string, context?: string): void {
    this.info(message, context);
  }

  warn(message: string, context?: string): void {
    this.warning(message, context);
  }

  private write(level: LogLevel, message: string, context?: string, metadata?: LogMetadata): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const payload: Record<string, unknown> = {
      level,
      message,
      timestamp: new Date().toISOString(),
    };

    if (context) {
      payload.context = context;
    }

    if (metadata) {
      Object.assign(payload, this.sanitizeMetadata(metadata));
    }

    process.stdout.write(`${JSON.stringify(payload)}\n`);
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[getLogLevel()];
  }

  private sanitizeMetadata(metadata: LogMetadata): LogMetadata {
    return Object.fromEntries(
      Object.entries(metadata).map(([key, value]) => [key, this.serializeValue(value)]),
    );
  }

  private serializeValue(value: unknown): unknown {
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack,
      };
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    return value;
  }
}

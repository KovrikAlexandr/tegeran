import { CallHandler, ExecutionContext, HttpException, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { JsonLogger } from './json-logger.service';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: JsonLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<{ method?: string; originalUrl?: string; url?: string }>();
    const response = http.getResponse<{ statusCode?: number }>();
    const path = request.originalUrl ?? request.url ?? 'unknown';
    const startedAt = Date.now();

    this.logger.info('HTTP request started', 'HttpRequest', {
      method: request.method,
      path,
    });

    return next.handle().pipe(
      tap(() => {
        this.logger.info('HTTP request completed', 'HttpRequest', {
          method: request.method,
          path,
          statusCode: response.statusCode,
          durationMs: Date.now() - startedAt,
        });
      }),
      catchError((error: unknown) => {
        const statusCode = error instanceof HttpException ? error.getStatus() : response.statusCode;

        this.logger.error('HTTP request failed', 'HttpRequest', {
          method: request.method,
          path,
          statusCode,
          durationMs: Date.now() - startedAt,
          error,
        });

        return throwError(() => error);
      }),
    );
  }
}

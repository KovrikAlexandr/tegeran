import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable, catchError, tap, throwError } from 'rxjs';

import { JsonLogger } from './json-logger.service';

@Injectable()
export class GraphqlLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: JsonLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType<'graphql'>() !== 'graphql') {
      return next.handle();
    }

    const gqlContext = GqlExecutionContext.create(context);
    const info = gqlContext.getInfo();
    const startedAt = Date.now();

    this.logger.info('GraphQL resolver invoked', 'GraphqlResolver', {
      operationType: info.parentType.name,
      fieldName: info.fieldName,
    });

    return next.handle().pipe(
      tap(() => {
        this.logger.info('GraphQL resolver completed', 'GraphqlResolver', {
          operationType: info.parentType.name,
          fieldName: info.fieldName,
          durationMs: Date.now() - startedAt,
        });
      }),
      catchError((error) => {
        this.logger.error('GraphQL resolver failed', 'GraphqlResolver', {
          operationType: info.parentType.name,
          fieldName: info.fieldName,
          durationMs: Date.now() - startedAt,
          error,
        });

        return throwError(() => error);
      }),
    );
  }
}

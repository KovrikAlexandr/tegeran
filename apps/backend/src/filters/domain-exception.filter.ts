import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Response } from 'express';

import {
  AccessDeniedError,
  BusinessRuleError,
  ConflictError,
  DomainError,
  NotFoundError,
} from '../domain/errors';
import { JsonLogger } from '../logging/json-logger.service';

@Injectable()
@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: JsonLogger = new JsonLogger()) {}

  catch(exception: DomainError | HttpException | Error, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const statusCode = this.resolveStatusCode(exception);
    const payload = this.resolvePayload(exception, statusCode);

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error('Unhandled request error', 'DomainExceptionFilter', {
        statusCode,
        error: exception,
      });
    }

    response.status(statusCode).json(payload);
  }

  private resolveStatusCode(exception: DomainError | HttpException | Error): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    if (exception instanceof NotFoundError) {
      return HttpStatus.NOT_FOUND;
    }

    if (exception instanceof ConflictError) {
      return HttpStatus.CONFLICT;
    }

    if (exception instanceof AccessDeniedError) {
      return HttpStatus.FORBIDDEN;
    }

    if (exception instanceof BusinessRuleError) {
      return HttpStatus.BAD_REQUEST;
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private resolvePayload(
    exception: DomainError | HttpException | Error,
    statusCode: number,
  ): { statusCode: number; error: string; message: string | string[] } {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      if (typeof response === 'string') {
        return {
          statusCode,
          error: exception.name,
          message: response,
        };
      }

      if (typeof response === 'object' && response !== null) {
        const responseRecord = response as Record<string, unknown>;

        return {
          statusCode,
          error: String(responseRecord.error ?? exception.name),
          message: (responseRecord.message as string | string[]) ?? exception.message,
        };
      }
    }

    return {
      statusCode,
      error: exception.name,
      message: exception.message,
    };
  }
}

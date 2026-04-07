import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

import {
  AccessDeniedError,
  BusinessRuleError,
  ConflictError,
  DomainError,
  NotFoundError,
} from '../domain/errors';

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const statusCode = this.resolveStatusCode(exception);

    response.status(statusCode).json({
      statusCode,
      error: exception.name,
      message: exception.message,
    });
  }

  private resolveStatusCode(exception: DomainError): number {
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

    return HttpStatus.BAD_REQUEST;
  }
}

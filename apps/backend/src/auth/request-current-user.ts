import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

import { CurrentUser } from '../domain/current-user';

export interface RequestWithCurrentUser extends Request {
  currentUser: CurrentUser;
}

export const RequestCurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): CurrentUser => {
  const request = context.switchToHttp().getRequest<RequestWithCurrentUser>();
  return request.currentUser;
});

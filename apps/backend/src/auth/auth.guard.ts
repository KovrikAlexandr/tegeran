import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuthIdentityService } from './auth-identity.service';
import { IS_PUBLIC_ROUTE } from './public.decorator';
import { RequestWithCurrentUser } from './request-current-user';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authIdentityService: AuthIdentityService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublicRoute = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_ROUTE, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublicRoute) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithCurrentUser>();
    request.currentUser = await this.authIdentityService.resolveCurrentUser(request.headers.authorization);

    return true;
  }
}

import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { AuthGuard as AuthGuardPassport } from '@nestjs/passport';
import { Observable } from 'rxjs';

export class AuthGuard extends AuthGuardPassport('jwt') {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  handleRequest(err, user) {
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}

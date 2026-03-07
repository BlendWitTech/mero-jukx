import { Injectable, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Skip JWT validation for MFA setup and health endpoints
    const url = request.url;
    if (url?.includes('/mfa/setup') || url?.includes('/health')) {
      return true;
    }

    // Store request path in context for MFA setup endpoint check
    if (request) {
      request._skipMfaCheck = url?.includes('/mfa/setup');
    }

    return super.canActivate(context);
  }
}

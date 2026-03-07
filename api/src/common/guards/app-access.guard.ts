import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reflector } from '@nestjs/core';
import { UserAppAccess, App } from '../../database/entities';

@Injectable()
export class AppAccessGuard implements CanActivate {
    constructor(
        @InjectRepository(UserAppAccess)
        private userAppAccessRepository: Repository<UserAppAccess>,
        @InjectRepository(App)
        private appRepository: Repository<App>,
        private reflector: Reflector,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || !user.userId || !user.organizationId) {
            throw new ForbiddenException('User not authenticated');
        }

        const { organizationId, userId } = user;

        // 1. Try to get appId/appSlug from request (params, query, body)
        const appIdFromRequest = request.params.appId || request.query.appId || request.body.appId;
        let appSlugFromRequest = request.params.appSlug || request.query.appSlug || request.body.appSlug;

        // 2. Try to get appSlug from metadata if not in request
        if (!appSlugFromRequest) {
            appSlugFromRequest = this.reflector.getAllAndOverride<string>('appSlug', [
                context.getHandler(),
                context.getClass(),
            ]);
        }

        let appId = appIdFromRequest;

        if (!appId && appSlugFromRequest) {
            // Resolve appId from slug
            const app = await this.appRepository.findOne({
                where: { slug: appSlugFromRequest },
                select: ['id'],
            });
            if (app) {
                appId = app.id;
                // Inject back into request for other guards (like PermissionsGuard)
                request.appId = appId;
            }
        }

        if (!appId) {
            // If no appId or slug provided, we can't check app access.
            // Depending on policy, we might allow or deny. 
            // Usually, if this guard is applied, an appId/slug is expected.
            throw new ForbiddenException('App context required');
        }

        const hasAccess = await this.userAppAccessRepository.findOne({
            where: {
                user_id: userId,
                organization_id: organizationId,
                app_id: appId,
                is_active: true,
            },
        });

        if (!hasAccess) {
            throw new ForbiddenException('You do not have access to this application');
        }

        return true;
    }
}

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentOrganization = createParamDecorator((data: string | undefined, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const user = request.user;

  const organizationId = user?.organizationId;
  const organization = user?.membership?.organization;

  if (data === 'id') {
    return organizationId || organization?.id || null;
  }

  if (data === 'accessibleIds') {
    return user?.accessibleOrganizationIds || [organizationId || organization?.id].filter(Boolean);
  }

  if (data && organization) {
    return organization[data];
  }

  return organization || organizationId || null;
});

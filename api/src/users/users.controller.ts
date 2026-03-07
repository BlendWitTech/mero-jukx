import {
  Controller,
  Get,
  Put,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentOrganization } from '../common/decorators/current-organization.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { RevokeAccessDto } from './dto/revoke-access.dto';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Not a member of organization' })
  async getCurrentUser(@CurrentUser() user: any) {
    // System admins don't have organization context
    const organizationId = user.is_system_admin ? null : user.organizationId;
    return this.usersService.getCurrentUser(user.userId, organizationId);
  }

  @Put('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'User profile updated successfully' })
  @ApiResponse({ status: 403, description: 'Not a member of organization' })
  async updateCurrentUser(@CurrentUser() user: any, @Body() dto: UpdateUserDto) {
    // System admins don't have organization context
    const organizationId = user.is_system_admin ? null : user.organizationId;
    return this.usersService.updateCurrentUser(user.userId, organizationId, dto);
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Partially update current user profile' })
  @ApiResponse({ status: 200, description: 'User profile updated successfully' })
  @ApiResponse({ status: 403, description: 'Not a member of organization' })
  async patchCurrentUser(@CurrentUser() user: any, @Body() dto: Partial<UpdateUserDto>) {
    // System admins don't have organization context
    const organizationId = user.is_system_admin ? null : user.organizationId;
    return this.usersService.updateCurrentUser(user.userId, organizationId, dto as UpdateUserDto);
  }

  @Put('me/change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change current user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid current password' })
  async changePassword(
    @CurrentUser() user: any,
    @Body() dto: { current_password: string; new_password: string },
  ) {
    return this.usersService.changePassword(user.userId, user.organizationId, dto.current_password, dto.new_password);
  }

  @Get()
  @Permissions('users.view')
  @ApiOperation({ summary: 'List organization users' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async getOrganizationUsers(
    @CurrentUser() user: any,
    @Query() query: UserQueryDto,
    @CurrentOrganization('accessibleIds') accessibleIds: string[],
  ) {
    return this.usersService.getOrganizationUsers(user.userId, user.organizationId, query, accessibleIds);
  }

  @Get(':id')
  @Permissions('users.view')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@CurrentUser() user: any, @Param('id') targetUserId: string) {
    return this.usersService.getUserById(user.userId, user.organizationId, targetUserId);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @Permissions('users.edit')
  @ApiOperation({ summary: 'Update user (admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async updateUser(
    @CurrentUser() user: any,
    @Param('id') targetUserId: string,
    @Body() dto: UpdateUserAdminDto,
  ) {
    return this.usersService.updateUser(user.userId, user.organizationId, targetUserId, dto);
  }

  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  @Permissions('users.revoke')
  @ApiOperation({ summary: 'Revoke user access with optional data transfer' })
  @ApiParam({ name: 'id', description: 'User ID to revoke' })
  @ApiResponse({ status: 200, description: 'User access revoked successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({
    status: 400,
    description: 'Invalid request (e.g., cannot revoke own access or organization owner)',
  })
  async revokeAccess(
    @CurrentUser() user: any,
    @Param('id') targetUserId: string,
    @Body() dto: RevokeAccessDto,
  ) {
    return this.usersService.revokeAccess(user.userId, user.organizationId, targetUserId, dto);
  }

  @Delete(':id/revoke')
  @HttpCode(HttpStatus.OK)
  @Permissions('users.revoke')
  @ApiOperation({ summary: 'Revoke user access (simple revocation without data transfer)' })
  @ApiParam({ name: 'id', description: 'User ID to revoke' })
  @ApiResponse({ status: 200, description: 'User access revoked successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async revokeAccessSimple(@CurrentUser() user: any, @Param('id') targetUserId: string) {
    return this.usersService.revokeAccess(user.userId, user.organizationId, targetUserId, {
      transfer_data: false,
    });
  }

  @Get('me/download-data')
  @ApiOperation({ summary: 'Download all account data (organization owner only)' })
  @ApiResponse({ status: 200, description: 'Account data downloaded successfully' })
  @ApiResponse({ status: 403, description: 'Only organization owners can download account data' })
  async downloadAccountData(@CurrentUser() user: any, @Res() res: Response) {
    const data = await this.usersService.downloadAccountData(user.userId, user.organizationId);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=account-data-${user.userId}-${new Date().toISOString().split('T')[0]}.json`);
    return res.json(data);
  }

  @Post(':id/impersonate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Impersonate a user (owner/admin or with permission)' })
  @ApiParam({ name: 'id', description: 'User ID to impersonate' })
  @ApiResponse({ status: 200, description: 'Impersonation started successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions or cannot impersonate this user' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async impersonateUser(@CurrentUser() user: any, @Param('id') targetUserId: string) {
    return this.usersService.impersonateUser(user.userId, user.organizationId, targetUserId);
  }

  @Post('me/stop-impersonation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stop impersonating and return to original user' })
  @ApiResponse({ status: 200, description: 'Impersonation stopped successfully' })
  async stopImpersonation(@CurrentUser() user: any) {
    return this.usersService.stopImpersonation(user.userId, user.organizationId, user.impersonatedBy);
  }
}

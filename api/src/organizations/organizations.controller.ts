import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpCode, HttpStatus, NotFoundException, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentOrganization } from '../common/decorators/current-organization.decorator';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateOrganizationSettingsDto } from './dto/update-organization-settings.dto';
import { UpdateOrganizationSlugDto } from './dto/update-organization-slug.dto';
import { SwitchOrganizationDto } from './dto/switch-organization.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { OrganizationBrandingService } from './organization-branding.service';

import { TransferUserDto, TransferTicketDto } from './dto/data-transfer.dto';
import { DataTransferService } from './services/data-transfer.service';

@ApiTags('organizations')
@Controller('organizations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly brandingService: OrganizationBrandingService,
    private readonly dataTransferService: DataTransferService,
  ) { }

  @Post('transfer/user')
  @Permissions('organizations.edit')
  @ApiOperation({ summary: 'Transfer a user from one branch to another' })
  @ApiResponse({ status: 200, description: 'User transferred successfully' })
  async transferUser(
    @CurrentUser('id') adminUserId: string,
    @Body() dto: TransferUserDto,
  ) {
    return this.dataTransferService.transferUser(
      adminUserId,
      dto.userId,
      dto.fromOrgId,
      dto.toOrgId,
    );
  }

  @Post('transfer/ticket')
  @Permissions('organizations.edit')
  @ApiOperation({ summary: 'Transfer a ticket to another branch' })
  @ApiResponse({ status: 200, description: 'Ticket transferred successfully' })
  async transferTicket(
    @CurrentUser('id') adminUserId: string,
    @Body() dto: TransferTicketDto,
  ) {
    return this.dataTransferService.transferTicket(
      adminUserId,
      dto.ticketId,
      dto.toOrgId,
    );
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current organization' })
  @ApiResponse({ status: 200, description: 'Organization retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Not a member of organization' })
  @ApiResponse({ status: 404, description: 'Organization not found or not applicable' })
  async getCurrentOrganization(@CurrentUser() user: any) {
    // System admins don't have organizations
    if (user.is_system_admin) {
      throw new NotFoundException('System administrators do not belong to any organization');
    }
    return this.organizationsService.getCurrentOrganization(user.userId, user.organizationId);
  }

  @Get()
  @ApiOperation({ summary: 'List user organizations' })
  @ApiResponse({ status: 200, description: 'Organizations retrieved successfully' })
  async getUserOrganizations(@CurrentUser() user: any) {
    return this.organizationsService.getUserOrganizations(user.userId);
  }

  @Put('me')
  @HttpCode(HttpStatus.OK)
  @Permissions('organizations.edit')
  @ApiOperation({ summary: 'Update current organization' })
  @ApiResponse({ status: 200, description: 'Organization updated successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 409, description: 'Name or email already exists' })
  async updateOrganization(@CurrentUser() user: any, @Body() dto: UpdateOrganizationDto) {
    return this.organizationsService.updateOrganization(user.userId, user.organizationId, dto);
  }

  @Put('me/settings')
  @HttpCode(HttpStatus.OK)
  @Permissions('organizations.settings')
  @ApiOperation({ summary: 'Update organization settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  @ApiResponse({ status: 403, description: 'Only organization owner can update settings' })
  async updateOrganizationSettings(
    @CurrentUser() user: any,
    @Body() dto: UpdateOrganizationSettingsDto,
  ) {
    return this.organizationsService.updateOrganizationSettings(
      user.userId,
      user.organizationId,
      dto,
    );
  }

  @Get('me/stats')
  @Permissions('organizations.view')
  @ApiOperation({ summary: 'Get organization statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Not a member of organization' })
  async getOrganizationStatistics(
    @CurrentUser() user: any,
    @CurrentOrganization('accessibleIds') accessibleIds: string[],
  ) {
    return this.organizationsService.getOrganizationStatistics(user.userId, user.organizationId, accessibleIds);
  }

  @Put('switch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Switch to another organization' })
  @ApiResponse({ status: 200, description: 'Organization switched successfully' })
  @ApiResponse({ status: 403, description: 'Not a member of organization' })
  async switchOrganization(@CurrentUser() user: any, @Body() dto: SwitchOrganizationDto) {
    return this.organizationsService.switchOrganization(user.userId, dto.organization_id);
  }

  @Put('me/slug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update organization slug (Basic, Platinum, Diamond only)' })
  @ApiResponse({ status: 200, description: 'Slug updated successfully' })
  @ApiResponse({ status: 403, description: 'Only organization owner can update slug, or package does not allow slug changes' })
  @ApiResponse({ status: 409, description: 'Slug already exists' })
  async updateOrganizationSlug(
    @CurrentUser() user: any,
    @Body() dto: UpdateOrganizationSlugDto,
  ) {
    return this.organizationsService.updateOrganizationSlug(
      user.userId,
      user.organizationId,
      dto.slug,
    );
  }

  @Get('me/branding')
  @Permissions('organizations.view')
  @ApiOperation({ summary: 'Get organization branding settings' })
  @ApiResponse({ status: 200, description: 'Branding settings retrieved successfully' })
  async getBranding(@CurrentUser() user: any) {
    return this.brandingService.getBranding(user.organizationId);
  }

  @Put('me/branding')
  @HttpCode(HttpStatus.OK)
  @Permissions('organizations.settings')
  @ApiOperation({ summary: 'Update organization branding settings' })
  @ApiResponse({ status: 200, description: 'Branding settings updated successfully' })
  @ApiResponse({ status: 403, description: 'Only organization owner can update branding' })
  async updateBranding(
    @CurrentUser() user: any,
    @Body() dto: {
      logo_url?: string;
      favicon_url?: string;
      primary_color?: string;
      secondary_color?: string;
      custom_css?: string;
      custom_js?: string;
      footer_text?: string;
    },
  ) {
    return this.brandingService.updateBranding(
      user.organizationId,
      user.userId,
      dto,
    );
  }

  @Get('me/branches')
  @Permissions('organizations.view')
  @ApiOperation({ summary: 'List branches of current organization' })
  @ApiResponse({ status: 200, description: 'Branches retrieved successfully' })
  async getBranches(@CurrentUser() user: any) {
    return this.organizationsService.getBranches(user.userId, user.organizationId);
  }

  @Post('me/branches')
  @Permissions('organizations.edit')
  @ApiOperation({ summary: 'Create a new branch/outlet' })
  @ApiResponse({ status: 201, description: 'Branch created successfully' })
  async createBranch(@CurrentUser() user: any, @Body() dto: CreateBranchDto) {
    return this.organizationsService.createBranch(user.userId, user.organizationId, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('branches/:id')
  @Permissions('organizations.delete')
  @ApiOperation({ summary: 'Delete a branch' })
  @ApiResponse({ status: 204, description: 'Branch deleted successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Branch not found' })
  async deleteBranch(@CurrentUser() user: any, @Param('id') id: string) {
    return this.organizationsService.deleteBranch(user.userId, user.organizationId, id);
  }

  @Put('branches/:id')
  @HttpCode(HttpStatus.OK)
  @Permissions('organizations.edit')
  @ApiOperation({ summary: 'Update a branch' })
  @ApiResponse({ status: 200, description: 'Branch updated successfully' })
  async updateBranch(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.organizationsService.updateBranch(user.userId, user.organizationId, id, dto);
  }

  @Put('me/ip-whitelist')
  @HttpCode(HttpStatus.OK)
  @Permissions('organizations.edit')
  @ApiOperation({ summary: 'Update IP whitelist for the current organization' })
  @ApiResponse({ status: 200, description: 'IP whitelist updated' })
  async updateIpWhitelist(
    @CurrentUser() user: any,
    @Body() body: { ips: string[] },
  ) {
    return this.organizationsService.updateIpWhitelist(user.organizationId, user.userId, body.ips || []);
  }

  @Put('me/tax-info')
  @HttpCode(HttpStatus.OK)
  @Permissions('organizations.edit')
  @ApiOperation({ summary: 'Update PAN/VAT tax info for the current organization' })
  @ApiResponse({ status: 200, description: 'Tax info updated' })
  async updateTaxInfo(
    @CurrentUser() user: any,
    @Body() body: { pan_number?: string; vat_number?: string },
  ) {
    return this.organizationsService.updateTaxInfo(user.organizationId, user.userId, body);
  }
}

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { PackagesService } from './packages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpgradePackageDto } from './dto/upgrade-package.dto';
import { PurchaseFeatureDto } from './dto/purchase-feature.dto';

@ApiTags('packages')
@Controller('packages')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) { }

  @Get()
  @Permissions('packages.view')
  @ApiOperation({ summary: 'List all available packages' })
  @ApiResponse({ status: 200, description: 'Packages retrieved successfully' })
  async getPackages(@CurrentUser() user: any) {
    return this.packagesService.getPackages(user.organizationId);
  }

  @Get('features')
  @Permissions('packages.view')
  @ApiOperation({ summary: 'List all available package features' })
  @ApiResponse({ status: 200, description: 'Features retrieved successfully' })
  async getPackageFeatures() {
    return this.packagesService.getPackageFeatures();
  }

  @Get(':id')
  @Permissions('packages.view')
  @ApiOperation({ summary: 'Get package by ID' })
  @ApiParam({ name: 'id', description: 'Package ID' })
  @ApiResponse({ status: 200, description: 'Package retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Package not found' })
  async getPackageById(@Param('id', ParseIntPipe) packageId: number) {
    return this.packagesService.getPackageById(packageId);
  }
}

@ApiTags('organizations')
@Controller('organizations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class OrganizationPackagesController {
  constructor(private readonly packagesService: PackagesService) { }

  @Get('me/package')
  @Permissions('packages.view')
  @ApiOperation({ summary: 'Get current organization package and limits' })
  @ApiResponse({ status: 200, description: 'Package information retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async getCurrentPackage(@CurrentUser() user: any) {
    return this.packagesService.getCurrentPackage(user.userId, user.organizationId);
  }

  @Put('me/package')
  @HttpCode(HttpStatus.OK)
  @Permissions('packages.upgrade')
  @ApiOperation({ summary: 'Upgrade or downgrade organization package' })
  @ApiResponse({ status: 200, description: 'Package upgraded successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 400, description: 'Cannot downgrade due to current usage' })
  @ApiResponse({ status: 409, description: 'Already on this package' })
  async upgradePackage(@CurrentUser() user: any, @Body() dto: UpgradePackageDto) {
    return this.packagesService.upgradePackage(user.userId, user.organizationId, dto);
  }

  @Post('me/features')
  @HttpCode(HttpStatus.CREATED)
  @Permissions('packages.features.purchase')
  @ApiOperation({ summary: 'Purchase a package feature' })
  @ApiResponse({ status: 201, description: 'Feature purchased successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 409, description: 'Feature already active' })
  async purchaseFeature(@CurrentUser() user: any, @Body() dto: PurchaseFeatureDto) {
    return this.packagesService.purchaseFeature(user.userId, user.organizationId, dto);
  }

  @Delete('me/features/:id')
  @HttpCode(HttpStatus.OK)
  @Permissions('packages.features.cancel')
  @ApiOperation({ summary: 'Cancel a package feature' })
  @ApiParam({ name: 'id', description: 'Organization Package Feature ID' })
  @ApiResponse({ status: 200, description: 'Feature cancelled successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 400, description: 'Cannot cancel due to current usage' })
  @ApiResponse({ status: 404, description: 'Feature not found' })
  async cancelFeature(@CurrentUser() user: any, @Param('id', ParseIntPipe) featureId: number) {
    return this.packagesService.cancelFeature(user.userId, user.organizationId, featureId);
  }

  @Put('me/package/auto-renew')
  @HttpCode(HttpStatus.OK)
  @Permissions('packages.upgrade')
  @ApiOperation({ summary: 'Toggle package auto-renewal' })
  @ApiResponse({ status: 200, description: 'Auto-renewal toggled successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 400, description: 'Invalid credentials or missing required fields' })
  async toggleAutoRenew(
    @CurrentUser() user: any,
    @Body() body: {
      enabled: boolean;
      credentials?: {
        payment_method: 'esewa' | 'stripe';
        esewa_username?: string;
        stripe_card_token?: string;
        card_last4?: string;
        card_brand?: string;
      };
    },
  ) {
    return this.packagesService.toggleAutoRenew(
      user.userId,
      user.organizationId,
      body.enabled,
      body.credentials,
    );
  }

  @Post('me/package/calculate-upgrade-price')
  @HttpCode(HttpStatus.OK)
  @Permissions('packages.view')
  @ApiOperation({ summary: 'Calculate upgrade price with prorated credit' })
  @ApiResponse({ status: 200, description: 'Upgrade price calculated successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async calculateUpgradePrice(@CurrentUser() user: any, @Body() dto: UpgradePackageDto) {
    return this.packagesService.calculateUpgradePrice(user.userId, user.organizationId, dto);
  }

  @Post('me/package/repair-branch-limits')
  @HttpCode(HttpStatus.OK)
  @Permissions('packages.upgrade')
  @ApiOperation({ summary: 'Repair organization branch limits based on package' })
  @ApiResponse({ status: 200, description: 'Branch limits repaired successfully' })
  async repairBranchLimits(@CurrentUser() user: any) {
    return this.packagesService.repairBranchLimits(user.organizationId);
  }
}

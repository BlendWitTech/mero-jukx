import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterOrganizationDto } from './dto/register-organization.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { VerifyMfaLoginDto } from './dto/verify-mfa-login.dto';
import { LoginWithMfaDto } from './dto/login-with-mfa.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Public()
  @Post('organization/register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new organization' })
  @ApiResponse({ status: 201, description: 'Organization registered successfully' })
  @ApiResponse({ status: 409, description: 'Organization or user already exists' })
  async registerOrganization(@Body() dto: RegisterOrganizationDto, @Headers('origin') origin?: string) {
    return this.authService.registerOrganization(dto, origin);
  }

  @Public()
  @Post('system-admin/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'System admin login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async systemAdminLogin(@Body() loginDto: LoginDto) {
    try {
      return await this.authService.systemAdminLogin(loginDto);
    } catch (error) {
      console.error('[AuthController] System admin login error:', error);
      throw error;
    }
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto, @Query('organization_id') organizationId?: string) {
    try {
      // If organization_id not provided, return user's organizations for selection
      if (!organizationId) {
        return this.authService.loginWithoutOrganization(loginDto);
      }
      return await this.authService.login(loginDto, organizationId);
    } catch (error) {
      console.error('[AuthController] Login error:', error);
      throw error;
    }
  }

  @Public()
  @Get('verify-email')
  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(@Query('token') token?: string) {
    if (!token || token.trim() === '') {
      throw new BadRequestException('Verification token is required');
    }
    return this.authService.verifyEmail(token);
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification link' })
  @ApiResponse({ status: 200, description: 'Verification email sent if account exists' })
  async resendVerification(@Body('email') email: string, @Headers('origin') origin?: string) {
    if (!email || email.trim() === '') {
      throw new BadRequestException('Email is required');
    }
    return this.authService.resendVerificationEmail(email.trim(), origin);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Headers('origin') origin?: string) {
    console.log(`[Forgot Password Controller] Received request for email: ${dto.email}`);
    return this.authService.forgotPassword(dto.email, origin);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    // Log token for debugging (first 10 chars only for security)
    console.log(`[Password Reset] Received token: ${dto.token?.substring(0, 10)}... (length: ${dto.token?.length})`);
    return this.authService.resetPassword(dto.token, dto.new_password);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refresh_token);
  }

  @Public()
  @Post('verify-mfa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify 2FA code and complete login' })
  @ApiResponse({ status: 200, description: 'Login successful after 2FA verification' })
  @ApiResponse({ status: 401, description: 'Invalid 2FA code or expired token' })
  async verifyMfaAndLogin(@Body() dto: VerifyMfaLoginDto) {
    return this.authService.verifyMfaAndLogin(dto);
  }

  @Public()
  @Post('login-with-mfa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and MFA code directly (for organizations with MFA enabled)' })
  @ApiResponse({ status: 200, description: 'Login successful with MFA code' })
  @ApiResponse({ status: 401, description: 'Invalid credentials or MFA code' })
  @ApiResponse({ status: 400, description: 'MFA not set up or invalid request' })
  async loginWithMfa(@Body() dto: LoginWithMfaDto) {
    return this.authService.loginWithMfa(dto);
  }

  @Public()
  @Post('check-mfa-required')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if email belongs to user with MFA-enabled organizations' })
  @ApiResponse({ status: 200, description: 'Returns whether MFA login is available' })
  async checkMfaRequired(@Body('email') email: string) {
    return this.authService.checkMfaRequiredForEmail(email);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@CurrentUser() user: any, @Body('token') token: string) {
    return this.authService.logout(user.userId, token);
  }
}

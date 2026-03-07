import { IsInt, IsNotEmpty, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppBillingPeriod } from '../../database/entities/apps.entity';

export enum PaymentMethod {
  STRIPE = 'stripe',
  ESEWA = 'esewa',
  IME_PAY = 'ime_pay',
}

export class PurchaseAppDto {
  @ApiProperty({ description: 'App ID to purchase', example: 1 })
  @IsInt()
  @IsNotEmpty()
  app_id: number;

  @ApiProperty({
    description: 'Billing period',
    enum: AppBillingPeriod,
    example: AppBillingPeriod.MONTHLY,
  })
  @IsEnum(AppBillingPeriod)
  billing_period: AppBillingPeriod;

  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    example: PaymentMethod.STRIPE,
  })
  @IsEnum(PaymentMethod)
  payment_method: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Start trial if available (only if app has trial_days > 0)',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  start_trial?: boolean;

  @ApiPropertyOptional({
    description: 'Enable auto-renewal (default: true)',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  auto_renew?: boolean;

  @ApiPropertyOptional({
    description: 'Array of user IDs to grant access to (organization owner gets access automatically)',
    type: [String],
  })
  @IsOptional()
  user_ids?: string[]; // Array of user IDs to grant access to
}


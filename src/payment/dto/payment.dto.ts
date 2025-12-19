import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsEmail,
  Min,
  Max,
  IsObject,
  ValidateNested,
  IsDefined,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PaymentCurrency } from '../entities/payment.entity';

export class ShippingDto {
  @ApiProperty({
    description: 'Recipient name',
    example: 'John Doe',
  })
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Address line 1',
    example: '123 Main St',
  })
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  line1: string;

  @ApiPropertyOptional({
    description: 'Address line 2',
    example: 'Apt 4B',
  })
  @IsOptional()
  @IsString()
  line2?: string;

  @ApiProperty({
    description: 'City',
    example: 'New York',
  })
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({
    description: 'State/Province',
    example: 'NY',
  })
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({
    description: 'Postal code',
    example: '10001',
  })
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  postal_code: string;

  @ApiProperty({
    description: 'Country',
    example: 'US',
  })
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  country: string;
}

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Payment amount',
    example: 99.99,
    minimum: 0.5,
    maximum: 999999.99,
  })
  @IsDefined()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.5)
  @Max(999999.99)
  amount: number;

  @ApiPropertyOptional({
    description: 'Payment currency',
    enum: PaymentCurrency,
    default: PaymentCurrency.USD,
  })
  @IsOptional()
  @IsEnum(PaymentCurrency)
  currency?: PaymentCurrency = PaymentCurrency.USD;

  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    example: PaymentMethod.STRIPE,
  })
  @IsDefined()
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Payment description',
    example: 'Constitution App Premium Subscription',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @ApiPropertyOptional({
    description: 'Customer email for receipt',
    example: 'user@example.com',
  })
  @IsOptional()
  @IsEmail()
  receiptEmail?: string;

  @ApiPropertyOptional({
    description: 'Source token (for Stripe)',
    example: 'tok_visa',
  })
  @IsOptional()
  @IsString()
  sourceToken?: string;

  @ApiPropertyOptional({
    description: 'Customer ID',
    example: 'cus_123456789',
  })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Invoice ID',
    example: 'inv_123456789',
  })
  @IsOptional()
  @IsString()
  invoiceId?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { orderId: 'ORD-001', source: 'web' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Shipping information',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ShippingDto)
  shipping?: ShippingDto;
}

export class PaymentDto {
  @ApiProperty({
    description: 'Payment ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'User ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  userId: string;

  @ApiProperty({
    description: 'Payment amount',
    example: 99.99,
  })
  amount: number;

  @ApiProperty({
    description: 'Payment currency',
    enum: PaymentCurrency,
    example: PaymentCurrency.USD,
  })
  currency: PaymentCurrency;

  @ApiProperty({
    description: 'Payment status',
    example: 'completed',
  })
  status: string;

  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    example: PaymentMethod.STRIPE,
  })
  paymentMethod: PaymentMethod;

  @ApiProperty({
    description: 'Payment metadata',
  })
  metadata: any;

  @ApiPropertyOptional({
    description: 'Payment intent ID',
    example: 'pi_123456789',
  })
  paymentIntentId?: string;

  @ApiPropertyOptional({
    description: 'Transaction ID',
    example: 'txn_123456789',
  })
  transactionId?: string;

  @ApiPropertyOptional({
    description: 'Failure reason',
  })
  failureReason?: string;

  @ApiProperty({
    description: 'Created at',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Updated at',
  })
  updatedAt: Date;
}

export class WebhookEventDto {
  @ApiProperty({
    description: 'Event type',
    example: 'payment_intent.succeeded',
  })
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({
    description: 'Event data',
  })
  @IsDefined()
  @IsObject()
  data: any;

  @ApiPropertyOptional({
    description: 'Webhook signature',
  })
  @IsOptional()
  @IsString()
  signature?: string;
}

export class RefundDto {
  @ApiProperty({
    description: 'Refund amount',
    example: 99.99,
  })
  @IsDefined()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.5)
  amount: number;

  @ApiProperty({
    description: 'Refund reason',
    example: 'Customer requested refund',
  })
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({
    description: 'Refund ID (if partial refund)',
    example: 're_123456789',
  })
  @IsOptional()
  @IsString()
  refundId?: string;
}
import {
  Controller,
  Post,
  Body,
  Headers,
  RawBody,
  Logger,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { WebhookEventDto } from './dto/payment.dto';
import * as crypto from 'crypto';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);
  private readonly webhookSecret: string;

  constructor(private readonly paymentService: PaymentService) {
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'test_webhook_secret';
  }

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Handle Stripe webhook events',
    description: 'Process payment status updates from Stripe',
  })
  @ApiHeader({
    name: 'stripe-signature',
    description: 'Stripe webhook signature',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid webhook signature or data',
  })
  async handleStripeWebhook(
    @RawBody() rawBody: Buffer,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    try {
      // Verify webhook signature
      const event = this.verifyStripeWebhook(rawBody, signature);

      this.logger.log(`Processing Stripe webhook: ${event.type}`);

      // Handle the event
      await this.paymentService.handleWebhook(event.type, event.data);

      return { received: true };
    } catch (error) {
      this.logger.error(
        `Failed to process Stripe webhook: ${error.message}`,
        error.stack,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      // Still return 200 to prevent Stripe from retrying
      return { received: false };
    }
  }

  @Post('generic')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Handle generic webhook events',
    description: 'Process payment status updates from other payment providers',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid webhook data',
  })
  async handleGenericWebhook(
    @Body() webhookDto: WebhookEventDto,
  ): Promise<{ received: boolean }> {
    try {
      this.logger.log(`Processing generic webhook: ${webhookDto.type}`);

      // Handle the event
      await this.paymentService.handleWebhook(webhookDto.type, webhookDto.data);

      return { received: true };
    } catch (error) {
      this.logger.error(
        `Failed to process generic webhook: ${error.message}`,
        error.stack,
      );

      return { received: false };
    }
  }

  private verifyStripeWebhook(rawBody: Buffer, signature: string): any {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    // In production, use actual Stripe SDK for webhook verification
    // const event = stripe.webhooks.constructEvent(
    //   rawBody,
    //   signature,
    //   this.webhookSecret,
    // );

    // For demo purposes, we'll parse and return a mock event
    try {
      const event = JSON.parse(rawBody.toString());
      return event;
    } catch (error) {
      throw new BadRequestException('Invalid webhook payload');
    }

    // Mock webhook verification for development
    const elements = signature.split(',');
    const timestamp = elements[0];
    const signatureHash = elements[1];

    if (!timestamp || !signatureHash) {
      throw new BadRequestException('Invalid signature format');
    }

    // In production, perform actual signature verification
    // const expectedSignature = crypto
    //   .createHmac('sha256', this.webhookSecret)
    //   .update(`${timestamp}.${rawBody}`)
    //   .digest('hex');

    // if (signatureHash !== `v1=${expectedSignature}`) {
    //   throw new BadRequestException('Invalid signature');
    // }
  }

  @Post('paypal')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Handle PayPal webhook events',
    description: 'Process payment status updates from PayPal',
  })
  @ApiHeader({
    name: 'paypal-auth-algo',
    description: 'PayPal signature algorithm',
    required: false,
  })
  @ApiHeader({
    name: 'paypal-transmission-id',
    description: 'PayPal transmission ID',
    required: false,
  })
  @ApiHeader({
    name: 'paypal-cert-id',
    description: 'PayPal certificate ID',
    required: false,
  })
  @ApiHeader({
    name: 'paypal-signature',
    description: 'PayPal signature',
    required: false,
  })
  @ApiHeader({
    name: 'paypal-timestamp',
    description: 'PayPal timestamp',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  async handlePaypalWebhook(
    @Body() webhookData: any,
    @Headers() headers: Record<string, string>,
  ): Promise<{ received: boolean }> {
    try {
      // Verify PayPal webhook signature in production
      const isValid = this.verifyPaypalWebhook(webhookData, headers);

      if (!isValid) {
        throw new BadRequestException('Invalid PayPal webhook signature');
      }

      this.logger.log(`Processing PayPal webhook: ${webhookData.event_type}`);

      // Map PayPal event type to internal format
      const eventType = this.mapPaypalEventType(webhookData.event_type);
      const eventData = webhookData.resource;

      // Handle the event
      await this.paymentService.handleWebhook(eventType, eventData);

      return { received: true };
    } catch (error) {
      this.logger.error(
        `Failed to process PayPal webhook: ${error.message}`,
        error.stack,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      return { received: false };
    }
  }

  private verifyPaypalWebhook(webhookData: any, headers: Record<string, string>): boolean {
    // In production, implement actual PayPal webhook verification
    // This involves fetching the webhook ID and verifying the signature
    return true;
  }

  private mapPaypalEventType(paypalEventType: string): string {
    const eventTypeMap: Record<string, string> = {
      'PAYMENT.SALE.COMPLETED': 'payment_intent.succeeded',
      'PAYMENT.SALE.DENIED': 'payment_intent.payment_failed',
      'PAYMENT.SALE.REFUNDED': 'payment_intent.refunded',
      'PAYMENT.CAPTURE.COMPLETED': 'payment_intent.succeeded',
      'PAYMENT.CAPTURE.DENIED': 'payment_intent.payment_failed',
      'PAYMENT.CAPTURE.REFUNDED': 'payment_intent.refunded',
    };

    return eventTypeMap[paypalEventType] || paypalEventType.toLowerCase();
  }

  @Post('square')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Handle Square webhook events',
    description: 'Process payment status updates from Square',
  })
  @ApiHeader({
    name: 'square-signature',
    description: 'Square webhook signature',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  async handleSquareWebhook(
    @Body() webhookData: any,
    @Headers('square-signature') signature: string,
  ): Promise<{ received: boolean }> {
    try {
      // Verify Square webhook signature in production
      const isValid = this.verifySquareWebhook(webhookData, signature);

      if (!isValid) {
        throw new BadRequestException('Invalid Square webhook signature');
      }

      this.logger.log(`Processing Square webhook: ${webhookData.type}`);

      // Map Square event type to internal format
      const eventType = this.mapSquareEventType(webhookData.type);
      const eventData = webhookData.data.object;

      // Handle the event
      await this.paymentService.handleWebhook(eventType, eventData);

      return { received: true };
    } catch (error) {
      this.logger.error(
        `Failed to process Square webhook: ${error.message}`,
        error.stack,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      return { received: false };
    }
  }

  private verifySquareWebhook(webhookData: any, signature: string): boolean {
    // In production, implement actual Square webhook verification
    // This involves verifying the HMAC signature using your webhook signature key
    return true;
  }

  private mapSquareEventType(squareEventType: string): string {
    const eventTypeMap: Record<string, string> = {
      'payment.updated': 'payment_intent.succeeded',
      'payment.created': 'payment_intent.succeeded',
    };

    return eventTypeMap[squareEventType] || squareEventType.toLowerCase();
  }
}
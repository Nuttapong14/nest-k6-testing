import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository, LessThan } from 'typeorm';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { CreatePaymentDto, PaymentDto, RefundDto } from './dto/payment.dto';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly stripeSecretKey: string;
  private readonly webhookSecret: string;

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly configService: ConfigService,
  ) {
    this.stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY') || '';
    this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || '';
  }

  async createPayment(
    createPaymentDto: CreatePaymentDto,
    userId: string,
  ): Promise<PaymentDto> {
    try {
      // Create payment record in database
      const payment = this.paymentRepository.create({
        userId,
        amount: createPaymentDto.amount,
        currency: createPaymentDto.currency,
        status: PaymentStatus.PENDING,
        paymentMethod: createPaymentDto.paymentMethod,
        metadata: {
          description: createPaymentDto.description,
          invoiceId: createPaymentDto.invoiceId,
          receiptEmail: createPaymentDto.receiptEmail,
          shipping: createPaymentDto.shipping,
          metadata: createPaymentDto.metadata,
        },
      });

      const savedPayment = await this.paymentRepository.save(payment);

      // Process payment based on method
      if (createPaymentDto.paymentMethod === 'stripe') {
        await this.processStripePayment(savedPayment, createPaymentDto);
      } else {
        // Handle other payment methods
        await this.processGenericPayment(savedPayment, createPaymentDto);
      }

      // Fetch updated payment
      const updatedPayment = await this.paymentRepository.findOne({
        where: { id: savedPayment.id },
      });

      return this.mapToDto(updatedPayment!);
    } catch (error) {
      this.logger.error(`Failed to create payment: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getPaymentStatus(paymentId: string, userId?: string): Promise<PaymentDto> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${paymentId} not found`);
    }

    // If userId is provided, ensure the payment belongs to the user
    if (userId && payment.userId !== userId) {
      throw new NotFoundException(`Payment not found`);
    }

    // Check status with payment provider if still pending
    if (payment.status === PaymentStatus.PENDING) {
      await this.checkExternalPaymentStatus(payment);
    }

    return this.mapToDto(payment);
  }

  async processRefund(paymentId: string, refundDto: RefundDto): Promise<PaymentDto> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${paymentId} not found`);
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new Error('Can only refund completed payments');
    }

    try {
      // Process refund based on payment method
      if (payment.paymentMethod === 'stripe') {
        await this.processStripeRefund(payment, refundDto);
      } else {
        // Handle other refund methods
        await this.processGenericRefund(payment, refundDto);
      }

      // Update payment record
      await this.paymentRepository.update(payment.id, {
        status: PaymentStatus.REFUNDED,
        refundAmount: refundDto.amount,
        refundReason: refundDto.reason,
        refundedAt: new Date(),
      });

      const updatedPayment = await this.paymentRepository.findOne({
        where: { id: paymentId },
      });

      return this.mapToDto(updatedPayment!);
    } catch (error) {
      this.logger.error(`Failed to process refund: ${error.message}`, error.stack);
      throw error;
    }
  }

  async retryFailedPayments(): Promise<void> {
    const paymentsToRetry = await this.paymentRepository.find({
      where: {
        status: PaymentStatus.FAILED,
        retryCount: LessThan(3),
        nextRetryAt: LessThan(new Date()),
      },
    });

    for (const payment of paymentsToRetry) {
      try {
        this.logger.log(`Retrying payment ${payment.id}, attempt ${payment.retryCount + 1}`);
        await this.retryPayment(payment);
      } catch (error) {
        this.logger.error(
          `Failed to retry payment ${payment.id}: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  private async processStripePayment(
    payment: Payment,
    createPaymentDto: CreatePaymentDto,
  ): Promise<void> {
    // This is a mock implementation - in production, integrate with Stripe SDK
    this.logger.log(`Processing Stripe payment for amount ${payment.amount}`);

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Randomly succeed or fail for demo purposes
    const isSuccess = Math.random() > 0.2; // 80% success rate

    if (isSuccess) {
      await this.paymentRepository.update(payment.id, {
        status: PaymentStatus.COMPLETED,
        paymentIntentId: `pi_${Date.now()}`,
        transactionId: `txn_${Date.now()}`,
        processedAt: new Date(),
      });
    } else {
      await this.paymentRepository.update(payment.id, {
        status: PaymentStatus.FAILED,
        failureReason: 'Payment declined by issuer',
        retryCount: payment.retryCount + 1,
        nextRetryAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes later
      });
    }
  }

  private async processGenericPayment(
    payment: Payment,
    createPaymentDto: CreatePaymentDto,
  ): Promise<void> {
    // Generic payment processing for other methods
    this.logger.log(`Processing ${payment.paymentMethod} payment`);

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock completion
    await this.paymentRepository.update(payment.id, {
      status: PaymentStatus.COMPLETED,
      transactionId: `txn_${payment.paymentMethod}_${Date.now()}`,
      processedAt: new Date(),
    });
  }

  private async processStripeRefund(payment: Payment, refundDto: RefundDto): Promise<void> {
    // Mock Stripe refund implementation
    this.logger.log(`Processing Stripe refund for payment ${payment.id}`);

    await new Promise(resolve => setTimeout(resolve, 1000));

    // In production, use Stripe SDK to process refund
    // const refund = await stripe.refunds.create({
    //   payment_intent: payment.paymentIntentId,
    //   amount: refundDto.amount * 100, // Convert to cents
    //   reason: 'requested_by_customer',
    // });
  }

  private async processGenericRefund(payment: Payment, refundDto: RefundDto): Promise<void> {
    // Generic refund processing
    this.logger.log(`Processing refund for payment ${payment.id}`);

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  private async checkExternalPaymentStatus(payment: Payment): Promise<void> {
    if (payment.paymentMethod === 'stripe' && payment.paymentIntentId) {
      // Check with Stripe for updated status
      // In production, use Stripe SDK to check payment intent status
      this.logger.log(`Checking Stripe status for payment ${payment.id}`);
    }
  }

  private async retryPayment(payment: Payment): Promise<void> {
    const retryCount = payment.retryCount + 1;

    await this.paymentRepository.update(payment.id, {
      status: PaymentStatus.PROCESSING,
      retryCount,
    });

    // Simulate retry processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock retry success
    const isSuccess = Math.random() > 0.3; // 70% success rate on retry

    if (isSuccess) {
      await this.paymentRepository.update(payment.id, {
        status: PaymentStatus.COMPLETED,
        transactionId: `txn_retry_${Date.now()}`,
        processedAt: new Date(),
      });
    } else {
      const nextRetryInMinutes = Math.min(60 * Math.pow(2, retryCount), 24 * 60); // Exponential backoff
      await this.paymentRepository.update(payment.id, {
        status: PaymentStatus.FAILED,
        failureReason: `Retry ${retryCount} failed`,
        nextRetryAt: new Date(Date.now() + nextRetryInMinutes * 60 * 1000),
      });
    }
  }

  public mapToDto(payment: Payment): PaymentDto {
    return {
      id: payment.id,
      userId: payment.userId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      paymentMethod: payment.paymentMethod,
      metadata: payment.metadata,
      paymentIntentId: payment.paymentIntentId,
      transactionId: payment.transactionId,
      failureReason: payment.failureReason,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  async handleWebhook(eventType: string, eventData: any): Promise<void> {
    this.logger.log(`Processing webhook event: ${eventType}`);

    switch (eventType) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSucceeded(eventData);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(eventData);
        break;
      case 'payment_intent.canceled':
        await this.handlePaymentCanceled(eventData);
        break;
      default:
        this.logger.warn(`Unhandled webhook event type: ${eventType}`);
    }
  }

  private async handlePaymentSucceeded(data: any): Promise<void> {
    const paymentIntentId = data.id;

    await this.paymentRepository.update(
      { paymentIntentId },
      {
        status: PaymentStatus.COMPLETED,
        transactionId: data.charges?.data[0]?.id,
        processedAt: new Date(),
      }
    );

    this.logger.log(`Payment succeeded: ${paymentIntentId}`);
  }

  private async handlePaymentFailed(data: any): Promise<void> {
    const paymentIntentId = data.id;
    const failureReason = data.last_payment_error?.message || 'Payment failed';

    await this.paymentRepository.update(
      { paymentIntentId },
      {
        status: PaymentStatus.FAILED,
        failureReason,
        retryCount: 1,
        nextRetryAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      }
    );

    this.logger.log(`Payment failed: ${paymentIntentId} - ${failureReason}`);
  }

  private async handlePaymentCanceled(data: any): Promise<void> {
    const paymentIntentId = data.id;

    await this.paymentRepository.update(
      { paymentIntentId },
      {
        status: PaymentStatus.CANCELLED,
      }
    );

    this.logger.log(`Payment canceled: ${paymentIntentId}`);
  }

  async findByUser(userId: string): Promise<Payment[]> {
    return this.paymentRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
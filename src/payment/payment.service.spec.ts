import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository, LessThan } from 'typeorm';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { CreatePaymentDto, RefundDto } from './dto/payment.dto';
import { NotFoundException, Logger } from '@nestjs/common';

describe('PaymentService', () => {
  let service: PaymentService;
  let repository: Repository<Payment>;
  let configService: ConfigService;

  const mockPaymentRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    find: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: getRepositoryToken(Payment),
          useValue: mockPaymentRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    repository = module.get<Repository<Payment>>(getRepositoryToken(Payment));
    configService = module.get<ConfigService>(ConfigService);

    // Mock config values
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'STRIPE_SECRET_KEY') return 'test_stripe_secret';
      if (key === 'STRIPE_WEBHOOK_SECRET') return 'test_webhook_secret';
      return null;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPayment', () => {
    const userId = 'user-123';
    const createDto: CreatePaymentDto = {
      amount: 100.0,
      currency: 'USD',
      paymentMethod: 'stripe',
      description: 'Test payment',
      receiptEmail: 'test@example.com',
    };

    it('should create a payment successfully', async () => {
      const payment = {
        id: 'payment-123',
        userId,
        amount: createDto.amount,
        currency: createDto.currency,
        status: PaymentStatus.PENDING,
        paymentMethod: createDto.paymentMethod,
        metadata: {
          description: createDto.description,
          receiptEmail: createDto.receiptEmail,
        },
      };

      const processedPayment = {
        ...payment,
        status: PaymentStatus.COMPLETED,
        paymentIntentId: 'pi_test',
        transactionId: 'txn_test',
        processedAt: new Date(),
      };

      mockPaymentRepository.create.mockReturnValue(payment);
      mockPaymentRepository.save
        .mockResolvedValueOnce(payment) // Initial save
        .mockResolvedValueOnce(processedPayment); // Updated after processing
      mockPaymentRepository.findOne.mockResolvedValue(processedPayment);

      // Mock the private method for processing
      jest
        .spyOn(service as any, 'processStripePayment')
        .mockImplementation(async (payment: Payment) => {
          await repository.update(payment.id, {
            status: PaymentStatus.COMPLETED,
            paymentIntentId: 'pi_test',
            transactionId: 'txn_test',
            processedAt: new Date(),
          });
        });

      const result = await service.createPayment(createDto, userId);

      expect(result).toEqual({
        id: processedPayment.id,
        userId: processedPayment.userId,
        amount: processedPayment.amount,
        currency: processedPayment.currency,
        status: processedPayment.status,
        paymentMethod: processedPayment.paymentMethod,
        metadata: processedPayment.metadata,
        paymentIntentId: processedPayment.paymentIntentId,
        transactionId: processedPayment.transactionId,
        failureReason: undefined,
        processedAt: expect.any(Date),
        refundAmount: undefined,
        refundReason: undefined,
        refundedAt: undefined,
        createdAt: processedPayment.createdAt,
        updatedAt: processedPayment.updatedAt,
      });

      expect(mockPaymentRepository.create).toHaveBeenCalledWith({
        userId,
        amount: createDto.amount,
        currency: createDto.currency,
        status: PaymentStatus.PENDING,
        paymentMethod: createDto.paymentMethod,
        metadata: {
          description: createDto.description,
          receiptEmail: createDto.receiptEmail,
        },
      });
    });

    it('should handle payment failure', async () => {
      const payment = {
        id: 'payment-123',
        userId,
        amount: createDto.amount,
        currency: createDto.currency,
        status: PaymentStatus.PENDING,
        paymentMethod: createDto.paymentMethod,
        metadata: {},
      };

      const failedPayment = {
        ...payment,
        status: PaymentStatus.FAILED,
        failureReason: 'Payment declined',
      };

      mockPaymentRepository.create.mockReturnValue(payment);
      mockPaymentRepository.save
        .mockResolvedValueOnce(payment)
        .mockResolvedValueOnce(failedPayment);
      mockPaymentRepository.findOne.mockResolvedValue(failedPayment);

      // Mock the private method for processing
      jest
        .spyOn(service as any, 'processStripePayment')
        .mockImplementation(async (payment: Payment) => {
          await repository.update(payment.id, {
            status: PaymentStatus.FAILED,
            failureReason: 'Payment declined',
          });
        });

      const result = await service.createPayment(createDto, userId);

      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(result.failureReason).toBe('Payment declined');
    });
  });

  describe('getPaymentStatus', () => {
    it('should return payment status for owner', async () => {
      const paymentId = 'payment-123';
      const userId = 'user-123';
      const payment = {
        id: paymentId,
        userId,
        status: PaymentStatus.COMPLETED,
        amount: 100.0,
        currency: 'USD',
        paymentMethod: 'stripe',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPaymentRepository.findOne.mockResolvedValue(payment);

      const result = await service.getPaymentStatus(paymentId, userId);

      expect(result).toEqual(payment);
      expect(mockPaymentRepository.findOne).toHaveBeenCalledWith({
        where: { id: paymentId },
      });
    });

    it('should throw NotFoundException when payment not found', async () => {
      const paymentId = 'non-existent';
      const userId = 'user-123';

      mockPaymentRepository.findOne.mockResolvedValue(null);

      await expect(service.getPaymentStatus(paymentId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when user tries to access another user payment', async () => {
      const paymentId = 'payment-123';
      const userId = 'user-123';
      const payment = {
        id: paymentId,
        userId: 'another-user', // Different user
      };

      mockPaymentRepository.findOne.mockResolvedValue(payment);

      await expect(service.getPaymentStatus(paymentId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should allow admin to access any payment', async () => {
      const paymentId = 'payment-123';
      const payment = {
        id: paymentId,
        userId: 'another-user',
      };

      mockPaymentRepository.findOne.mockResolvedValue(payment);

      const result = await service.getPaymentStatus(paymentId); // No userId provided

      expect(result).toEqual(payment);
    });
  });

  describe('processRefund', () => {
    const paymentId = 'payment-123';
    const refundDto: RefundDto = {
      amount: 100.0,
      reason: 'Customer requested refund',
    };

    it('should process a refund successfully', async () => {
      const payment = {
        id: paymentId,
        status: PaymentStatus.COMPLETED,
        amount: 100.0,
        paymentMethod: 'stripe',
      };

      const refundedPayment = {
        ...payment,
        status: PaymentStatus.REFUNDED,
        refundAmount: refundDto.amount,
        refundReason: refundDto.reason,
        refundedAt: new Date(),
      };

      mockPaymentRepository.findOne
        .mockResolvedValueOnce(payment)
        .mockResolvedValueOnce(refundedPayment);
      mockPaymentRepository.update.mockResolvedValue(undefined);

      // Mock the private method for refund processing
      jest
        .spyOn(service as any, 'processStripeRefund')
        .mockImplementation(async () => {
          // Do nothing for mock
        });

      const result = await service.processRefund(paymentId, refundDto);

      expect(result.status).toBe(PaymentStatus.REFUNDED);
      expect(result.refundAmount).toBe(refundDto.amount);
      expect(result.refundReason).toBe(refundDto.reason);

      expect(mockPaymentRepository.update).toHaveBeenCalledWith(paymentId, {
        status: PaymentStatus.REFUNDED,
        refundAmount: refundDto.amount,
        refundReason: refundDto.reason,
        refundedAt: expect.any(Date),
      });
    });

    it('should throw NotFoundException when payment not found', async () => {
      mockPaymentRepository.findOne.mockResolvedValue(null);

      await expect(service.processRefund(paymentId, refundDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw error when trying to refund non-completed payment', async () => {
      const payment = {
        id: paymentId,
        status: PaymentStatus.PENDING, // Not completed
      };

      mockPaymentRepository.findOne.mockResolvedValue(payment);

      await expect(service.processRefund(paymentId, refundDto)).rejects.toThrow(
        'Can only refund completed payments',
      );
    });
  });

  describe('retryFailedPayments', () => {
    it('should retry failed payments with retry count below max', async () => {
      const paymentsToRetry = [
        {
          id: 'payment-1',
          retryCount: 1,
          maxRetries: 3,
          nextRetryAt: new Date(Date.now() - 1000), // Past time
        },
        {
          id: 'payment-2',
          retryCount: 2,
          maxRetries: 3,
          nextRetryAt: new Date(Date.now() - 1000), // Past time
        },
      ];

      mockPaymentRepository.find.mockResolvedValue(paymentsToRetry);

      // Mock retryPayment method
      jest
        .spyOn(service as any, 'retryPayment')
        .mockImplementation(async () => {
          // Do nothing for mock
        });

      await service.retryFailedPayments();

      expect(mockPaymentRepository.find).toHaveBeenCalledWith({
        where: {
          status: PaymentStatus.FAILED,
          retryCount: LessThan(3),
          nextRetryAt: expect.anything(),
        },
      });

      expect((service as any).retryPayment).toHaveBeenCalledTimes(2);
    });

    it('should not retry payments that have reached max retries', async () => {
      const paymentsToRetry = [
        {
          id: 'payment-1',
          retryCount: 3, // Max retries reached
          maxRetries: 3,
        },
      ];

      mockPaymentRepository.find.mockResolvedValue([]);

      await service.retryFailedPayments();

      expect(mockPaymentRepository.find).toHaveBeenCalledWith({
        where: {
          status: PaymentStatus.FAILED,
          retryCount: LessThan(3), // Should filter out max retries
          nextRetryAt: expect.anything(),
        },
      });
    });
  });

  describe('handleWebhook', () => {
    it('should handle payment succeeded webhook', async () => {
      const eventData = {
        id: 'pi_test',
        charges: {
          data: [
            {
              id: 'ch_test',
            },
          ],
        },
      };

      mockPaymentRepository.update.mockResolvedValue(undefined);

      await service.handleWebhook('payment_intent.succeeded', eventData);

      expect(mockPaymentRepository.update).toHaveBeenCalledWith(
        { paymentIntentId: 'pi_test' },
        {
          status: PaymentStatus.COMPLETED,
          transactionId: 'ch_test',
          processedAt: expect.any(Date),
        },
      );
    });

    it('should handle payment failed webhook', async () => {
      const eventData = {
        id: 'pi_test',
        last_payment_error: {
          message: 'Insufficient funds',
        },
      };

      mockPaymentRepository.update.mockResolvedValue(undefined);

      await service.handleWebhook('payment_intent.payment_failed', eventData);

      expect(mockPaymentRepository.update).toHaveBeenCalledWith(
        { paymentIntentId: 'pi_test' },
        {
          status: PaymentStatus.FAILED,
          failureReason: 'Insufficient funds',
          retryCount: 1,
          nextRetryAt: expect.anything(),
        },
      );
    });

    it('should handle payment canceled webhook', async () => {
      const eventData = {
        id: 'pi_test',
      };

      mockPaymentRepository.update.mockResolvedValue(undefined);

      await service.handleWebhook('payment_intent.canceled', eventData);

      expect(mockPaymentRepository.update).toHaveBeenCalledWith(
        { paymentIntentId: 'pi_test' },
        {
          status: PaymentStatus.CANCELLED,
        },
      );
    });

    it('should ignore unknown webhook events', async () => {
      const loggerSpy = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation();

      await service.handleWebhook('unknown.event', {});

      expect(loggerSpy).toHaveBeenCalledWith(
        'Unhandled webhook event type: unknown.event',
      );

      loggerSpy.mockRestore();
    });
  });

  describe('mapToDto', () => {
    it('should map payment entity to DTO', async () => {
      const payment = {
        id: 'payment-123',
        userId: 'user-123',
        amount: 100.0,
        currency: 'USD',
        status: PaymentStatus.COMPLETED,
        paymentMethod: 'stripe',
        metadata: { description: 'Test payment' },
        paymentIntentId: 'pi_test',
        transactionId: 'txn_test',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Access private method
      const dto = (service as any).mapToDto(payment);

      expect(dto).toEqual({
        id: payment.id,
        userId: payment.userId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        metadata: payment.metadata,
        paymentIntentId: payment.paymentIntentId,
        transactionId: payment.transactionId,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      });
    });
  });
});

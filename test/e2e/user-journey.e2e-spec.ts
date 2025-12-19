import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../src/auth/entities/user.entity';
import { Principle } from '../src/constitution/entities/principle.entity';
import { Payment } from '../src/payment/entities/payment.entity';

describe('Complete User Journey E2E', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let principleRepository: Repository<Principle>;
  let paymentRepository: Repository<Payment>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    principleRepository = moduleFixture.get<Repository<Principle>>(
      getRepositoryToken(Principle),
    );
    paymentRepository = moduleFixture.get<Repository<Payment>>(
      getRepositoryToken(Payment),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up database
    await paymentRepository.delete({});
    await principleRepository.delete({});
    await userRepository.delete({});

    // Create test data
    await principleRepository.save([
      {
        slug: 'user-authentication',
        title: 'User Authentication',
        description: 'All user interactions must be authenticated with secure tokens',
        priority: 1,
        metadata: {
          category: 'security',
          tags: ['authentication', 'jwt', 'security'],
          relatedPrinciples: [],
          examples: [],
        },
        isActive: true,
      },
      {
        slug: 'performance-standards',
        title: 'Performance Standards',
        description: 'API responses must meet performance standards',
        priority: 2,
        metadata: {
          category: 'performance',
          tags: ['performance', 'standards', 'metrics'],
          relatedPrinciples: [],
          examples: [],
        },
        isActive: true,
      },
      {
        slug: 'error-handling',
        title: 'Error Handling',
        description: 'All errors must be handled gracefully with proper responses',
        priority: 3,
        metadata: {
          category: 'reliability',
          tags: ['error', 'handling', 'graceful'],
          relatedPrinciples: [],
          examples: [],
        },
        isActive: true,
      },
    ]);
  });

  describe('Complete User Registration and Authentication Flow', () => {
    const userData = {
      email: 'journey@example.com',
      password: 'SecurePassword123!',
      name: 'Journey User',
    };

    it('should complete full authentication lifecycle', async () => {
      // Step 1: Register new user
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(registerResponse.body).toHaveProperty('message', 'User registered successfully');

      // Step 2: Login with credentials
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(200);

      const { accessToken, refreshToken } = loginResponse.body;
      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();

      // Step 3: Access protected profile endpoint
      const profileResponse = await request(app.getHttpServer())
        .get('/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(profileResponse.body.email).toBe(userData.email);
      expect(profileResponse.body.name).toBe(userData.name);

      // Step 4: Use refresh token to get new tokens
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken,
        })
        .expect(200);

      const newAccessToken = refreshResponse.body.accessToken;
      expect(newAccessToken).toBeDefined();
      expect(newAccessToken).not.toBe(accessToken);

      // Step 5: Use new access token to access profile
      await request(app.getHttpServer())
        .get('/profile')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      // Step 6: Logout user
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .send({
          refreshToken: refreshResponse.body.refreshToken,
        })
        .expect(200);

      // Step 7: Verify old refresh token is invalid
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: refreshResponse.body.refreshToken,
        })
        .expect(401);
    });
  });

  describe('Principle Search and Discovery Flow', () => {
    let userToken: string;

    beforeEach(async () => {
      // Login and get token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'searcher@example.com',
          password: 'SearcherPassword123!',
        });

      if (loginResponse.status === 200) {
        userToken = loginResponse.body.accessToken;
      } else {
        // Register if user doesn't exist
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: 'searcher@example.com',
            password: 'SearcherPassword123!',
            name: 'Search User',
          });

        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'searcher@example.com',
            password: 'SearcherPassword123!',
          });

        userToken = response.body.accessToken;
      }
    });

    it('should complete search and discovery workflow', async () => {
      // Step 1: Browse all principles
      const allPrinciplesResponse = await request(app.getHttpServer())
        .get('/principles')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(allPrinciplesResponse.body.data.length).toBeGreaterThan(0);

      // Step 2: Search for specific principle
      const searchResponse = await request(app.getHttpServer())
        .get('/principles?search=authentication')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(searchResponse.body.data.length).toBeGreaterThan(0);
      searchResponse.body.data.forEach((principle: any) => {
        expect(
          principle.title.toLowerCase().includes('authentication') ||
            principle.description.toLowerCase().includes('authentication'),
        ).toBe(true);
      });

      // Step 3: Filter by category
      const categoryResponse = await request(app.getHttpServer())
        .get('/principles?category=security')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      categoryResponse.body.data.forEach((principle: any) => {
        expect(principle.metadata.category).toBe('security');
      });

      // Step 4: Use advanced search endpoint
      const advancedSearchResponse = await request(app.getHttpServer())
        .get('/items?query=error%20handling&type=principles')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(advancedSearchResponse.body.data.length).toBeGreaterThan(0);

      // Step 5: Get specific principle details
      const principle = searchResponse.body.data[0];
      const detailResponse = await request(app.getHttpServer())
        .get(`/principles/${principle.slug}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(detailResponse.body.id).toBe(principle.id);
      expect(detailResponse.body.title).toBe(principle.title);

      // Step 6: Get related principles
      const relatedResponse = await request(app.getHttpServer())
        .get(`/principles/${principle.slug}/related`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(relatedResponse.body)).toBe(true);

      // Step 7: Test pagination
      const paginatedResponse = await request(app.getHttpServer())
        .get('/principles?page=1&limit=2')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(paginatedResponse.body.data.length).toBeLessThanOrEqual(2);
      expect(paginatedResponse.body.meta).toHaveProperty('totalPages');
    });
  });

  describe('Payment Creation and Status Check Flow', () => {
    let userToken: string;
    let createdPaymentId: string;

    beforeEach(async () => {
      // Login and get token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'payer@example.com',
          password: 'PayerPassword123!',
        });

      if (loginResponse.status === 200) {
        userToken = loginResponse.body.accessToken;
      } else {
        // Register if user doesn't exist
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: 'payer@example.com',
            password: 'PayerPassword123!',
            name: 'Payer User',
          });

        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'payer@example.com',
            password: 'PayerPassword123!',
          });

        userToken = response.body.accessToken;
      }
    });

    it('should complete payment workflow', async () => {
      // Step 1: Create a new payment
      const paymentData = {
        amount: 99.99,
        currency: 'USD',
        paymentMethod: 'stripe',
        description: 'Constitution App Premium Subscription',
        receiptEmail: 'payer@example.com',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${userToken}`)
        .send(paymentData)
        .expect(201);

      expect(createResponse.body).toHaveProperty('id');
      expect(createResponse.body.amount).toBe(paymentData.amount);
      expect(createResponse.body.currency).toBe(paymentData.currency);
      expect(createResponse.body.status).toBeDefined();

      createdPaymentId = createResponse.body.id;

      // Step 2: Check payment status
      const statusResponse = await request(app.getHttpServer())
        .get(`/payments/${createdPaymentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(statusResponse.body.id).toBe(createdPaymentId);
      expect(statusResponse.body.status).toBeDefined();

      // Step 3: Monitor payment status changes
      // In a real scenario, this might poll or use webhooks
      for (let i = 0; i < 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

        const checkResponse = await request(app.getHttpServer())
          .get(`/payments/${createdPaymentId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        // Stop if payment is completed or failed
        if (['completed', 'failed'].includes(checkResponse.body.status)) {
          break;
        }
      }

      // Step 4: Get user's payment history
      const historyResponse = await request(app.getHttpServer())
        .get('/payments/user/my-payments')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(historyResponse.body)).toBe(true);
      expect(historyResponse.body.length).toBeGreaterThan(0);

      // Step 5: Verify payment appears in history
      const userPayment = historyResponse.body.find(
        (p: any) => p.id === createdPaymentId,
      );
      expect(userPayment).toBeDefined();
    });

    it('should handle payment errors gracefully', async () => {
      // Step 1: Attempt to create payment with invalid data
      const invalidPaymentData = {
        amount: -100, // Invalid amount
        currency: 'USD',
        paymentMethod: 'stripe',
      };

      await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidPaymentData)
        .expect(400);

      // Step 2: Try to access non-existent payment
      await request(app.getHttpServer())
        .get('/payments/non-existent-payment-id')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      // Step 3: Try to access payment without authentication
      if (createdPaymentId) {
        await request(app.getHttpServer())
          .get(`/payments/${createdPaymentId}`)
          .expect(401);
      }
    });
  });

  describe('Combined User Workflow', () => {
    let userToken: string;

    it('should complete full user journey', async () => {
      // Step 1: User registration and authentication
      const userData = {
        email: 'fulljourney@example.com',
        password: 'FullJourneyPassword123!',
        name: 'Full Journey User',
      };

      // Register
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(201);

      // Login
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(200);

      userToken = loginResponse.body.accessToken;

      // Step 2: User explores constitution principles
      const principlesResponse = await request(app.getHttpServer())
        .get('/principles')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(principlesResponse.body.data.length).toBeGreaterThan(0);

      // Step 3: User searches for specific topics
      const searchResponse = await request(app.getHttpServer())
        .get('/items?query=performance&category=performance')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Step 4: User views principle details
      if (principlesResponse.body.data.length > 0) {
        const principle = principlesResponse.body.data[0];
        await request(app.getHttpServer())
          .get(`/principles/${principle.slug}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);
      }

      // Step 5: User makes a payment
      const paymentData = {
        amount: 49.99,
        currency: 'USD',
        paymentMethod: 'stripe',
        description: 'Constitution App Standard Plan',
        receiptEmail: userData.email,
      };

      const paymentResponse = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${userToken}`)
        .send(paymentData)
        .expect(201);

      expect(paymentResponse.body.id).toBeDefined();

      // Step 6: User checks payment status
      await request(app.getHttpServer())
        .get(`/payments/${paymentResponse.body.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Step 7: User refreshes their token
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: loginResponse.body.refreshToken,
        })
        .expect(200);

      // Step 8: User continues with new token
      await request(app.getHttpServer())
        .get('/profile')
        .set('Authorization', `Bearer ${refreshResponse.body.accessToken}`)
        .expect(200);

      // Step 9: User logs out
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${refreshResponse.body.accessToken}`)
        .send({
          refreshToken: refreshResponse.body.refreshToken,
        })
        .expect(200);
    });
  });
});
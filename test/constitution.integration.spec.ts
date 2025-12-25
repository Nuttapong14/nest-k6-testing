import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../src/auth/entities/user.entity';
import { Role } from '../src/auth/entities/role.entity';
import { UserRole } from '../src/auth/entities/user-role.entity';
import { Principle } from '../src/constitution/entities/principle.entity';
import { ConfigService } from '@nestjs/config';

describe('Constitution Endpoints (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let principleRepository: Repository<Principle>;

  const testUser = {
    email: 'test@example.com',
    password: 'TestPassword123!',
    name: 'Test User',
  };

  const testAdmin = {
    email: 'admin@example.com',
    password: 'AdminPassword123!',
    name: 'Admin User',
  };

  let userAccessToken: string;
  let adminAccessToken: string;
  let testPrinciple: Principle;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
    principleRepository = moduleFixture.get<Repository<Principle>>(
      getRepositoryToken(Principle),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up database
    await principleRepository.delete({});
    await userRepository.delete({});

    // Create test users
    const userRole = {
      name: 'user',
      description: 'Regular user',
      permissions: ['read:principles'],
    };
    const adminRole = {
      name: 'admin',
      description: 'Administrator',
      permissions: ['read:principles', 'write:principles', 'delete:principles'],
    };

    // Create test principle
    testPrinciple = principleRepository.create({
      slug: 'test-principle',
      title: 'Test Principle',
      description: 'This is a test principle for testing purposes',
      priority: 1,
      metadata: {
        category: 'testing',
        tags: ['test', 'e2e'],
        relatedPrinciples: [],
        examples: [],
      },
      isActive: true,
    });
    await principleRepository.save(testPrinciple);
  });

  describe('Authentication Setup', () => {
    it('should setup authenticated users', async () => {
      // Create regular user
      const userResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'user@example.com',
          password: 'UserPassword123!',
        });

      if (userResponse.status === 200) {
        userAccessToken = userResponse.body.accessToken;
      } else {
        // Create user if doesn't exist
        await request(app.getHttpServer()).post('/auth/register').send({
          email: 'user@example.com',
          password: 'UserPassword123!',
          name: 'Test User',
        });

        const loginResponse = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'user@example.com',
            password: 'UserPassword123!',
          });

        userAccessToken = loginResponse.body.accessToken;
      }

      // Create admin user
      const adminResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'AdminPassword123!',
        });

      if (adminResponse.status === 200) {
        adminAccessToken = adminResponse.body.accessToken;
      } else {
        // Create admin if doesn't exist
        await request(app.getHttpServer()).post('/auth/register').send({
          email: 'admin@example.com',
          password: 'AdminPassword123!',
          name: 'Admin User',
        });

        const loginResponse = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'admin@example.com',
            password: 'AdminPassword123!',
          });

        adminAccessToken = loginResponse.body.accessToken;
      }

      expect(userAccessToken).toBeDefined();
      expect(adminAccessToken).toBeDefined();
    });
  });

  describe('GET /principles', () => {
    it('should return paginated principles', async () => {
      const response = await request(app.getHttpServer())
        .get('/principles')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta).toHaveProperty('page');
      expect(response.body.meta).toHaveProperty('limit');
    });

    it('should filter by search query', async () => {
      const response = await request(app.getHttpServer())
        .get('/principles?search=test')
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((principle: any) => {
        expect(
          principle.title.toLowerCase().includes('test') ||
            principle.description.toLowerCase().includes('test'),
        ).toBe(true);
      });
    });

    it('should filter by category', async () => {
      const response = await request(app.getHttpServer())
        .get('/principles?category=testing')
        .expect(200);

      response.body.data.forEach((principle: any) => {
        expect(principle.metadata.category).toBe('testing');
      });
    });

    it('should filter by tags', async () => {
      const response = await request(app.getHttpServer())
        .get('/principles?tags=test,e2e')
        .expect(200);

      response.body.data.forEach((principle: any) => {
        expect(principle.metadata.tags).toContain('test');
      });
    });

    it('should sort by priority', async () => {
      // Create additional principles with different priorities
      await principleRepository.save([
        {
          slug: 'high-priority',
          title: 'High Priority Principle',
          description: 'High priority test',
          priority: 1,
          metadata: {
            category: 'test',
            tags: [],
            relatedPrinciples: [],
            examples: [],
          },
          isActive: true,
        },
        {
          slug: 'low-priority',
          title: 'Low Priority Principle',
          description: 'Low priority test',
          priority: 5,
          metadata: {
            category: 'test',
            tags: [],
            relatedPrinciples: [],
            examples: [],
          },
          isActive: true,
        },
      ]);

      const response = await request(app.getHttpServer())
        .get('/principles?sortBy=priority&sortOrder=asc')
        .expect(200);

      const priorities = response.body.data.map((p: any) => p.priority);
      const sortedPriorities = [...priorities].sort((a, b) => a - b);
      expect(priorities).toEqual(sortedPriorities);
    });

    it('should paginate correctly', async () => {
      const response = await request(app.getHttpServer())
        .get('/principles?page=1&limit=2')
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(2);
      expect(response.body.meta.hasNextPage).toBe(response.body.meta.total > 2);
    });
  });

  describe('GET /principles/:slug', () => {
    it('should return principle by slug', async () => {
      const response = await request(app.getHttpServer())
        .get(`/principles/${testPrinciple.slug}`)
        .expect(200);

      expect(response.body.id).toBe(testPrinciple.id);
      expect(response.body.slug).toBe(testPrinciple.slug);
      expect(response.body.title).toBe(testPrinciple.title);
    });

    it('should return 404 for non-existent principle', async () => {
      await request(app.getHttpServer())
        .get('/principles/non-existent')
        .expect(404);
    });
  });

  describe('GET /principles/:slug/related', () => {
    it('should return related principles', async () => {
      // Create related principle
      const relatedPrinciple = principleRepository.create({
        slug: 'related-principle',
        title: 'Related Principle',
        description: 'Related to test principle',
        priority: 2,
        metadata: {
          category: 'test',
          tags: ['related'],
          relatedPrinciples: [testPrinciple.id],
          examples: [],
        },
        isActive: true,
      });
      await principleRepository.save(relatedPrinciple);

      // Update test principle to reference related
      await principleRepository.update(testPrinciple.id, {
        metadata: {
          ...testPrinciple.metadata,
          relatedPrinciples: [relatedPrinciple.id],
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/principles/${testPrinciple.slug}/related`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('id');
        expect(response.body[0]).toHaveProperty('title');
      }
    });
  });

  describe('POST /principles (Admin only)', () => {
    const newPrinciple = {
      slug: 'new-test-principle',
      title: 'New Test Principle',
      description: 'A new test principle created via API',
      priority: 3,
      metadata: {
        category: 'test',
        tags: ['new', 'test'],
        relatedPrinciples: [],
        examples: [],
      },
    };

    it('should create principle with admin token', async () => {
      if (!adminAccessToken) {
        console.warn('Skipping admin test - no admin token available');
        return;
      }

      const response = await request(app.getHttpServer())
        .post('/principles')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(newPrinciple)
        .expect(201);

      expect(response.body.slug).toBe(newPrinciple.slug);
      expect(response.body.title).toBe(newPrinciple.title);
      expect(response.body.description).toBe(newPrinciple.description);
      expect(response.body.priority).toBe(newPrinciple.priority);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/principles')
        .send(newPrinciple)
        .expect(401);
    });

    it('should return 403 with user token', async () => {
      if (!userAccessToken) {
        console.warn('Skipping user test - no user token available');
        return;
      }

      await request(app.getHttpServer())
        .post('/principles')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send(newPrinciple)
        .expect(403);
    });

    it('should validate input fields', async () => {
      if (!adminAccessToken) {
        return;
      }

      await request(app.getHttpServer())
        .post('/principles')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          // Missing required fields
          slug: 'incomplete',
        })
        .expect(400);
    });

    it('should prevent duplicate slugs', async () => {
      if (!adminAccessToken) {
        return;
      }

      await request(app.getHttpServer())
        .post('/principles')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          ...newPrinciple,
          slug: testPrinciple.slug, // Duplicate slug
        })
        .expect(400);
    });
  });

  describe('PUT /principles/:id (Admin only)', () => {
    const updateData = {
      title: 'Updated Test Principle',
      description: 'Updated description',
      priority: 2,
    };

    it('should update principle with admin token', async () => {
      if (!adminAccessToken) {
        console.warn('Skipping admin test - no admin token available');
        return;
      }

      const response = await request(app.getHttpServer())
        .put(`/principles/${testPrinciple.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.title).toBe(updateData.title);
      expect(response.body.description).toBe(updateData.description);
      expect(response.body.priority).toBe(updateData.priority);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .put(`/principles/${testPrinciple.id}`)
        .send(updateData)
        .expect(401);
    });

    it('should return 403 with user token', async () => {
      if (!userAccessToken) {
        console.warn('Skipping user test - no user token available');
        return;
      }

      await request(app.getHttpServer())
        .put(`/principles/${testPrinciple.id}`)
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send(updateData)
        .expect(403);
    });
  });

  describe('DELETE /principles/:id (Admin only)', () => {
    it('should soft delete principle with admin token', async () => {
      if (!adminAccessToken) {
        console.warn('Skipping admin test - no admin token available');
        return;
      }

      // Create a principle to delete
      const principleToDelete = principleRepository.create({
        slug: 'delete-me',
        title: 'Delete Me',
        description: 'This principle will be deleted',
        priority: 5,
        metadata: {
          category: 'test',
          tags: [],
          relatedPrinciples: [],
          examples: [],
        },
        isActive: true,
      });
      const saved = await principleRepository.save(principleToDelete);

      await request(app.getHttpServer())
        .delete(`/principles/${saved.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(204);

      // Verify it's soft deleted
      const deleted = await principleRepository.findOne({
        where: { id: saved.id },
      });
      expect(deleted?.isActive).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .delete(`/principles/${testPrinciple.id}`)
        .expect(401);
    });

    it('should return 403 with user token', async () => {
      if (!userAccessToken) {
        console.warn('Skipping user test - no user token available');
        return;
      }

      await request(app.getHttpServer())
        .delete(`/principles/${testPrinciple.id}`)
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(403);
    });
  });
});

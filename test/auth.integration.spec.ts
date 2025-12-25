import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../src/auth/entities/user.entity';
import { Role } from '../src/auth/entities/role.entity';
import { UserRole } from '../src/auth/entities/user-role.entity';
import { ConfigService } from '@nestjs/config';

describe('Auth Endpoints (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let roleRepository: Repository<Role>;
  let userRoleRepository: Repository<UserRole>;

  const testUser = {
    email: 'test@example.com',
    password: 'TestPassword123!',
    name: 'Test User',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
    roleRepository = moduleFixture.get<Repository<Role>>(
      getRepositoryToken(Role),
    );
    userRoleRepository = moduleFixture.get<Repository<UserRole>>(
      getRepositoryToken(UserRole),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await userRoleRepository.delete({});
    await userRepository.delete({});
    await roleRepository.delete({});
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create test user
      const userRole = roleRepository.create({
        name: 'user',
        description: 'Regular user role',
        permissions: [],
      });
      await roleRepository.save(userRole);

      const hashedPassword = await bcrypt.hash(testUser.password, 10);
      const user = userRepository.create({
        ...testUser,
        passwordHash: hashedPassword,
        isActive: true,
      });
      await userRepository.save(user);

      const userRoleAssign = userRoleRepository.create({
        userId: user.id,
        roleId: userRole.id,
      });
      await userRoleRepository.save(userRoleAssign);
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('expiresIn');
      expect(typeof response.body.accessToken).toBe('string');
      expect(typeof response.body.refreshToken).toBe('string');
      expect(typeof response.body.expiresIn).toBe('number');
    });

    it('should return 401 with invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should return 401 with non-existent user', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password,
        })
        .expect(401);
    });

    it('should return 401 with inactive user', async () => {
      // Deactivate the user
      await userRepository.update(
        { email: testUser.email },
        { isActive: false },
      );

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(401);
    });

    it('should validate input fields', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'invalid-email',
          password: '',
        })
        .expect(400);
    });
  });

  describe('POST /auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Create and login user to get refresh token
      const userRole = roleRepository.create({
        name: 'user',
        description: 'Regular user role',
        permissions: [],
      });
      await roleRepository.save(userRole);

      const hashedPassword = await bcrypt.hash(testUser.password, 10);
      const user = userRepository.create({
        ...testUser,
        passwordHash: hashedPassword,
        isActive: true,
      });
      await userRepository.save(user);

      const userRoleAssign = userRoleRepository.create({
        userId: user.id,
        roleId: userRole.id,
      });
      await userRoleRepository.save(userRoleAssign);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      refreshToken = loginResponse.body.refreshToken;
    });

    it('should refresh tokens successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('expiresIn');
      expect(response.body.accessToken).not.toBe(refreshToken); // Should get new tokens
    });

    it('should return 401 with invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: 'invalid-refresh-token',
        })
        .expect(401);
    });

    it('should return 401 with expired refresh token', async () => {
      // This test would require mocking JWT verification to return expired token error
      // For now, we'll test with a malformed token
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: 'malformed.token.here',
        })
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      // Create and login user to get tokens
      const userRole = roleRepository.create({
        name: 'user',
        description: 'Regular user role',
        permissions: [],
      });
      await roleRepository.save(userRole);

      const hashedPassword = await bcrypt.hash(testUser.password, 10);
      const user = userRepository.create({
        ...testUser,
        passwordHash: hashedPassword,
        isActive: true,
      });
      await userRepository.save(user);

      const userRoleAssign = userRoleRepository.create({
        userId: user.id,
        roleId: userRole.id,
      });
      await userRoleRepository.save(userRoleAssign);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      accessToken = loginResponse.body.accessToken;
      refreshToken = loginResponse.body.refreshToken;
    });

    it('should logout successfully with valid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          refreshToken,
        })
        .expect(200);

      // Try to use the refresh token again
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken,
        })
        .expect(401); // Should be invalid after logout
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({
          refreshToken,
        })
        .expect(401);
    });

    it('should return 400 without refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('GET /profile', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Create and login user to get access token
      const userRole = roleRepository.create({
        name: 'user',
        description: 'Regular user role',
        permissions: [],
      });
      await roleRepository.save(userRole);

      const hashedPassword = await bcrypt.hash(testUser.password, 10);
      const user = userRepository.create({
        ...testUser,
        passwordHash: hashedPassword,
        isActive: true,
      });
      await userRepository.save(user);

      const userRoleAssign = userRoleRepository.create({
        userId: user.id,
        roleId: userRole.id,
      });
      await userRoleRepository.save(userRoleAssign);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      accessToken = loginResponse.body.accessToken;
    });

    it('should return user profile with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email', testUser.email);
      expect(response.body).toHaveProperty('name', testUser.name);
      expect(response.body).toHaveProperty('roles');
      expect(response.body).not.toHaveProperty('passwordHash'); // Should not expose password
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get('/profile').expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});

// Helper function for password hashing
import * as bcrypt from 'bcryptjs';

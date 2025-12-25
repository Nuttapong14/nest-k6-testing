import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserRole } from './entities/user-role.entity';
import { Role } from './entities/role.entity';
import { Repository } from 'typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { PasswordUtil } from '../common/utils/password.util';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let userRoleRepository: Repository<UserRole>;
  let roleRepository: Repository<Role>;
  let jwtService: JwtService;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    find: jest.fn(),
  };

  const mockUserRoleRepository = {
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockRoleRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(UserRole),
          useValue: mockUserRoleRepository,
        },
        {
          provide: getRepositoryToken(Role),
          useValue: mockRoleRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    userRoleRepository = module.get<Repository<UserRole>>(
      getRepositoryToken(UserRole),
    );
    roleRepository = module.get<Repository<Role>>(getRepositoryToken(Role));
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      const user = {
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        isActive: true,
      };

      mockUserRepository.findOne.mockResolvedValue(user);
      jest.spyOn(PasswordUtil, 'compare').mockResolvedValue(true as never);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toEqual(
        expect.objectContaining({
          id: user.id,
          email: user.email,
          isActive: user.isActive,
        }),
      );
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        relations: ['roles', 'roles.role'],
      });
      expect(PasswordUtil.compare).toHaveBeenCalledWith(
        'password',
        'hashed-password',
      );
    });

    it('should return null when user is not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.validateUser('test@example.com', 'password');
      expect(result).toBeNull();

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        relations: ['roles', 'roles.role'],
      });
    });

    it('should return null when password is incorrect', async () => {
      const user = {
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        isActive: true,
      };

      mockUserRepository.findOne.mockResolvedValue(user);
      jest.spyOn(PasswordUtil, 'compare').mockResolvedValue(false as never);

      const result = await service.validateUser(
        'test@example.com',
        'wrong-password',
      );
      expect(result).toBeNull();

      expect(PasswordUtil.compare).toHaveBeenCalledWith(
        'wrong-password',
        'hashed-password',
      );
    });

    it('should return null when user is inactive', async () => {
      const user = {
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        isActive: false,
      };

      mockUserRepository.findOne.mockResolvedValue(user);
      jest.spyOn(PasswordUtil, 'compare').mockResolvedValue(true as never);

      const result = await service.validateUser('test@example.com', 'password');
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    const user = {
      id: 'user-id',
      email: 'test@example.com',
      name: 'Test User',
      roles: [{ role: { name: 'user' } }],
      isActive: true,
    };

    it('should return access and refresh tokens', async () => {
      mockUserRepository.findOne.mockResolvedValue(user);
      jest.spyOn(PasswordUtil, 'compare').mockResolvedValue(true as never);

      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'jwt.expiresIn') return '15m';
        if (key === 'jwt.refreshExpiresIn') return '7d';
        return null;
      });

      mockJwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const result = await service.login({
        email: 'test@example.com',
        password: 'password',
      });

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: '15m',
      });
    });
  });

  describe('refreshToken', () => {
    it('should return new tokens when refresh token is valid', async () => {
      const payload = {
        sub: 'user-id',
        type: 'refresh',
      };

      const user = {
        id: 'user-id',
        email: 'test@example.com',
        isActive: true,
        roles: [{ role: { name: 'user' } }],
      };

      mockJwtService.verify.mockReturnValue(payload);
      mockUserRepository.findOne.mockResolvedValue(user);

      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'jwt.expiresIn') return '15m';
        if (key === 'jwt.refreshExpiresIn') return '7d';
        return null;
      });

      mockJwtService.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');

      const result = await service.refreshToken({
        refreshToken: 'valid-refresh-token',
      });

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: '15m',
      });

      expect(mockJwtService.verify).toHaveBeenCalledWith(
        'valid-refresh-token',
        expect.any(Object),
      );
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        relations: ['roles', 'roles.role'],
      });
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(
        service.refreshToken({ refreshToken: 'invalid-refresh-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      const payload = {
        sub: 'user-id',
        type: 'refresh',
      };

      mockJwtService.verify.mockReturnValue(payload);
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.refreshToken({ refreshToken: 'valid-refresh-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});

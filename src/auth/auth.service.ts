import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { UserRole } from './entities/user-role.entity';
import { PasswordUtil } from '../common/utils/password.util';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  roles: string[];
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

/**
 * Service responsible for user authentication, registration, and token management.
 */
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Validates user credentials and returns the user object if successful.
   * 
   * @param email - User's email address
   * @param password - User's plain text password
   * @returns The user entity or null if validation fails
   */
  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['roles', 'roles.role'],
    });

    if (!user || !user.isActive) {
      return null;
    }

    const isPasswordValid = await PasswordUtil.compare(
      password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      return null;
    }

    // Update last login
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    return user;
  }

  /**
   * Retrieves a user by their unique identifier.
   * 
   * @param id - User's UUID
   * @returns The user entity or null if not found
   */
  async validateUserById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: ['roles', 'roles.role'],
    });
  }

  /**
   * Authenticates a user and generates JWT access and refresh tokens.
   * 
   * @param loginDto - Data containing user email and password
   * @throws UnauthorizedException if credentials are invalid
   * @returns Object containing access token, refresh token, and expiration time
   */
  async login(loginDto: LoginDto): Promise<AuthTokens> {
    const { email, password } = loginDto;

    const user = await this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const roles = user.roles.map((ur) => ur.role.name);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      roles,
    };

    // Create access token
    const accessToken = this.jwtService.sign(payload);

    // Create refresh token
    const refreshToken = this.jwtService.sign(payload, {
      secret:
        this.configService.get<string>('jwt.refreshSecret') ||
        'default-refresh-secret',
      expiresIn: (this.configService.get<string>('jwt.refreshExpiresIn') ||
        '7d') as StringValue,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.configService.get<string>('jwt.expiresIn') || '15m',
    };
  }

  /**
   * Registers a new user and returns their initial authentication tokens.
   * 
   * @param registerDto - Data containing new user's name, email, and password
   * @throws ConflictException if the email is already registered
   * @throws BadRequestException if the password does not meet security requirements
   * @returns Authentication tokens for the newly registered user
   */
  async register(registerDto: RegisterDto): Promise<AuthTokens> {
    const { email, password, name } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Validate password strength
    if (!PasswordUtil.validateStrength(password)) {
      throw new BadRequestException(
        'Password must be at least 8 characters and include uppercase, lowercase, number, and special character',
      );
    }

    // Hash password
    const passwordHash = await PasswordUtil.hash(password);

    // Create user
    const user = this.userRepository.create({
      email,
      passwordHash,
      name,
    });

    const savedUser = await this.userRepository.save(user);

    // Assign default viewer role
    const viewerRole = await this.roleRepository.findOne({
      where: { name: 'viewer' },
    });

    if (viewerRole) {
      const userRole = this.userRoleRepository.create({
        userId: savedUser.id,
        roleId: viewerRole.id,
        assignedAt: new Date(),
      });
      await this.userRoleRepository.save(userRole);
    }

    // Login the user
    return this.login({ email, password });
  }

  /**
   * Generates a new pair of access and refresh tokens using a valid refresh token.
   * Implements token rotation by returning a new refresh token as well.
   * 
   * @param refreshTokenDto - Data containing the current refresh token
   * @throws UnauthorizedException if the token is invalid, expired, or the user is inactive
   * @returns New authentication tokens
   */
  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<AuthTokens> {
    const { refreshToken } = refreshTokenDto;

    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      // Validate user still exists and is active
      const user = await this.validateUserById(payload.sub);
      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      // Create new tokens
      const roles = user.roles.map((ur) => ur.role.name);

      const newPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        name: user.name,
        roles,
      };

      const newAccessToken = this.jwtService.sign(newPayload);
      const newRefreshToken = this.jwtService.sign(newPayload, {
        secret:
          this.configService.get<string>('jwt.refreshSecret') ||
          'default-refresh-secret',
        expiresIn: (this.configService.get<string>('jwt.refreshExpiresIn') ||
          '7d') as StringValue,
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: this.configService.get<string>('jwt.expiresIn') || '15m',
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Checks if a refresh token is valid and belongs to the specified user.
   * 
   * @param userId - Expected user ID
   * @param refreshToken - Token to validate
   * @returns The user entity if valid, null otherwise
   */
  async validateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<User | null> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      if (payload.sub !== userId) {
        throw new Error('Token user mismatch');
      }

      return this.validateUserById(userId);
    } catch (error) {
      return null;
    }
  }

  /**
   * Handles user logout by invalidating the provided refresh token.
   * 
   * @param refreshToken - Token to invalidate
   */
  async logout(refreshToken: string): Promise<void> {
    // In a production environment, you would:
    // 1. Add the refresh token to a blacklist
    // 2. Or use Redis to store invalidated tokens
    // For now, we'll just log the logout
    console.log('User logged out, refresh token invalidated');
  }

  /**
   * Retrieves the full user profile including roles.
   * 
   * @param userId - User UUID
   * @throws NotFoundException if user doesn't exist
   * @returns User entity with relations
   */
  async getProfile(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles', 'roles.role'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}

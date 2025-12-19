# Developer Onboarding Guide

Welcome to the Constitution Application! This guide will help you get started with development, understand the codebase, and contribute effectively to the project.

## Table of Contents

1. [About the Project](#about-the-project)
2. [Development Philosophy](#development-philosophy)
3. [Principles](#principles)
4. [Getting Started](#getting-started)
5. [Architecture Overview](#architecture-overview)
6. [Development Workflow](#development-workflow)
7. [Code Standards](#code-standards)
8. [Testing](#testing)
9. [Performance](#performance)
10. [Security](#security)
11. [Common Tasks](#common-tasks)
12. [Troubleshooting](#troubleshooting)
13. [Resources](#resources)

## About the Project

The Constitution Application is a modern web application built with Node.js, NestJS, and TypeScript. It provides a platform for managing constitutional principles, performance standards, and governance rules with a focus on scalability, security, and maintainability.

### Key Features

- **Constitution Management**: CRUD operations for constitutional principles
- **Search System**: Full-text search with advanced filtering
- **Performance Monitoring**: Built-in performance standards and metrics
- **User Authentication**: JWT-based authentication with role-based access
- **Payment Processing**: Integration with payment providers
- **Load Testing**: Comprehensive k6 load testing suite

### Technology Stack

- **Backend**: Node.js 20.x, NestJS, TypeScript 5.x
- **Database**: PostgreSQL 14.x with TypeORM
- **Cache**: Redis 7.x
- **Authentication**: JWT with refresh tokens
- **API Documentation**: OpenAPI/Swagger
- **Testing**: Jest, Supertest, k6
- **Containerization**: Docker, Kubernetes

## Development Philosophy

Our development philosophy is guided by the following principles:

1. **Code Quality First**: Write clean, maintainable, and well-documented code
2. **Performance Matters**: Optimize for speed and scalability from the start
3. **Security by Default**: Implement security best practices at every layer
4. **Test Everything**: Comprehensive testing ensures reliability
5. **Documentation Driven**: Document decisions and APIs thoroughly

## Principles

### 1. Simplicity Over Complexity

```typescript
// Good: Simple and clear
async getPrinciple(slug: string): Promise<Principle> {
  return this.principleRepository.findOneBy({ slug });
}

// Avoid: Overly complex
async getPrinciple(slug: string): Promise<Principle> {
  const complexQuery = this.principleRepository
    .createQueryBuilder('p')
    .leftJoinAndSelect('p.tags', 'tags')
    .where('p.slug = :slug', { slug })
    .andWhere('p.isActive = :isActive', { isActive: true })
    .orderBy('p.priority', 'DESC')
    .limit(1);

  return complexQuery.getOne();
}
```

### 2. Explicit Over Implicit

```typescript
// Good: Explicit error handling
try {
  const user = await this.userService.findById(id);
  if (!user) {
    throw new NotFoundException(`User with ID ${id} not found`);
  }
  return user;
} catch (error) {
  this.logger.error(`Failed to fetch user: ${error.message}`);
  throw error;
}

// Avoid: Implicit error handling
const user = await this.userService.findById(id);
return user; // Might return null without clear error
```

### 3. Performance-Conscious Development

```typescript
// Good: Efficient database queries with indexes
const principles = await this.principleRepository.find({
  where: { isActive: true },
  order: { priority: 'DESC' },
  take: 10,
  cache: true // Use cache for frequently accessed data
});

// Good: Batch operations for better performance
await this.principleRepository.save(principles); // Batch insert
```

### 4. Security-First Approach

```typescript
// Good: Input validation and sanitization
@Post()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
async createPrinciple(@Body() createDto: CreatePrincipleDto): Promise<Principle> {
  // DTO ensures validation
  // Sanitize HTML content if needed
  const sanitizedContent = this.sanitizer.sanitize(createDto.description);
  return this.principleRepository.save({ ...createDto, description: sanitizedContent });
}
```

## Getting Started

### 1. Prerequisites

Ensure you have the following installed:

```bash
# Node.js 20.x
node --version  # Should be v20.x.x

# npm 10.x
npm --version  # Should be 10.x.x

# PostgreSQL 14.x
psql --version  # Should be 14.x.x

# Redis 6.x+
redis-server --version

# Docker 20.x+
docker --version
```

### 2. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/your-org/constitution-app.git
cd constitution-app

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start development services (PostgreSQL, Redis)
docker-compose up -d postgres redis

# Run database migrations
npm run migration:run

# Seed development data
npm run seed:dev

# Start development server
npm run start:dev
```

### 3. Verify Setup

```bash
# Check application health
curl http://localhost:3000/api/health

# Access API documentation
open http://localhost:3000/api-docs
```

### 4. Development Environment

Configure your `.env` file:

```bash
# Development configuration
NODE_ENV=development
PORT=3000
API_PREFIX=api

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=dev_user
DB_PASSWORD=dev_password
DB_DATABASE=constitution_dev

# JWT secrets for development
JWT_SECRET=dev-jwt-secret-key
REFRESH_TOKEN_SECRET=dev-refresh-secret-key
```

## Architecture Overview

### Project Structure

```
src/
├── auth/                 # Authentication module
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
│   └── dto/
├── common/              # Shared utilities
│   ├── guards/
│   ├── decorators/
│   ├── filters/
│   └── pipes/
├── constitution/        # Constitution management
│   ├── constitution.controller.ts
│   ├── constitution.service.ts
│   ├── constitution.module.ts
│   └── dto/
├── config/             # Configuration files
│   ├── database.config.ts
│   ├── jwt.config.ts
│   └── redis.config.ts
├── database/           # Database entities
│   ├── entities/
│   └── migrations/
├── payment/            # Payment processing
├── performance/        # Performance standards
├── search/            # Search functionality
└── governance/        # Governance rules
```

### Module Structure

Each module follows NestJS best practices:

```typescript
// Example module structure
@Module({
  imports: [
    TypeOrmModule.forFeature([Principle]),
    AuthModule,
  ],
  controllers: [ConstitutionController],
  providers: [ConstitutionService],
  exports: [ConstitutionService],
})
export class ConstitutionModule {}
```

### Data Flow

1. **Controller Layer**: Handle HTTP requests, validation, and responses
2. **Service Layer**: Business logic, data transformation, and external integrations
3. **Repository Layer**: Database operations and queries
4. **DTO Layer**: Data transfer objects for validation and serialization

## Development Workflow

### 1. Feature Development

```bash
# Create feature branch
git checkout -b feature/new-feature-name

# Make changes
# ...

# Run tests
npm test
npm run test:e2e

# Run linting
npm run lint

# Run load tests for performance impact
npm run test:load:quick

# Commit changes
git add .
git commit -m "feat: add new feature description"

# Push branch
git push origin feature/new-feature-name

# Create pull request
```

### 2. Commit Message Convention

Follow conventional commits:

```
feat: add new feature
fix: resolve authentication issue
docs: update API documentation
style: format code with prettier
refactor: optimize database queries
test: add unit tests for auth service
perf: improve search performance
security: implement input sanitization
```

### 3. Code Review Process

1. **Self-Review**: Review your own code before submitting
2. **Peer Review**: Request review from at least one team member
3. **Automated Checks**: Ensure all CI checks pass
4. **Merge**: Only merge after approval and successful checks

### 4. Branch Strategy

- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/*`: Individual feature branches
- `hotfix/*`: Critical fixes for production

## Code Standards

### 1. TypeScript Guidelines

```typescript
// Use interfaces for type definitions
interface User {
  id: string;
  email: string;
  name: string;
  roles: Role[];
}

// Use proper typing for function parameters and returns
async findById(id: string): Promise<User | null> {
  return this.userRepository.findOneBy({ id });
}

// Use enums for constants
enum Role {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer'
}
```

### 2. NestJS Best Practices

```typescript
// Use decorators for validation
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

// Use proper HTTP status codes
@Post()
@HttpCode(HttpStatus.CREATED)
async create(@Body() createDto: CreateUserDto): Promise<User> {
  return this.userService.create(createDto);
}

// Use dependency injection
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}
}
```

### 3. Database Best Practices

```typescript
// Use repositories for data access
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // Use transactions for multiple operations
  async transferRoles(fromUserId: string, toUserId: string): Promise<void> {
    await this.userRepository.manager.transaction(async (manager) => {
      await manager.update(User, fromUserId, { roles: [] });
      await manager.update(User, toUserId, { /* roles */ });
    });
  }
}
```

### 4. Error Handling

```typescript
// Create custom exceptions
export class PrincipleNotFoundException extends NotFoundException {
  constructor(slug: string) {
    super(`Principle with slug "${slug}" not found`);
  }
}

// Use filters for global error handling
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      message: exception instanceof HttpException
        ? exception.message
        : 'Internal server error',
    });
  }
}
```

## Testing

### 1. Unit Tests

```typescript
// Example unit test
describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  describe('validateUser', () => {
    it('should return user if credentials are valid', async () => {
      const expectedUser = { id: '1', email: 'test@example.com' };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(expectedUser as User);

      const result = await service.validateUser('test@example.com', 'password');
      expect(result).toEqual(expectedUser);
    });
  });
});
```

### 2. Integration Tests

```typescript
// Example integration test
describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  describe('/auth/login (POST)', () => {
    it('should return JWT tokens on successful login', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'password' })
        .expect(200)
        .expect((res) => {
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.refreshToken).toBeDefined();
        });
    });
  });
});
```

### 3. Load Testing

```typescript
// k6 test example
// tests/k6/auth-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<100'], // 95% of requests under 100ms
    http_req_failed: ['rate<0.01'],    // Less than 1% failures
  },
};

export default function() {
  const payload = JSON.stringify({
    email: 'test@example.com',
    password: 'password',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post('http://localhost:3000/api/auth/login', payload, params);

  check(res, {
    'login successful': (r) => r.status === 200,
    'token returned': (r) => r.json('accessToken') !== '',
  });

  sleep(1);
}
```

## Performance

### 1. Database Optimization

```typescript
// Use query optimization
const principles = await this.principleRepository
  .createQueryBuilder('principle')
  .leftJoinAndSelect('principle.tags', 'tag')
  .where('principle.isActive = :isActive', { isActive: true })
  .orderBy('principle.priority', 'DESC')
  .limit(10)
  .cache(true) // Enable query caching
  .getMany();

// Use batch operations
async updateMultiplePrinciples(updates: UpdatePrincipleDto[]): Promise<void> {
  await this.principleRepository.manager.transaction(async (manager) => {
    for (const update of updates) {
      await manager.update(Principle, update.id, update);
    }
  });
}
```

### 2. Caching Strategy

```typescript
// Implement Redis caching
@Injectable()
export class PrincipleService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getPrincipleBySlug(slug: string): Promise<Principle> {
    const cacheKey = `principle:${slug}`;

    // Try cache first
    let principle = await this.cacheManager.get<Principle>(cacheKey);

    if (!principle) {
      // Fetch from database
      principle = await this.principleRepository.findOneBy({ slug });

      // Cache for 1 hour
      if (principle) {
        await this.cacheManager.set(cacheKey, principle, 3600);
      }
    }

    return principle;
  }
}
```

### 3. Response Optimization

```typescript
// Use pagination for large datasets
@Get()
async getPrinciples(
  @Query() query: GetPrinciplesDto,
): Promise<PaginatedResponse<Principle>> {
  const { page = 1, limit = 10 } = query;
  const skip = (page - 1) * limit;

  const [data, total] = await this.principleRepository.findAndCount({
    skip,
    take: limit,
    order: { priority: 'DESC' },
  });

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// Use compression for large responses
import * as compression from 'compression';

// In main.ts
app.use(compression());
```

## Security

### 1. Input Validation

```typescript
// Use class-validator for input validation
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsEnum
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
  })
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
```

### 2. Authentication and Authorization

```typescript
// Implement JWT authentication
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}

// Role-based authorization
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
```

### 3. Security Headers

```typescript
// Implement security middleware
import helmet from 'helmet';

// In main.ts
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// Implement rate limiting
import * as rateLimit from 'express-rate-limit';

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP',
  }),
);
```

## Common Tasks

### 1. Adding a New Endpoint

```typescript
// 1. Create DTO
export class CreateAmendmentDto {
  @IsString()
  @MinLength(10)
  title: string;

  @IsString()
  @MinLength(50)
  description: string;

  @IsUUID()
  principleId: string;
}

// 2. Add service method
async createAmendment(createDto: CreateAmendmentDto): Promise<Amendment> {
  const amendment = this.amendmentRepository.create(createDto);
  return this.amendmentRepository.save(amendment);
}

// 3. Add controller endpoint
@Post()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
@ApiOperation({ summary: 'Create amendment' })
async create(@Body() createDto: CreateAmendmentDto): Promise<Amendment> {
  return this.amendmentService.create(createDto);
}
```

### 2. Database Migration

```bash
# Generate migration
npm run migration:generate -- AddNewFieldToPrinciple

# Run migration
npm run migration:run

# Revert migration
npm run migration:revert
```

### 3. Adding Tests

```bash
# Generate unit test
npm run test:unit -- --generateFile src/amendment/amendment.service.spec.ts

# Run specific test
npm test -- amendment.service.spec.ts

# Run with coverage
npm run test:cov
```

### 4. Performance Profiling

```typescript
// Add performance monitoring
import { PerformanceInterceptor } from './common/interceptors/performance.interceptor';

// Apply to controller
@UseInterceptors(PerformanceInterceptor)
export class PrincipleController {}

// Custom performance logging
@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();
    const method = context.getHandler().name;
    const url = context.switchToHttp().getRequest().url;

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        console.log(`${method} ${url} took ${duration}ms`);
      }),
    );
  }
}
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Check database status
   docker ps | grep postgres

   # Check logs
   docker logs <postgres-container-id>

   # Test connection
   npm run db:test
   ```

2. **JWT Token Issues**
   ```bash
   # Verify JWT secret is set
   echo $JWT_SECRET

   # Test token generation
   npm run test:auth
   ```

3. **Performance Issues**
   ```bash
   # Run load tests
   npm run test:load:quick

   # Check database queries
   npm run debug:queries
   ```

### Debug Mode

```bash
# Enable debug logging
DEBUG=* npm run start:dev

# Specific debug modules
DEBUG=app:*,database:* npm run start:dev
```

## Resources

### Documentation

- [API Documentation](./API.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Architecture Overview](./ARCHITECTURE.md)
- [NestJS Documentation](https://docs.nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

### Tools

- [Postman Collection](./tools/postman-collection.json)
- [Database Schema](./docs/database-schema.md)
- [Performance Benchmarks](./docs/performance-benchmarks.md)

### Communication

- **Slack**: #constitution-app-dev
- **Email**: dev-team@constitution-app.com
- **Standups**: Daily at 9:00 AM UTC
- **Sprint Planning**: Every 2 weeks on Monday

### Code Reviews

- All code changes require review
- Use PR templates for consistency
- Automated checks must pass
- Performance impact must be considered

---

Happy coding! If you have any questions or need help, don't hesitate to reach out to the team.
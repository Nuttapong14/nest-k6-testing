import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS configuration
  const corsOrigins = configService
    .get<string>('CORS_ORIGIN')
    ?.split(',')
    .map((origin) => origin.trim()) || ['http://localhost:3000'];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // API prefix
  const apiPrefix = configService.get<string>('API_PREFIX', 'api');
  app.setGlobalPrefix(apiPrefix);

  // Swagger documentation
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Constitution Application API')
      .setDescription(
        `## Constitution Management Application API

        This API provides endpoints for managing constitutional principles,
        performance standards, user authentication, and payment processing.

        ### Authentication
        Most endpoints require JWT authentication. Include the access token
        in the Authorization header:
        \`Authorization: Bearer <access-token>\`

        ### Rate Limiting
        - Auth endpoints: 5 requests per minute
        - Other endpoints: 100 requests per minute

        ### Performance Targets
        - Authentication: <100ms (p95)
        - Search: <150ms (p95)
        - Payments: <200ms (p95)`,
      )
      .setVersion('1.0.0')
      .setContact('Constitution App Support', '', 'support@constitution-app.com')
      .setLicense('MIT', 'https://opensource.org/licenses/MIT')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('Authentication', 'User authentication and token management')
      .addTag('Constitution', 'Constitutional principles management')
      .addTag('Performance', 'Performance standards and metrics')
      .addTag('Governance', 'Governance rules and compliance')
      .addTag('Search', 'Full-text search functionality')
      .addTag('Payments', 'Payment processing and status tracking')
      .addTag('Health', 'Application health and monitoring')
      .addServer(
        `http://localhost:${port}`,
        'Development server',
      )
      .addServer('https://api.constitution-app.com', 'Production server')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document, {
      customSiteTitle: 'Constitution App API Documentation',
      customfavIcon: '/favicon.ico',
      customCss: `
        .topbar-wrapper img { content: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSIjNEY0NkU1Ii8+CjxwYXRoIGQ9Ik04IDEwSDI0VjIySDEwVjEwWiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTEwIDE0SDIyVjE4SDEwVjE0WiIgZmlsbD0iIzRGNDZFNSIvPgo8L3N2Zz4K'); }
        .swagger-ui .topbar { background-color: #4F46E5; }
        .swagger-ui .topbar-wrapper .link { color: white; }
      `,
    });
  }

  await app.listen(port);

  console.log(`
    🚀 Constitution Application is running!
    📍 Port: ${port}
    📚 API Documentation: http://localhost:${port}/api-docs
    🌍 Environment: ${process.env.NODE_ENV || 'development'}
  `);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});

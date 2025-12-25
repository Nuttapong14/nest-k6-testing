import { Controller, Get, Inject } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from '../services/health.service';
import { Public } from '../decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
@Public() // Health endpoints should be public
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private db: TypeOrmHealthIndicator,
    private healthService: HealthService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Check application health' })
  @ApiResponse({
    status: 200,
    description: 'Application is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        info: { type: 'object' },
        error: { type: 'object' },
        details: { type: 'object' },
      },
    },
  })
  async check() {
    return this.health.check([
      async () =>
        this.http.pingCheck(
          'api',
          process.env.BASE_URL || 'http://localhost:3000',
        ),
      async () => this.db.pingCheck('database'),
    ]);
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Get detailed health status with metrics' })
  @ApiResponse({
    status: 200,
    description: 'Detailed health information',
  })
  async getDetailedHealth() {
    return this.healthService.checkOverallHealth();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Kubernetes readiness probe' })
  @ApiResponse({
    status: 200,
    description: 'Application is ready',
  })
  async readiness() {
    const readiness = await this.healthService.checkReadiness();
    return {
      status: readiness.ready.status,
      details: readiness.ready.info,
    };
  }

  @Get('live')
  @ApiOperation({ summary: 'Kubernetes liveness probe' })
  @ApiResponse({
    status: 200,
    description: 'Application is alive',
  })
  async liveness() {
    const liveness = await this.healthService.checkLiveness();
    return {
      status: liveness.alive.status,
      details: liveness.alive.info,
    };
  }

  @Get('database')
  @ApiOperation({ summary: 'Check database health' })
  @ApiResponse({
    status: 200,
    description: 'Database health status',
  })
  async checkDatabase() {
    return this.healthService.checkDatabase();
  }

  @Get('redis')
  @ApiOperation({ summary: 'Check Redis cache health' })
  @ApiResponse({
    status: 200,
    description: 'Redis health status',
  })
  async checkRedis() {
    return this.healthService.checkRedis();
  }

  @Get('memory')
  @ApiOperation({ summary: 'Check memory usage' })
  @ApiResponse({
    status: 200,
    description: 'Memory usage statistics',
  })
  async checkMemory() {
    return this.healthService.checkMemory();
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get performance metrics' })
  @ApiResponse({
    status: 200,
    description: 'Current performance metrics',
  })
  async getMetrics() {
    return {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      performance: {
        averageResponseTime:
          this.healthService['getAverageResponseTime']?.() || 0,
        requestCount: this.healthService['getRequestCount']?.() || 0,
        errorRate: this.healthService['getErrorRate']?.() || 0,
      },
    };
  }
}

import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HealthIndicatorResult } from '@nestjs/terminus';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HealthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Check database health
   */
  async checkDatabase(): Promise<HealthIndicatorResult> {
    const result: HealthIndicatorResult = {
      database: {
        status: 'down',
        info: {},
      },
    };

    try {
      // Simple query to test database connection
      const queryResult = await this.dataSource.query('SELECT 1 as test');

      if (queryResult && queryResult[0]?.test === 1) {
        // Get detailed database stats
        const stats = await this.getDatabaseStats();

        result.database.status = 'up';
        result.database.info = {
          connected: true,
          host: this.configService.get('DB_HOST'),
          database: this.configService.get('DB_DATABASE'),
          totalConnections: stats.totalConnections,
          activeConnections: stats.activeConnections,
          idleConnections: stats.idleConnections,
          maxConnections: this.configService.get('DB_MAX_CONNECTIONS', 100),
          databaseSize: stats.databaseSize,
          lastCheckpoint: stats.lastCheckpoint,
        };
      }
    } catch (error) {
      result.database.info = {
        connected: false,
        error: error.message,
      };
    }

    return result;
  }

  /**
   * Check Redis cache health
   */
  async checkRedis(): Promise<HealthIndicatorResult> {
    const result: HealthIndicatorResult = {
      redis: {
        status: 'down',
        info: {},
      },
    };

    let redis: Redis | null = null;

    try {
      redis = new Redis({
        host: this.configService.get('REDIS_HOST', 'localhost'),
        port: this.configService.get('REDIS_PORT', 6379),
        password: this.configService.get('REDIS_PASSWORD'),
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      });

      // Test Redis connection
      const pong = await redis.ping();

      if (pong === 'PONG') {
        // Get Redis info
        const info = await redis.info('memory');
        const memoryInfo = this.parseRedisInfo(info);

        result.redis.status = 'up';
        result.redis.info = {
          connected: true,
          host: this.configService.get('REDIS_HOST'),
          port: this.configService.get('REDIS_PORT'),
          memoryUsage: memoryInfo.used_memory_human,
          memoryPeak: memoryInfo.used_memory_peak_human,
          keyCount: await redis.dbsize(),
          uptimeInSeconds: memoryInfo.uptime_in_seconds,
        };
      }
    } catch (error) {
      result.redis.info = {
        connected: false,
        error: error.message,
      };
    } finally {
      if (redis) {
        await redis.quit();
      }
    }

    return result;
  }

  /**
   * Check memory usage
   */
  async checkMemory(): Promise<HealthIndicatorResult> {
    const result: HealthIndicatorResult = {
      memory: {
        status: 'up',
        info: {},
      },
    };

    const memUsage = process.memoryUsage();
    const totalMemory = memUsage.heapTotal;
    const usedMemory = memUsage.heapUsed;
    const memoryUtilization = (usedMemory / totalMemory) * 100;

    result.memory.info = {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(totalMemory / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(usedMemory / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
      utilization: `${Math.round(memoryUtilization)}%`,
    };

    // Set status based on memory utilization
    if (memoryUtilization > 90) {
      result.memory.status = 'down';
    } else if (memoryUtilization > 80) {
      result.memory.status = 'down';
      result.memory.info = {
        ...result.memory.info,
        warning: 'Memory utilization is high',
      };
    }

    return result;
  }

  /**
   * Check API response time
   */
  async checkApiResponseTime(): Promise<HealthIndicatorResult> {
    const result: HealthIndicatorResult = {
      apiResponseTime: {
        status: 'up',
        info: {},
      },
    };

    const startTime = Date.now();

    try {
      // Simulate API health check
      const responseTime = Date.now() - startTime;

      result.apiResponseTime.info = {
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
      };

      // Set status based on response time
      if (responseTime > 1000) {
        result.apiResponseTime.status = 'down';
      } else if (responseTime > 500) {
        result.apiResponseTime.status = 'down';
        result.apiResponseTime.info = {
          ...result.apiResponseTime.info,
          warning: 'Response time is slow',
        };
      }
    } catch (error) {
      result.apiResponseTime.status = 'down';
      result.apiResponseTime.info.error = error.message;
    }

    return result;
  }

  /**
   * Get application uptime
   */
  async checkUptime(): Promise<HealthIndicatorResult> {
    const result: HealthIndicatorResult = {
      uptime: {
        status: 'up',
        info: {},
      },
    };

    const uptime = process.uptime();
    const days = Math.floor(uptime / (24 * 60 * 60));
    const hours = Math.floor((uptime % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((uptime % (60 * 60)) / 60);
    const seconds = Math.floor(uptime % 60);

    result.uptime.info = {
      uptimeInSeconds: Math.round(uptime),
      uptimeHuman: `${days}d ${hours}h ${minutes}m ${seconds}s`,
      startTime: new Date(Date.now() - uptime * 1000).toISOString(),
    };

    return result;
  }

  /**
   * Check overall application health
   */
  async checkOverallHealth(): Promise<any> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkMemory(),
      this.checkApiResponseTime(),
      this.checkUptime(),
    ]);

    const results: any = {
      status: 'up',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {},
    };

    let hasDown = false;

    checks.forEach((check, index) => {
      const checkNames = ['database', 'redis', 'memory', 'apiResponseTime', 'uptime'];
      const checkName = checkNames[index];

      if (check.status === 'fulfilled') {
        results.checks[checkName] = check.value;

        const checkStatus = Object.values(check.value)[0]?.status;
        if (checkStatus === 'down') {
          hasDown = true;
        }
      } else {
        results.checks[checkName] = {
          [checkName]: {
            status: 'down',
            info: { error: check.reason?.message || 'Unknown error' },
          },
        };
        hasDown = true;
      }
    });

    // Determine overall status
    if (hasDown) {
      results.status = 'down';
    }

    // Add performance metrics
    results.performance = {
      averageResponseTime: this.getAverageResponseTime(),
      requestCount: this.getRequestCount(),
      errorRate: this.getErrorRate(),
    };

    return results;
  }

  /**
   * Get readiness status (for Kubernetes readiness probe)
   */
  async checkReadiness(): Promise<HealthIndicatorResult> {
    // Check only critical dependencies
    const dbCheck = await this.checkDatabase();

    return {
      ready: {
        status: dbCheck.database?.status === 'up' ? 'up' : 'down',
        info: {
          database: dbCheck.database?.status || 'unknown',
        },
      },
    };
  }

  /**
   * Get liveness status (for Kubernetes liveness probe)
   */
  async checkLiveness(): Promise<HealthIndicatorResult> {
    // Simple check if the application is responsive
    const startTime = Date.now();
    const responseTime = Date.now() - startTime;

    return {
      alive: {
        status: responseTime < 5000 ? 'up' : 'down',
        info: {
          responseTime: `${responseTime}ms`,
        },
      },
    };
  }

  private async getDatabaseStats(): Promise<any> {
    try {
      const stats = await this.dataSource.query(`
        SELECT
          (SELECT COUNT(*) FROM pg_stat_activity WHERE datname = current_database()) as totalConnections,
          (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active' AND datname = current_database()) as activeConnections,
          (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'idle' AND datname = current_database()) as idleConnections,
          pg_size_pretty(pg_database_size(current_database())) as databaseSize,
          pg_last_xact_replay_timestamp() as lastCheckpoint
      `);

      return {
        totalConnections: parseInt(stats[0]?.totalConnections) || 0,
        activeConnections: parseInt(stats[0]?.activeConnections) || 0,
        idleConnections: parseInt(stats[0]?.idleConnections) || 0,
        databaseSize: stats[0]?.databasesize || 'Unknown',
        lastCheckpoint: stats[0]?.lastcheckpoint || null,
      };
    } catch (error) {
      return {
        totalConnections: 0,
        activeConnections: 0,
        idleConnections: 0,
        databaseSize: 'Unknown',
        lastCheckpoint: null,
      };
    }
  }

  private parseRedisInfo(info: string): Record<string, any> {
    const lines = info.split('\r\n');
    const result: Record<string, any> = {};

    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        result[key] = isNaN(Number(value)) ? value : Number(value);
      }
    }

    return result;
  }

  private getAverageResponseTime(): number {
    const metrics = global['performanceMetrics'] || [];
    if (metrics.length === 0) return 0;

    const totalDuration = metrics.reduce(
      (sum: number, m: any) => sum + parseInt(m.duration || 0),
      0
    );

    return Math.round(totalDuration / metrics.length);
  }

  private getRequestCount(): number {
    const metrics = global['performanceMetrics'] || [];
    return metrics.length;
  }

  private getErrorRate(): number {
    const metrics = global['performanceMetrics'] || [];
    if (metrics.length === 0) return 0;

    const errorCount = metrics.filter((m: any) => m.statusCode >= 400).length;
    return Math.round((errorCount / metrics.length) * 100);
  }
}
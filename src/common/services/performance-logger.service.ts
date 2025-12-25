import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

interface RequestMetadata {
  method: string;
  url: string;
  userAgent?: string;
  ip?: string;
  startTime: number;
}

interface PoolStats {
  total: number;
  active: number;
  idle: number;
  waiting: number;
}

interface PerformanceLogEntry {
  correlationId?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: string;
  timestamp?: string;
  [key: string]: unknown;
}

@Injectable()
export class PerformanceLoggerService {
  private readonly logger = new Logger(PerformanceLoggerService.name);
  private readonly requestMetrics = new Map<string, RequestMetadata>();

  logRequestStart(request: Request): string {
    const correlationId =
      (request.headers['x-correlation-id'] as string) || uuidv4();
    const startTime = Date.now();

    // Store request metadata
    this.requestMetrics.set(correlationId, {
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      startTime,
    });

    // Add correlation ID to request for use in other parts of the application
    request['correlationId'] = correlationId;

    this.logger.verbose(
      `Request started: ${request.method} ${request.url} [${correlationId}]`,
    );

    return correlationId;
  }

  logRequestEnd(
    request: Request,
    response: Response,
    correlationId: string,
  ): void {
    const metrics = this.requestMetrics.get(correlationId);
    if (!metrics) return;

    const duration = Date.now() - metrics.startTime;
    const memoryUsage = process.memoryUsage();

    // Log detailed performance metrics
    const logData = {
      correlationId,
      method: metrics.method,
      url: metrics.url,
      statusCode: response.statusCode,
      duration: `${duration}ms`,
      memoryUsage: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      },
      userAgent: metrics.userAgent,
      ip: metrics.ip,
    };

    // Log based on duration and status code
    if (duration > 1000 || response.statusCode >= 500) {
      this.logger.warn(`Slow or failed request detected`, logData);
    } else if (duration > 500) {
      this.logger.log(`Request completed with warning`, logData);
    } else {
      this.logger.verbose(`Request completed successfully`, logData);
    }

    // Store metrics for analysis
    this.storeMetrics(logData);

    // Clean up
    this.requestMetrics.delete(correlationId);
  }

  private storeMetrics(metrics: PerformanceLogEntry): void {
    const storedMetrics = (global as any).performanceMetrics || [];
    storedMetrics.push({
      ...metrics,
      timestamp: new Date().toISOString(),
    });

    if (storedMetrics.length > 1000) {
      storedMetrics.shift();
    }

    (global as any).performanceMetrics = storedMetrics;
  }

  getMetrics(limit = 100): PerformanceLogEntry[] {
    const metrics = (global as any).performanceMetrics || [];
    return metrics.slice(-limit);
  }

  getAverageResponseTime(timeWindowMinutes = 5): number {
    const metrics = this.getMetrics();
    const cutoff = Date.now() - timeWindowMinutes * 60 * 1000;

    const recentMetrics = metrics.filter(
      (m) => m.timestamp && new Date(m.timestamp).getTime() > cutoff,
    );

    if (recentMetrics.length === 0) return 0;

    const totalDuration = recentMetrics.reduce(
      (sum, m) => sum + parseInt(m.duration || '0'),
      0,
    );

    return Math.round(totalDuration / recentMetrics.length);
  }

  getErrorRate(timeWindowMinutes = 5): number {
    const metrics = this.getMetrics();
    const cutoff = Date.now() - timeWindowMinutes * 60 * 1000;

    const recentMetrics = metrics.filter(
      (m) => m.timestamp && new Date(m.timestamp).getTime() > cutoff,
    );

    if (recentMetrics.length === 0) return 0;

    const errorCount = recentMetrics.filter(
      (m) => (m.statusCode || 0) >= 400,
    ).length;

    return Math.round((errorCount / recentMetrics.length) * 100);
  }

  logSlowQuery(query: string, duration: number, parameters?: unknown): void {
    const logData = {
      type: 'SLOW_QUERY',
      query: query.substring(0, 500) + (query.length > 500 ? '...' : ''),
      duration: `${duration}ms`,
      parameters: parameters
        ? JSON.stringify(parameters).substring(0, 200)
        : null,
      timestamp: new Date().toISOString(),
    };

    if (duration > 1000) {
      this.logger.error('Very slow query detected', logData);
    } else if (duration > 500) {
      this.logger.warn('Slow query detected', logData);
    } else {
      this.logger.verbose('Query performance', logData);
    }
  }

  logCacheHit(key: string, hit: boolean): void {
    const logData = {
      type: 'CACHE_ACCESS',
      key,
      hit,
      timestamp: new Date().toISOString(),
    };

    this.logger.verbose(`Cache ${hit ? 'HIT' : 'MISS'}: ${key}`, logData);
  }

  logDatabaseConnection(poolStats: PoolStats): void {
    const logData = {
      type: 'DATABASE_POOL',
      totalConnections: poolStats.total,
      activeConnections: poolStats.active,
      idleConnections: poolStats.idle,
      waitingClients: poolStats.waiting,
      timestamp: new Date().toISOString(),
    };

    this.logger.verbose('Database connection pool status', logData);

    // Alert if pool is under stress
    const utilizationRate = (poolStats.active / poolStats.total) * 100;
    if (utilizationRate > 80) {
      this.logger.warn('Database connection pool under high stress', {
        ...logData,
        utilizationRate: `${Math.round(utilizationRate)}%`,
      });
    }
  }

  logMemoryUsage(): void {
    const memoryUsage = process.memoryUsage();
    const logData = {
      type: 'MEMORY_USAGE',
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
      timestamp: new Date().toISOString(),
    };

    this.logger.verbose('Memory usage', logData);

    // Alert if memory usage is high
    const heapUtilization =
      (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    if (heapUtilization > 90) {
      this.logger.warn('High memory usage detected', {
        ...logData,
        heapUtilization: `${Math.round(heapUtilization)}%`,
      });
    }
  }

  logCpuUsage(): void {
    const cpuUsage = process.cpuUsage();
    const logData = {
      type: 'CPU_USAGE',
      user: cpuUsage.user,
      system: cpuUsage.system,
      timestamp: new Date().toISOString(),
    };

    this.logger.verbose('CPU usage', logData);
  }

  logCustomMetric(
    name: string,
    value: number,
    unit = '',
    tags?: unknown,
  ): void {
    const logData = {
      type: 'CUSTOM_METRIC',
      name,
      value,
      unit,
      tags,
      timestamp: new Date().toISOString(),
    };

    this.logger.verbose(`Custom metric: ${name} = ${value}${unit}`, logData);
  }
}

@Injectable()
export class PerformanceLoggerMiddleware implements NestMiddleware {
  constructor(private readonly performanceLogger: PerformanceLoggerService) {}

  use(request: Request, response: Response, next: NextFunction): void {
    const correlationId = this.performanceLogger.logRequestStart(request);

    // Add correlation ID to response headers
    response.setHeader('X-Correlation-ID', correlationId);

    // Listen for response finish
    response.on('finish', () => {
      this.performanceLogger.logRequestEnd(request, response, correlationId);
    });

    next();
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for invalidation
}

@Injectable()
export class CacheService {
  private readonly redis: Redis;
  private readonly logger = new Logger(CacheService.name);
  private readonly defaultTtl = 300; // 5 minutes
  private readonly keyPrefix = 'constitution-app:';

  constructor(private readonly configService: ConfigService) {
    // Initialize Redis client
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    // Handle Redis events
    this.redis.on('connect', () => {
      this.logger.log('Redis connected successfully');
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error', error);
    });

    this.redis.on('reconnecting', () => {
      this.logger.log('Redis reconnecting...');
    });
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const fullKey = this.buildKey(key);
      const value = await this.redis.get(fullKey);

      if (value === null) {
        return null;
      }

      const parsed = JSON.parse(value);
      this.logger.verbose(`Cache HIT: ${key}`);
      return parsed;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}`, error);
      return null;
    }
  }

  /**
   * Set a value in cache
   */
  async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {},
  ): Promise<void> {
    try {
      const fullKey = this.buildKey(key);
      const serialized = JSON.stringify(value);
      const ttl = options.ttl || this.defaultTtl;

      // Store with TTL
      await this.redis.setex(fullKey, ttl, serialized);

      // Store tags for invalidation
      if (options.tags && options.tags.length > 0) {
        await this.addTagsToKey(key, options.tags);
      }

      this.logger.verbose(`Cache SET: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}`, error);
    }
  }

  /**
   * Delete a key from cache
   */
  async del(key: string): Promise<void> {
    try {
      const fullKey = this.buildKey(key);
      await this.redis.del(fullKey);
      this.logger.verbose(`Cache DEL: ${key}`);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}`, error);
    }
  }

  /**
   * Delete multiple keys by tag
   */
  async invalidateByTag(tag: string): Promise<void> {
    try {
      const tagKey = this.buildTagKey(tag);
      const keys = await this.redis.smembers(tagKey);

      if (keys.length > 0) {
        const fullKeys = keys.map((key) => this.buildKey(key));
        await this.redis.del(...fullKeys);
        await this.redis.del(tagKey);
        this.logger.verbose(
          `Cache invalidation by tag: ${tag} (${keys.length} keys)`,
        );
      }
    } catch (error) {
      this.logger.error(`Cache invalidation error for tag ${tag}`, error);
    }
  }

  /**
   * Get or set pattern - returns cached value or sets new one
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {},
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute factory function
    const value = await factory();

    // Set in cache
    await this.set(key, value, options);

    return value;
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      const pattern = this.buildKey('*');
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.log(`Cache cleared: ${keys.length} keys deleted`);
      }
    } catch (error) {
      this.logger.error('Cache clear error', error);
    }
  }

  /**
   * Increment a numeric value
   */
  async increment(key: string, amount = 1): Promise<number> {
    try {
      const fullKey = this.buildKey(key);
      const result = await this.redis.incrby(fullKey, amount);
      this.logger.verbose(`Cache INCR: ${key} by ${amount}`);
      return result;
    } catch (error) {
      this.logger.error(`Cache increment error for key ${key}`, error);
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key);
      const result = await this.redis.exists(fullKey);
      return result === 1;
    } catch (error) {
      this.logger.error(`Cache exists error for key ${key}`, error);
      return false;
    }
  }

  /**
   * Set expiration for existing key
   */
  async expire(key: string, ttl: number): Promise<void> {
    try {
      const fullKey = this.buildKey(key);
      await this.redis.expire(fullKey, ttl);
      this.logger.verbose(`Cache EXPIRE: ${key} in ${ttl}s`);
    } catch (error) {
      this.logger.error(`Cache expire error for key ${key}`, error);
    }
  }

  /**
   * Get remaining TTL for key
   */
  async ttl(key: string): Promise<number> {
    try {
      const fullKey = this.buildKey(key);
      return await this.redis.ttl(fullKey);
    } catch (error) {
      this.logger.error(`Cache TTL error for key ${key}`, error);
      return -1;
    }
  }

  /**
   * Cache warming for frequently accessed data
   */
  async warmUp(): Promise<void> {
    this.logger.log('Starting cache warm-up...');

    try {
      // Warm up principles list
      await this.set('principles:list:page:1', [], {
        ttl: 600,
        tags: ['principles'],
      });

      // Warm up performance standards
      await this.set('performance:standards:list', [], {
        ttl: 600,
        tags: ['performance'],
      });

      // Warm up load test requirements
      await this.set('loadtest:requirements:list', [], {
        ttl: 300,
        tags: ['loadtest'],
      });

      this.logger.log('Cache warm-up completed');
    } catch (error) {
      this.logger.error('Cache warm-up error', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    memory: Record<string, string | number>;
    keyspace: Record<string, string | number>;
  } | null> {
    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');

      return {
        memory: this.parseRedisInfo(info),
        keyspace: this.parseRedisInfo(keyspace),
      };
    } catch (error) {
      this.logger.error('Cache stats error', error);
      return null;
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    await this.redis.quit();
    this.logger.log('Redis connection closed');
  }

  private buildKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  private buildTagKey(tag: string): string {
    return `${this.keyPrefix}tag:${tag}`;
  }

  private async addTagsToKey(key: string, tags: string[]): Promise<void> {
    const pipeline = this.redis.pipeline();

    for (const tag of tags) {
      const tagKey = this.buildTagKey(tag);
      pipeline.sadd(tagKey, key);
      pipeline.expire(tagKey, 86400 * 7); // Tags expire after 7 days
    }

    await pipeline.exec();
  }

  private parseRedisInfo(info: string): Record<string, string | number> {
    const lines = info.split('\r\n');
    const result: Record<string, string | number> = {};

    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        result[key] = isNaN(Number(value)) ? value : Number(value);
      }
    }

    return result;
  }
}

// Cache decorator for methods
export function Cacheable(options: CacheOptions = {}) {
  return function (
    target: object,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;

    descriptor.value = async function (
      this: { cacheService: CacheService },
      ...args: unknown[]
    ) {
      const cacheService: CacheService = this.cacheService;

      // Build cache key
      const key = `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`;

      // Try to get from cache
      const cached = await cacheService.get(key);
      if (cached !== null) {
        return cached;
      }

      // Execute method
      const result = await method.apply(this, args);

      // Cache result
      await cacheService.set(key, result, options);

      return result;
    };
  };
}

// Cache invalidation decorator
export function CacheInvalidator(tags: string[]) {
  return function (
    target: object,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;

    descriptor.value = async function (
      this: { cacheService: CacheService },
      ...args: unknown[]
    ) {
      const cacheService: CacheService = this.cacheService;

      // Execute method
      const result = await method.apply(this, args);

      // Invalidate cache by tags
      for (const tag of tags) {
        await cacheService.invalidateByTag(tag);
      }

      return result;
    };
  };
}

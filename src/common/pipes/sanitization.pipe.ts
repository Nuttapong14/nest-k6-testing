import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import sanitizeHtml from 'sanitize-html';

@Injectable()
export class SanitizationPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata) {
    // Skip sanitization for certain types
    if (
      metadata.type === 'body' &&
      (metadata.metatype === Object || value instanceof Object)
    ) {
      return this.sanitizeObject(value);
    }

    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }

    return value;
  }

  private sanitizeString(value: string): string {
    // Remove any script tags and potentially dangerous content
    return sanitizeHtml(value, {
      allowedTags: [],
      allowedAttributes: {},
      disallowedTagsMode: 'discard',
      textFilter: (text) => {
        // Additional sanitization for XSS
        return text
          .replace(/javascript:/gi, '')
          .replace(/data:/gi, '')
          .replace(/vbscript:/gi, '')
          .replace(/on\w+=/gi, '');
      },
    }).trim();
  }

  private sanitizeObject(obj: unknown): unknown {
    if (Array.isArray(obj)) {
      return obj.map((item: unknown) => this.sanitizeObject(item));
    }

    if (obj !== null && typeof obj === 'object') {
      const sanitized: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(
        obj as Record<string, unknown>,
      )) {
        // Skip private properties
        if (key.startsWith('_')) {
          continue;
        }

        // Sanitize property key as well
        const sanitizedKey = this.sanitizeString(key);

        if (typeof value === 'string') {
          sanitized[sanitizedKey] = this.sanitizeString(value);
        } else if (Array.isArray(value)) {
          sanitized[sanitizedKey] = value.map((item: unknown) =>
            this.sanitizeObject(item),
          );
        } else if (value !== null && typeof value === 'object') {
          sanitized[sanitizedKey] = this.sanitizeObject(value);
        } else {
          sanitized[sanitizedKey] = value;
        }
      }

      return sanitized;
    }

    return obj;
  }
}

// Custom validation decorator to prevent SQL injection
export function NoSqlInjection() {
  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: unknown[]) {
      // Check for SQL injection patterns
      const sqlInjectionPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
        /(\/\*.*\*\/|--)/gi,
        /(\bOR\b.*=.*\bOR\b)/gi,
        /(\bAND\b.*=.*\bAND\b)/gi,
        /(;|\b(DELAY|IF|BENCHMARK)\b)/gi,
        /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|SCRIPT)\s)/gi,
      ];

      for (const arg of args) {
        if (typeof arg === 'string') {
          for (const pattern of sqlInjectionPatterns) {
            if (pattern.test(arg)) {
              throw new BadRequestException('Invalid input detected');
            }
          }
        } else if (typeof arg === 'object' && arg !== null) {
          const jsonStr = JSON.stringify(arg);
          for (const pattern of sqlInjectionPatterns) {
            if (pattern.test(jsonStr)) {
              throw new BadRequestException('Invalid input detected');
            }
          }
        }
      }

      return originalMethod.apply(this, args);
    };
  };
}

// Rate limit decorator for sensitive operations
export function RateLimit(limit: number, windowMs: number) {
  const attempts = new Map<string, { count: number; resetTime: number }>();

  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (
      this: { getRequest?: () => { ip?: string } },
      ...args: unknown[]
    ) {
      // Get client identifier (IP or user ID)
      const clientId = this.getRequest?.()?.ip || 'anonymous';

      // Check rate limit
      const now = Date.now();
      const clientAttempts = attempts.get(clientId);

      if (clientAttempts) {
        if (now > clientAttempts.resetTime) {
          // Reset window
          attempts.set(clientId, {
            count: 1,
            resetTime: now + windowMs,
          });
        } else if (clientAttempts.count >= limit) {
          // Rate limit exceeded
          const resetIn = Math.ceil((clientAttempts.resetTime - now) / 1000);
          throw new BadRequestException(
            `Rate limit exceeded. Try again in ${resetIn} seconds.`,
          );
        } else {
          // Increment counter
          attempts.set(clientId, {
            count: clientAttempts.count + 1,
            resetTime: clientAttempts.resetTime,
          });
        }
      } else {
        // First attempt
        attempts.set(clientId, {
          count: 1,
          resetTime: now + windowMs,
        });
      }

      return originalMethod.apply(this, args);
    };
  };
}

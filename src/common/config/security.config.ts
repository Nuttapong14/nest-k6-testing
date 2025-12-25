import { registerAs } from '@nestjs/config';

export default registerAs('security', () => ({
  // CORS configuration
  cors: {
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Correlation-ID',
    ],
    exposedHeaders: ['X-Correlation-ID'],
    maxAge: 86400, // 24 hours
  },

  // Rate limiting configuration
  rateLimit: {
    // Global rate limit
    global: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // Limit each IP to 1000 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    },
    // Auth endpoints - stricter limits
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // Limit each IP to 5 auth attempts per windowMs
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      message: 'Too many authentication attempts, please try again later.',
    },
    // Search endpoints
    search: {
      windowMs: 60 * 1000, // 1 minute
      max: 100, // Limit each IP to 100 searches per minute
      message: 'Too many search requests, please slow down.',
    },
    // Payment endpoints
    payment: {
      windowMs: 60 * 1000, // 1 minute
      max: 10, // Limit each IP to 10 payment attempts per minute
      message: 'Too many payment attempts, please try again later.',
    },
    // Create/update operations
    write: {
      windowMs: 60 * 1000, // 1 minute
      max: 30, // Limit each IP to 30 write operations per minute
      message: 'Too many write operations, please slow down.',
    },
  },

  // Helmet security headers
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        manifestSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Disabled for compatibility
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
  },

  // JWT configuration
  jwt: {
    accessTokenSecret:
      process.env.JWT_ACCESS_SECRET ||
      'default-access-secret-change-in-production',
    accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshTokenSecret:
      process.env.JWT_REFRESH_SECRET ||
      'default-refresh-secret-change-in-production',
    refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: process.env.JWT_ISSUER || 'constitution-app',
    audience: process.env.JWT_AUDIENCE || 'constitution-app-users',
  },

  // Password security
  password: {
    saltRounds: 12,
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    preventCommonPasswords: true,
  },

  // Session security
  session: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
  },

  // Request validation
  validation: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedFileTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxRequestBodySize: '1mb',
    sanitizeInput: true,
    stripHtml: true,
  },

  // API security
  api: {
    version: 'v1',
    keyRotationInterval: 30 * 24 * 60 * 60 * 1000, // 30 days
    enableApiKeyAuth: process.env.ENABLE_API_KEY_AUTH === 'true',
  },

  // Monitoring and alerts
  monitoring: {
    enableSuspiciousActivityDetection: true,
    suspiciousActivityThreshold: 10, // attempts per minute
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    enableAccountLockout: true,
    maxFailedAttempts: 5,
  },
}));

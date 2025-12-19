/**
 * Constitution API Contracts
 *
 * This file defines TypeScript interfaces for the Constitution API
 * ensuring type safety across frontend and backend implementations.
 */

export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
  pagination?: Pagination;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface HealthCheck {
  status: 'ok' | 'error';
  timestamp: string;
  version: string;
  database: {
    status: 'connected' | 'disconnected';
    responseTime?: number;
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  isActive: boolean;
  lastLoginAt?: string;
  roles: UserRole[];
}

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
}

export interface UserRole {
  id: number;
  user: User;
  role: Role;
  assignedAt: string;
  assignedBy?: string;
}

// Authentication
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

// Constitution Principles
export interface Principle {
  id: string;
  slug: string;
  title: string;
  description: string;
  priority: number;
  metadata: PrincipleMetadata;
  currentVersion: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  performanceStandards?: PerformanceStandard[];
  loadTestRequirements?: LoadTestRequirement[];
  qualityGates?: QualityGate[];
}

export interface CreatePrinciple {
  title: string;
  description: string;
  priority: number;
  metadata?: Partial<PrincipleMetadata>;
}

export interface UpdatePrinciple extends Partial<CreatePrinciple> {
  isActive?: boolean;
}

export interface PrincipleMetadata {
  category: string;
  tags: string[];
  relatedPrinciples: string[];
  examples: Example[];
}

export interface Example {
  type: 'code' | 'diagram' | 'text';
  title: string;
  content: string;
  language?: string;
}

// Performance Standards
export interface PerformanceStandard {
  id: string;
  name: string;
  endpointType: string;
  targetResponseTime: number;
  metricType: '95th_percentile' | 'average' | 'max' | 'min';
  concurrentUsers: number;
  additionalMetrics?: AdditionalMetrics;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePerformanceStandard {
  name: string;
  endpointType: string;
  targetResponseTime: number;
  metricType: '95th_percentile' | 'average' | 'max' | 'min';
  concurrentUsers: number;
  additionalMetrics?: Partial<AdditionalMetrics>;
  description?: string;
}

export interface UpdatePerformanceStandard extends Partial<CreatePerformanceStandard> {
  isActive?: boolean;
}

export interface AdditionalMetrics {
  cpuUsage?: number;
  memoryUsage?: number;
  errorRate?: number;
}

// Load Test Requirements
export interface LoadTestRequirement {
  id: string;
  name: string;
  testType: 'smoke' | 'load' | 'stress' | 'spike';
  endpointPattern: string;
  testParameters: TestParameters;
  expectedRate: number;
  maxResponseTime: number;
  maxErrorRate: number;
  scriptPath?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TestParameters {
  rampUp?: RampUpParameters;
  constantLoad?: ConstantLoadParameters;
  stress?: StressParameters;
}

export interface RampUpParameters {
  from: number;
  to: number;
  duration: string;
}

export interface ConstantLoadParameters {
  users: number;
  duration: string;
}

export interface StressParameters {
  load: string;
  duration: string;
}

// Quality Gates
export interface QualityGate {
  id: string;
  name: string;
  type: 'automated' | 'manual';
  tool?: string;
  requirement: string;
  criteria: QualityGateCriteria;
  isRequired: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQualityGate {
  name: string;
  type: 'automated' | 'manual';
  tool?: string;
  requirement: string;
  criteria: QualityGateCriteria;
  isRequired: boolean;
}

export interface UpdateQualityGate extends Partial<CreateQualityGate> {
  isActive?: boolean;
}

export interface QualityGateCriteria {
  threshold?: number;
  unit?: string;
  conditions?: Condition[];
}

export interface Condition {
  field: string;
  operator: string;
  value: any;
}

// Amendments
export interface Amendment {
  id: string;
  title: string;
  description: string;
  type: 'addition' | 'modification' | 'removal';
  changes: AmendmentChange[];
  status: 'proposed' | 'under_review' | 'approved' | 'rejected' | 'implemented';
  proposedBy: {
    id: string;
    name: string;
  };
  proposedAt: string;
  votingStartsAt?: string;
  votingEndsAt?: string;
  implementedAt?: string;
  migrationPlan?: string;
  votes?: AmendmentVote[];
}

export interface CreateAmendment {
  title: string;
  description: string;
  type: 'addition' | 'modification' | 'removal';
  changes: Omit<AmendmentChange, 'oldValue'>[];
  migrationPlan?: string;
}

export interface UpdateAmendment extends Partial<CreateAmendment> {
  status?: Amendment['status'];
  votingStartsAt?: string;
  votingEndsAt?: string;
}

export interface AmendmentChange {
  entityType: string;
  entityId: string;
  oldValue?: any;
  newValue: any;
  impact: string;
}

export interface AmendmentVote {
  id: number;
  amendment: Amendment;
  voter: {
    id: string;
    name: string;
  };
  vote: 'approve' | 'reject' | 'abstain';
  comment?: string;
  votedAt: string;
}

export interface VoteAmendment {
  vote: 'approve' | 'reject' | 'abstain';
  comment?: string;
}

// Compliance
export interface ComplianceCheck {
  id: string;
  entityType: string;
  entityId: string;
  checkType: string;
  status: 'passed' | 'failed' | 'warning' | 'pending';
  results?: ComplianceResults;
  notes?: string;
  performedBy: {
    id: string;
    name: string;
  };
  performedAt: string;
  issues?: ComplianceIssue[];
}

export interface CreateComplianceCheck {
  entityType: string;
  entityId: string;
  checkType: string;
  status: ComplianceCheck['status'];
  results?: Partial<ComplianceResults>;
  notes?: string;
}

export interface UpdateComplianceCheck extends Partial<CreateComplianceCheck> {
  issues?: ComplianceIssue[];
}

export interface ComplianceResults {
  score?: number;
  issues?: string[];
  metrics?: Record<string, number>;
}

export interface ComplianceIssue {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  remediationSteps?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'ignored';
  assignedTo?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Search
export interface SearchQuery {
  query: string;
  page?: number;
  limit?: number;
  category?: string;
}

export interface SearchResult {
  data: Principle[];
  total: number;
  pagination: Pagination;
}

// Metrics
export interface ApplicationMetrics {
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  requests: {
    total: number;
    rate: number;
  };
  performance: {
    avgResponseTime: number;
    p95ResponseTime: number;
    errorRate: number;
  };
  database: {
    connections: number;
    maxConnections: number;
  };
}

// Error Types
export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
  details?: any;
}

export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  CONFLICT = 'CONFLICT'
}

// Validation Schemas
export const PrincipleValidation = {
  title: {
    required: true,
    minLength: 3,
    maxLength: 200,
    message: 'Title must be between 3 and 200 characters'
  },
  description: {
    required: true,
    minLength: 10,
    maxLength: 5000,
    message: 'Description must be at least 10 characters'
  },
  priority: {
    required: true,
    min: 1,
    max: 5,
    message: 'Priority must be between 1 and 5'
  },
  slug: {
    required: true,
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
    maxLength: 50,
    message: 'Slug must be lowercase, hyphen-separated, max 50 chars'
  }
};

export const PerformanceStandardValidation = {
  targetResponseTime: {
    required: true,
    min: 10,
    max: 10000,
    message: 'Response time must be between 10ms and 10000ms'
  },
  concurrentUsers: {
    required: true,
    min: 1,
    max: 100000,
    message: 'Concurrent users must be between 1 and 100000'
  },
  maxErrorRate: {
    required: true,
    min: 0,
    max: 100,
    message: 'Error rate must be between 0 and 100'
  }
};

// HTTP Status Codes
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503
}

// Permission Constants
export const PERMISSIONS = {
  PRINCIPLES: {
    READ: 'principles:read',
    CREATE: 'principles:create',
    UPDATE: 'principles:update',
    DELETE: 'principles:delete'
  },
  STANDARDS: {
    READ: 'standards:read',
    CREATE: 'standards:create',
    UPDATE: 'standards:update',
    DELETE: 'standards:delete'
  },
  AMENDMENTS: {
    READ: 'amendments:read',
    CREATE: 'amendments:create',
    UPDATE: 'amendments:update',
    DELETE: 'amendments:delete',
    VOTE: 'amendments:vote'
  },
  COMPLIANCE: {
    READ: 'compliance:read',
    CREATE: 'compliance:create',
    UPDATE: 'compliance:update',
    DELETE: 'compliance:delete'
  },
  ADMIN: {
    USERS: 'admin:users',
    SYSTEM: 'admin:system',
    SETTINGS: 'admin:settings'
  }
} as const;

// Role Definitions
export const ROLES = {
  ADMIN: {
    id: 1,
    name: 'admin',
    description: 'Full system access',
    permissions: Object.values(PERMISSIONS).flatMap(Object.values)
  },
  EDITOR: {
    id: 2,
    name: 'editor',
    description: 'Can edit constitution content',
    permissions: [
      ...Object.values(PERMISSIONS.PRINCIPLES).slice(0, 3), // Read, Create, Update
      ...Object.values(PERMISSIONS.STANDARDS).slice(0, 3), // Read, Create, Update
      ...Object.values(PERMISSIONS.AMENDMENTS).slice(0, 2), // Read, Create
      PERMISSIONS.COMPLIANCE.READ,
      PERMISSIONS.COMPLIANCE.CREATE
    ]
  },
  VIEWER: {
    id: 3,
    name: 'viewer',
    description: 'Read-only access',
    permissions: [
      PERMISSIONS.PRINCIPLES.READ,
      PERMISSIONS.STANDARDS.READ,
      PERMISSIONS.AMENDMENTS.READ,
      PERMISSIONS.COMPLIANCE.READ
    ]
  }
} as const;

// Performance Targets
export const PERFORMANCE_TARGETS = {
  AUTHENTICATION: {
    target: 100, // ms
    percentile: 95,
    metric: '95th_percentile'
  },
  CONTENT_RETRIEVAL: {
    target: 150, // ms
    percentile: 95,
    metric: '95th_percentile'
  },
  SEARCH: {
    target: 200, // ms
    percentile: 95,
    metric: '95th_percentile'
  },
  DATABASE: {
    target: 50, // ms
    percentile: 95,
    metric: '95th_percentile'
  },
  CONCURRENT_USERS: 10000,
  ERROR_RATE_THRESHOLD: 0.1 // percentage
} as const;
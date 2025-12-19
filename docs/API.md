# Constitution Application API Documentation

## Overview

This document provides comprehensive information about the Constitution Application API endpoints, authentication, request/response formats, and usage examples.

## Base URL

- **Development**: `http://localhost:3000/api`
- **Production**: `https://api.constitution-app.com/api`

## Authentication

The API uses JWT (JSON Web Token) authentication with the following flow:

1. **Login**: Send credentials to `/auth/login` to receive access and refresh tokens
2. **Access Token**: Include in Authorization header for protected routes: `Authorization: Bearer <access-token>`
3. **Token Refresh**: Use `/auth/refresh` with refresh token to get new access token
4. **Token Expiry**:
   - Access token: 15 minutes
   - Refresh token: 7 days

### Authentication Headers

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

## API Endpoints

### Authentication Endpoints

#### POST /auth/login
Authenticate user with email and password.

**Request Body:**
```json
{
  "email": "admin@constitution-app.com",
  "password": "SecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid credentials
- `429 Too Many Requests`: Rate limit exceeded (5 attempts per minute)

#### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

**Response (201 Created):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

**Error Responses:**
- `400 Bad Request`: Validation errors
- `409 Conflict`: Email already exists
- `429 Too Many Requests`: Rate limit exceeded (3 attempts per minute)

#### POST /auth/refresh
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or expired refresh token

#### POST /auth/logout
Logout user and invalidate refresh token.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

#### GET /auth/profile
Get current user profile information.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200 OK):**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "admin@constitution-app.com",
  "name": "John Doe",
  "avatar": "https://example.com/avatars/john-doe.jpg",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "lastLoginAt": "2024-01-15T12:30:00.000Z",
  "roles": [
    {
      "id": 1,
      "name": "admin",
      "description": "Administrator with full access",
      "assignedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Constitution Endpoints

All constitution endpoints require authentication and appropriate role permissions.

#### GET /principles
Retrieve principles with pagination, filtering, and search.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10, max: 100)
- `search` (string, optional): Search term for title and description
- `category` (string, optional): Filter by category
- `tags` (string[], optional): Filter by tags (comma-separated)
- `isActive` (boolean, optional): Filter by active status
- `sortBy` (string, optional): Sort field (default: priority)
- `sortOrder` (string, optional): Sort direction (ASC or DESC, default: DESC)

**Example Request:**
```http
GET /api/principles?page=1&limit=10&search=governance&category=fundamental&tags=democracy,transparency&isActive=true&sortBy=priority&sortOrder=DESC
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "slug": "democratic-governance",
      "title": "Democratic Governance",
      "description": "All political power derives from the people...",
      "category": "fundamental",
      "priority": 1,
      "metadata": {
        "tags": ["democracy", "governance", "participation"],
        "version": "1.0.0",
        "lastAmended": "2024-01-01"
      },
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "version": 1
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### GET /principles/:slug
Retrieve a single principle by slug.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200 OK):**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "slug": "democratic-governance",
  "title": "Democratic Governance",
  "description": "All political power derives from the people through free and fair elections...",
  "category": "fundamental",
  "priority": 1,
  "metadata": {
    "tags": ["democracy", "governance", "participation"],
    "version": "1.0.0",
    "lastAmended": "2024-01-01",
    "references": [
      {
        "title": "Universal Declaration of Human Rights",
        "url": "https://www.un.org/en/universal-declaration-human-rights/"
      }
    ]
  },
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "version": 1,
  "performanceStandards": [
    {
      "id": 1,
      "endpointType": "GET_PRINCIPLE",
      "targetResponseTime": 100,
      "targetThroughput": 1000,
      "targetAvailability": 99.9
    }
  ]
}
```

**Error Responses:**
- `404 Not Found`: Principle not found

#### POST /principles
Create a new principle (Admin/Editor role required).

**Headers:**
```
Authorization: Bearer <access-token>
```

**Request Body:**
```json
{
  "slug": "transparency-accountability",
  "title": "Transparency and Accountability",
  "description": "Government institutions must operate transparently and be accountable to the people...",
  "category": "governance",
  "priority": 2,
  "metadata": {
    "tags": ["transparency", "accountability", "oversight"],
    "version": "1.0.0"
  }
}
```

**Response (201 Created):**
```json
{
  "id": "456e7890-f12a-34b5-c678-537715289111",
  "slug": "transparency-accountability",
  "title": "Transparency and Accountability",
  "description": "Government institutions must operate transparently...",
  "category": "governance",
  "priority": 2,
  "metadata": {
    "tags": ["transparency", "accountability", "oversight"],
    "version": "1.0.0"
  },
  "isActive": true,
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z",
  "version": 1
}
```

**Error Responses:**
- `400 Bad Request`: Validation errors
- `403 Forbidden`: Insufficient permissions
- `409 Conflict`: Slug already exists

#### PUT /principles/:id
Update an existing principle (Admin/Editor role required).

**Headers:**
```
Authorization: Bearer <access-token>
```

**Request Body:**
```json
{
  "title": "Transparency and Accountability in Governance",
  "description": "All government institutions must operate with full transparency...",
  "priority": 2,
  "metadata": {
    "tags": ["transparency", "accountability", "oversight", "governance"],
    "version": "1.1.0"
  }
}
```

**Response (200 OK):**
```json
{
  "id": "456e7890-f12a-34b5-c678-537715289111",
  "slug": "transparency-accountability",
  "title": "Transparency and Accountability in Governance",
  "description": "All government institutions must operate with full transparency...",
  "category": "governance",
  "priority": 2,
  "metadata": {
    "tags": ["transparency", "accountability", "oversight", "governance"],
    "version": "1.1.0"
  },
  "isActive": true,
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-16T14:30:00.000Z",
  "version": 2
}
```

#### DELETE /principles/:id
Soft delete a principle (Admin role required).

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200 OK):**
```json
{
  "message": "Principle deleted successfully"
}
```

**Error Responses:**
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Principle not found

### Search Endpoints

#### GET /search/items
Full-text search across principles and related content.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Query Parameters:**
- `q` (string, required): Search query
- `type` (string, optional): Content type filter
- `category` (string, optional): Category filter
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10)

**Example Request:**
```http
GET /api/search/items?q=democratic governance&type=principles&category=fundamental&page=1&limit=10
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "type": "principle",
      "title": "Democratic Governance",
      "description": "All political power derives from the people...",
      "slug": "democratic-governance",
      "category": "fundamental",
      "relevanceScore": 0.95,
      "highlights": [
        "All political power derives from the <mark>people</mark> through free and fair elections",
        "The principle of <mark>democratic</mark> participation ensures citizen engagement"
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 15,
    "totalPages": 2
  },
  "facets": {
    "categories": {
      "fundamental": 8,
      "governance": 5,
      "rights": 2
    },
    "types": {
      "principles": 12,
      "amendments": 3
    }
  }
}
```

### Payment Endpoints

#### POST /payments/create
Create a new payment transaction.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Request Body:**
```json
{
  "amount": 99.99,
  "currency": "USD",
  "paymentMethod": "credit_card",
  "description": "Constitution Application Pro Subscription",
  "metadata": {
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "subscriptionType": "pro"
  }
}
```

**Response (201 Created):**
```json
{
  "id": "pay_789xyz012345678",
  "status": "pending",
  "amount": 99.99,
  "currency": "USD",
  "paymentMethod": "credit_card",
  "description": "Constitution Application Pro Subscription",
  "createdAt": "2024-01-15T15:30:00.000Z",
  "expiresAt": "2024-01-15T16:30:00.000Z",
  "paymentUrl": "https://checkout.stripe.com/pay/pay_789xyz..."
}
```

#### GET /payments/status/:id
Check payment status.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200 OK):**
```json
{
  "id": "pay_789xyz012345678",
  "status": "completed",
  "amount": 99.99,
  "currency": "USD",
  "paymentMethod": "credit_card",
  "description": "Constitution Application Pro Subscription",
  "createdAt": "2024-01-15T15:30:00.000Z",
  "completedAt": "2024-01-15T15:32:15.000Z",
  "transactionId": "txn_1234567890abcdef",
  "receiptUrl": "https://stripe.com/receipts/pay_789xyz..."
}
```

### Performance Endpoints

#### GET /performance/standards
Get performance standards for endpoints.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Query Parameters:**
- `endpointType` (string, optional): Filter by endpoint type

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "endpointType": "GET_PRINCIPLE",
      "targetResponseTime": 100,
      "targetThroughput": 1000,
      "targetAvailability": 99.9,
      "description": "Single principle retrieval"
    },
    {
      "id": 2,
      "endpointType": "SEARCH_PRINCIPLES",
      "targetResponseTime": 150,
      "targetThroughput": 500,
      "targetAvailability": 99.5,
      "description": "Full-text search across principles"
    }
  ]
}
```

#### GET /performance/standards/:id
Get specific performance standard.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200 OK):**
```json
{
  "id": 1,
  "endpointType": "GET_PRINCIPLE",
  "targetResponseTime": 100,
  "targetThroughput": 1000,
  "targetAvailability": 99.9,
  "description": "Single principle retrieval",
  "metrics": [
    {
      "date": "2024-01-15",
      "avgResponseTime": 85,
      "throughput": 1200,
      "availability": 99.95
    }
  ]
}
```

### Health Check

#### GET /health
Check application health status.

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T15:30:00.000Z",
  "uptime": 86400,
  "version": "1.0.0",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 15
    },
    "redis": {
      "status": "healthy",
      "responseTime": 5
    }
  }
}
```

## Rate Limiting

The API implements rate limiting to ensure fair usage:

- **Authentication endpoints**: 5 requests per minute per IP
- **Other endpoints**: 100 requests per minute per authenticated user
- **Search endpoints**: 200 requests per minute per authenticated user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1642248600
```

## Error Handling

The API uses standard HTTP status codes and returns error details in JSON format:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "email",
      "message": "Email must be a valid email address"
    }
  ]
}
```

### Common Error Codes

- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict
- `422 Unprocessable Entity`: Validation errors
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## SDK and Client Libraries

### JavaScript/TypeScript Client

```typescript
import { ConstitutionAPI } from '@constitution-app/client';

const api = new ConstitutionAPI({
  baseURL: 'https://api.constitution-app.com/api',
  apiKey: 'your-api-key'
});

// Login
const tokens = await api.auth.login({
  email: 'user@example.com',
  password: 'password'
});

// Set authentication
api.setToken(tokens.accessToken);

// Get principles
const principles = await api.principles.list({
  page: 1,
  limit: 10,
  search: 'governance'
});
```

## Testing

### Load Testing with k6

The application includes k6 load testing scripts in the `/tests/k6` directory:

```bash
# Run authentication load test
npm run test:load:auth

# Run search load test
npm run test:load:search

# Run payment load test
npm run test:load:payment

# Run mixed workload test
npm run test:load:mixed
```

## Support

- **API Documentation**: https://api.constitution-app.com/api-docs
- **Support Email**: support@constitution-app.com
- **Status Page**: https://status.constitution-app.com
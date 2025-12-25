# API Reference

This document provides detailed information about the API endpoints available in the Constitution Application.

## Base URL
The API is available at: `http://localhost:3000` (development)

## Authentication
Most endpoints require authentication using a JWT Bearer token.
To authenticate, use the `/auth/login` endpoint to obtain an `accessToken`.
Include this token in the `Authorization` header of your requests:
`Authorization: Bearer <your_access_token>`

---

## 🔐 Authentication Module

### User Login
`POST /auth/login`
Authenticate user and receive tokens.

**Request Body:**
- `email` (string, required): User email
- `password` (string, required): User password (min 8 chars)

**Response (200 OK):**
```json
{
  "accessToken": "string",
  "refreshToken": "string",
  "expiresIn": "15m"
}
```

### User Registration
`POST /auth/register`
Create a new user account.

**Request Body:**
- `email` (string, required): Valid email
- `password` (string, required): Strong password (8-100 chars)
- `name` (string, required): Full name

### Refresh Token
`POST /auth/refresh`
Get a new access token using a valid refresh token.

**Request Body:**
- `refreshToken` (string, required)

### Get User Profile
`GET /auth/profile`
Retrieve current user details. (Requires Auth)

---

## 📜 Constitution Module (Principles)

### List All Principles
`GET /principles`
Get paginated list of principles with filtering. (Requires Auth)

**Query Parameters:**
- `page` (number): Default 1
- `limit` (number): Default 10
- `search` (string): Search in title and description
- `category` (string): Filter by category
- `tags` (string[]): Filter by tags
- `isActive` (boolean): Filter by status
- `sortBy` (string): `title`, `priority`, `createdAt`, `updatedAt`
- `sortOrder` (string): `asc`, `desc`

### Get Principle by Slug
`GET /principles/:slug`
Retrieve detailed information for a specific principle.

### Get Related Principles
`GET /principles/:slug/related`
Find principles related to the specified principle.

### Create Principle
`POST /principles` (Admin/Editor Only)
Create a new constitution principle.

### Update Principle
`PUT /principles/:id` (Admin/Editor Only)
Update an existing principle.

### Delete Principle
`DELETE /principles/:id` (Admin Only)
Soft delete a principle.

---

## ⚡ Performance Standards Module

### List All Standards
`GET /performance/standards`
Get paginated list of performance standards. (Requires Auth)

### Get Standard by ID
`GET /performance/standards/:id`

### Get Standards by Endpoint Type
`GET /performance/standards/by-endpoint/:endpointType`
Filter standards by `authentication`, `search`, `payment`, etc.

### Get Standards by Principle ID
`GET /performance/standards/principle/:principleId`

### Create/Update/Delete Standard
- `POST /performance/standards` (Admin/Editor Only)
- `PUT /performance/standards/:id` (Admin/Editor Only)
- `DELETE /performance/standards/:id` (Admin Only)

---

## 🔍 Search Module

### Global Search
`GET /items`
Advanced search across principles, standards, gates, and rules. (Requires Auth)

**Query Parameters:**
- `query` (string): Search term
- `type` (enum): `all`, `principles`, `standards`, `gates`, `rules`
- `category` (string): Category filter
- `tags` (string[]): Tag filter
- `minPriority` (number): 1-10
- `maxPriority` (number): 1-10
- `sortBy` (enum): `relevance`, `priority`, `title`, `createdAt`, `updatedAt`
- `sortOrder` (enum): `asc`, `desc`

### Specialized Search
- `GET /items/principles`: Principles only
- `GET /items/standards`: Standards only
- `GET /items/gates`: Quality gates only
- `GET /items/rules`: Governance rules only

---

## 💰 Payments Module

### Create Payment
`POST /payments`
Initiate a new payment transaction. (Requires Auth)

**Request Body:**
- `amount` (number, required): min 0.50
- `currency` (enum): `USD`, `EUR`, `GBP`, `JPY`
- `paymentMethod` (enum): `stripe`, `paypal`, `bank_transfer`, etc.
- `description` (string)
- `metadata` (object)

### Get Payment Status
`GET /payments/:id`
Check the status of a specific payment.

### Process Refund
`POST /payments/:id/refund` (Admin Only)
Refund a completed payment.

### My Payments
`GET /payments/user/my-payments`
Retrieve payment history for the authenticated user.

---

## 🔗 Webhooks

### Stripe Webhook
`POST /webhooks/stripe`
Handle status updates from Stripe. (Requires `stripe-signature` header)

### Generic Webhook
`POST /webhooks/generic`
Handle updates from other providers.

---

## 🏥 Health & System

### App Health
`GET /health`
Basic health status check.

### Detailed Health
`GET /health/detailed`
System metrics, DB status, Redis status, memory, and performance logs.

### Readiness/Liveness
- `GET /health/ready`: Kubernetes readiness check
- `GET /health/live`: Kubernetes liveness check

### Metrics
`GET /health/metrics`
Current system performance metrics (CPU, Memory, Request stats).

---

## ⚖️ Governance (Placeholder)

- `GET /governance/amendments`: List amendments
- `GET /governance/compliance`: List compliance checks
- `POST /governance/amendments`: Propose a new amendment

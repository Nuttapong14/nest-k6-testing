# Constitution Application Deployment Guide

This guide provides comprehensive instructions for deploying the Constitution Application to production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Database Setup](#database-setup)
4. [Docker Deployment](#docker-deployment)
5. [Kubernetes Deployment](#kubernetes-deployment)
6. [CI/CD Pipeline](#cicd-pipeline)
7. [Monitoring and Logging](#monitoring-and-logging)
8. [Security Considerations](#security-considerations)
9. [Performance Optimization](#performance-optimization)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Node.js**: 20.x or higher
- **PostgreSQL**: 14.x or higher
- **Redis**: 6.x or higher (for caching)
- **Docker**: 20.x or higher
- **Kubernetes**: 1.24 or higher (for K8s deployment)
- **Minimum RAM**: 2GB
- **Storage**: 20GB available space

### Required Tools

```bash
# Install Node.js (using nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install kubectl (for Kubernetes)
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
```

## Environment Configuration

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/constitution-app.git
cd constitution-app
```

### 2. Environment Variables

Create environment configuration files:

#### `.env.production`
```bash
# Application
NODE_ENV=production
PORT=3000
API_PREFIX=api
CORS_ORIGIN=https://constitution-app.com,https://app.constitution-app.com

# Database
DB_HOST=your-postgres-host
DB_PORT=5432
DB_USERNAME=constitution_user
DB_PASSWORD=your-secure-password
DB_DATABASE=constitution_prod
DB_SSL=true
DB_CONNECTION_POOL_MAX=100
DB_CONNECTION_POOL_MIN=10

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-256-bits
JWT_EXPIRATION=900
REFRESH_TOKEN_SECRET=your-refresh-token-secret-key
REFRESH_TOKEN_EXPIRATION=604800

# Redis Configuration
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# Payment Provider (Stripe)
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Monitoring
METRICS_ENABLED=true
HEALTH_CHECK_INTERVAL=30000
```

#### `.env.staging`
```bash
# Similar to production but with staging-specific values
NODE_ENV=staging
CORS_ORIGIN=https://staging.constitution-app.com
DB_DATABASE=constitution_staging
STRIPE_SECRET_KEY=sk_test_your-stripe-test-key
```

## Database Setup

### 1. PostgreSQL Installation

#### Using Docker
```bash
docker run -d \
  --name constitution-postgres \
  -e POSTGRES_DB=constitution_prod \
  -e POSTGRES_USER=constitution_user \
  -e POSTGRES_PASSWORD=your-secure-password \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:14-alpine
```

#### Using Managed Service (AWS RDS Example)
```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier constitution-prod \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 14.9 \
  --master-username constitution_user \
  --master-user-password your-secure-password \
  --allocated-storage 100 \
  --storage-type gp2 \
  --vpc-security-group-ids sg-xxxxxxxxx \
  --db-subnet-group-name default
```

### 2. Database Migration

```bash
# Install dependencies
npm install

# Run migrations
npm run migration:run

# Seed initial data
npm run seed:prod
```

### 3. Database Optimization

Create indexes for performance:
```sql
-- Create performance indexes
CREATE INDEX CONCURRENTLY idx_principles_slug ON principles(slug);
CREATE INDEX CONCURRENTLY idx_principles_category ON principles(category);
CREATE INDEX CONCURRENTLY idx_principles_active_priority ON principles(is_active, priority DESC);
CREATE INDEX CONCURRENTLY idx_principles_search ON principles USING gin(to_tsvector('english', title || ' ' || description));

CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_users_active ON users(is_active);

CREATE INDEX CONCURRENTLY idx_performance_standards_endpoint ON performance_standards(endpoint_type);

-- Create partitioned table for audit logs (if needed)
CREATE TABLE audit_logs (
  id SERIAL,
  user_id UUID,
  action VARCHAR(50),
  entity_type VARCHAR(50),
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (created_at);

CREATE TABLE audit_logs_2024_01 PARTITION OF audit_logs
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

## Docker Deployment

### 1. Multi-stage Dockerfile

The application includes a production-ready Dockerfile:

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy production dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "dist/main.js"]
```

### 2. Docker Compose for Production

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: ${DB_DATABASE}
      POSTGRES_USER: ${DB_USERNAME}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 2G

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### 3. Deploy with Docker Compose

```bash
# Deploy production
docker-compose -f docker-compose.prod.yml up -d

# Scale application
docker-compose -f docker-compose.prod.yml up -d --scale app=3

# View logs
docker-compose -f docker-compose.prod.yml logs -f app
```

## Kubernetes Deployment

### 1. Namespace and ConfigMaps

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: constitution-app

---
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: constitution-config
  namespace: constitution-app
data:
  NODE_ENV: "production"
  PORT: "3000"
  API_PREFIX: "api"
  LOG_LEVEL: "info"
  LOG_FORMAT: "json"

---
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: constitution-secrets
  namespace: constitution-app
type: Opaque
data:
  DB_PASSWORD: <base64-encoded-password>
  JWT_SECRET: <base64-encoded-jwt-secret>
  REFRESH_TOKEN_SECRET: <base64-encoded-refresh-secret>
  REDIS_PASSWORD: <base64-encoded-redis-password>
  STRIPE_SECRET_KEY: <base64-encoded-stripe-key>
```

### 2. Application Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: constitution-app
  namespace: constitution-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: constitution-app
  template:
    metadata:
      labels:
        app: constitution-app
    spec:
      containers:
      - name: app
        image: constitution-app:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: constitution-config
        - secretRef:
            name: constitution-secrets
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### 3. Service and Ingress

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: constitution-service
  namespace: constitution-app
spec:
  selector:
    app: constitution-app
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP

---
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: constitution-ingress
  namespace: constitution-app
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  tls:
  - hosts:
    - api.constitution-app.com
    secretName: constitution-tls
  rules:
  - host: api.constitution-app.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: constitution-service
            port:
              number: 80
```

### 4. Deploy to Kubernetes

```bash
# Apply all configurations
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n constitution-app
kubectl get services -n constitution-app
kubectl get ingress -n constitution-app

# View logs
kubectl logs -f deployment/constitution-app -n constitution-app
```

## CI/CD Pipeline

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Run linting
        run: npm run lint

      - name: Run load tests
        run: npm run test:load:quick

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v3

      - name: Log in to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    environment: production

    steps:
      - name: Checkout repository
        uses: actions/checkout@v3

      - name: Setup kubectl
        uses: azure/setup-kubectl@v3
        with:
          version: 'v1.24.0'

      - name: Configure kubectl
        run: |
          echo "${{ secrets.KUBE_CONFIG }}" | base64 -d > kubeconfig
          export KUBECONFIG=kubeconfig

      - name: Deploy to Kubernetes
        run: |
          export KUBECONFIG=kubeconfig
          kubectl set image deployment/constitution-app app=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:main -n constitution-app
          kubectl rollout status deployment/constitution-app -n constitution-app

      - name: Run smoke tests
        run: |
          sleep 30
          npm run test:smoke
```

## Monitoring and Logging

### 1. Prometheus Monitoring

Create monitoring configuration:

```yaml
# k8s/monitoring.yaml
apiVersion: v1
kind: ServiceMonitor
metadata:
  name: constitution-metrics
  namespace: constitution-app
spec:
  selector:
    matchLabels:
      app: constitution-app
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics

---
apiVersion: v1
kind: Service
metadata:
  name: constitution-metrics
  namespace: constitution-app
  labels:
    app: constitution-app
spec:
  selector:
    app: constitution-app
  ports:
  - name: metrics
    port: 9090
    targetPort: 9090
```

### 2. ELK Stack for Logging

```yaml
# k8s/logging.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: filebeat-config
  namespace: constitution-app
data:
  filebeat.yml: |
    filebeat.inputs:
    - type: container
      paths:
        - /var/log/containers/*constitution-app*.log
      processors:
      - add_kubernetes_metadata:
          host: ${NODE_NAME}
          matchers:
          - logs_path:
              logs_path: "/var/log/containers/"

    output.elasticsearch:
      hosts: ["elasticsearch:9200"]
      index: "constitution-app-%{+yyyy.MM.dd}"
```

### 3. Grafana Dashboard

Create custom dashboard for monitoring:
- Response times by endpoint
- Request throughput
- Error rates
- Database performance
- Memory and CPU usage

## Security Considerations

### 1. Network Security

```yaml
# Network policies
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: constitution-netpol
  namespace: constitution-app
spec:
  podSelector:
    matchLabels:
      app: constitution-app
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: database
    ports:
    - protocol: TCP
      port: 5432
```

### 2. Pod Security

```yaml
# Pod security context
securityContext:
  runAsNonRoot: true
  runAsUser: 1001
  fsGroup: 1001
  capabilities:
    drop:
    - ALL
  readOnlyRootFilesystem: true
```

### 3. Secrets Management

Use Kubernetes secrets or external secret management:
- HashiCorp Vault
- AWS Secrets Manager
- Azure Key Vault

## Performance Optimization

### 1. Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: constitution-hpa
  namespace: constitution-app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: constitution-app
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### 2. Database Connection Pooling

Configure TypeORM connection pooling:
```typescript
{
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  extra: {
    max: 100,
    min: 10,
    acquire: 30000,
    idle: 10000
  }
}
```

### 3. Redis Caching

Implement Redis for:
- Session storage
- API response caching
- Database query results
- Rate limiting

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check database connectivity
   kubectl exec -it deployment/constitution-app -n constitution-app -- npm run db:test

   # Check database logs
   kubectl logs -f deployment/postgres -n database
   ```

2. **High Memory Usage**
   ```bash
   # Check pod resources
   kubectl top pods -n constitution-app

   # Describe pod for details
   kubectl describe pod -n constitution-app <pod-name>
   ```

3. **API Latency Issues**
   ```bash
   # Check response times
   curl -w "@curl-format.txt" -o /dev/null -s http://api.constitution-app.com/api/health

   # View application logs
   kubectl logs -f deployment/constitution-app -n constitution-app | grep ERROR
   ```

### Health Checks

```bash
# Application health
curl https://api.constitution-app.com/api/health

# Database health
kubectl exec -it deployment/postgres -n database -- pg_isready

# Redis health
kubectl exec -it deployment/redis -n cache -- redis-cli ping
```

### Rollback Procedures

```bash
# Docker Compose rollback
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --scale app=1

# Kubernetes rollback
kubectl rollout undo deployment/constitution-app -n constitution-app
kubectl rollout status deployment/constitution-app -n constitution-app
```

## Support and Maintenance

### Regular Tasks

1. **Daily**
   - Check application logs for errors
   - Monitor performance metrics
   - Verify backup completion

2. **Weekly**
   - Review security scan results
   - Update dependencies
   - Performance optimization review

3. **Monthly**
   - Database maintenance
   - Log rotation
   - SSL certificate renewal

### Emergency Contacts

- **DevOps Team**: devops@constitution-app.com
- **Security Team**: security@constitution-app.com
- **On-call Engineer**: +1-555-0123

### Additional Resources

- [API Documentation](./API.md)
- [Developer Guide](./DEVELOPER.md)
- [Architecture Overview](./ARCHITECTURE.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
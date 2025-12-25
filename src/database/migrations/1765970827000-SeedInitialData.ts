import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export class SeedInitialData1765970827000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Hash password for test users (password: 'Test1234!')
    const hashedPassword = await bcrypt.hash('Test1234!', 10);

    // Generate UUIDs for relationships
    const adminUserId = uuidv4();
    const editorUserId = uuidv4();
    const viewerUserId = uuidv4();
    const qaUserId = uuidv4();
    const devUserId = uuidv4();

    const performancePrincipleId = uuidv4();
    const securityPrincipleId = uuidv4();
    const scalabilityPrincipleId = uuidv4();
    const reliabilityPrincipleId = uuidv4();

    // 1. Insert Roles (4 records) and get their IDs
    const rolesResult = await queryRunner.query(`
      INSERT INTO roles (name, description, permissions, "createdAt", "updatedAt")
      VALUES
        ('admin', 'Full system access with all permissions', '["read", "write", "delete", "manage_users", "manage_roles", "approve_amendments", "manage_governance"]', NOW(), NOW()),
        ('editor', 'Can create and edit content but not delete or manage users', '["read", "write", "propose_amendments", "view_governance"]', NOW(), NOW()),
        ('viewer', 'Read-only access to all content', '["read"]', NOW(), NOW()),
        ('qa', 'Quality assurance role with testing permissions', '["read", "run_tests", "view_performance", "create_compliance_checks"]', NOW(), NOW())
      RETURNING id, name
    `);

    // Map role names to their IDs
    const roleMap: Record<string, number> = {};
    rolesResult.forEach((role: { id: number; name: string }) => {
      roleMap[role.name] = role.id;
    });

    // 2. Insert Users (5 records)
    await queryRunner.query(`
      INSERT INTO users (id, email, "passwordHash", name, avatar, "isActive", "lastLoginAt", "createdAt", "updatedAt")
      VALUES
        ('${adminUserId}', 'admin@constitution.app', '${hashedPassword}', 'Alice Administrator', 'https://i.pravatar.cc/150?img=1', true, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '30 days', NOW()),
        ('${editorUserId}', 'editor@constitution.app', '${hashedPassword}', 'Bob Editor', 'https://i.pravatar.cc/150?img=2', true, NOW() - INTERVAL '1 day', NOW() - INTERVAL '20 days', NOW()),
        ('${viewerUserId}', 'viewer@constitution.app', '${hashedPassword}', 'Charlie Viewer', 'https://i.pravatar.cc/150?img=3', true, NOW() - INTERVAL '3 days', NOW() - INTERVAL '15 days', NOW()),
        ('${qaUserId}', 'qa@constitution.app', '${hashedPassword}', 'Diana QA Engineer', 'https://i.pravatar.cc/150?img=4', true, NOW() - INTERVAL '5 hours', NOW() - INTERVAL '10 days', NOW()),
        ('${devUserId}', 'dev@constitution.app', '${hashedPassword}', 'Evan Developer', 'https://i.pravatar.cc/150?img=5', true, NOW() - INTERVAL '12 hours', NOW() - INTERVAL '25 days', NOW())
    `);

    // 3. Insert UserRoles (5 records - linking users to roles)
    await queryRunner.query(`
      INSERT INTO user_roles ("userId", "roleId", "assignedAt", "assignedBy")
      VALUES
        ('${adminUserId}', ${roleMap.admin}, NOW() - INTERVAL '30 days', NULL),
        ('${editorUserId}', ${roleMap.editor}, NOW() - INTERVAL '20 days', '${adminUserId}'),
        ('${viewerUserId}', ${roleMap.viewer}, NOW() - INTERVAL '15 days', '${adminUserId}'),
        ('${qaUserId}', ${roleMap.qa}, NOW() - INTERVAL '10 days', '${adminUserId}'),
        ('${devUserId}', ${roleMap.editor}, NOW() - INTERVAL '25 days', '${adminUserId}')
    `);

    // 4. Insert Principles (5 records)
    await queryRunner.query(`
      INSERT INTO principles (id, slug, title, description, priority, metadata, "isActive", "currentVersion", "createdAt", "updatedAt")
      VALUES
        (
          '${performancePrincipleId}',
          'api-performance',
          'API Performance Excellence',
          'All API endpoints must meet strict performance standards to ensure optimal user experience. This includes response time targets, throughput requirements, and resource utilization limits.',
          1,
          '{"category": "performance", "tags": ["api", "latency", "optimization"], "relatedPrinciples": [], "examples": [{"type": "text", "title": "Response Time Target", "content": "Authentication endpoints: p95 < 100ms, Search endpoints: p95 < 150ms"}]}'::jsonb,
          true,
          '1.0.0',
          NOW() - INTERVAL '60 days',
          NOW() - INTERVAL '30 days'
        ),
        (
          '${securityPrincipleId}',
          'security-first',
          'Security First Approach',
          'Security must be built into every layer of the application. All data transmissions must be encrypted, authentication must use industry standards, and sensitive data must be properly protected.',
          1,
          '{"category": "security", "tags": ["authentication", "encryption", "data-protection"], "relatedPrinciples": ["${performancePrincipleId}"], "examples": [{"type": "code", "title": "JWT Authentication", "content": "Use JWT tokens with 15-minute expiry for access tokens and 7-day expiry for refresh tokens", "language": "typescript"}]}'::jsonb,
          true,
          '1.0.0',
          NOW() - INTERVAL '55 days',
          NOW() - INTERVAL '25 days'
        ),
        (
          '${scalabilityPrincipleId}',
          'horizontal-scalability',
          'Horizontal Scalability',
          'The system must be designed to scale horizontally by adding more instances rather than vertically by increasing instance resources. This ensures cost-effective growth and fault tolerance.',
          2,
          '{"category": "architecture", "tags": ["scalability", "distributed-systems", "load-balancing"], "relatedPrinciples": ["${performancePrincipleId}"], "examples": [{"type": "diagram", "title": "Load Balancer Architecture", "content": "Multiple app instances behind load balancer with Redis for session state"}]}'::jsonb,
          true,
          '1.0.0',
          NOW() - INTERVAL '50 days',
          NOW() - INTERVAL '20 days'
        ),
        (
          '${reliabilityPrincipleId}',
          'system-reliability',
          'System Reliability & Fault Tolerance',
          'The system must maintain high availability and gracefully handle failures. Critical operations must have proper error handling, retry mechanisms, and fallback strategies.',
          1,
          '{"category": "reliability", "tags": ["availability", "fault-tolerance", "error-handling"], "relatedPrinciples": ["${scalabilityPrincipleId}"], "examples": [{"type": "text", "title": "Uptime Target", "content": "99.9% uptime with automated failover and circuit breakers for external dependencies"}]}'::jsonb,
          true,
          '1.0.0',
          NOW() - INTERVAL '45 days',
          NOW() - INTERVAL '15 days'
        ),
        (
          '${uuidv4()}',
          'test-automation',
          'Comprehensive Test Automation',
          'All code changes must be covered by automated tests. Unit test coverage must be at least 80%, and critical user flows must have end-to-end tests.',
          3,
          '{"category": "quality", "tags": ["testing", "automation", "ci-cd"], "relatedPrinciples": [], "examples": [{"type": "code", "title": "Test Coverage", "content": "npm run test:cov should show >= 80% coverage across all metrics", "language": "bash"}]}'::jsonb,
          true,
          '1.0.0',
          NOW() - INTERVAL '40 days',
          NOW() - INTERVAL '10 days'
        )
    `);

    // 5. Insert Performance Standards (3 records)
    await queryRunner.query(`
      INSERT INTO performance_standards (id, "principleId", name, "endpointType", "targetResponseTime", "metricType", "concurrentUsers", "additionalMetrics", description, "isActive", "createdAt", "updatedAt")
      VALUES
        (
          '${uuidv4()}',
          '${performancePrincipleId}',
          'Authentication Performance Standard',
          'authentication',
          100,
          '95th_percentile',
          500,
          '{"errorRate": 0.1, "throughput": 1000, "cpuUsage": 70}'::jsonb,
          'Authentication endpoints must respond within 100ms at p95 under 500 concurrent users',
          true,
          NOW() - INTERVAL '30 days',
          NOW() - INTERVAL '5 days'
        ),
        (
          '${uuidv4()}',
          '${performancePrincipleId}',
          'Search Performance Standard',
          'search',
          150,
          '95th_percentile',
          1000,
          '{"errorRate": 0.1, "throughput": 2000, "cpuUsage": 80}'::jsonb,
          'Full-text search endpoints must respond within 150ms at p95 under 1000 concurrent users',
          true,
          NOW() - INTERVAL '25 days',
          NOW() - INTERVAL '3 days'
        ),
        (
          '${uuidv4()}',
          '${performancePrincipleId}',
          'Payment Processing Standard',
          'payment',
          200,
          '95th_percentile',
          200,
          '{"errorRate": 0.01, "throughput": 500, "cpuUsage": 60}'::jsonb,
          'Payment processing must complete within 200ms at p95 with < 0.01% error rate',
          true,
          NOW() - INTERVAL '20 days',
          NOW() - INTERVAL '2 days'
        )
    `);

    // 6. Insert Governance Rules (3 records)
    await queryRunner.query(`
      INSERT INTO governance_rules (id, "principleId", "ruleType", title, description, parameters, "isActive", "effectiveFrom", "createdAt", "updatedAt")
      VALUES
        (
          '${uuidv4()}',
          '${securityPrincipleId}',
          'amendment',
          'Security Amendment Approval Process',
          'All amendments affecting security principles require approval from security team lead and at least 3 senior developers',
          '{"requiredVotes": 3, "votingPeriod": "5 business days", "approvalProcess": ["security_lead_review", "senior_dev_review", "final_approval"], "notificationRequirements": ["security_team", "dev_team_leads"]}'::jsonb,
          true,
          NOW() - INTERVAL '30 days',
          NOW() - INTERVAL '30 days',
          NOW() - INTERVAL '5 days'
        ),
        (
          '${uuidv4()}',
          '${performancePrincipleId}',
          'compliance',
          'Performance Monitoring Compliance',
          'All production endpoints must have performance monitoring enabled with alerts for violations of standards',
          '{"complianceChecklist": ["prometheus_metrics_enabled", "grafana_dashboard_configured", "alert_rules_active"], "remediationPlan": true, "escalationPath": ["on_call_engineer", "engineering_manager", "cto"]}'::jsonb,
          true,
          NOW() - INTERVAL '25 days',
          NOW() - INTERVAL '25 days',
          NOW() - INTERVAL '3 days'
        ),
        (
          '${uuidv4()}',
          '${reliabilityPrincipleId}',
          'enforcement',
          'Deployment Rollback Enforcement',
          'Any deployment causing > 1% error rate increase must be automatically rolled back within 5 minutes',
          '{"escalationPath": ["on_call_sre", "engineering_manager"], "notificationRequirements": ["ops_team", "engineering_team"], "remediationPlan": true}'::jsonb,
          true,
          NOW() - INTERVAL '20 days',
          NOW() - INTERVAL '20 days',
          NOW() - INTERVAL '2 days'
        )
    `);

    // 7. Insert Amendments (3 records)
    await queryRunner.query(`
      INSERT INTO amendments (id, title, description, type, changes, status, proposed_by_id, proposed_at, voting_starts_at, voting_ends_at, implemented_at, "migrationPlan")
      VALUES
        (
          '${uuidv4()}',
          'Reduce Authentication Response Time Target',
          'Proposal to reduce authentication p95 response time from 100ms to 75ms to improve user experience during login',
          'modification',
          '[{"entityType": "performance_standard", "entityId": "${performancePrincipleId}", "oldValue": "100ms", "newValue": "75ms", "impact": "Requires infrastructure optimization and caching improvements"}]'::jsonb,
          'under_review',
          '${editorUserId}',
          NOW() - INTERVAL '5 days',
          NOW() - INTERVAL '4 days',
          NOW() + INTERVAL '3 days',
          NULL,
          'Phase 1: Add Redis caching for user sessions. Phase 2: Optimize database queries. Phase 3: Deploy to production with monitoring'
        ),
        (
          '${uuidv4()}',
          'Add Code Quality Gate',
          'Introduce new principle for code quality with automated linting and formatting checks',
          'addition',
          '[{"entityType": "principle", "entityId": "new", "newValue": "Code Quality Standards", "impact": "All PRs must pass ESLint and Prettier checks"}]'::jsonb,
          'approved',
          '${devUserId}',
          NOW() - INTERVAL '15 days',
          NOW() - INTERVAL '14 days',
          NOW() - INTERVAL '8 days',
          NOW() - INTERVAL '2 days',
          'Add pre-commit hooks and CI pipeline checks for code quality validation'
        ),
        (
          '${uuidv4()}',
          'Remove Deprecated API Versioning',
          'Remove support for API v1 endpoints as all clients have migrated to v2',
          'removal',
          '[{"entityType": "api_endpoint", "entityId": "v1/*", "oldValue": "active", "impact": "Breaking change for any remaining v1 clients"}]'::jsonb,
          'rejected',
          '${editorUserId}',
          NOW() - INTERVAL '30 days',
          NOW() - INTERVAL '29 days',
          NOW() - INTERVAL '23 days',
          NULL,
          'Deprecated endpoints to be removed after 3-month grace period'
        )
    `);

    console.log('✅ Seed data inserted successfully');
    console.log('📊 Summary:');
    console.log('   - 4 Roles (admin, editor, viewer, qa)');
    console.log('   - 5 Users (with password: Test1234!)');
    console.log('   - 5 User-Role assignments');
    console.log(
      '   - 5 Principles (performance, security, scalability, reliability, testing)',
    );
    console.log('   - 3 Performance Standards (auth, search, payment)');
    console.log('   - 3 Governance Rules (amendment, compliance, enforcement)');
    console.log('   - 3 Amendments (under_review, approved, rejected)');
    console.log('   📈 Total: 28 records');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Delete in reverse order to handle foreign key constraints
    await queryRunner.query(`DELETE FROM amendments WHERE title IN (
      'Reduce Authentication Response Time Target',
      'Add Code Quality Gate',
      'Remove Deprecated API Versioning'
    )`);

    await queryRunner.query(`DELETE FROM governance_rules WHERE title IN (
      'Security Amendment Approval Process',
      'Performance Monitoring Compliance',
      'Deployment Rollback Enforcement'
    )`);

    await queryRunner.query(`DELETE FROM performance_standards WHERE name IN (
      'Authentication Performance Standard',
      'Search Performance Standard',
      'Payment Processing Standard'
    )`);

    await queryRunner.query(`DELETE FROM principles WHERE slug IN (
      'api-performance',
      'security-first',
      'horizontal-scalability',
      'system-reliability',
      'test-automation'
    )`);

    await queryRunner.query(`DELETE FROM user_roles WHERE "userId" IN (
      SELECT id FROM users WHERE email LIKE '%@constitution.app'
    )`);

    await queryRunner.query(
      `DELETE FROM users WHERE email LIKE '%@constitution.app'`,
    );

    await queryRunner.query(`DELETE FROM roles WHERE name IN (
      'admin', 'editor', 'viewer', 'qa'
    )`);

    console.log('✅ Seed data removed successfully');
  }
}

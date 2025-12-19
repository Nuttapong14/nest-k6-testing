import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PerformanceLoggerService } from './performance-logger.service';

@Injectable()
export class QueryOptimizerService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly performanceLogger: PerformanceLoggerService,
  ) {}

  /**
   * Creates database indexes for frequently queried fields
   */
  async createOptimizedIndexes(): Promise<void> {
    const queries = [
      // Principles table indexes
      'CREATE INDEX IF NOT EXISTS idx_principles_slug ON principles(slug)',
      'CREATE INDEX IF NOT EXISTS idx_principles_priority ON principles(priority DESC)',
      'CREATE INDEX IF NOT EXISTS idx_principles_created_at ON principles(created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_principles_is_active ON principles(is_active)',

      // Full-text search index for principles
      'CREATE INDEX IF NOT EXISTS idx_principles_search ON principles USING gin(to_tsvector(\'english\', title || \' \' || description))',

      // Performance standards table indexes
      'CREATE INDEX IF NOT EXISTS idx_performance_standards_endpoint ON performance_standards(endpoint_type)',
      'CREATE INDEX IF NOT EXISTS idx_performance_standards_principle ON performance_standards(principle_id)',

      // Users table indexes
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC)',

      // Payments table indexes
      'CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)',
      'CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id)',

      // Load test requirements indexes
      'CREATE INDEX IF NOT EXISTS idx_load_test_endpoint ON load_test_requirements(endpoint_type)',
      'CREATE INDEX IF NOT EXISTS idx_load_test_vus ON load_test_requirements(target_vus)',

      // Governance rules indexes
      'CREATE INDEX IF NOT EXISTS idx_governance_rules_category ON governance_rules(category)',
      'CREATE INDEX IF NOT EXISTS idx_governance_rules_is_active ON governance_rules(is_active)',
    ];

    for (const query of queries) {
      try {
        await this.dataSource.query(query);
        console.log(`Index created: ${query.split('idx_')[1].split(' ')[0]}`);
      } catch (error) {
        console.warn(`Failed to create index: ${query}`, error.message);
      }
    }
  }

  /**
   * Analyzes query performance and suggests optimizations
   */
  async analyzeSlowQueries(thresholdMs = 100): Promise<any[]> {
    // Enable pg_stat_statements if not already enabled
    await this.dataSource.query(`
      CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
    `);

    // Get slow queries
    const result = await this.dataSource.query(`
      SELECT
        query,
        calls,
        total_time,
        mean_time,
        rows,
        100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
      FROM pg_stat_statements
      WHERE mean_time > $1
      ORDER BY mean_time DESC
      LIMIT 20;
    `, [thresholdMs]);

    return result;
  }

  /**
   * Updates table statistics for better query planning
   */
  async updateTableStatistics(): Promise<void> {
    const tables = [
      'principles',
      'performance_standards',
      'users',
      'user_roles',
      'roles',
      'payments',
      'load_test_requirements',
      'governance_rules',
      'quality_gates',
    ];

    for (const table of tables) {
      try {
        await this.dataSource.query(`ANALYZE ${table};`);
      } catch (error) {
        console.warn(`Failed to analyze table ${table}:`, error.message);
      }
    }
  }

  /**
   * Creates materialized views for complex queries
   */
  async createMaterializedViews(): Promise<void> {
    // Materialized view for principle statistics
    await this.dataSource.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS mv_principle_stats AS
      SELECT
        p.id,
        p.title,
        p.slug,
        p.priority,
        COUNT(ps.id) as performance_standard_count,
        COUNT(ltr.id) as load_test_count,
        MAX(ltr.target_vus) as max_load_vus,
        p.created_at
      FROM principles p
      LEFT JOIN performance_standards ps ON p.id = ps.principle_id
      LEFT JOIN load_test_requirements ltr ON p.id = ltr.principle_id
      GROUP BY p.id, p.title, p.slug, p.priority, p.created_at;
    `);

    // Create unique index for materialized view
    await this.dataSource.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_principle_stats_id
      ON mv_principle_stats(id);
    `);

    // Materialized view for payment analytics
    await this.dataSource.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS mv_payment_analytics AS
      SELECT
        DATE_TRUNC('day', created_at) as date,
        status,
        COUNT(*) as payment_count,
        SUM(amount) as total_amount,
        AVG(amount) as avg_amount
      FROM payments
      GROUP BY DATE_TRUNC('day', created_at), status
      ORDER BY date DESC;
    `);

    // Create index for payment analytics
    await this.dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_mv_payment_analytics_date_status
      ON mv_payment_analytics(date, status);
    `);
  }

  /**
   * Refreshes materialized views
   */
  async refreshMaterializedViews(): Promise<void> {
    const views = ['mv_principle_stats', 'mv_payment_analytics'];

    for (const view of views) {
      try {
        await this.dataSource.query(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${view};`);
        console.log(`Refreshed materialized view: ${view}`);
      } catch (error) {
        // If concurrent refresh fails, try regular refresh
        try {
          await this.dataSource.query(`REFRESH MATERIALIZED VIEW ${view};`);
          console.log(`Refreshed materialized view: ${view} (non-concurrent)`);
        } catch (err) {
          console.warn(`Failed to refresh view ${view}:`, err.message);
        }
      }
    }
  }

  /**
   * Implements connection pool monitoring
   */
  async getConnectionPoolStats(): Promise<any> {
    try {
      const result = await this.dataSource.query(`
        SELECT
          state,
          COUNT(*) as connection_count,
          AVG(EXTRACT(EPOCH FROM (NOW() - query_start))) as avg_duration_seconds
        FROM pg_stat_activity
        WHERE datname = current_database()
        GROUP BY state
        ORDER BY connection_count DESC;
      `);

      return result;
    } catch (error) {
      console.warn('Failed to get connection pool stats:', error.message);
      return [];
    }
  }

  /**
   * Implements database partitioning for large tables (example with payments)
   */
  async createPartitionedTables(): Promise<void> {
    // Create partitioned payments table by month
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS payments_partitioned (
        LIKE payments INCLUDING ALL
      ) PARTITION BY RANGE (created_at);
    `);

    // Create monthly partitions for current and next 3 months
    const dates: Array<{ startDate: string; endDate: string }> = [];
    const today = new Date();

    for (let i = 0; i < 4; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const startDate = date.toISOString().split('T')[0];
      const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 1)
        .toISOString().split('T')[0];

      dates.push({ startDate, endDate });
    }

    for (const { startDate, endDate } of dates) {
      const partitionName = `payments_${startDate.replace(/-/g, '_')}`;

      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS ${partitionName}
        PARTITION OF payments_partitioned
        FOR VALUES FROM ('${startDate}') TO ('${endDate}');
      `);
    }
  }

  /**
   * Suggests query optimizations based on EXPLAIN ANALYZE
   */
  async analyzeQuery(query: string): Promise<any> {
    try {
      const result = await this.dataSource.query(`
        EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}
      `);

      const plan = result[0]['QUERY PLAN'][0];

      // Extract key metrics
      const executionTime = plan['Execution Time'];
      const planningTime = plan['Planning Time'];
      const totalCost = plan['Total Cost'];

      // Check for sequential scans
      const sequentialScans = this.findSequentialScans(plan.Plan);

      // Check for missing indexes
      const suggestions = this.generateOptimizationSuggestions(plan.Plan);

      return {
        query,
        executionTime,
        planningTime,
        totalCost,
        sequentialScans,
        suggestions,
      };
    } catch (error) {
      return {
        query,
        error: error.message,
      };
    }
  }

  private findSequentialScans(node: any): string[] {
    const scans: string[] = [];

    if (node['Node Type'] === 'Seq Scan') {
      scans.push(node['Relation Name']);
    }

    if (node.Plans) {
      for (const plan of node.Plans) {
        scans.push(...this.findSequentialScans(plan));
      }
    }

    return scans;
  }

  private generateOptimizationSuggestions(node: any): string[] {
    const suggestions: string[] = [];

    // Check for sequential scans on large tables
    if (node['Node Type'] === 'Seq Scan' && node['Actual Rows'] > 1000) {
      suggestions.push(
        `Consider adding an index on table "${node['Relation Name']}" for better performance`
      );
    }

    // Check for hash joins without adequate work_mem
    if (node['Node Type'] === 'Hash Join' && node['Hash Batches'] > 1) {
      suggestions.push(
        'Consider increasing work_mem for more efficient hash joins'
      );
    }

    // Recursive check
    if (node.Plans) {
      for (const plan of node.Plans) {
        suggestions.push(...this.generateOptimizationSuggestions(plan));
      }
    }

    return suggestions;
  }
}
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSearchIndexes1672314000000 implements MigrationInterface {
  name = 'AddSearchIndexes1672314000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add full-text search indexes for principles
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_principles_fulltext
      ON principles
      USING gin(to_tsvector('english', title || ' ' || description))
    `);

    // Add GIN index for metadata JSONB queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_principles_metadata_gin
      ON principles
      USING gin(metadata)
    `);

    // Add index for performance standards
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_performance_standards_fulltext
      ON performance_standards
      USING gin(to_tsvector('english', endpoint_type || ' ' || COALESCE(description, '')))
    `);

    // Add indexes for quality gates
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_quality_gates_fulltext
      ON quality_gates
      USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(criteria, '')))
    `);

    // Add index for governance rules
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_governance_rules_fulltext
      ON governance_rules
      USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(rule, '')))
    `);

    // Add GIN index for tags in governance rules
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_governance_rules_tags_gin
      ON governance_rules
      USING gin(tags)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop full-text search indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_principles_fulltext`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_principles_metadata_gin`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_performance_standards_fulltext`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_quality_gates_fulltext`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_governance_rules_fulltext`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_governance_rules_tags_gin`,
    );
  }
}

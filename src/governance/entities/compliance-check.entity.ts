import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { ComplianceIssue } from './compliance-issue.entity';

export interface ComplianceCheckResults {
  score?: number;
  issues?: string[];
  metrics?: Record<string, number>;
  passed?: boolean;
  warnings?: string[];
}

@Entity('compliance_checks')
@Index(['entityType', 'entityId'])
@Index(['checkType'])
@Index(['status'])
@Index(['performedAt'])
export class ComplianceCheck {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'entity_type' })
  entityType: string; // principle, performance_standard, etc.

  @Column({ name: 'entity_id' })
  entityId: string;

  @Column({ name: 'check_type' })
  checkType: string; // manual_review, automated_test, security_scan

  @Column({
    type: 'enum',
    enum: ['passed', 'failed', 'warning', 'pending'],
  })
  status: 'passed' | 'failed' | 'warning' | 'pending';

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  results?: ComplianceCheckResults;

  @Column('text', { nullable: true })
  notes?: string;

  @Column({ name: 'performed_by_id' })
  performedById: string;

  @ManyToOne(() => User, (user) => user.performedChecks)
  performedBy: User;

  @Column({ type: 'timestamp', name: 'performed_at' })
  performedAt: Date;

  // Relationships
  @OneToMany(() => ComplianceIssue, (issue) => issue.check)
  issues: ComplianceIssue[];
}

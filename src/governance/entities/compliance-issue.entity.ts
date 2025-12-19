import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { ComplianceCheck } from './compliance-check.entity';

@Entity('compliance_issues')
@Index(['checkId'])
@Index(['severity'])
@Index(['status'])
@Index(['createdAt'])
export class ComplianceIssue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'check_id' })
  checkId: string;

  @ManyToOne(() => ComplianceCheck, (check) => check.issues, {
    onDelete: 'CASCADE',
  })
  check: ComplianceCheck;

  @Column({
    type: 'enum',
    enum: ['low', 'medium', 'high', 'critical'],
  })
  severity: 'low' | 'medium' | 'high' | 'critical';

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({ nullable: true })
  remediationSteps?: string;

  @Column({
    type: 'enum',
    enum: ['open', 'in_progress', 'resolved', 'ignored'],
    default: 'open',
  })
  status: 'open' | 'in_progress' | 'resolved' | 'ignored';

  @Column({ name: 'assigned_to', nullable: true })
  assignedTo?: string;

  @Column({ type: 'timestamp', nullable: true, name: 'resolved_at' })
  resolvedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

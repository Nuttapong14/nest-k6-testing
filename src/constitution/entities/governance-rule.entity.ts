import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { Principle } from './principle.entity';

export interface GovernanceRuleParameters {
  requiredVotes?: number;
  votingPeriod?: string; // 3 business days
  approvalProcess?: string[];
  escalationPath?: string[];
  remediationPlan?: boolean;
  notificationRequirements?: string[];
  complianceChecklist?: string[];
}

@Entity('governance_rules')
@Index(['principleId'])
@Index(['ruleType'])
@Index(['isActive'])
export class GovernanceRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  principleId: string;

  @ManyToOne(() => Principle, (principle) => principle.governanceRules, {
    onDelete: 'CASCADE',
  })
  principle: Principle;

  @Column({
    type: 'enum',
    enum: ['amendment', 'compliance', 'approval', 'enforcement'],
  })
  ruleType: 'amendment' | 'compliance' | 'approval' | 'enforcement';

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({
    type: 'jsonb',
    default: {},
  })
  parameters: GovernanceRuleParameters;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  effectiveFrom?: Date;

  @Column({ type: 'timestamp', nullable: true })
  effectiveTo?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

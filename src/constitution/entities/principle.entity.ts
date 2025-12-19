import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { PrincipleVersion } from './principle-version.entity';
import { PerformanceStandard } from './performance-standard.entity';
import { LoadTestRequirement } from './load-test-requirement.entity';
import { QualityGate } from './quality-gate.entity';
import { GovernanceRule } from './governance-rule.entity';

export interface PrincipleMetadata {
  category: string;
  tags: string[];
  relatedPrinciples: string[];
  examples: Array<{
    type: 'code' | 'diagram' | 'text';
    title: string;
    content: string;
    language?: string;
  }>;
}

@Entity('principles')
@Index(['slug'])
@Index(['isActive'])
@Index(['priority'])
export class Principle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({ default: 1 })
  priority: number; // 1 = highest

  @Column({
    type: 'jsonb',
    default: {
      category: '',
      tags: [],
      relatedPrinciples: [],
      examples: [],
    },
  })
  metadata: PrincipleMetadata;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Version tracking
  @Column({ default: '1.0.0' })
  currentVersion: string;

  // Relationships
  @OneToMany(() => PrincipleVersion, (version) => version.principle)
  versions: PrincipleVersion[];

  @OneToMany(() => PerformanceStandard, (standard) => standard.principle)
  performanceStandards: PerformanceStandard[];

  @OneToMany(() => LoadTestRequirement, (req) => req.principle)
  loadTestRequirements: LoadTestRequirement[];

  @OneToMany(() => QualityGate, (gate) => gate.principle)
  qualityGates: QualityGate[];

  @OneToMany(() => GovernanceRule, (rule) => rule.principle)
  governanceRules: GovernanceRule[];
}

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

export interface QualityGateCriteria {
  threshold?: number;
  unit?: string;
  conditions?: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
}

@Entity('quality_gates')
@Index(['principleId'])
@Index(['type'])
@Index(['isActive'])
export class QualityGate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  principleId: string;

  @ManyToOne(() => Principle, (principle) => principle.qualityGates, {
    onDelete: 'CASCADE',
  })
  principle: Principle;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: ['automated', 'manual'] })
  type: 'automated' | 'manual';

  @Column({ nullable: true })
  tool?: string; // Jest, k6, npm audit, etc.

  @Column('text')
  requirement: string;

  @Column({
    type: 'jsonb',
    default: {},
  })
  criteria: QualityGateCriteria;

  @Column({ default: true })
  isRequired: boolean;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

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

export interface AdditionalMetrics {
  cpuUsage?: number;
  memoryUsage?: number;
  errorRate?: number;
  throughput?: number;
  concurrency?: number;
}

@Entity('performance_standards')
@Index(['principleId'])
@Index(['endpointType', 'isActive'])
export class PerformanceStandard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  principleId: string;

  @ManyToOne(() => Principle, (principle) => principle.performanceStandards, {
    onDelete: 'CASCADE',
  })
  principle: Principle;

  @Column()
  name: string;

  @Column()
  endpointType: string; // authentication, search, payment, etc.

  @Column()
  targetResponseTime: number; // in milliseconds

  @Column()
  metricType: string; // 95th_percentile, average, max, min

  @Column()
  concurrentUsers: number;

  @Column({
    type: 'jsonb',
    default: {},
  })
  additionalMetrics: AdditionalMetrics;

  @Column('text', { nullable: true })
  description?: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

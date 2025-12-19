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

export interface TestParameters {
  rampUp: {
    from: number;
    to: number;
    duration: string; // 5m
  };
  constantLoad?: {
    users: number;
    duration: string;
  };
  stress?: {
    load: string; // 150% of expected
    duration: string;
  };
  spike?: {
    from: number;
    to: number;
    duration: string;
  };
}

@Entity('load_test_requirements')
@Index(['principleId'])
@Index(['isActive'])
@Index(['testType'])
export class LoadTestRequirement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  principleId: string;

  @ManyToOne(() => Principle, (principle) => principle.loadTestRequirements, {
    onDelete: 'CASCADE',
  })
  principle: Principle;

  @Column()
  name: string;

  @Column()
  testType: string; // smoke, load, stress, spike

  @Column()
  endpointPattern: string; // /api/auth/*

  @Column({
    type: 'jsonb',
    default: {
      rampUp: { from: 0, to: 100, duration: '5m' },
    },
  })
  testParameters: TestParameters;

  @Column()
  expectedRate: number; // requests per second

  @Column()
  maxResponseTime: number; // in milliseconds

  @Column()
  maxErrorRate: number; // percentage

  @Column({ nullable: true })
  scriptPath?: string; // path to k6 script

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

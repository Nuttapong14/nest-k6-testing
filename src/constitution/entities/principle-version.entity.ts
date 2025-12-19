import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { Principle } from './principle.entity';

@Entity('principle_versions')
@Index(['principleId'])
@Index(['version'])
export class PrincipleVersion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  principleId: string;

  @ManyToOne(() => Principle, (principle) => principle.versions, {
    onDelete: 'CASCADE',
  })
  principle: Principle;

  @Column()
  version: string;

  @Column('text')
  title: string;

  @Column('text')
  description: string;

  @Column({
    type: 'jsonb',
    default: {},
  })
  metadata: any;

  @Column()
  changeLog: string;

  @Column()
  authorId: string;

  @Column({ type: 'timestamp' })
  effectiveDate: Date;

  @CreateDateColumn()
  createdAt: Date;
}

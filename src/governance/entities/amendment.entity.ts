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
import { AmendmentVote } from './amendment-vote.entity';

export interface AmendmentChange {
  entityType: string;
  entityId: string;
  oldValue?: any;
  newValue: any;
  impact: string;
}

@Entity('amendments')
@Index(['status'])
@Index(['proposedAt'])
@Index(['proposedById'])
export class Amendment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({
    type: 'enum',
    enum: ['addition', 'modification', 'removal'],
  })
  type: 'addition' | 'modification' | 'removal';

  @Column({
    type: 'jsonb',
    default: [],
  })
  changes: AmendmentChange[];

  @Column({
    type: 'enum',
    enum: ['proposed', 'under_review', 'approved', 'rejected', 'implemented'],
    default: 'proposed',
  })
  status: 'proposed' | 'under_review' | 'approved' | 'rejected' | 'implemented';

  @Column({ name: 'proposed_by_id' })
  proposedById: string;

  @ManyToOne(() => User, (user) => user.proposedAmendments)
  proposedBy: User;

  @Column({ type: 'timestamp', name: 'proposed_at' })
  proposedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'voting_starts_at' })
  votingStartsAt?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'voting_ends_at' })
  votingEndsAt?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'implemented_at' })
  implementedAt?: Date;

  @Column({ nullable: true })
  migrationPlan?: string;

  // Relationships
  @OneToMany(() => AmendmentVote, (vote) => vote.amendment)
  votes: AmendmentVote[];
}

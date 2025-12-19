import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { Amendment } from './amendment.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('amendment_votes')
@Index(['amendmentId'])
@Index(['voterId'])
@Unique(['amendmentId', 'voterId'])
export class AmendmentVote {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'amendment_id' })
  amendmentId: string;

  @ManyToOne(() => Amendment, (amendment) => amendment.votes, {
    onDelete: 'CASCADE',
  })
  amendment: Amendment;

  @Column({ name: 'voter_id' })
  voterId: string;

  @ManyToOne(() => User)
  voter: User;

  @Column({
    type: 'enum',
    enum: ['approve', 'reject', 'abstain'],
  })
  vote: 'approve' | 'reject' | 'abstain';

  @Column({ nullable: true })
  comment?: string;

  @CreateDateColumn({ name: 'voted_at' })
  votedAt: Date;
}

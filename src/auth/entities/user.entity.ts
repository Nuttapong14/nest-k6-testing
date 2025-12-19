import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserRole } from './user-role.entity';
import { Amendment } from '../../governance/entities/amendment.entity';
import { ComplianceCheck } from '../../governance/entities/compliance-check.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  avatar?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  // Relationships
  @OneToMany(() => UserRole, (role) => role.user)
  roles: UserRole[];

  @OneToMany(() => Amendment, (amendment) => amendment.proposedBy)
  proposedAmendments: Amendment[];

  @OneToMany(() => ComplianceCheck, (check) => check.performedBy)
  performedChecks: ComplianceCheck[];
}

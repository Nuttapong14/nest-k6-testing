import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GovernanceController } from './governance.controller';
import { GovernanceService } from './governance.service';
import { Amendment } from './entities/amendment.entity';
import { AmendmentVote } from './entities/amendment-vote.entity';
import { ComplianceCheck } from './entities/compliance-check.entity';
import { ComplianceIssue } from './entities/compliance-issue.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Amendment,
      AmendmentVote,
      ComplianceCheck,
      ComplianceIssue,
    ]),
  ],
  controllers: [GovernanceController],
  providers: [GovernanceService],
  exports: [GovernanceService],
})
export class GovernanceModule {}

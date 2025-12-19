import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConstitutionController } from './constitution.controller';
import { ConstitutionService } from './constitution.service';
import { Principle } from './entities/principle.entity';
import { PrincipleVersion } from './entities/principle-version.entity';
import { PerformanceStandard } from './entities/performance-standard.entity';
import { LoadTestRequirement } from './entities/load-test-requirement.entity';
import { QualityGate } from './entities/quality-gate.entity';
import { GovernanceRule } from './entities/governance-rule.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Principle,
      PrincipleVersion,
      PerformanceStandard,
      LoadTestRequirement,
      QualityGate,
      GovernanceRule,
    ]),
  ],
  controllers: [ConstitutionController],
  providers: [ConstitutionService],
  exports: [ConstitutionService],
})
export class ConstitutionModule {}

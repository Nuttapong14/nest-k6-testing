import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { Principle } from '../constitution/entities/principle.entity';
import { PerformanceStandard } from '../constitution/entities/performance-standard.entity';
import { QualityGate } from '../constitution/entities/quality-gate.entity';
import { GovernanceRule } from '../constitution/entities/governance-rule.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Principle,
      PerformanceStandard,
      QualityGate,
      GovernanceRule,
    ]),
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}

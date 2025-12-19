import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PerformanceController } from './performance.controller';
import { PerformanceService } from './performance.service';
import { PerformanceStandard } from '../constitution/entities/performance-standard.entity';
import { LoadTestRequirement } from '../constitution/entities/load-test-requirement.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PerformanceStandard, LoadTestRequirement]),
  ],
  controllers: [PerformanceController],
  providers: [PerformanceService],
  exports: [PerformanceService],
})
export class PerformanceModule {}

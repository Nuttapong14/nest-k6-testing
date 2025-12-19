import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsObject,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export interface AdditionalMetrics {
  cpuUsage?: number;
  memoryUsage?: number;
  errorRate?: number;
  throughput?: number;
  concurrency?: number;
}

export class PerformanceStandardDto {
  @ApiProperty({ description: 'Performance standard unique identifier' })
  id: string;

  @ApiProperty({ description: 'Associated principle ID' })
  principleId: string;

  @ApiProperty({ description: 'Standard name' })
  name: string;

  @ApiProperty({
    description: 'Endpoint type (authentication, search, payment, etc.)',
  })
  endpointType: string;

  @ApiProperty({ description: 'Target response time in milliseconds' })
  targetResponseTime: number;

  @ApiProperty({
    description: 'Metric type (95th_percentile, average, max, min)',
  })
  metricType: string;

  @ApiProperty({ description: 'Number of concurrent users' })
  concurrentUsers: number;

  @ApiProperty({ description: 'Additional performance metrics' })
  additionalMetrics: AdditionalMetrics;

  @ApiProperty({ description: 'Optional description', required: false })
  description?: string;

  @ApiProperty({ description: 'Whether standard is active', default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export class CreatePerformanceStandardDto {
  @ApiProperty({ description: 'Associated principle ID' })
  @IsString()
  principleId: string;

  @ApiProperty({ description: 'Standard name' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Endpoint type (authentication, search, payment, etc.)',
  })
  @IsEnum([
    'authentication',
    'search',
    'payment',
    'profile',
    'constitution',
    'governance',
    'load-testing',
  ])
  endpointType: string;

  @ApiProperty({ description: 'Target response time in milliseconds' })
  @IsInt()
  @Min(1)
  @Max(10000)
  targetResponseTime: number;

  @ApiProperty({
    description: 'Metric type',
    enum: ['95th_percentile', 'average', 'max', 'min'],
  })
  @IsEnum(['95th_percentile', 'average', 'max', 'min'])
  metricType: string;

  @ApiProperty({ description: 'Number of concurrent users' })
  @IsInt()
  @Min(1)
  @Max(100000)
  concurrentUsers: number;

  @ApiProperty({
    description: 'Additional performance metrics',
    required: false,
  })
  @IsOptional()
  @IsObject()
  additionalMetrics?: Partial<AdditionalMetrics>;

  @ApiProperty({ description: 'Optional description', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdatePerformanceStandardDto {
  @ApiProperty({ description: 'Standard name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Endpoint type',
    enum: [
      'authentication',
      'search',
      'payment',
      'profile',
      'constitution',
      'governance',
      'load-testing',
    ],
    required: false,
  })
  @IsOptional()
  @IsEnum([
    'authentication',
    'search',
    'payment',
    'profile',
    'constitution',
    'governance',
    'load-testing',
  ])
  endpointType?: string;

  @ApiProperty({
    description: 'Target response time in milliseconds',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  targetResponseTime?: number;

  @ApiProperty({
    description: 'Metric type',
    enum: ['95th_percentile', 'average', 'max', 'min'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['95th_percentile', 'average', 'max', 'min'])
  metricType?: string;

  @ApiProperty({ description: 'Number of concurrent users', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  concurrentUsers?: number;

  @ApiProperty({
    description: 'Additional performance metrics',
    required: false,
  })
  @IsOptional()
  @IsObject()
  additionalMetrics?: Partial<AdditionalMetrics>;

  @ApiProperty({ description: 'Optional description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Whether standard is active', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SearchPerformanceStandardsDto {
  @ApiProperty({ description: 'Filter by endpoint type', required: false })
  @IsOptional()
  @IsEnum([
    'authentication',
    'search',
    'payment',
    'profile',
    'constitution',
    'governance',
    'load-testing',
  ])
  endpointType?: string;

  @ApiProperty({ description: 'Filter by principle ID', required: false })
  @IsOptional()
  @IsString()
  principleId?: string;

  @ApiProperty({ description: 'Filter by active status', required: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiProperty({ description: 'Page number (default: 1)', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({
    description: 'Items per page (default: 10, max: 100)',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;
}

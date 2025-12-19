import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PerformanceStandard } from '../constitution/entities/performance-standard.entity';
import {
  CreatePerformanceStandardDto,
  UpdatePerformanceStandardDto,
  SearchPerformanceStandardsDto,
} from '../constitution/dto/performance-standard.dto';
import {
  PaginatedResponse,
  PaginationMetaDto,
} from '../constitution/dto/pagination.dto';

@Injectable()
export class PerformanceService {
  constructor(
    @InjectRepository(PerformanceStandard)
    private readonly performanceStandardRepository: Repository<PerformanceStandard>,
  ) {}

  async findAll(
    searchDto: SearchPerformanceStandardsDto,
  ): Promise<PaginatedResponse<PerformanceStandard>> {
    const {
      page = 1,
      limit = 10,
      endpointType,
      principleId,
      isActive,
    } = searchDto;

    // Build query
    const queryBuilder = this.performanceStandardRepository
      .createQueryBuilder('performanceStandard')
      .leftJoinAndSelect('performanceStandard.principle', 'principle');

    // Apply filters
    if (endpointType) {
      queryBuilder.andWhere(
        'performanceStandard.endpointType = :endpointType',
        { endpointType },
      );
    }

    if (principleId) {
      queryBuilder.andWhere('performanceStandard.principleId = :principleId', {
        principleId,
      });
    }

    if (typeof isActive === 'boolean') {
      queryBuilder.andWhere('performanceStandard.isActive = :isActive', {
        isActive,
      });
    }

    // Default ordering
    queryBuilder.orderBy('performanceStandard.targetResponseTime', 'ASC');

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Execute query
    const standards = await queryBuilder.getMany();

    // Calculate pagination meta
    const totalPages = Math.ceil(total / limit);
    const meta: PaginationMetaDto = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    return { data: standards, meta };
  }

  async findByEndpointType(
    endpointType: string,
  ): Promise<PerformanceStandard[]> {
    return await this.performanceStandardRepository.find({
      where: {
        endpointType,
        isActive: true,
      },
      relations: ['principle'],
      order: { targetResponseTime: 'ASC' },
    });
  }

  async findOne(id: string): Promise<PerformanceStandard> {
    const standard = await this.performanceStandardRepository.findOne({
      where: { id },
      relations: ['principle'],
    });

    if (!standard) {
      throw new NotFoundException(
        `Performance standard with ID "${id}" not found`,
      );
    }

    return standard;
  }

  async findByPrincipleId(principleId: string): Promise<PerformanceStandard[]> {
    return await this.performanceStandardRepository.find({
      where: {
        principleId,
        isActive: true,
      },
      relations: ['principle'],
      order: { targetResponseTime: 'ASC' },
    });
  }

  async create(
    createPerformanceStandardDto: CreatePerformanceStandardDto,
  ): Promise<PerformanceStandard> {
    // Validate that the principle exists
    // Note: This would require injecting the Principle repository, but to avoid circular dependencies,
    // we'll let the database handle the foreign key constraint

    // Create default additional metrics if not provided
    const additionalMetrics = {
      cpuUsage: 0,
      memoryUsage: 0,
      errorRate: 0,
      throughput: 0,
      concurrency: 0,
      ...createPerformanceStandardDto.additionalMetrics,
    };

    // Create performance standard
    const standard = this.performanceStandardRepository.create({
      ...createPerformanceStandardDto,
      additionalMetrics,
    });

    return await this.performanceStandardRepository.save(standard);
  }

  async update(
    id: string,
    updatePerformanceStandardDto: UpdatePerformanceStandardDto,
  ): Promise<PerformanceStandard> {
    const standard = await this.performanceStandardRepository.findOne({
      where: { id },
    });

    if (!standard) {
      throw new NotFoundException(
        `Performance standard with ID "${id}" not found`,
      );
    }

    // Merge additional metrics updates
    let additionalMetrics = standard.additionalMetrics;
    if (updatePerformanceStandardDto.additionalMetrics) {
      additionalMetrics = {
        ...additionalMetrics,
        ...updatePerformanceStandardDto.additionalMetrics,
      };
    }

    // Update standard
    Object.assign(standard, updatePerformanceStandardDto);
    if (updatePerformanceStandardDto.additionalMetrics) {
      standard.additionalMetrics = additionalMetrics;
    }

    return await this.performanceStandardRepository.save(standard);
  }

  async remove(id: string): Promise<void> {
    const standard = await this.performanceStandardRepository.findOne({
      where: { id },
    });

    if (!standard) {
      throw new NotFoundException(
        `Performance standard with ID "${id}" not found`,
      );
    }

    // Soft delete by setting isActive to false
    standard.isActive = false;
    await this.performanceStandardRepository.save(standard);
  }

  async getPerformanceMetricsSummary(): Promise<any> {
    // Get summary statistics for all active standards
    const standards = await this.performanceStandardRepository.find({
      where: { isActive: true },
      relations: ['principle'],
    });

    // Group by endpoint type
    const summary = standards.reduce((acc, standard) => {
      const endpointType = standard.endpointType;

      if (!acc[endpointType]) {
        acc[endpointType] = {
          endpointType,
          count: 0,
          averageTargetResponseTime: 0,
          minTargetResponseTime: Infinity,
          maxTargetResponseTime: 0,
          standards: [],
        };
      }

      acc[endpointType].count++;
      acc[endpointType].averageTargetResponseTime +=
        standard.targetResponseTime;
      acc[endpointType].minTargetResponseTime = Math.min(
        acc[endpointType].minTargetResponseTime,
        standard.targetResponseTime,
      );
      acc[endpointType].maxTargetResponseTime = Math.max(
        acc[endpointType].maxTargetResponseTime,
        standard.targetResponseTime,
      );
      acc[endpointType].standards.push({
        id: standard.id,
        name: standard.name,
        targetResponseTime: standard.targetResponseTime,
        metricType: standard.metricType,
      });

      return acc;
    }, {} as any);

    // Calculate averages
    Object.values(summary).forEach((endpointSummary: any) => {
      endpointSummary.averageTargetResponseTime = Math.round(
        endpointSummary.averageTargetResponseTime / endpointSummary.count,
      );
    });

    return Object.values(summary);
  }
}

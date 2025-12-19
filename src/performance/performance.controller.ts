import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/constants/roles.constants';
import { PerformanceService } from './performance.service';
import {
  PerformanceStandardDto,
  CreatePerformanceStandardDto,
  UpdatePerformanceStandardDto,
  SearchPerformanceStandardsDto,
} from '../constitution/dto/performance-standard.dto';
import { PaginatedResponse } from '../constitution/dto/pagination.dto';

@ApiTags('Performance Standards')
@Controller('performance/standards')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}

  @Get()
  @ApiOperation({ summary: 'Get all performance standards with filtering' })
  @ApiResponse({
    status: 200,
    description: 'List of performance standards retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/PerformanceStandardDto' },
        },
        meta: {
          $ref: '#/components/schemas/PaginationMetaDto',
        },
      },
    },
  })
  async findAll(
    @Query() searchDto: SearchPerformanceStandardsDto,
  ): Promise<PaginatedResponse<PerformanceStandardDto>> {
    const result = await this.performanceService.findAll(searchDto);

    // Convert entities to DTOs
    const data = result.data.map((standard) => this.mapToDto(standard));

    return {
      data,
      meta: result.meta,
    };
  }

  @Get('by-endpoint/:endpointType')
  @ApiOperation({ summary: 'Get performance standards by endpoint type' })
  @ApiResponse({
    status: 200,
    description: 'Performance standards retrieved successfully',
    type: [PerformanceStandardDto],
  })
  async findByEndpointType(
    @Param('endpointType') endpointType: string,
  ): Promise<PerformanceStandardDto[]> {
    const standards =
      await this.performanceService.findByEndpointType(endpointType);
    return standards.map((standard) => this.mapToDto(standard));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get performance standard by ID' })
  @ApiResponse({
    status: 200,
    description: 'Performance standard retrieved successfully',
    type: PerformanceStandardDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Performance standard not found',
  })
  async findOne(@Param('id') id: string): Promise<PerformanceStandardDto> {
    const standard = await this.performanceService.findOne(id);
    return this.mapToDto(standard);
  }

  @Get('principle/:principleId')
  @ApiOperation({ summary: 'Get performance standards by principle ID' })
  @ApiResponse({
    status: 200,
    description: 'Performance standards retrieved successfully',
    type: [PerformanceStandardDto],
  })
  async findByPrincipleId(
    @Param('principleId') principleId: string,
  ): Promise<PerformanceStandardDto[]> {
    const standards =
      await this.performanceService.findByPrincipleId(principleId);
    return standards.map((standard) => this.mapToDto(standard));
  }

  @Post()
  @Roles(Role.ADMIN, Role.EDITOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new performance standard' })
  @ApiResponse({
    status: 201,
    description: 'Performance standard created successfully',
    type: PerformanceStandardDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires ADMIN or EDITOR role',
  })
  async create(
    @Body() createPerformanceStandardDto: CreatePerformanceStandardDto,
  ): Promise<PerformanceStandardDto> {
    const standard = await this.performanceService.create(
      createPerformanceStandardDto,
    );
    return this.mapToDto(standard);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.EDITOR)
  @ApiOperation({ summary: 'Update performance standard by ID' })
  @ApiResponse({
    status: 200,
    description: 'Performance standard updated successfully',
    type: PerformanceStandardDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires ADMIN or EDITOR role',
  })
  @ApiResponse({
    status: 404,
    description: 'Performance standard not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updatePerformanceStandardDto: UpdatePerformanceStandardDto,
  ): Promise<PerformanceStandardDto> {
    const standard = await this.performanceService.update(
      id,
      updatePerformanceStandardDto,
    );
    return this.mapToDto(standard);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete performance standard by ID (soft delete)' })
  @ApiResponse({
    status: 204,
    description: 'Performance standard deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Requires ADMIN role',
  })
  @ApiResponse({
    status: 404,
    description: 'Performance standard not found',
  })
  async remove(@Param('id') id: string): Promise<void> {
    await this.performanceService.remove(id);
  }

  private mapToDto(standard: any): PerformanceStandardDto {
    return {
      id: standard.id,
      principleId: standard.principleId,
      name: standard.name,
      endpointType: standard.endpointType,
      targetResponseTime: standard.targetResponseTime,
      metricType: standard.metricType,
      concurrentUsers: standard.concurrentUsers,
      additionalMetrics: standard.additionalMetrics,
      description: standard.description,
      isActive: standard.isActive,
      createdAt: standard.createdAt,
      updatedAt: standard.updatedAt,
    };
  }
}

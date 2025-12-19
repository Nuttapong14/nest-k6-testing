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
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/constants/roles.constants';
import { ConstitutionService } from './constitution.service';
import {
  PrincipleDto,
  CreatePrincipleDto,
  UpdatePrincipleDto,
  SearchPrinciplesDto,
} from './dto/principle.dto';
import { PaginatedResponse } from './dto/pagination.dto';

@ApiTags('Constitution')
@Controller('principles')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ConstitutionController {
  constructor(private readonly constitutionService: ConstitutionService) {}

  @Get()
  @ApiOperation({ summary: 'Get all principles with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'tags', required: false, type: [String] })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['title', 'priority', 'createdAt', 'updatedAt'],
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({
    status: 200,
    description: 'List of principles retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/Principle' },
        },
        meta: {
          $ref: '#/components/schemas/PaginationMetaDto',
        },
      },
    },
  })
  async findAll(
    @Query() searchDto: SearchPrinciplesDto,
  ): Promise<PaginatedResponse<PrincipleDto>> {
    const result = await this.constitutionService.findAll(searchDto);

    // Convert entities to DTOs
    const data = result.data.map((principle) => this.mapToDto(principle));

    return {
      data,
      meta: result.meta,
    };
  }

  @Get('search')
  @ApiOperation({ summary: 'Search principles with advanced filtering' })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
  })
  async search(
    @Query() searchDto: SearchPrinciplesDto,
  ): Promise<PaginatedResponse<PrincipleDto>> {
    return this.findAll(searchDto);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get principle by slug' })
  @ApiResponse({
    status: 200,
    description: 'Principle retrieved successfully',
    type: PrincipleDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Principle not found',
  })
  async findOne(@Param('slug') slug: string): Promise<PrincipleDto> {
    const principle = await this.constitutionService.findOne(slug);
    return this.mapToDto(principle);
  }

  @Get(':slug/related')
  @ApiOperation({ summary: 'Get related principles' })
  @ApiResponse({
    status: 200,
    description: 'Related principles retrieved successfully',
    type: [PrincipleDto],
  })
  async findRelated(@Param('slug') slug: string): Promise<PrincipleDto[]> {
    // First find the principle by slug to get its ID
    const principle = await this.constitutionService.findOne(slug);
    const relatedPrinciples =
      await this.constitutionService.findRelatedPrinciples(principle.id);
    return relatedPrinciples.map((p) => this.mapToDto(p));
  }

  @Post()
  @Roles(Role.ADMIN, Role.EDITOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new principle' })
  @ApiResponse({
    status: 201,
    description: 'Principle created successfully',
    type: PrincipleDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or slug already exists',
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
    @Body() createPrincipleDto: CreatePrincipleDto,
    @Request() req: any,
  ): Promise<PrincipleDto> {
    const principle = await this.constitutionService.create(
      createPrincipleDto,
      req.user.id,
    );
    return this.mapToDto(principle);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.EDITOR)
  @ApiOperation({ summary: 'Update principle by ID' })
  @ApiResponse({
    status: 200,
    description: 'Principle updated successfully',
    type: PrincipleDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or slug already exists',
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
    description: 'Principle not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updatePrincipleDto: UpdatePrincipleDto,
    @Request() req: any,
  ): Promise<PrincipleDto> {
    const principle = await this.constitutionService.update(
      id,
      updatePrincipleDto,
      req.user.id,
    );
    return this.mapToDto(principle);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete principle by ID (soft delete)' })
  @ApiResponse({
    status: 204,
    description: 'Principle deleted successfully',
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
    description: 'Principle not found',
  })
  async remove(@Param('id') id: string): Promise<void> {
    await this.constitutionService.remove(id);
  }

  private mapToDto(principle: any): PrincipleDto {
    return {
      id: principle.id,
      slug: principle.slug,
      title: principle.title,
      description: principle.description,
      priority: principle.priority,
      metadata: principle.metadata,
      isActive: principle.isActive,
      currentVersion: principle.currentVersion,
      createdAt: principle.createdAt,
      updatedAt: principle.updatedAt,
    };
  }
}

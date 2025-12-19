import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, SelectQueryBuilder } from 'typeorm';
import { Principle } from './entities/principle.entity';
import { PrincipleVersion } from './entities/principle-version.entity';
import {
  CreatePrincipleDto,
  UpdatePrincipleDto,
  SearchPrinciplesDto,
} from './dto/principle.dto';
import { PaginatedResponse, PaginationMetaDto } from './dto/pagination.dto';

@Injectable()
export class ConstitutionService {
  constructor(
    @InjectRepository(Principle)
    private readonly principleRepository: Repository<Principle>,
    @InjectRepository(PrincipleVersion)
    private readonly principleVersionRepository: Repository<PrincipleVersion>,
  ) {}

  async findAll(
    searchDto: SearchPrinciplesDto,
  ): Promise<PaginatedResponse<Principle>> {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      tags,
      isActive,
      sortBy = 'priority',
      sortOrder = 'asc',
    } = searchDto;

    // Build query
    const queryBuilder = this.principleRepository
      .createQueryBuilder('principle')
      .leftJoinAndSelect(
        'principle.performanceStandards',
        'performanceStandards',
      )
      .leftJoinAndSelect('principle.qualityGates', 'qualityGates')
      .leftJoinAndSelect('principle.governanceRules', 'governanceRules');

    // Apply filters
    if (search) {
      queryBuilder.andWhere(
        '(principle.title ILIKE :search OR principle.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (category) {
      queryBuilder.andWhere('principle.metadata->>:category = :categoryValue', {
        category: 'category',
        categoryValue: category,
      });
    }

    if (tags && tags.length > 0) {
      queryBuilder.andWhere('principle.metadata->:tags ?| :tagsArray', {
        tags: 'tags',
        tagsArray: tags,
      });
    }

    if (typeof isActive === 'boolean') {
      queryBuilder.andWhere('principle.isActive = :isActive', { isActive });
    }

    // Apply sorting
    const validSortFields = ['title', 'priority', 'createdAt', 'updatedAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'priority';
    queryBuilder.orderBy(
      `principle.${sortField}`,
      sortOrder.toUpperCase() as 'ASC' | 'DESC',
    );

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Execute query
    const principles = await queryBuilder.getMany();

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

    return { data: principles, meta };
  }

  async findOne(slug: string): Promise<Principle> {
    const principle = await this.principleRepository.findOne({
      where: { slug },
      relations: [
        'performanceStandards',
        'qualityGates',
        'governanceRules',
        'loadTestRequirements',
        'versions',
      ],
    });

    if (!principle) {
      throw new NotFoundException(`Principle with slug "${slug}" not found`);
    }

    return principle;
  }

  async create(
    createPrincipleDto: CreatePrincipleDto,
    authorId: string,
  ): Promise<Principle> {
    // Check if slug already exists
    const existingPrinciple = await this.principleRepository.findOne({
      where: { slug: createPrincipleDto.slug },
    });

    if (existingPrinciple) {
      throw new BadRequestException(
        `Principle with slug "${createPrincipleDto.slug}" already exists`,
      );
    }

    // Create default metadata if not provided
    const metadata = {
      category: createPrincipleDto.metadata?.category || '',
      tags: createPrincipleDto.metadata?.tags || [],
      relatedPrinciples: createPrincipleDto.metadata?.relatedPrinciples || [],
      examples: createPrincipleDto.metadata?.examples || [],
    };

    // Create principle
    const principle = this.principleRepository.create({
      ...createPrincipleDto,
      metadata,
      currentVersion: '1.0.0',
    });

    const savedPrinciple = await this.principleRepository.save(principle);

    // Create initial version
    await this.createVersion(savedPrinciple, authorId, 'Initial version');

    return savedPrinciple;
  }

  async update(
    id: string,
    updatePrincipleDto: UpdatePrincipleDto,
    authorId: string,
  ): Promise<Principle> {
    const principle = await this.principleRepository.findOne({ where: { id } });

    if (!principle) {
      throw new NotFoundException(`Principle with ID "${id}" not found`);
    }

    // Check if updating slug and new slug already exists
    if (updatePrincipleDto.slug && updatePrincipleDto.slug !== principle.slug) {
      const existingPrinciple = await this.principleRepository.findOne({
        where: { slug: updatePrincipleDto.slug },
      });

      if (existingPrinciple) {
        throw new BadRequestException(
          `Principle with slug "${updatePrincipleDto.slug}" already exists`,
        );
      }
    }

    // Merge metadata updates
    let metadata = principle.metadata;
    if (updatePrincipleDto.metadata) {
      metadata = {
        ...metadata,
        ...updatePrincipleDto.metadata,
      };
    }

    // Update principle
    Object.assign(principle, updatePrincipleDto);
    if (updatePrincipleDto.metadata) {
      principle.metadata = metadata;
    }

    // Increment version for significant changes
    const hasSignificantChanges =
      (updatePrincipleDto.title &&
        updatePrincipleDto.title !== principle.title) ||
      (updatePrincipleDto.description &&
        updatePrincipleDto.description !== principle.description) ||
      (updatePrincipleDto.metadata &&
        JSON.stringify(updatePrincipleDto.metadata) !==
          JSON.stringify(principle.metadata));

    if (hasSignificantChanges) {
      const currentVersion = principle.currentVersion.split('.').map(Number);
      currentVersion[2]++; // Patch version
      principle.currentVersion = currentVersion.join('.');

      // Create new version
      await this.createVersion(principle, authorId, 'Updated principle');
    }

    return await this.principleRepository.save(principle);
  }

  async remove(id: string): Promise<void> {
    const principle = await this.principleRepository.findOne({ where: { id } });

    if (!principle) {
      throw new NotFoundException(`Principle with ID "${id}" not found`);
    }

    // Soft delete by setting isActive to false
    principle.isActive = false;
    await this.principleRepository.save(principle);
  }

  async findRelatedPrinciples(principleId: string): Promise<Principle[]> {
    const principle = await this.principleRepository.findOne({
      where: { id: principleId },
      relations: ['performanceStandards'],
    });

    if (!principle) {
      throw new NotFoundException(
        `Principle with ID "${principleId}" not found`,
      );
    }

    // Find principles with similar tags or category
    const relatedPrinciples = await this.principleRepository
      .createQueryBuilder('principle')
      .where('principle.id != :id', { id: principleId })
      .andWhere('principle.isActive = :isActive', { isActive: true })
      .andWhere(
        '(principle.metadata->>:category = :category OR principle.metadata->:tags ?| :tagsArray)',
        {
          category: 'category',
          categoryValue: principle.metadata.category,
          tags: 'tags',
          tagsArray: principle.metadata.tags,
        },
      )
      .orderBy('principle.priority', 'ASC')
      .limit(5)
      .getMany();

    return relatedPrinciples;
  }

  private async createVersion(
    principle: Principle,
    authorId: string,
    changeLog: string,
  ): Promise<PrincipleVersion> {
    const version = this.principleVersionRepository.create({
      principle,
      version: principle.currentVersion,
      title: principle.title,
      description: principle.description,
      metadata: principle.metadata,
      changeLog,
      authorId,
      effectiveDate: new Date(),
    });

    return await this.principleVersionRepository.save(version);
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { ConstitutionService } from './constitution.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Principle } from './entities/principle.entity';
import { PrincipleVersion } from './entities/principle-version.entity';
import { NotFoundException } from '@nestjs/common';
import { CreatePrincipleDto, UpdatePrincipleDto } from './dto/principle.dto';

describe('ConstitutionService', () => {
  let service: ConstitutionService;
  let repository: Repository<Principle>;

  const mockPrincipleRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockPrincipleVersionRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const sharedQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(0),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getMany: jest.fn().mockResolvedValue([]),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
  };

  const mockQueryBuilder = () => sharedQueryBuilder;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConstitutionService,
        {
          provide: getRepositoryToken(Principle),
          useValue: mockPrincipleRepository,
        },
        {
          provide: getRepositoryToken(PrincipleVersion),
          useValue: mockPrincipleVersionRepository,
        },
      ],
    }).compile();

    service = module.get<ConstitutionService>(ConstitutionService);
    repository = module.get<Repository<Principle>>(
      getRepositoryToken(Principle),
    );
    mockPrincipleRepository.createQueryBuilder.mockReturnValue(
      mockQueryBuilder(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new principle', async () => {
      const createDto: CreatePrincipleDto = {
        slug: 'test-principle',
        title: 'Test Principle',
        description: 'This is a test principle',
        priority: 1,
        metadata: {
          category: 'testing',
          tags: ['test'],
          relatedPrinciples: [],
          examples: [],
        },
      };

      const userId = 'user-id';
      const expectedPrinciple = {
        id: 'principle-id',
        ...createDto,
        isActive: true,
        currentVersion: '1.0.0',
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrincipleRepository.create.mockReturnValue(expectedPrinciple);
      mockPrincipleRepository.save.mockResolvedValue(expectedPrinciple);

      const result = await service.create(createDto, userId);

      expect(result).toEqual(expectedPrinciple);
      expect(mockPrincipleRepository.create).toHaveBeenCalledWith({
        ...createDto,
        metadata: {
          category: 'testing',
          tags: ['test'],
          relatedPrinciples: [],
          examples: [],
        },
        currentVersion: '1.0.0',
      });
      expect(mockPrincipleRepository.save).toHaveBeenCalledWith(
        expectedPrinciple,
      );
    });
  });

  describe('findOne', () => {
    it('should return a principle by slug', async () => {
      const principle = {
        id: 'principle-id',
        slug: 'test-principle',
        title: 'Test Principle',
        description: 'This is a test principle',
        isActive: true,
      };

      mockPrincipleRepository.findOne.mockResolvedValue(principle);

      const result = await service.findOne('test-principle');

      expect(result).toEqual(principle);
      expect(mockPrincipleRepository.findOne).toHaveBeenCalledWith({
        where: { slug: 'test-principle' },
        relations: [
          'performanceStandards',
          'qualityGates',
          'governanceRules',
          'loadTestRequirements',
          'versions',
        ],
      });
    });

    it('should throw NotFoundException when principle is not found', async () => {
      mockPrincipleRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );

      expect(mockPrincipleRepository.findOne).toHaveBeenCalledWith({
        where: { slug: 'non-existent' },
        relations: [
          'performanceStandards',
          'qualityGates',
          'governanceRules',
          'loadTestRequirements',
          'versions',
        ],
      });
    });
  });

  describe('update', () => {
    it('should update a principle', async () => {
      const principleId = 'principle-id';
      const updateDto: UpdatePrincipleDto = {
        title: 'Updated Test Principle',
        description: 'Updated description',
        priority: 2,
      };

      const existingPrinciple = {
        id: principleId,
        slug: 'test-principle',
        title: 'Test Principle',
        description: 'This is a test principle',
        priority: 1,
        currentVersion: '1.0.0',
      };

      const updatedPrinciple = {
        ...existingPrinciple,
        ...updateDto,
        updatedAt: new Date(),
      };

      mockPrincipleRepository.findOne.mockResolvedValue(existingPrinciple);
      mockPrincipleRepository.save.mockResolvedValue(updatedPrinciple);

      const result = await service.update(principleId, updateDto, 'user-id');

      expect(result).toEqual(updatedPrinciple);
      expect(mockPrincipleRepository.findOne).toHaveBeenCalledWith({
        where: { id: principleId },
      });
      expect(mockPrincipleRepository.save).toHaveBeenCalledWith({
        ...existingPrinciple,
        ...updateDto,
      });
    });

    it('should throw NotFoundException when principle to update is not found', async () => {
      const principleId = 'non-existent-id';
      const updateDto = { title: 'Updated' };

      mockPrincipleRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update(principleId, updateDto, 'user-id'),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrincipleRepository.findOne).toHaveBeenCalledWith({
        where: { id: principleId },
      });
    });
  });

  describe('remove', () => {
    it('should soft delete a principle', async () => {
      const principleId = 'principle-id';

      const principle = {
        id: principleId,
        isActive: true,
      };

      mockPrincipleRepository.findOne.mockResolvedValue(principle);
      mockPrincipleRepository.save.mockResolvedValue({
        ...principle,
        isActive: false,
        deletedAt: new Date(),
      });

      await service.remove(principleId);

      expect(mockPrincipleRepository.findOne).toHaveBeenCalledWith({
        where: { id: principleId },
      });
    });

    it('should throw NotFoundException when principle to delete is not found', async () => {
      const principleId = 'non-existent-id';

      mockPrincipleRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(principleId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    beforeEach(() => {
      mockPrincipleRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder(),
      );
    });

    it('should return paginated principles', async () => {
      const searchDto = {
        page: 1,
        limit: 10,
        search: 'test',
        category: 'security',
        isActive: true,
        sortBy: 'title',
        sortOrder: 'asc' as any,
      };

      const principles = [
        { id: '1', title: 'Test Principle 1' },
        { id: '2', title: 'Test Principle 2' },
      ];

      sharedQueryBuilder.getCount.mockResolvedValue(2);
      sharedQueryBuilder.getMany.mockResolvedValue(principles);

      const result = await service.findAll(searchDto);

      expect(result.data).toEqual(principles);
      expect(result.meta).toEqual({
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });
    });

    it('should apply search filter', async () => {
      const searchDto = {
        page: 1,
        limit: 10,
        search: 'security',
      };

      await service.findAll(searchDto);

      expect(sharedQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(principle.title ILIKE :search OR principle.description ILIKE :search)',
        { search: '%security%' },
      );
    });

    it('should apply category filter', async () => {
      const searchDto = {
        page: 1,
        limit: 10,
        category: 'security',
      };

      await service.findAll(searchDto);

      expect(sharedQueryBuilder.andWhere).toHaveBeenCalledWith(
        'principle.metadata->>:category = :categoryValue',
        { category: 'category', categoryValue: 'security' },
      );
    });
  });

  describe('findRelatedPrinciples', () => {
    it('should return related principles', async () => {
      const principleId = 'principle-id';
      const principle = {
        id: principleId,
        metadata: {
          category: 'security',
          tags: ['test'],
        },
      };

      const relatedPrinciples = [
        { id: 'related-1', title: 'Related Principle 1' },
        { id: 'related-2', title: 'Related Principle 2' },
      ];

      sharedQueryBuilder.getMany.mockResolvedValue(relatedPrinciples);
      mockPrincipleRepository.findOne.mockResolvedValue(principle);

      const result = await service.findRelatedPrinciples(principleId);

      expect(result).toEqual(relatedPrinciples);
      expect(sharedQueryBuilder.where).toHaveBeenCalledWith(
        'principle.id != :id',
        { id: principleId },
      );
      expect(sharedQueryBuilder.andWhere).toHaveBeenCalledWith(
        'principle.isActive = :isActive',
        { isActive: true },
      );
      expect(sharedQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(principle.metadata->>:category = :category OR principle.metadata->:tags ?| :tagsArray)',
        {
          category: 'category',
          categoryValue: 'security',
          tags: 'tags',
          tagsArray: ['test'],
        },
      );
    });

    it('should return empty array when no related principles', async () => {
      const principleId = 'principle-id';
      const principle = {
        id: principleId,
        metadata: {
          category: 'security',
          tags: ['test'],
        },
      };

      sharedQueryBuilder.getMany.mockResolvedValue([]);
      mockPrincipleRepository.findOne.mockResolvedValue(principle);

      const result = await service.findRelatedPrinciples(principleId);

      expect(result).toEqual([]);
    });
  });
});

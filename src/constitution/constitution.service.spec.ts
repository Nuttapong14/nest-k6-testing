import { Test, TestingModule } from '@nestjs/testing';
import { ConstitutionService } from './constitution.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Principle } from './entities/principle.entity';
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

  const createQueryBuilderMock = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConstitutionService,
        {
          provide: getRepositoryToken(Principle),
          useValue: mockPrincipleRepository,
        },
      ],
    }).compile();

    service = module.get<ConstitutionService>(ConstitutionService);
    repository = module.get<Repository<Principle>>(getRepositoryToken(Principle));
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

      mockRepository.create.mockReturnValue(expectedPrinciple);
      mockRepository.save.mockResolvedValue(expectedPrinciple);

      const result = await service.create(createDto, userId);

      expect(result).toEqual(expectedPrinciple);
      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createDto,
        isActive: true,
        currentVersion: '1.0.0',
        createdBy: userId,
      });
      expect(mockRepository.save).toHaveBeenCalledWith(expectedPrinciple);
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

      mockRepository.findOne.mockResolvedValue(principle);

      const result = await service.findOne('test-principle');

      expect(result).toEqual(principle);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { slug: 'test-principle', isActive: true },
      });
    });

    it('should throw NotFoundException when principle is not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { slug: 'non-existent', isActive: true },
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

      mockRepository.findOne.mockResolvedValue(existingPrinciple);
      mockRepository.save.mockResolvedValue(updatedPrinciple);

      const result = await service.update(principleId, updateDto, 'user-id');

      expect(result).toEqual(updatedPrinciple);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: principleId },
      });
      expect(mockRepository.save).toHaveBeenCalledWith({
        ...existingPrinciple,
        ...updateDto,
        updatedBy: 'user-id',
      });
    });

    it('should throw NotFoundException when principle to update is not found', async () => {
      const principleId = 'non-existent-id';
      const updateDto = { title: 'Updated' };

      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update(principleId, updateDto, 'user-id'),
      ).rejects.toThrow(NotFoundException);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
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

      mockRepository.findOne.mockResolvedValue(principle);
      mockRepository.save.mockResolvedValue({
        ...principle,
        isActive: false,
        deletedAt: new Date(),
      });

      await service.remove(principleId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: principleId },
      });
    });

    it('should throw NotFoundException when principle to delete is not found', async () => {
      const principleId = 'non-existent-id';

      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(principleId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    const mockQueryBuilder = () => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    });

    beforeEach(() => {
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder());
    });

    it('should return paginated principles', async () => {
      const searchDto = {
        page: 1,
        limit: 10,
        search: 'test',
        category: 'security',
        isActive: true,
        sortBy: 'title',
        sortOrder: 'asc',
      };

      const principles = [
        { id: '1', title: 'Test Principle 1' },
        { id: '2', title: 'Test Principle 2' },
      ];

      const queryBuilder = mockQueryBuilder();
      queryBuilder.getManyAndCount.mockResolvedValue([principles, 2]);

      const result = await service.findAll(searchDto);

      expect(result.data).toEqual(principles);
      expect(result.meta).toEqual({
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      });
    });

    it('should apply search filter', async () => {
      const searchDto = {
        page: 1,
        limit: 10,
        search: 'security',
      };

      const queryBuilder = mockQueryBuilder();
      await service.findAll(searchDto);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
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

      const queryBuilder = mockQueryBuilder();
      await service.findAll(searchDto);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'principle.metadata->>:category = :true',
        { category: 'security', true: 'true' },
      );
    });
  });

  describe('findRelatedPrinciples', () => {
    it('should return related principles', async () => {
      const principleId = 'principle-id';
      const principle = {
        id: principleId,
        metadata: {
          relatedPrinciples: ['related-1', 'related-2'],
        },
      };

      const relatedPrinciples = [
        { id: 'related-1', title: 'Related Principle 1' },
        { id: 'related-2', title: 'Related Principle 2' },
      ];

      const queryBuilder = mockQueryBuilder();
      queryBuilder.getMany.mockResolvedValue(relatedPrinciples);

      mockRepository.findOne.mockResolvedValue(principle);
      mockRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.findRelatedPrinciples(principleId);

      expect(result).toEqual(relatedPrinciples);
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'principle.isActive = :isActive',
        { isActive: true },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'principle.id IN (:...ids)',
        { ids: ['related-1', 'related-2'] },
      );
    });

    it('should return empty array when no related principles', async () => {
      const principleId = 'principle-id';
      const principle = {
        id: principleId,
        metadata: {
          relatedPrinciples: [],
        },
      };

      mockRepository.findOne.mockResolvedValue(principle);

      const result = await service.findRelatedPrinciples(principleId);

      expect(result).toEqual([]);
    });
  });
});
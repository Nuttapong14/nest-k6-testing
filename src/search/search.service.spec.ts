import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Principle } from '../constitution/entities/principle.entity';
import { PerformanceStandard } from '../constitution/entities/performance-standard.entity';
import { QualityGate } from '../constitution/entities/quality-gate.entity';
import { GovernanceRule } from '../constitution/entities/governance-rule.entity';
import { SearchDto, SearchType, SortBy, SortOrder } from './dto/search.dto';

describe('SearchService', () => {
  let service: SearchService;
  let principleRepository: Repository<Principle>;
  let standardRepository: Repository<PerformanceStandard>;
  let gateRepository: Repository<QualityGate>;
  let ruleRepository: Repository<GovernanceRule>;

  const mockPrincipleRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockStandardRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockGateRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockRuleRepository = {
    createQueryBuilder: jest.fn(),
  };

  const createQueryBuilderMock = () => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: getRepositoryToken(Principle),
          useValue: mockPrincipleRepository,
        },
        {
          provide: getRepositoryToken(PerformanceStandard),
          useValue: mockStandardRepository,
        },
        {
          provide: getRepositoryToken(QualityGate),
          useValue: mockGateRepository,
        },
        {
          provide: getRepositoryToken(GovernanceRule),
          useValue: mockRuleRepository,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    principleRepository = module.get<Repository<Principle>>(
      getRepositoryToken(Principle),
    );
    standardRepository = module.get<Repository<PerformanceStandard>>(
      getRepositoryToken(PerformanceStandard),
    );
    gateRepository = module.get<Repository<QualityGate>>(
      getRepositoryToken(QualityGate),
    );
    ruleRepository = module.get<Repository<GovernanceRule>>(
      getRepositoryToken(GovernanceRule),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('search', () => {
    it('should search across all item types', async () => {
      const searchDto: SearchDto = {
        query: 'test',
        type: SearchType.ALL,
        page: 1,
        limit: 10,
      };

      const principles = [
        {
          id: 'p1',
          title: 'Test Principle',
          description: 'A test principle',
          priority: 5,
          metadata: { category: 'test' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const standards = [
        {
          id: 's1',
          endpointType: 'test-endpoint',
          description: 'Test standard',
          principle: { priority: 5 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const principleQueryBuilder = createQueryBuilderMock();
      const standardQueryBuilder = createQueryBuilderMock();
      const gateQueryBuilder = createQueryBuilderMock();
      const ruleQueryBuilder = createQueryBuilderMock();

      principleQueryBuilder.getMany.mockResolvedValue(principles);
      standardQueryBuilder.getMany.mockResolvedValue(standards);
      gateQueryBuilder.getMany.mockResolvedValue([]);
      ruleQueryBuilder.getMany.mockResolvedValue([]);

      mockPrincipleRepository.createQueryBuilder.mockReturnValue(
        principleQueryBuilder,
      );
      mockStandardRepository.createQueryBuilder.mockReturnValue(
        standardQueryBuilder,
      );
      mockGateRepository.createQueryBuilder.mockReturnValue(gateQueryBuilder);
      mockRuleRepository.createQueryBuilder.mockReturnValue(ruleQueryBuilder);

      const result = await service.search(searchDto);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].type).toBe('standard');
      expect(result.data[1].type).toBe('principle');
      expect(result.meta.total).toBe(2);
    });

    it('should search only principles when type is PRINCIPLES', async () => {
      const searchDto: SearchDto = {
        query: 'test',
        type: SearchType.PRINCIPLES,
        page: 1,
        limit: 10,
      };

      const principles = [
        {
          id: 'p1',
          title: 'Test Principle',
          description: 'A test principle',
          priority: 5,
          metadata: { category: 'test' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const principleQueryBuilder = createQueryBuilderMock();
      principleQueryBuilder.getMany.mockResolvedValue(principles);

      mockPrincipleRepository.createQueryBuilder.mockReturnValue(
        principleQueryBuilder,
      );

      const result = await service.search(searchDto);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].type).toBe('principle');
      expect(mockStandardRepository.createQueryBuilder).not.toHaveBeenCalled();
      expect(mockGateRepository.createQueryBuilder).not.toHaveBeenCalled();
      expect(mockRuleRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should apply text search filter', async () => {
      const searchDto: SearchDto = {
        query: 'security',
        type: SearchType.PRINCIPLES,
      };

      const principleQueryBuilder = createQueryBuilderMock();
      principleQueryBuilder.getMany.mockResolvedValue([]);

      mockPrincipleRepository.createQueryBuilder.mockReturnValue(
        principleQueryBuilder,
      );

      await service.search(searchDto);

      expect(principleQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(principle.title ILIKE :query OR principle.description ILIKE :query)',
        { query: '%security%' },
      );
    });

    it('should apply category filter', async () => {
      const searchDto: SearchDto = {
        category: 'security',
        type: SearchType.PRINCIPLES,
      };

      const principleQueryBuilder = createQueryBuilderMock();
      principleQueryBuilder.getMany.mockResolvedValue([]);

      mockPrincipleRepository.createQueryBuilder.mockReturnValue(
        principleQueryBuilder,
      );

      await service.search(searchDto);

      expect(principleQueryBuilder.andWhere).toHaveBeenCalledWith(
        `principle.metadata->>'category' = :category`,
        { category: 'security' },
      );
    });

    it('should apply tags filter', async () => {
      const searchDto: SearchDto = {
        tags: ['security', 'auth'],
        type: SearchType.PRINCIPLES,
      };

      const principleQueryBuilder = createQueryBuilderMock();
      principleQueryBuilder.getMany.mockResolvedValue([]);

      mockPrincipleRepository.createQueryBuilder.mockReturnValue(
        principleQueryBuilder,
      );

      await service.search(searchDto);

      expect(principleQueryBuilder.andWhere).toHaveBeenCalledWith(
        `principle.metadata->'tags' ?| ARRAY[:...tags]::text[]`,
        { tags: ['security', 'auth'] },
      );
    });

    it('should apply priority range filter', async () => {
      const searchDto: SearchDto = {
        minPriority: 3,
        maxPriority: 7,
        type: SearchType.PRINCIPLES,
      };

      const principleQueryBuilder = createQueryBuilderMock();
      principleQueryBuilder.getMany.mockResolvedValue([]);

      mockPrincipleRepository.createQueryBuilder.mockReturnValue(
        principleQueryBuilder,
      );

      await service.search(searchDto);

      expect(principleQueryBuilder.andWhere).toHaveBeenCalledWith(
        'principle.priority BETWEEN :min AND :max',
        { min: 3, max: 7 },
      );
    });

    it('should sort results by relevance when searching with query', async () => {
      const searchDto: SearchDto = {
        query: 'test',
        sortBy: SortBy.RELEVANCE,
        sortOrder: SortOrder.ASC,
        type: SearchType.PRINCIPLES,
      };

      const principles = [
        {
          id: 'p1',
          title: 'Test', // Higher relevance
          description: 'Test principle',
          priority: 5,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'p2',
          title: 'Other',
          description: 'Other principle',
          priority: 10, // Higher priority
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const principleQueryBuilder = createQueryBuilderMock();
      principleQueryBuilder.getMany.mockResolvedValue(principles);

      mockPrincipleRepository.createQueryBuilder.mockReturnValue(
        principleQueryBuilder,
      );

      const result = await service.search(searchDto);

      expect(result.data[0].title).toBe('Test'); // Should come first due to relevance
      expect(result.data[0].relevanceScore).toBeGreaterThan(
        result.data[1].relevanceScore,
      );
    });

    it('should sort results by priority when sorting by PRIORITY', async () => {
      const searchDto: SearchDto = {
        sortBy: SortBy.PRIORITY,
        sortOrder: SortOrder.ASC,
        type: SearchType.PRINCIPLES,
      };

      const principles = [
        {
          id: 'p1',
          title: 'Low Priority',
          description: 'Test principle',
          priority: 3,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'p2',
          title: 'High Priority',
          description: 'Test principle',
          priority: 8,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const principleQueryBuilder = createQueryBuilderMock();
      principleQueryBuilder.getMany.mockResolvedValue(principles);

      mockPrincipleRepository.createQueryBuilder.mockReturnValue(
        principleQueryBuilder,
      );

      const result = await service.search(searchDto);

      expect(result.data[0].title).toBe('High Priority'); // Should come first
    });

    it('should paginate results correctly', async () => {
      const searchDto: SearchDto = {
        page: 2,
        limit: 5,
        type: SearchType.PRINCIPLES,
      };

      const principles = Array.from({ length: 10 }, (_, i) => ({
        id: `p${i}`,
        title: `Principle ${i}`,
        description: 'Test principle',
        priority: 5,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const principleQueryBuilder = createQueryBuilderMock();
      principleQueryBuilder.getMany.mockResolvedValue(principles);

      mockPrincipleRepository.createQueryBuilder.mockReturnValue(
        principleQueryBuilder,
      );

      const result = await service.search(searchDto);

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(5);
      expect(result.meta.total).toBe(10);
      expect(result.meta.totalPages).toBe(2);
      expect(result.meta.hasNextPage).toBe(false);
      expect(result.meta.hasPrevPage).toBe(true);
    });
  });

  describe('calculateRelevanceScore', () => {
    it('should give higher score for title matches', () => {
      const item = {
        title: 'Test Security Principle',
        description: 'This is a principle',
        priority: 5,
      };

      const service = new SearchService(
        null as any,
        null as any,
        null as any,
        null as any,
      );

      // Access private method through prototype
      const score = (service as any).calculateRelevanceScore(item, 'security');

      expect(score).toBeGreaterThan(10); // Title match should give at least 10 points
    });

    it('should give moderate score for description matches', () => {
      const item = {
        title: 'Generic Principle',
        description: 'This is about security and authentication',
        priority: 5,
      };

      const service = new SearchService(
        null as any,
        null as any,
        null as any,
        null as any,
      );

      const score = (service as any).calculateRelevanceScore(item, 'security');

      expect(score).toBeGreaterThan(5); // Description match should give at least 5 points
      expect(score).toBeLessThan(10); // But less than title match
    });

    it('should include priority in relevance score', () => {
      const item1 = {
        title: 'Test Principle',
        description: 'Test description',
        priority: 8,
      };

      const item2 = {
        title: 'Test Principle',
        description: 'Test description',
        priority: 3,
      };

      const service = new SearchService(
        null as any,
        null as any,
        null as any,
        null as any,
      );

      const score1 = (service as any).calculateRelevanceScore(item1, 'test');
      const score2 = (service as any).calculateRelevanceScore(item2, 'test');

      expect(score1).toBeGreaterThan(score2); // Higher priority should have higher score
    });
  });

  describe('generateHighlights', () => {
    it('should extract relevant sentences as highlights', () => {
      const text =
        'This is the first sentence. This sentence contains security. Another sentence about authentication.';
      const query = 'security authentication';

      const service = new SearchService(
        null as any,
        null as any,
        null as any,
        null as any,
      );

      const highlights = (service as any).generateHighlights(text, query);

      expect(highlights).toHaveLength(2);
      expect(highlights[0]).toContain('security');
      expect(highlights[1]).toContain('authentication');
    });

    it('should limit highlights to 3 maximum', () => {
      const text =
        'Sentence 1 about security. Sentence 2 about security. Sentence 3 about security. Sentence 4 about security. Sentence 5 about security.';
      const query = 'security';

      const service = new SearchService(
        null as any,
        null as any,
        null as any,
        null as any,
      );

      const highlights = (service as any).generateHighlights(text, query);

      expect(highlights).toHaveLength(3); // Should limit to 3 highlights
    });
  });
});

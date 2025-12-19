import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, Between, Like } from 'typeorm';
import { Principle } from '../constitution/entities/principle.entity';
import { PerformanceStandard } from '../constitution/entities/performance-standard.entity';
import { QualityGate } from '../constitution/entities/quality-gate.entity';
import { GovernanceRule } from '../constitution/entities/governance-rule.entity';
import {
  SearchDto,
  SearchResultDto,
  PaginatedSearchResultDto,
  SearchType,
  SortBy,
  SortOrder,
} from './dto/search.dto';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Principle)
    private readonly principleRepository: Repository<Principle>,
    @InjectRepository(PerformanceStandard)
    private readonly performanceStandardRepository: Repository<PerformanceStandard>,
    @InjectRepository(QualityGate)
    private readonly qualityGateRepository: Repository<QualityGate>,
    @InjectRepository(GovernanceRule)
    private readonly governanceRuleRepository: Repository<GovernanceRule>,
  ) {}

  async search(searchDto: SearchDto): Promise<PaginatedSearchResultDto> {
    const {
      query,
      type,
      category,
      tags,
      minPriority,
      maxPriority,
      sortBy,
      sortOrder,
      page = 1,
      limit = 20,
    } = searchDto;

    const offset = (page - 1) * limit;
    let allResults: SearchResultDto[] = [];

    // Search based on type
    if (type === SearchType.ALL || type === SearchType.PRINCIPLES) {
      const principles = await this.searchPrinciples(
        query,
        category,
        tags,
        minPriority,
        maxPriority,
      );
      allResults.push(
        ...principles.map((p) => this.mapPrincipleToSearchResult(p, query)),
      );
    }

    if (type === SearchType.ALL || type === SearchType.STANDARDS) {
      const standards = await this.searchPerformanceStandards(
        query,
        category,
        tags,
        minPriority,
        maxPriority,
      );
      allResults.push(
        ...standards.map((s) => this.mapStandardToSearchResult(s, query)),
      );
    }

    if (type === SearchType.ALL || type === SearchType.GATES) {
      const gates = await this.searchQualityGates(
        query,
        category,
        tags,
        minPriority,
        maxPriority,
      );
      allResults.push(
        ...gates.map((g) => this.mapGateToSearchResult(g, query)),
      );
    }

    if (type === SearchType.ALL || type === SearchType.RULES) {
      const rules = await this.searchGovernanceRules(
        query,
        category,
        tags,
        minPriority,
        maxPriority,
      );
      allResults.push(
        ...rules.map((r) => this.mapRuleToSearchResult(r, query)),
      );
    }

    // Sort results
    allResults = this.sortResults(allResults, sortBy || SortBy.RELEVANCE, sortOrder || SortOrder.DESC, query);

    // Paginate
    const total = allResults.length;
    const paginatedResults = allResults.slice(offset, offset + limit);

    return {
      data: paginatedResults,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: offset + limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  private async searchPrinciples(
    query?: string,
    category?: string,
    tags?: string[],
    minPriority?: number,
    maxPriority?: number,
  ): Promise<Principle[]> {
    const queryBuilder = this.principleRepository
      .createQueryBuilder('principle')
      .where('principle.isActive = :isActive', { isActive: true });

    // Apply text search
    if (query) {
      queryBuilder.andWhere(
        '(principle.title ILIKE :query OR principle.description ILIKE :query)',
        { query: `%${query}%` },
      );
    }

    // Apply category filter
    if (category) {
      queryBuilder.andWhere(`principle.metadata->>'category' = :category`, {
        category,
      });
    }

    // Apply tags filter
    if (tags && tags.length > 0) {
      queryBuilder.andWhere(
        `principle.metadata->'tags' ?| ARRAY[:...tags]::text[]`,
        { tags },
      );
    }

    // Apply priority range
    if (minPriority || maxPriority) {
      queryBuilder.andWhere('principle.priority BETWEEN :min AND :max', {
        min: minPriority || 1,
        max: maxPriority || 10,
      });
    }

    return queryBuilder.getMany();
  }

  private async searchPerformanceStandards(
    query?: string,
    category?: string,
    tags?: string[],
    minPriority?: number,
    maxPriority?: number,
  ): Promise<PerformanceStandard[]> {
    const queryBuilder = this.performanceStandardRepository
      .createQueryBuilder('standard')
      .leftJoin('standard.principle', 'principle')
      .where('standard.isActive = :isActive', { isActive: true });

    // Apply text search
    if (query) {
      queryBuilder.andWhere(
        '(standard.name ILIKE :query OR standard.endpointType ILIKE :query OR standard.description ILIKE :query)',
        { query: `%${query}%` },
      );
    }

    // Apply category filter (endpoint type or linked principle category)
    if (category) {
      queryBuilder.andWhere(
        `(standard.endpointType = :category OR principle.metadata->>'category' = :category)`,
        { category },
      );
    }

    // Apply tags filter via linked principle tags
    if (tags && tags.length > 0) {
      queryBuilder.andWhere(`principle.metadata->'tags' ?| ARRAY[:...tags]::text[]`, {
        tags,
      });
    }

    // Apply priority range (from associated principle)
    if (minPriority || maxPriority) {
      queryBuilder.andWhere('principle.priority BETWEEN :min AND :max', {
        min: minPriority || 1,
        max: maxPriority || 10,
      });
    }

    return queryBuilder.getMany();
  }

  private async searchQualityGates(
    query?: string,
    category?: string,
    tags?: string[],
    minPriority?: number,
    maxPriority?: number,
  ): Promise<QualityGate[]> {
    const queryBuilder = this.qualityGateRepository
      .createQueryBuilder('gate')
      .leftJoin('gate.principle', 'principle')
      .where('gate.isActive = :isActive', { isActive: true });

    // Apply text search
    if (query) {
      queryBuilder.andWhere(
        '(gate.name ILIKE :query OR gate.requirement ILIKE :query OR gate.tool ILIKE :query OR CAST(gate.criteria AS TEXT) ILIKE :query)',
        { query: `%${query}%` },
      );
    }

    // Apply category filter
    if (category) {
      if (category === 'automated' || category === 'manual') {
        queryBuilder.andWhere('gate.type = :category', { category });
      } else {
        queryBuilder.andWhere(`principle.metadata->>'category' = :category`, {
          category,
        });
      }
    }

    // Apply tags filter via linked principle tags
    if (tags && tags.length > 0) {
      queryBuilder.andWhere(`principle.metadata->'tags' ?| ARRAY[:...tags]::text[]`, {
        tags,
      });
    }

    // Apply priority range (from associated principle)
    if (minPriority || maxPriority) {
      queryBuilder.andWhere('principle.priority BETWEEN :min AND :max', {
        min: minPriority || 1,
        max: maxPriority || 10,
      });
    }

    return queryBuilder.getMany();
  }

  private async searchGovernanceRules(
    query?: string,
    category?: string,
    tags?: string[],
    minPriority?: number,
    maxPriority?: number,
  ): Promise<GovernanceRule[]> {
    const queryBuilder = this.governanceRuleRepository
      .createQueryBuilder('rule')
      .leftJoin('rule.principle', 'principle')
      .where('rule.isActive = :isActive', { isActive: true });

    // Apply text search
    if (query) {
      queryBuilder.andWhere(
        '(rule.title ILIKE :query OR rule.description ILIKE :query OR CAST(rule.parameters AS TEXT) ILIKE :query OR CAST(rule.ruleType AS TEXT) ILIKE :query)',
        { query: `%${query}%` },
      );
    }

    // Apply category filter
    if (category) {
      const ruleTypes = ['amendment', 'compliance', 'approval', 'enforcement'];
      if (ruleTypes.includes(category)) {
        queryBuilder.andWhere('rule.ruleType = :category', { category });
      } else {
        queryBuilder.andWhere(`principle.metadata->>'category' = :category`, {
          category,
        });
      }
    }

    // Apply tags filter via linked principle tags
    if (tags && tags.length > 0) {
      queryBuilder.andWhere(`principle.metadata->'tags' ?| ARRAY[:...tags]::text[]`, {
        tags,
      });
    }

    // Apply priority range (from associated principle)
    if (minPriority || maxPriority) {
      queryBuilder.andWhere('principle.priority BETWEEN :min AND :max', {
        min: minPriority || 1,
        max: maxPriority || 10,
      });
    }

    return queryBuilder.getMany();
  }

  private sortResults(
    results: SearchResultDto[],
    sortBy: SortBy,
    sortOrder: SortOrder,
    query?: string,
  ): SearchResultDto[] {
    const multiplier = sortOrder === SortOrder.ASC ? 1 : -1;

    return results.sort((a, b) => {
      switch (sortBy) {
        case SortBy.RELEVANCE:
          if (query) {
            return (b.relevanceScore - a.relevanceScore) * multiplier;
          }
          return (b.priority - a.priority) * multiplier;
        case SortBy.PRIORITY:
          return (b.priority - a.priority) * multiplier;
        case SortBy.TITLE:
          return a.title.localeCompare(b.title) * multiplier;
        case SortBy.CREATED_AT:
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          ) * multiplier;
        case SortBy.UPDATED_AT:
          return (
            new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
          ) * multiplier;
        default:
          return 0;
      }
    });
  }

  private calculateRelevanceScore(
    item: any,
    query?: string,
  ): number {
    if (!query) return item.priority || 5;

    const queryLower = query.toLowerCase();
    let score = 0;

    // Title matches get highest score
    if (item.title && item.title.toLowerCase().includes(queryLower)) {
      score += 10;
    }

    // Description matches get medium score
    if (item.description && item.description.toLowerCase().includes(queryLower)) {
      score += 5;
    }

    // Priority adds to score
    score += (item.priority || 5) * 0.5;

    return score;
  }

  private generateHighlights(text: string, query: string): string[] {
    if (!query) return [];

    const words = query.toLowerCase().split(' ');
    const sentences = text.split(/[.!?]+/);
    const highlights: string[] = [];

    sentences.forEach((sentence) => {
      const sentenceLower = sentence.toLowerCase();
      if (words.some((word) => sentenceLower.includes(word))) {
        highlights.push(sentence.trim());
      }
    });

    return highlights.slice(0, 3); // Return max 3 highlights
  }

  private mapPrincipleToSearchResult(
    principle: Principle,
    query?: string,
  ): SearchResultDto {
    return {
      type: 'principle',
      id: principle.id,
      slug: principle.slug,
      title: principle.title,
      description: principle.description,
      priority: principle.priority,
      relevanceScore: this.calculateRelevanceScore(principle, query),
      highlights: this.generateHighlights(principle.description || '', query || ''),
      metadata: principle.metadata,
      createdAt: principle.createdAt,
      updatedAt: principle.updatedAt,
    };
  }

  private mapStandardToSearchResult(
    standard: PerformanceStandard,
    query?: string,
  ): SearchResultDto {
    return {
      type: 'standard',
      id: standard.id,
      title: `${standard.endpointType} - ${standard.targetResponseTime}ms`,
      description: standard.description || `Performance standard for ${standard.endpointType}`,
      priority: standard.principle?.priority || 5,
      relevanceScore: this.calculateRelevanceScore(standard, query),
      highlights: this.generateHighlights(standard.description || '', query || ''),
      metadata: {
        name: standard.name,
        endpointType: standard.endpointType,
        targetResponseTime: standard.targetResponseTime,
        metricType: standard.metricType,
        concurrentUsers: standard.concurrentUsers,
      },
      createdAt: standard.createdAt,
      updatedAt: standard.updatedAt,
    };
  }

  private mapGateToSearchResult(
    gate: QualityGate,
    query?: string,
  ): SearchResultDto {
    return {
      type: 'gate',
      id: gate.id,
      title: gate.name,
      description: gate.requirement,
      priority: gate.principle?.priority || 5,
      relevanceScore: this.calculateRelevanceScore(gate, query),
      highlights: this.generateHighlights(
        `${gate.requirement} ${JSON.stringify(gate.criteria)}`,
        query || '',
      ),
      metadata: {
        type: gate.type,
        tool: gate.tool,
        criteria: gate.criteria,
      },
      createdAt: gate.createdAt,
      updatedAt: gate.updatedAt,
    };
  }

  private mapRuleToSearchResult(
    rule: GovernanceRule,
    query?: string,
  ): SearchResultDto {
    return {
      type: 'rule',
      id: rule.id,
      title: rule.title,
      description: rule.description,
      priority: rule.principle?.priority || 5,
      relevanceScore: this.calculateRelevanceScore(rule, query),
      highlights: this.generateHighlights(
        `${rule.description} ${rule.ruleType}`,
        query || '',
      ),
      metadata: {
        ruleType: rule.ruleType,
        parameters: rule.parameters,
        isActive: rule.isActive,
      },
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }
}

import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsInt,
  Min,
  Max,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SearchType {
  ALL = 'all',
  PRINCIPLES = 'principles',
  STANDARDS = 'standards',
  GATES = 'gates',
  RULES = 'rules',
}

export enum SortBy {
  RELEVANCE = 'relevance',
  PRIORITY = 'priority',
  TITLE = 'title',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class SearchDto {
  @ApiPropertyOptional({
    description: 'Search query string',
    example: 'performance testing',
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({
    description: 'Type of items to search',
    enum: SearchType,
    default: SearchType.ALL,
  })
  @IsOptional()
  @IsEnum(SearchType)
  type?: SearchType = SearchType.ALL;

  @ApiPropertyOptional({
    description: 'Category filter',
    example: 'security',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Tags to filter by',
    type: [String],
    example: ['authentication', 'security'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Minimum priority level',
    minimum: 1,
    maximum: 10,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  minPriority?: number = 1;

  @ApiPropertyOptional({
    description: 'Maximum priority level',
    minimum: 1,
    maximum: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  maxPriority?: number = 10;

  @ApiPropertyOptional({
    description: 'Sort results by',
    enum: SortBy,
    default: SortBy.RELEVANCE,
  })
  @IsOptional()
  @IsEnum(SortBy)
  sortBy?: SortBy = SortBy.RELEVANCE;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: SortOrder,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional({
    description: 'Page number',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class SearchResultDto {
  @ApiProperty({
    description: 'Item type',
    enum: ['principle', 'standard', 'gate', 'rule'],
  })
  type: string;

  @ApiProperty()
  id: string;

  @ApiProperty()
  slug?: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  priority: number;

  @ApiProperty()
  relevanceScore: number;

  @ApiProperty()
  highlights: string[];

  @ApiProperty()
  metadata?: Record<string, any>;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PaginatedSearchResultDto {
  @ApiProperty({
    type: [SearchResultDto],
    description: 'Search results',
  })
  data: SearchResultDto[];

  @ApiProperty({
    description: 'Pagination metadata',
  })
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsArray,
  IsObject,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export interface PrincipleExample {
  type: 'code' | 'diagram' | 'text';
  title: string;
  content: string;
  language?: string;
}

export interface PrincipleMetadata {
  category: string;
  tags: string[];
  relatedPrinciples: string[];
  examples: PrincipleExample[];
}

export class PrincipleDto {
  @ApiProperty({ description: 'Principle unique identifier' })
  id: string;

  @ApiProperty({ description: 'Unique slug for URL' })
  slug: string;

  @ApiProperty({ description: 'Principle title' })
  title: string;

  @ApiProperty({ description: 'Detailed description' })
  description: string;

  @ApiProperty({ description: 'Priority (1 = highest)', default: 1 })
  @IsInt()
  @Min(1)
  @Max(5)
  priority: number;

  @ApiProperty({ description: 'Additional metadata' })
  metadata: PrincipleMetadata;

  @ApiProperty({ description: 'Whether principle is active', default: true })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({ description: 'Current semantic version' })
  currentVersion: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export class CreatePrincipleDto {
  @ApiProperty({
    description: 'Unique slug for URL (lowercase, hyphen-separated)',
  })
  @IsString()
  slug: string;

  @ApiProperty({ description: 'Principle title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Detailed description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Priority (1 = highest)', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  priority?: number = 1;

  @ApiProperty({
    description: 'Additional metadata including category, tags, examples',
    example: {
      category: 'api',
      tags: ['rest', 'api'],
      relatedPrinciples: ['database-integration'],
      examples: [],
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: Partial<PrincipleMetadata>;
}

export class UpdatePrincipleDto {
  @ApiProperty({
    description: 'Unique slug for URL (lowercase, hyphen-separated)',
    required: false,
  })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({ description: 'Principle title', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'Detailed description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Priority (1 = highest)', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  priority?: number;

  @ApiProperty({ description: 'Additional metadata', required: false })
  @IsOptional()
  @IsObject()
  metadata?: Partial<PrincipleMetadata>;

  @ApiProperty({ description: 'Whether principle is active', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SearchPrinciplesDto {
  @ApiProperty({
    description: 'Search term for title and description',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ description: 'Filter by category', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({
    description: 'Filter by tags',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

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

  @ApiProperty({
    description: 'Sort by field (title, priority, createdAt)',
    required: false,
  })
  @IsOptional()
  @IsEnum(['title', 'priority', 'createdAt', 'updatedAt'])
  sortBy?: string = 'priority';

  @ApiProperty({ description: 'Sort order (asc or desc)', required: false })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'asc';
}

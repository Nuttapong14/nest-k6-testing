import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SearchService } from './search.service';
import {
  SearchDto,
  PaginatedSearchResultDto,
  SearchType,
} from './dto/search.dto';

@ApiTags('Search')
@Controller('items')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({
    summary: 'Search across all constitution items',
    description: 'Search principles, performance standards, quality gates, and governance rules with advanced filtering'
  })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
    type: PaginatedSearchResultDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async search(@Query() searchDto: SearchDto): Promise<PaginatedSearchResultDto> {
    return this.searchService.search(searchDto);
  }

  @Get('principles')
  @ApiOperation({
    summary: 'Search principles only',
    description: 'Search within principles with advanced filtering'
  })
  @ApiResponse({
    status: 200,
    description: 'Principle search results retrieved successfully',
    type: PaginatedSearchResultDto,
  })
  async searchPrinciples(
    @Query() searchDto: SearchDto,
  ): Promise<PaginatedSearchResultDto> {
    return this.searchService.search({
      ...searchDto,
      type: SearchType.PRINCIPLES,
    });
  }

  @Get('standards')
  @ApiOperation({
    summary: 'Search performance standards only',
    description: 'Search within performance standards with advanced filtering'
  })
  @ApiResponse({
    status: 200,
    description: 'Performance standards search results retrieved successfully',
    type: PaginatedSearchResultDto,
  })
  async searchStandards(
    @Query() searchDto: SearchDto,
  ): Promise<PaginatedSearchResultDto> {
    return this.searchService.search({
      ...searchDto,
      type: SearchType.STANDARDS,
    });
  }

  @Get('gates')
  @ApiOperation({
    summary: 'Search quality gates only',
    description: 'Search within quality gates with advanced filtering'
  })
  @ApiResponse({
    status: 200,
    description: 'Quality gates search results retrieved successfully',
    type: PaginatedSearchResultDto,
  })
  async searchGates(
    @Query() searchDto: SearchDto,
  ): Promise<PaginatedSearchResultDto> {
    return this.searchService.search({
      ...searchDto,
      type: SearchType.GATES,
    });
  }

  @Get('rules')
  @ApiOperation({
    summary: 'Search governance rules only',
    description: 'Search within governance rules with advanced filtering'
  })
  @ApiResponse({
    status: 200,
    description: 'Governance rules search results retrieved successfully',
    type: PaginatedSearchResultDto,
  })
  async searchRules(
    @Query() searchDto: SearchDto,
  ): Promise<PaginatedSearchResultDto> {
    return this.searchService.search({
      ...searchDto,
      type: SearchType.RULES,
    });
  }
}
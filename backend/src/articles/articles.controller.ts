import { Controller, Get, Query } from '@nestjs/common';
import {
    ArticlesService,
    Article,
    PaginatedArticlesResult,
} from './articles.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DateRangeDto } from './dtos/time-range.dto';
import { PaginationDto } from './dtos/pagination.dto';
import { PaginatedArticlesResponseDto } from './dtos/pagination-response.dto';

@ApiTags('articles')
@Controller('articles')
export class ArticlesController {
    constructor(private readonly articlesService: ArticlesService) {}

    @ApiOperation({ summary: 'Get all articles with pagination' })
    @ApiResponse({
        status: 200,
        description: 'Returns paginated articles',
        type: PaginatedArticlesResponseDto,
    })
    @Get()
    async getAllArticles(
        @Query() paginationDto: PaginationDto,
    ): Promise<PaginatedArticlesResult> {
        return this.articlesService.getAllArticles(
            paginationDto.page,
            paginationDto.pageSize,
        );
    }

    @ApiOperation({ summary: 'Get articles by date range' })
    @ApiResponse({
        status: 200,
        description: 'Returns articles filtered by date range',
        schema: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    url: { type: 'string' },
                    title: { type: 'string' },
                    content: { type: 'string' },
                },
            },
        },
    })
    @Get('filter')
    async getArticlesByDateRange(
        @Query() dateRange: DateRangeDto,
    ): Promise<Article[]> {
        return this.articlesService.getArticlesBetweenDates(
            dateRange.startTime,
            dateRange.endTime,
        );
    }

    @ApiOperation({ summary: 'Get articles by date range with pagination' })
    @ApiResponse({
        status: 200,
        description: 'Returns paginated articles filtered by date range',
        type: PaginatedArticlesResponseDto,
    })
    @Get('filter/paginated')
    async getArticlesByDateRangePaginated(
        @Query() dateRange: DateRangeDto,
        @Query() paginationDto: PaginationDto,
    ): Promise<PaginatedArticlesResult> {
        return this.articlesService.getArticlesBetweenDatesWithPagination(
            dateRange.startTime,
            dateRange.endTime,
            paginationDto.page,
            paginationDto.pageSize,
        );
    }
}

import { Controller, Get, Query } from '@nestjs/common';
import { ArticlesService, PaginatedArticlesResult } from './articles.service';
import { ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DateRangePaginationDto } from './dtos/time-range.dto';
import { PaginationDto } from './dtos/pagination.dto';
import { PaginatedArticlesResponseDto } from './dtos/pagination-response.dto';

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
    @ApiOperation({ summary: 'Get articles by date range with pagination' })
    @ApiResponse({
        status: 200,
        description: 'Returns paginated articles filtered by date range',
        type: PaginatedArticlesResponseDto,
    })
    @Get('time')
    async getArticlesByDateRangePaginated(
        @Query() query: DateRangePaginationDto,
    ): Promise<PaginatedArticlesResult> {
        return this.articlesService.getArticlesBetweenDatesWithPagination(
            query.startTime,
            query.endTime,
            query.page,
            query.pageSize,
        );
    }

    @ApiOperation({ summary: 'Get latest articles' })
    @ApiResponse({
        status: 200,
        description: 'Returns the latest articles sorted by publish date',
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Maximum number of articles to return',
    })
    @Get('latest')
    async getLatestArticles(
        @Query('limit') limit: number = 10,
    ): Promise<any[]> {
        return this.articlesService.getLatestArticles(limit);
    }
}

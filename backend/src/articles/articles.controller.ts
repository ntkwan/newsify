import { Controller, Get, Query, Param } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { DateRangePaginationDto } from './dtos/time-range.dto';
import { PaginationDto } from './dtos/pagination.dto';
import { PaginatedArticlesResponseDto } from './dtos/paginated-articles-response.dto';
import { CategoryPaginationDto } from './dtos/category-pagination.dto';
import { ArticleResponseDto } from './dtos/article-response.dto';
import { TrendingPaginationDto } from './dtos/trending-pagination.dto';

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
    ): Promise<PaginatedArticlesResponseDto> {
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
    ): Promise<PaginatedArticlesResponseDto> {
        return this.articlesService.getArticlesBetweenDatesWithPagination(
            query.startTime,
            query.endTime,
            query.page,
            query.pageSize,
        );
    }

    @ApiOperation({ summary: 'Get articles by category with pagination' })
    @ApiResponse({
        status: 200,
        description: 'Returns paginated articles filtered by main category',
        type: PaginatedArticlesResponseDto,
    })
    @Get('categories')
    async getArticlesByCategory(
        @Query() query: CategoryPaginationDto,
    ): Promise<PaginatedArticlesResponseDto> {
        return this.articlesService.getArticlesByCategory(
            query.category,
            query.page,
            query.pageSize,
        );
    }

    @ApiOperation({
        summary: 'Get trending articles sorted by similarity score',
    })
    @ApiResponse({
        status: 200,
        description: 'Returns trending articles sorted by similarity score',
        type: PaginatedArticlesResponseDto,
    })
    @Get('trending')
    async getTrendingArticles(
        @Query() query: TrendingPaginationDto,
    ): Promise<PaginatedArticlesResponseDto> {
        if (query.category) {
            return this.articlesService.getTrendingArticlesByCategory(
                query.category,
                query.page,
                query.pageSize,
                query.minScore || 0,
            );
        }

        return this.articlesService.getTrendingArticles(
            query.page,
            query.pageSize,
            query.minScore || 0,
        );
    }

    @ApiOperation({
        summary: 'Get article by ID with auto-generated summary if needed',
    })
    @ApiResponse({
        status: 200,
        description: 'Returns a single article by ID',
        type: ArticleResponseDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Article not found',
    })
    @ApiParam({
        name: 'id',
        description: 'Article ID (trending_id)',
        type: String,
    })
    @Get(':id')
    async getArticleById(@Param('id') id: string): Promise<ArticleResponseDto> {
        return this.articlesService.getArticleById(id);
    }
}

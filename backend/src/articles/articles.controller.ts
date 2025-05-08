import { Controller, Get, Query, Param } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { DateRangePaginationDto } from './dtos/time-range.dto';
import { PaginationDto } from './dtos/pagination.dto';
import { PaginatedArticlesResponseDto } from './dtos/paginated-articles-response.dto';
import { CategoryPaginationDto } from './dtos/category-pagination.dto';
import { TrendingPaginationDto } from './dtos/trending-pagination.dto';
import { SearchService } from '../search/search.service';
import { SearchResponseDto } from '../search/dtos/search-response.dto';
import { ArticleResponseDto } from './dtos/article-response.dto';

@Controller('articles')
export class ArticlesController {
    constructor(
        private readonly articlesService: ArticlesService,
        private readonly searchService: SearchService,
    ) {}

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

    @ApiOperation({
        summary: 'Search articles by title and content with relevance ranking',
    })
    @ApiResponse({
        status: 200,
        description:
            'Returns articles matching the search query sorted by relevance',
        type: SearchResponseDto,
    })
    @ApiQuery({
        name: 'q',
        description: 'Search query',
        required: true,
        type: String,
        example: 'artificial intelligence',
    })
    @ApiQuery({
        name: 'page',
        description: 'Page number (1-based)',
        required: false,
        type: Number,
        example: 1,
    })
    @ApiQuery({
        name: 'size',
        description: 'Top 20 results per page',
        required: false,
        type: Number,
        example: 20,
    })
    @Get('search')
    async searchArticles(
        @Query('q') query: string,
        @Query('page') page: number = 1,
        @Query('size') size: number = 20,
    ): Promise<SearchResponseDto> {
        return this.searchService.searchArticles(query, page, size);
    }
}

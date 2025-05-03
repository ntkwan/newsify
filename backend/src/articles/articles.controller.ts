import { Controller, Get, Query } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DateRangePaginationDto } from './dtos/time-range.dto';
import { PaginationDto } from './dtos/pagination.dto';
import { PaginatedArticlesResponseDto } from './dtos/paginated-articles-response.dto';
import { CategoryPaginationDto } from './dtos/category-pagination.dto';

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
}

import { Controller, Get, Query } from '@nestjs/common';
import { ArticlesService, Article } from './articles.service';
import { ApiOperation } from '@nestjs/swagger';
import { DateRangeDto } from './dtos/time-range.dto';

@Controller('articles')
export class ArticlesController {
    constructor(private readonly articlesService: ArticlesService) {}

    @ApiOperation({ summary: 'Get articles by date range' })
    @Get('filter')
    getArticlesByDateRange(
        @Query() dateRange: DateRangeDto,
    ): Promise<Article[]> {
        return this.articlesService.getArticlesBetweenDates(
            dateRange.startTime,
            dateRange.endTime,
        );
    }
}

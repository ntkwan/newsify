import { Controller, Get, Query, Param } from '@nestjs/common';
import { PodcastsService } from './podcasts.service';
import { ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { DateRangePaginationDto } from './dtos/time-range.dto';
import { PaginationDto } from './dtos/pagination.dto';
import { PaginatedPodcastsResponseDto } from './dtos/paginated-podcasts-response.dto';
import { PodcastResponseDto } from './dtos/podcast-response.dto';

@Controller('podcasts')
export class PodcastsController {
    constructor(private readonly podcastsService: PodcastsService) {}

    @ApiOperation({ summary: 'Get all podcasts with pagination' })
    @ApiResponse({
        status: 200,
        description: 'Returns paginated podcasts',
        type: PaginatedPodcastsResponseDto,
    })
    @Get()
    async getAllPodcasts(
        @Query() paginationDto: PaginationDto,
    ): Promise<PaginatedPodcastsResponseDto> {
        return this.podcastsService.getAllPodcasts(
            paginationDto.page,
            paginationDto.pageSize,
        );
    }

    @ApiOperation({ summary: 'Get podcasts by date range with pagination' })
    @ApiResponse({
        status: 200,
        description: 'Returns paginated podcasts filtered by date range',
        type: PaginatedPodcastsResponseDto,
    })
    @Get('time')
    async getPodcastsByDateRangePaginated(
        @Query() query: DateRangePaginationDto,
    ): Promise<PaginatedPodcastsResponseDto> {
        return this.podcastsService.getPodcastsBetweenDatesWithPagination(
            query.startTime,
            query.endTime,
            query.page,
            query.pageSize,
        );
    }

    @ApiOperation({ summary: 'Get podcast by ID' })
    @ApiResponse({
        status: 200,
        description: 'Returns a single podcast by ID',
        type: PodcastResponseDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Podcast not found',
    })
    @ApiParam({
        name: 'id',
        description: 'Podcast ID',
        type: String,
    })
    @Get(':id')
    async getPodcastById(@Param('id') id: string): Promise<PodcastResponseDto> {
        const podcast = await this.podcastsService.getPodcastById(id);
        return podcast;
    }
}

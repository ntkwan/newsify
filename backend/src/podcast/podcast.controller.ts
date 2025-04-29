import { Controller, Post, Query } from '@nestjs/common';
import { PodcastService } from './podcast.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GeneratePodcastDto } from './dtos/generate-podcast.dto';
import { PodcastResponseDto } from './dtos/podcast-response.dto';

@Controller('podcast')
export class PodcastController {
    constructor(private readonly podcastService: PodcastService) {}

    @ApiOperation({
        summary: 'Generate a podcast from articles in a time range',
    })
    @ApiResponse({
        status: 201,
        description: 'The podcast has been successfully generated',
        type: PodcastResponseDto,
    })
    @ApiResponse({ status: 400, description: 'Invalid input data' })
    @ApiResponse({
        status: 500,
        description: 'Internal server error during podcast generation',
    })
    @Post()
    async generatePodcast(
        @Query() generatePodcastDto: GeneratePodcastDto,
    ): Promise<PodcastResponseDto> {
        return this.podcastService.generatePodcast(
            generatePodcastDto.startTime,
            generatePodcastDto.endTime,
        );
    }
}

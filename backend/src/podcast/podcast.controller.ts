import { Controller, Post, Query } from '@nestjs/common';
import { PodcastService } from './podcast.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GeneratePodcastDto } from './dtos/generate-podcast.dto';

@ApiTags('podcast')
@Controller('podcast')
export class PodcastController {
    constructor(private readonly podcastService: PodcastService) {}

    @ApiOperation({
        summary: 'Generate a podcast from articles in a time range',
    })
    @ApiResponse({
        status: 201,
        description: 'The podcast has been successfully generated',
        schema: {
            properties: {
                url: {
                    type: 'string',
                    description: 'URL to the generated podcast audio file',
                },
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Invalid input data' })
    @ApiResponse({
        status: 500,
        description: 'Internal server error during podcast generation',
    })
    @Post()
    async generatePodcast(
        @Query() generatePodcastDto: GeneratePodcastDto,
    ): Promise<{ url: string }> {
        const podcastUrl = await this.podcastService.generatePodcast(
            generatePodcastDto.startTime,
            generatePodcastDto.endTime,
        );

        return { url: podcastUrl };
    }
}

import { ApiProperty } from '@nestjs/swagger';
import { PodcastResponseDto } from './podcast-response.dto';

export class PaginatedPodcastsResponseDto {
    @ApiProperty({
        description: 'List of podcasts',
        type: [PodcastResponseDto],
    })
    podcasts: PodcastResponseDto[];

    @ApiProperty({
        description: 'Total count of podcasts',
        example: 100,
    })
    total: number;

    @ApiProperty({
        description: 'Current page number',
        example: 1,
    })
    page: number;

    @ApiProperty({
        description: 'Number of items per page',
        example: 10,
    })
    pageSize: number;
}

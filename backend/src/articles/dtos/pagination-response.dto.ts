import { ApiProperty } from '@nestjs/swagger';
import { Article } from '../articles.service';

export class PaginatedArticlesResponseDto {
    @ApiProperty({
        description: 'Array of articles',
        type: 'array',
        items: {
            type: 'object',
            properties: {
                url: { type: 'string' },
                title: { type: 'string' },
                content: { type: 'string' },
                image_url: { type: 'string' },
                author: { type: 'string' },
                time_reading: { type: 'string' },
                publish_date: { type: 'string' },
                time: { type: 'string' },
                timezone: { type: 'string' },
                categories: { type: 'array', items: { type: 'string' } },
            },
        },
    })
    articles: Article[];

    @ApiProperty({
        description: 'Total number of articles',
        example: 100,
    })
    total: number;

    @ApiProperty({
        description: 'Current page number',
        example: 1,
    })
    page: number;

    @ApiProperty({
        description: 'Number of articles per page',
        example: 10,
    })
    pageSize: number;
}

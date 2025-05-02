import { ApiProperty } from '@nestjs/swagger';

export class ArticleResponseDto {
    @ApiProperty({
        description: 'The trending ID of the article',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    trending_id: string;

    @ApiProperty({
        description: 'The article ID',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    article_id: string;

    @ApiProperty({
        description: 'The URL of the article',
        example: 'https://example.com/article/1',
    })
    url: string;

    @ApiProperty({
        description: 'The URL of the article image',
        example: 'https://example.com/images/article1.jpg',
        required: false,
    })
    image_url: string | null;

    @ApiProperty({
        description: 'The categories of the article',
        example: ['Technology', 'AI'],
        type: [String],
    })
    categories: string[];

    @ApiProperty({
        description: 'The main category of the article',
        example: 'Technology',
    })
    main_category: string;

    @ApiProperty({
        description: 'The title of the article',
        example: 'New AI Breakthrough',
    })
    title: string;

    @ApiProperty({
        description: 'The identified trend of the article',
        example: 'Artificial Intelligence',
        required: false,
    })
    trend: string | null;

    /*
    @ApiProperty({
        description: 'The content of the article',
        example: 'This is the full content of the article...',
    })
    content: string;
    */

    @ApiProperty({
        description: 'The summary of the article',
        example: 'A brief summary of the article content.',
        required: false,
    })
    summary: string | null;

    @ApiProperty({
        description:
            'The similarity score of the article to trending topics (0-1)',
        example: 0.85,
    })
    similarity_score: number;

    @ApiProperty({
        description: 'The publication date of the article in ISO format',
        example: '2023-04-15T12:30:45.000Z',
        required: false,
    })
    publish_date: string | null;

    @ApiProperty({
        description: 'The date when the article was analyzed in ISO format',
        example: '2023-04-16T09:15:30.000Z',
    })
    analyzed_date: string;
}

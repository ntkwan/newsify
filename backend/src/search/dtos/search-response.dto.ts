import { ApiProperty } from '@nestjs/swagger';

export class HighlightDto {
    @ApiProperty({
        description: 'Highlighted title fragments',
        type: [String],
        required: false,
        example: ['Article about <strong>artificial intelligence</strong>'],
    })
    title?: string[];

    @ApiProperty({
        description: 'Highlighted content fragments',
        type: [String],
        required: false,
        example: [
            'The field of <strong>artificial intelligence</strong> has seen rapid growth',
            'Applications of <strong>AI</strong> in medicine are promising',
        ],
    })
    content?: string[];

    @ApiProperty({
        description: 'Highlighted summary fragments',
        type: [String],
        required: false,
        example: ['A summary of <strong>AI</strong> advancements'],
    })
    summary?: string[];
}

export class ArticleSearchResultDto {
    @ApiProperty({
        description: 'Article trending ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    trendingId: string;

    @ApiProperty({
        description: 'Article title',
        example: 'Advances in Artificial Intelligence',
    })
    title: string;

    @ApiProperty({
        description: 'Article summary',
        example: 'A brief overview of recent AI advancements and applications.',
    })
    summary: string;

    @ApiProperty({
        description: 'Main category',
        example: 'Technology',
    })
    mainCategory: string;

    @ApiProperty({
        description: 'Publication date',
        example: '2023-01-15T12:00:00Z',
    })
    publishDate: Date;

    @ApiProperty({
        description: 'Image URL',
        example: 'https://example.com/images/ai-article.jpg',
    })
    imageUrl: string;

    @ApiProperty({
        description: 'Similarity score',
        example: 0.85,
    })
    similarityScore: number;

    @ApiProperty({
        description: 'Highlighted search matches',
        type: HighlightDto,
    })
    highlights: Record<string, string[]>;
}
export class SearchResponseDto {
    @ApiProperty({
        description: 'Articles matching the search criteria',
        type: [ArticleSearchResultDto],
    })
    articles: ArticleSearchResultDto[];

    @ApiProperty({
        description: 'Total number of matching articles',
        example: 42,
    })
    total: number;

    @ApiProperty({
        description: 'Current page number (1-based)',
        example: 1,
    })
    page: number;

    @ApiProperty({
        description: 'Number of articles per page',
        example: 10,
    })
    pageSize: number;
}

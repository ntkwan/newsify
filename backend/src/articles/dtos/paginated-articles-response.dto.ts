import { ApiProperty } from '@nestjs/swagger';
import { ArticleResponseDto } from './article-response.dto';

export class PaginatedArticlesResponseDto {
    @ApiProperty({
        description: 'List of articles based on the provided criteria',
        type: [ArticleResponseDto],
    })
    articles: ArticleResponseDto[];

    @ApiProperty({
        description: 'Total number of articles matching the criteria',
        example: 150,
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

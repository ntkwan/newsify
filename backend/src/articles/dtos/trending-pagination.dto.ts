import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from './pagination.dto';
import { AVAILABLE_CATEGORIES } from '../constants/categories';

export class TrendingPaginationDto extends PaginationDto {
    @ApiProperty({
        description: 'Optional category to filter trending articles by',
        required: false,
        example: 'Technology',
        enum: AVAILABLE_CATEGORIES,
    })
    @IsOptional()
    @IsString()
    @IsEnum(AVAILABLE_CATEGORIES, {
        message: 'category must be one of the available categories',
    })
    category?: string;

    @ApiProperty({
        description: 'Minimum similarity score (0.0 to 1.0)',
        required: false,
        example: 0.5,
        minimum: 0,
        maximum: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @Min(0)
    minScore?: number;
}

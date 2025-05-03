import { ApiProperty } from '@nestjs/swagger';
import {
    IsString,
    IsOptional,
    IsInt,
    Min,
    IsEnum,
    IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AVAILABLE_CATEGORIES } from '../constants/categories';

export class CategoryPaginationDto {
    @ApiProperty({
        description: 'The main category to filter by',
        example: 'Technology',
        required: true,
        enum: AVAILABLE_CATEGORIES,
    })
    @IsNotEmpty()
    @IsString()
    @IsEnum(AVAILABLE_CATEGORIES, {
        message: 'category must be one of the available categories',
    })
    category: string;

    @ApiProperty({
        description: 'Page number (1-based)',
        example: 1,
        default: 1,
        required: false,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiProperty({
        description: 'Number of items per page',
        example: 10,
        default: 10,
        required: false,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    pageSize?: number = 10;
}

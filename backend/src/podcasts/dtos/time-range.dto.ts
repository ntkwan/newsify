import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty } from 'class-validator';
import { PaginationDto } from './pagination.dto';

export class DateRangePaginationDto extends PaginationDto {
    @ApiProperty({
        description: 'Start time in ISO format',
        example: '2023-01-01T00:00:00.000Z',
    })
    @IsNotEmpty()
    @IsDateString()
    startTime: string;

    @ApiProperty({
        description: 'End time in ISO format',
        example: '2023-12-31T23:59:59.999Z',
    })
    @IsNotEmpty()
    @IsDateString()
    endTime: string;
}

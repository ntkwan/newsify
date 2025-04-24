import { IsDateString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GeneratePodcastDto {
    @ApiProperty({
        description: 'Start time in ISO string format (YYYY-MM-DDTHH:mm:ss)',
        example: '2025-04-18T00:00:00',
        required: true,
    })
    @IsNotEmpty()
    @IsDateString()
    startTime: string;

    @ApiProperty({
        description: 'End time in ISO string format (YYYY-MM-DDTHH:mm:ss)',
        example: '2025-04-19T00:00:00',
        required: true,
    })
    @IsNotEmpty()
    @IsDateString()
    endTime: string;
}

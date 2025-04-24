import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateProfileDto {
    @ApiProperty({ required: false })
    @IsString()
    username?: string;

    @ApiProperty({ required: false })
    @IsString()
    email?: string;
}

import { IsEmail, IsString, MinLength } from 'class-validator';
import { Role } from '../../auth/enums/roles.enum';
import { ApiProperty } from '@nestjs/swagger';

export class UserLoginDto {
    @ApiProperty()
    @IsString()
    id: string;

    @ApiProperty()
    @IsEmail()
    email: string;

    @ApiProperty()
    @IsString()
    username: string;

    @ApiProperty()
    @IsString()
    @MinLength(4)
    password: string;

    @ApiProperty()
    @IsString()
    role: Role;
}

export class AuthLoginDto {
    @ApiProperty()
    @IsString()
    username: string;

    @ApiProperty()
    @IsString()
    password: string;
}

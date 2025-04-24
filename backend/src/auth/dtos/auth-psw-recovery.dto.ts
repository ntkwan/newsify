import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty, MinLength } from 'class-validator';

export class ChangePasswordDto {
    @ApiProperty()
    @IsEmail()
    @IsString()
    oldPassword: string;

    @ApiProperty()
    @IsString()
    @MinLength(6)
    newPassword: string;

    @ApiProperty()
    @IsString()
    @MinLength(6)
    confirmPassword: string;
}
export class ForgotPasswordDto {
    @ApiProperty()
    @IsEmail()
    @IsString()
    email: string;
}

export class VerifyOtpDto {
    @ApiProperty()
    @IsEmail()
    @IsString()
    email: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    otp: string;
}

export class ResetPasswordDto {
    @ApiProperty()
    @IsEmail()
    @IsString()
    email: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    otp: string;

    @ApiProperty()
    @IsString()
    @MinLength(6)
    newPassword: string;

    @ApiProperty()
    @IsString()
    @MinLength(6)
    confirmPassword: string;
}

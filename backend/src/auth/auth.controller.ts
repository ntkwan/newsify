import {
    Body,
    Controller,
    HttpCode,
    Post,
    UseGuards,
    Request,
    Res,
    Get,
    Delete,
    Put,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { ATAuthGuard } from './guards/at-auth.guard';
import { RTAuthGuard } from './guards/rt-auth.guard';
import {
    ApiResponse,
    ApiOperation,
    ApiBody,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { TokensDto } from './dtos/tokens.dto';
import { CredDto } from './dtos/cred.dto';
import { AuthLoginDto } from './dtos/user-signin.dto';
import { UserSignUpDto } from './dtos/user-signup.dto';
import {
    ChangePasswordDto,
    ForgotPasswordDto,
    ResetPasswordDto,
    VerifyOtpDto,
} from './dtos/auth-psw-recovery.dto';
import { UserLoginDto } from './dtos/user-signin.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @ApiOperation({
        summary: 'Login using credentials. Provide email in username field',
    })
    @ApiBody({ type: AuthLoginDto })
    @ApiResponse({
        status: 200,
        description: 'Login successful',
        type: TokensDto,
    })
    @UseGuards(LocalAuthGuard)
    @HttpCode(200)
    @Post('sign-in')
    async signIn(@Request() req: any, @Res() res: Response): Promise<void> {
        const { refreshToken, accessToken } = await this.authService.signIn(
            req.user as UserLoginDto,
        );
        res.cookie('refresh_token', refreshToken, { httpOnly: true });
        res.send({
            accessToken,
            refreshToken,
            message: 'User has been signed in successfully',
        });
    }

    @ApiOperation({ summary: 'Sign-up to login' })
    @ApiBody({ type: UserSignUpDto })
    @ApiResponse({
        status: 200,
        description: 'Sign-up successful',
        type: CredDto,
    })
    @Post('sign-up')
    @HttpCode(200)
    async signUp(
        @Body() req: UserSignUpDto,
        @Res() res: Response,
    ): Promise<void> {
        const newUser = await this.authService.signUp(req);
        res.send({
            newUser,
            message: 'User has been created successfully',
        });
    }

    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Sign-out and clear credentials' })
    @ApiResponse({
        status: 200,
        description: 'Sign-out successful',
    })
    @Delete('sign-out')
    @UseGuards(ATAuthGuard)
    @HttpCode(200)
    async signOut(@Request() req: any, @Res() res: Response): Promise<void> {
        await this.authService.signOut(req.user);
        res.clearCookie('refresh_token');
        res.send({
            message: 'User has been signed out successfully',
        });
    }

    @ApiBearerAuth('refresh-token')
    @ApiOperation({
        summary:
            'Refresh tokens with credentials. Provide refresh token, not access token to the field',
    })
    @Get('refresh-token')
    @UseGuards(RTAuthGuard)
    @ApiResponse({
        status: 200,
        description: 'Refresh tokens successfully',
        type: TokensDto,
    })
    @HttpCode(200)
    async refreshToken(
        @Request() req: any,
        @Res() res: Response,
    ): Promise<void> {
        const oldRefreshToken = req
            .get('Authorization')
            .replace('Bearer', '')
            .trim();

        const { refreshToken, accessToken } =
            await this.authService.getNewTokens(oldRefreshToken);
        res.cookie('refresh_token', refreshToken, { httpOnly: true });

        res.send({
            accessToken,
            message: 'Access token has been refreshed successfully',
        });
    }

    @ApiOperation({ summary: 'Verify OTP' })
    @Post('verify-otp')
    @ApiBody({ type: VerifyOtpDto })
    @ApiResponse({
        status: 200,
        description: 'OTP verified successfully',
    })
    @HttpCode(200)
    async verifyOtp(@Request() req: any, @Res() res: Response): Promise<void> {
        const email = req.body.email;
        const otp = req.body.otp;
        await this.authService.verifyOtp(email, otp);
        res.send({
            message: 'OTP has been verified successfully',
        });
    }

    @ApiOperation({ summary: 'Password recovery' })
    @Post('password-recovery')
    @ApiBody({ type: ForgotPasswordDto })
    @ApiResponse({
        status: 200,
        description: 'Send OTP successfully via email',
    })
    @HttpCode(200)
    async forgotPassword(
        @Request() req: any,
        @Res() res: Response,
    ): Promise<void> {
        await this.authService.forgotPassword(req.body.email);
        res.send({
            message: 'Password recovery email has been sent successfully',
        });
    }

    @ApiOperation({ summary: 'Change password' })
    @ApiBearerAuth('access-token')
    @Put('change-password')
    @ApiBody({ type: ChangePasswordDto })
    @ApiResponse({
        status: 200,
        description: 'Password changed successfully',
    })
    @HttpCode(200)
    @UseGuards(ATAuthGuard)
    async changePassword(
        @Request() req: any,
        @Res() res: Response,
    ): Promise<void> {
        await this.authService.changePassword(
            req.user.id,
            req.body.oldPassword,
            req.body.newPassword,
            req.body.confirmPassword,
        );
        res.send({
            message: 'Password has been changed successfully',
        });
    }

    @ApiOperation({ summary: 'Reset password' })
    @Post('reset-password')
    @ApiBody({ type: ResetPasswordDto })
    @ApiResponse({
        status: 200,
        description: 'Reset password successfully',
    })
    @HttpCode(200)
    async resetPassword(
        @Request() req: any,
        @Res() res: Response,
    ): Promise<void> {
        const email = req.body.email;
        const otp = req.body.otp;
        const newPassword = req.body.newPassword;
        const confirmPassword = req.body.confirmPassword;
        await this.authService.resetPassword(
            email,
            otp,
            newPassword,
            confirmPassword,
        );
        res.send({
            message: 'Password has been reset successfully',
        });
    }
}

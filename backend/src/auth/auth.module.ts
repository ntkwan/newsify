import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { LocalStrategy } from './strategies/local.strategy';
import { PassportModule } from '@nestjs/passport';
import { AccessTokenStrategy } from './strategies/at.strategy';
import { RefreshTokenStrategy } from './strategies/rt.strategy';
@Module({
    imports: [
        UsersModule,
        PassportModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get('AT_SECRET'),
                signOptions: {
                    expiresIn: configService.get('JWT_EXPIRATION_TIME'),
                },
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        LocalStrategy,
        AccessTokenStrategy,
        RefreshTokenStrategy,
    ],
})
export class AuthModule {}

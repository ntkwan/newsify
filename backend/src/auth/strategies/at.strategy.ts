import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(private configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('AT_SECRET'),
        });
    }

    validate(payload: {
        id: string;
        username: string;
        email: string;
        role: string;
    }) {
        return {
            id: payload.id,
            email: payload.email,
            username: payload.username,
            role: payload.role,
        };
    }
}

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { UsersModule } from './users/users.module';
import pg from 'pg';
import { User } from './users/entities/user.model';
import { MailerModule } from '@nestjs-modules/mailer';
import { AuthModule } from './auth/auth.module';
import { HttpModule } from '@nestjs/axios';
import { RedisModule, RedisModuleOptions } from '@nestjs-modules/ioredis';
import { ArticlesModule } from './articles/articles.module';
@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        HttpModule,
        MailerModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                transport: {
                    host: configService.get('MAIL_HOST'),
                    port: configService.get('MAIL_PORT'),
                    auth: {
                        user: configService.get('MAIL_USER'),
                        pass: configService.get('MAIL_PASSWORD'),
                    },
                },
                defaults: {
                    from: `"Newsify - Online Newspaper System" <support@newsify>`, // Sender's email address
                },
            }),
            inject: [ConfigService],
        }),

        RedisModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService): RedisModuleOptions => ({
                type: 'single',
                options: {
                    host: configService.get<string>('REDIS_HOST'),
                    port: Number(configService.get<string>('REDIS_PORT')),
                    username: configService.get<string>('REDIS_USER'),
                    password: configService.get<string>('REDIS_PASSWORD'),
                    tls: {
                        rejectUnauthorized: true,
                    },
                    retryStrategy: (times: number) => {
                        const delay = Math.min(times * 50, 2000);
                        return delay;
                    },
                    maxRetriesPerRequest: 5,
                },
            }),
        }),

        SequelizeModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                dialect: 'postgres',
                dialectModule: pg,
                dialectOptions: {
                    ssl: { require: true, rejectUnauthorized: false },
                },
                uri: configService.get('DATABASE_MIGRATION'),
                autoLoadModels: true,
                synchronize: true,
                models: [User],
                pool: {
                    max: 20,
                    min: 0,
                    acquire: 30000,
                    idle: 10000,
                },
                define: {
                    timestamps: true,
                    underscored: true,
                },
                logging:
                    configService.get('ENV') === 'development'
                        ? console.log
                        : false,
            }),
            inject: [ConfigService],
        }),
        AuthModule,
        UsersModule,
        ArticlesModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}

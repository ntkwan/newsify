import { RedisModule, RedisModuleOptions } from '@nestjs-modules/ioredis';
import { MailerModule } from '@nestjs-modules/mailer';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import pg from 'pg';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ArticlesModule } from './articles/articles.module';
import { Article } from './articles/entities/article.model';
import { AuthModule } from './auth/auth.module';
import { Podcast } from './podcasts/entities/podcast.model';
import { PodcastsModule } from './podcasts/podcasts.module';
import { User } from './users/entities/user.model';
import { UsersModule } from './users/users.module';

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
            useFactory: (configService: ConfigService) => {
                const isDevelopment =
                    configService.get('ENV') === 'development';

                return {
                    dialect: 'postgres',
                    host: configService.get('DO_DB_HOST'),
                    port: configService.get('DO_DB_PORT'),
                    username: configService.get('DO_DB_USERNAME'),
                    password: configService.get('DO_DB_PASSWORD'),
                    database: configService.get('DO_DB_NAME'),
                    dialectModule: pg,
                    autoLoadModels: true,
                    synchronize: true,
                    models: [User, Article, Podcast],
                    dialectOptions: isDevelopment
                        ? { ssl: false }
                        : { ssl: { require: true, rejectUnauthorized: false } },
                };
            },
            inject: [ConfigService],
        }),

        AuthModule,
        UsersModule,
        ArticlesModule,
        PodcastsModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}

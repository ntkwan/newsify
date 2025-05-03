import { Module } from '@nestjs/common';
import { PodcastsService } from './podcasts.service';
import { PodcastsController } from './podcasts.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { Podcast } from './entities/podcast.model';
import { PodcastRepository } from './podcast.repository';

@Module({
    imports: [SequelizeModule.forFeature([Podcast])],
    controllers: [PodcastsController],
    providers: [PodcastsService, PodcastRepository],
    exports: [PodcastsService],
})
export class PodcastsModule {}

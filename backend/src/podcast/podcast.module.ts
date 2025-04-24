import { Module } from '@nestjs/common';
import { PodcastService } from './podcast.service';
import { PodcastController } from './podcast.controller';
import { ArticlesModule } from '../articles/articles.module';
import { UploadModule } from '../uploader/upload.module';
import { HttpModule } from '@nestjs/axios';

@Module({
    imports: [ArticlesModule, UploadModule, HttpModule],
    controllers: [PodcastController],
    providers: [PodcastService],
})
export class PodcastModule {}

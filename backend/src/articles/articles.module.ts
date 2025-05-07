import { Module } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { ArticlesController } from './articles.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { Article } from './entities/article.model';
import { ArticleRepository } from './article.repository';
import { SearchModule } from '../search/search.module';
import { SyncService } from '../search/sync.service';

@Module({
    imports: [
        SequelizeModule.forFeature([Article]),
        SearchModule
    ],
    controllers: [ArticlesController],
    providers: [
        ArticlesService,
        ArticleRepository,
        SyncService
    ],
    exports: [ArticlesService],
})
export class ArticlesModule {}

import { Module } from '@nestjs/common';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';
import { ArticleRepository } from './article.repository';
import { SearchModule } from '../search/search.module';
import { MilvusModule } from '../milvus/milvus.module';
import { SequelizeModule } from '@nestjs/sequelize';
import { Article } from './entities/article.model';
import { SyncService } from '../search/sync.service';
@Module({
    imports: [
        SearchModule,
        MilvusModule,
        SequelizeModule.forFeature([Article]),
    ],
    controllers: [ArticlesController],
    providers: [ArticlesService, ArticleRepository],
    exports: [ArticlesService],
})
export class ArticlesModule {}

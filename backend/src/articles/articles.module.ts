import { Module } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { ArticlesController } from './articles.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { Article } from './entities/article.model';
import { ArticleRepository } from './article.repository';

@Module({
    imports: [SequelizeModule.forFeature([Article])],
    controllers: [ArticlesController],
    providers: [ArticlesService, ArticleRepository],
    exports: [ArticlesService],
})
export class ArticlesModule {}

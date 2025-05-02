import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Article } from './entities/article.model';
import { FindOptions, Op } from 'sequelize';

@Injectable()
export class ArticleRepository {
    constructor(
        @InjectModel(Article)
        private articleModel: typeof Article,
    ) {}

    async findAll(options?: FindOptions): Promise<Article[]> {
        return this.articleModel.findAll({
            ...options,
            order: [['publishDate', 'DESC']],
        });
    }

    async findAndCountAll(
        page: number = 1,
        pageSize: number = 10,
        options?: FindOptions,
    ): Promise<{ rows: Article[]; count: number }> {
        return this.articleModel.findAndCountAll({
            ...options,
            limit: pageSize,
            offset: (page - 1) * pageSize,
            order: [['publishDate', 'DESC']],
        });
    }

    async findByDateRange(
        startDate: Date,
        endDate: Date,
        page: number = 1,
        pageSize: number = 10,
    ): Promise<{ rows: Article[]; count: number }> {
        return this.articleModel.findAndCountAll({
            where: {
                publishDate: {
                    [Op.gte]: startDate,
                    [Op.lte]: endDate,
                },
            },
            limit: pageSize,
            offset: (page - 1) * pageSize,
            order: [['publishDate', 'DESC']],
        });
    }

    async findLatest(limit: number = 10): Promise<Article[]> {
        return this.articleModel.findAll({
            limit,
            order: [['publishDate', 'DESC']],
        });
    }

    async findById(id: string): Promise<Article> {
        return this.articleModel.findByPk(id);
    }
}

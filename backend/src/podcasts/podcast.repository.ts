import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Podcast } from './entities/podcast.model';
import { FindOptions, Op } from 'sequelize';

@Injectable()
export class PodcastRepository {
    constructor(
        @InjectModel(Podcast)
        private podcastModel: typeof Podcast,
    ) {}

    async findAll(options?: FindOptions): Promise<Podcast[]> {
        return this.podcastModel.findAll({
            ...options,
            order: [['publishDate', 'DESC']],
        });
    }

    async findAndCountAll(
        page: number = 1,
        pageSize: number = 10,
        options?: FindOptions,
    ): Promise<{ rows: Podcast[]; count: number }> {
        return this.podcastModel.findAndCountAll({
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
    ): Promise<{ rows: Podcast[]; count: number }> {
        return this.podcastModel.findAndCountAll({
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

    async findById(id: string): Promise<Podcast> {
        return this.podcastModel.findByPk(id);
    }
}

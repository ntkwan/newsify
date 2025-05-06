import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ElasticsearchService } from './elasticsearch.service';
import { ArticleRepository } from '../articles/article.repository';

@Injectable()
export class SyncService implements OnModuleInit {
    private readonly logger = new Logger(SyncService.name);
    private readonly batchSize = 100;

    constructor(
        private readonly elasticsearchService: ElasticsearchService,
        private readonly articleRepository: ArticleRepository,
    ) {}

    async onModuleInit() {
        try {
            this.logger.log('Initializing Elasticsearch and syncing data');

            await this.elasticsearchService.createIndex();

            await this.reindexAll();
        } catch (error) {
            this.logger.error(
                'Failed to initialize Elasticsearch or sync data:',
                error.message,
            );
        }
    }

    async syncAllArticles(): Promise<void> {
        this.logger.log('Starting full sync of articles to Elasticsearch');

        let page = 1;
        let hasMore = true;
        let totalSynced = 0;

        while (hasMore) {
            this.logger.log(
                `Syncing batch ${page} (page size: ${this.batchSize})`,
            );

            const { rows, count } =
                await this.articleRepository.findAndCountAll(
                    page,
                    this.batchSize,
                );

            if (rows && rows.length > 0) {
                await this.elasticsearchService.bulkIndexArticles(rows);
                totalSynced += rows.length;
                this.logger.log(
                    `Synced ${rows.length} articles (total: ${totalSynced}/${count})`,
                );
            }

            if (page * this.batchSize >= count || rows.length === 0) {
                hasMore = false;
            } else {
                page++;
            }
        }

        this.logger.log(
            `Completed full sync of ${totalSynced} articles to Elasticsearch`,
        );
    }

    async reindexAll(): Promise<void> {
        try {
            this.logger.log('Re-indexing all articles in Elasticsearch');

            const { count } = await this.articleRepository.findAndCountAll(
                1,
                1,
            );
            this.logger.log(`Found ${count} articles in the database`);

            if (count === 0) {
                this.logger.warn(
                    'No articles found in the database. Nothing to index.',
                );
                return;
            }

            await this.elasticsearchService.deleteIndex();

            await this.elasticsearchService.createIndex();

            await this.syncAllArticles();

            const countAfterIndexing =
                await this.elasticsearchService.countDocuments();
            this.logger.log(
                `Total documents after indexing: ${countAfterIndexing}`,
            );

            if (countAfterIndexing === 0) {
                this.logger.error(
                    'Failed to index any documents. Index remains empty.',
                );
            } else {
                this.logger.log('Re-indexing completed successfully');
            }
        } catch (error) {
            this.logger.error('Error re-indexing articles:', error.message);
            throw error;
        }
    }
}

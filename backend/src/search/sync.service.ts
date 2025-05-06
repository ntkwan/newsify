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

    /**
     * Initialize Elasticsearch index and sync data when module starts
     */
    async onModuleInit() {
        try {
            this.logger.log('Initializing Elasticsearch and syncing data');

            // Create index with proper mappings
            await this.elasticsearchService.createIndex();

            // Perform initial sync
            await this.syncAllArticles();
        } catch (error) {
            this.logger.error(
                'Failed to initialize Elasticsearch or sync data:',
                error.message,
            );
        }
    }

    /**
     * Sync all articles to Elasticsearch
     */
    async syncAllArticles(): Promise<void> {
        this.logger.log('Starting full sync of articles to Elasticsearch');

        let page = 1;
        let hasMore = true;
        let totalSynced = 0;

        while (hasMore) {
            this.logger.log(
                `Syncing batch ${page} (page size: ${this.batchSize})`,
            );

            // Get batch of articles
            const { rows, count } =
                await this.articleRepository.findAndCountAll(
                    page,
                    this.batchSize,
                );

            if (rows && rows.length > 0) {
                // Index articles in Elasticsearch
                await this.elasticsearchService.bulkIndexArticles(rows);
                totalSynced += rows.length;
                this.logger.log(
                    `Synced ${rows.length} articles (total: ${totalSynced}/${count})`,
                );
            }

            // Check if we have more articles to sync
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

    /**
     * Sync a single article to Elasticsearch
     */
    async syncArticle(articleId: string): Promise<void> {
        try {
            const article = await this.articleRepository.findById(articleId);
            if (article) {
                await this.elasticsearchService.indexArticle(article);
                this.logger.log(`Synced article ${articleId} to Elasticsearch`);
            } else {
                this.logger.warn(`Article ${articleId} not found for syncing`);
            }
        } catch (error) {
            this.logger.error(
                `Error syncing article ${articleId}:`,
                error.message,
            );
            throw error;
        }
    }

    /**
     * Re-index all data (delete index and sync again)
     */
    async reindexAll(): Promise<void> {
        try {
            this.logger.log('Re-indexing all articles in Elasticsearch');

            // Delete existing index
            await this.elasticsearchService.deleteIndex();

            // Create index with mappings
            await this.elasticsearchService.createIndex();

            // Sync all articles
            await this.syncAllArticles();

            this.logger.log('Re-indexing completed successfully');
        } catch (error) {
            this.logger.error('Error re-indexing articles:', error.message);
            throw error;
        }
    }
}

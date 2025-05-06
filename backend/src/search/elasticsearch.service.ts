import { Injectable, Logger } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { ConfigService } from '@nestjs/config';
import { Article } from '../articles/entities/article.model';

interface ArticleDocument {
    trendingId: string;
    articleId: string;
    title: string;
    content: string;
    summary: string;
    mainCategory: string;
    categories: string[];
    publishDate: Date;
    url: string;
    imageUrl: string;
    similarityScore: number;
}

interface SearchResponseDto {
    articles: Array<
        ArticleDocument & {
            score: number;
            highlights: Record<string, string[]>;
        }
    >;
    total: number;
    page: number;
    pageSize: number;
}

@Injectable()
export class ElasticsearchService {
    private readonly client: Client;
    private readonly logger = new Logger(ElasticsearchService.name);
    private readonly indexName = 'articles';

    constructor(private configService: ConfigService) {
        this.client = new Client({
            node: 'https://146.190.81.220:9200',
            auth: {
                username: 'elastic',
                password: 'IQoEliXEX+53yi4ZEYTq',
            },
            tls: {
                rejectUnauthorized: true,
            },
        });

        this.checkConnection();
    }

    private async checkConnection(): Promise<void> {
        try {
            const info = await this.client.info();
            this.logger.log(
                `Elasticsearch connected successfully to ${info.name}`,
            );
        } catch (error) {
            this.logger.error('Elasticsearch connection error:', error);
        }
    }

    /**
     * Create Elasticsearch index with optimized mappings for article search
     */
    async createIndex(): Promise<void> {
        try {
            const indexExists = await this.client.indices.exists({
                index: this.indexName,
            });

            if (!indexExists) {
                await this.client.indices.create({
                    index: this.indexName,
                    settings: {
                        analysis: {
                            analyzer: {
                                title_analyzer: {
                                    type: 'custom',
                                    tokenizer: 'standard',
                                    filter: [
                                        'lowercase',
                                        'english_stop',
                                        'english_stemmer',
                                    ],
                                },
                            },
                            filter: {
                                english_stop: {
                                    type: 'stop',
                                    stopwords: '_english_',
                                },
                                english_stemmer: {
                                    type: 'stemmer',
                                    language: 'english',
                                },
                            },
                        },
                    },
                    mappings: {
                        properties: {
                            trendingId: { type: 'keyword' },
                            articleId: { type: 'keyword' },
                            title: {
                                type: 'text',
                                analyzer: 'title_analyzer',
                                fields: {
                                    keyword: { type: 'keyword' },
                                },
                            },
                            content: { type: 'text', analyzer: 'standard' },
                            summary: { type: 'text', analyzer: 'standard' },
                            mainCategory: { type: 'keyword' },
                            categories: { type: 'keyword' },
                            publishDate: { type: 'date' },
                            url: { type: 'keyword' },
                            imageUrl: { type: 'keyword' },
                            similarityScore: { type: 'float' },
                        },
                    },
                });
                this.logger.log(`Index ${this.indexName} created successfully`);
            }
        } catch (error) {
            this.logger.error(
                `Error creating index: ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }

    /**
     * Index a single article in Elasticsearch
     */
    async indexArticle(article: Article): Promise<void> {
        try {
            await this.client.index({
                index: this.indexName,
                id: article.trendingId,
                document: {
                    trendingId: article.trendingId,
                    articleId: article.articleId,
                    title: article.title,
                    content: article.content,
                    summary: article.summary,
                    mainCategory: article.mainCategory,
                    categories: article.categories,
                    publishDate: article.publishDate,
                    url: article.url,
                    imageUrl: article.imageUrl,
                    similarityScore: article.similarityScore,
                },
                refresh: true, // Ensure the document is immediately available for search
            });
            this.logger.debug(`Indexed article ${article.trendingId}`);
        } catch (error) {
            this.logger.error(
                `Error indexing article: ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }

    /**
     * Bulk index multiple articles
     */
    async bulkIndexArticles(articles: Article[]): Promise<void> {
        if (!articles || articles.length === 0) {
            return;
        }

        try {
            const operations = articles.flatMap((article) => [
                { index: { _index: this.indexName, _id: article.trendingId } },
                {
                    trendingId: article.trendingId,
                    articleId: article.articleId,
                    title: article.title,
                    content: article.content,
                    summary: article.summary,
                    mainCategory: article.mainCategory,
                    categories: article.categories,
                    publishDate: article.publishDate,
                    url: article.url,
                    imageUrl: article.imageUrl,
                    similarityScore: article.similarityScore,
                },
            ]);

            const response = await this.client.bulk({
                operations,
                refresh: true,
            });

            if (response.errors) {
                const errorItems = response.items.filter(
                    (item) => item.index && item.index.error,
                );
                this.logger.error(
                    `Bulk indexing errors: ${JSON.stringify(errorItems)}`,
                );
            } else {
                this.logger.log(
                    `Successfully bulk indexed ${articles.length} articles`,
                );
            }
        } catch (error) {
            this.logger.error(
                `Error bulk indexing articles: ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }

    /**
     * Search for articles by title with relevance scoring
     */
    async searchArticles(
        query: string,
        page: number = 1,
        size: number = 10,
    ): Promise<SearchResponseDto> {
        try {
            this.logger.log(
                `Searching for "${query}" (page ${page}, size ${size})`,
            );

            const response = await this.client.search<ArticleDocument>({
                index: this.indexName,
                from: (page - 1) * size,
                size,
                query: {
                    bool: {
                        should: [
                            // Title exact matches (highest boost)
                            {
                                match_phrase: {
                                    title: {
                                        query,
                                        boost: 4,
                                    },
                                },
                            },
                            // Title partial matches (high boost)
                            {
                                match: {
                                    title: {
                                        query,
                                        boost: 3,
                                        fuzziness: 'AUTO',
                                    },
                                },
                            },
                            // Summary matches (medium boost)
                            {
                                match: {
                                    summary: {
                                        query,
                                        boost: 2,
                                    },
                                },
                            },
                            // Content matches (lowest boost)
                            {
                                match: {
                                    content: {
                                        query,
                                        boost: 1,
                                    },
                                },
                            },
                        ],
                    },
                },
                highlight: {
                    fields: {
                        title: {
                            number_of_fragments: 1,
                            pre_tags: ['<strong>'],
                            post_tags: ['</strong>'],
                        },
                        content: {
                            number_of_fragments: 2,
                            fragment_size: 150,
                            pre_tags: ['<strong>'],
                            post_tags: ['</strong>'],
                        },
                        summary: {
                            number_of_fragments: 1,
                            pre_tags: ['<strong>'],
                            post_tags: ['</strong>'],
                        },
                    },
                },
                sort: [
                    '_score', // Primary sort by relevance
                    { publishDate: 'desc' }, // Secondary sort by publish date
                ],
            });

            const totalHits =
                typeof response.hits.total === 'number'
                    ? response.hits.total
                    : response.hits.total?.value || 0;

            this.logger.log(`Found ${totalHits} results for "${query}"`);

            return {
                articles: response.hits.hits.map((hit) => ({
                    ...hit._source,
                    score: hit._score || 0,
                    highlights: hit.highlight || {},
                })),
                total: totalHits,
                page,
                pageSize: size,
            };
        } catch (error) {
            this.logger.error(
                `Error searching articles: ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }

    /**
     * Delete index (for maintenance or re-indexing)
     */
    async deleteIndex(): Promise<void> {
        try {
            const indexExists = await this.client.indices.exists({
                index: this.indexName,
            });

            if (indexExists) {
                await this.client.indices.delete({ index: this.indexName });
                this.logger.log(`Index ${this.indexName} deleted`);
            }
        } catch (error) {
            this.logger.error(
                `Error deleting index: ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }
}

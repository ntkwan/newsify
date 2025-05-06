import { Injectable, Logger } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { ConfigService } from '@nestjs/config';
import { Article } from '../articles/entities/article.model';
import { SearchResponseDto } from './dtos/search-response.dto';
import { ArticleResponseDto } from 'src/articles/dtos/article-response.dto';
@Injectable()
export class SearchService {
    private readonly client: Client;
    private readonly logger = new Logger(SearchService.name);
    private readonly indexName = 'title';

    constructor(private configService: ConfigService) {
        this.client = new Client({
            node: this.configService.get('ELS_IP'),
            auth: {
                username: this.configService.get('ELS_USERNAME'),
                password: this.configService.get('ELS_PASSWORD'),
            },
            ssl: {
                rejectUnauthorized: false,
            },
        });
    }

    async createIndex(): Promise<void> {
        try {
            try {
                await this.client.indices.exists({
                    index: this.indexName,
                });

                this.logger.log(`Index ${this.indexName} already exists`);
                return;
            } catch (err) {
                if (err.statusCode !== 404) {
                    throw err;
                }
            }

            this.logger.log(`Creating index ${this.indexName}...`);

            await this.client.indices.create({
                index: this.indexName,
                body: {
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
                },
            });
            this.logger.log(`Index ${this.indexName} created successfully`);
        } catch (error) {
            this.logger.error(
                `Error creating index: ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }

    async bulkIndexArticles(articles: Article[]): Promise<void> {
        if (!articles || articles.length === 0) {
            return;
        }

        try {
            const body = articles.flatMap((article) => [
                {
                    index: {
                        _index: this.indexName,
                        _id: article.dataValues.trendingId,
                    },
                },
                {
                    trendingId: article.dataValues.trendingId,
                    articleId: article.dataValues.articleId,
                    title: article.dataValues.title,
                    content: article.dataValues.content,
                    summary: article.dataValues.summary,
                    mainCategory: article.dataValues.mainCategory,
                    categories: article.dataValues.categories,
                    publishDate: article.dataValues.publishDate,
                    url: article.dataValues.url,
                    imageUrl: article.dataValues.imageUrl,
                    similarityScore: article.dataValues.similarityScore,
                },
            ]);

            const response = await this.client.bulk({
                body,
                refresh: true,
            });

            if (response.body.errors) {
                const errorItems = response.body.items.filter(
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

    async searchArticles(
        query: string,
        page: number = 1,
        size: number = 20,
    ): Promise<SearchResponseDto> {
        try {
            this.logger.log(
                `Searching for "${query}" (page ${page}, size ${size})`,
            );

            const countResponse = await this.client.count({
                index: this.indexName,
            });

            const totalDocuments = countResponse.body.count;
            this.logger.log(`Total documents in index: ${totalDocuments}`);

            if (totalDocuments === 0) {
                this.logger.warn('Index is empty. No results to return.');
                return {
                    articles: [],
                    total: 0,
                    page,
                    pageSize: size,
                };
            }

            const response = await this.client.search({
                index: this.indexName,
                body: {
                    from: (page - 1) * size,
                    size,
                    query:
                        query && query.trim() !== ''
                            ? {
                                  multi_match: {
                                      query: query,
                                      fields: ['title'],
                                      type: 'best_fields',
                                      operator: 'and',
                                      fuzziness: 'AUTO',
                                  },
                              }
                            : { match_all: {} },
                    _source: true,
                    sort: [{ publishDate: { order: 'desc' } }, '_score'],
                    highlight: {
                        fields: {
                            title: {},
                            content: {
                                fragment_size: 150,
                                number_of_fragments: 3,
                            },
                            summary: {},
                        },
                    },
                },
            });
            const totalHits =
                typeof response.body.hits.total === 'number'
                    ? response.body.hits.total
                    : response.body.hits.total.value || 0;

            this.logger.log(`Found ${totalHits} total matches`);
            const newReponse: SearchResponseDto = {
                articles: response?.body?.hits?.hits?.map((hit) => {
                    return {
                        trendingId: hit._source?.trendingId || hit._id || '',
                        title: hit._source?.title || 'No title available',
                        summary: hit._source?.summary || '',
                        mainCategory:
                            hit._source?.mainCategory || 'Uncategorized',
                        publishDate: hit._source?.publishDate || null,
                        imageUrl: hit._source?.imageUrl || '',
                        highlights: hit.highlight || {},
                    };
                }),
                total: totalHits,
                page,
                pageSize: size,
            };
            return {
                articles: newReponse.articles,
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

    async deleteIndex(): Promise<void> {
        try {
            try {
                await this.client.indices.exists({
                    index: this.indexName,
                });

                await this.client.indices.delete({
                    index: this.indexName,
                });

                this.logger.log(`Index ${this.indexName} deleted`);
            } catch (err) {
                if (err.statusCode === 404) {
                    this.logger.log(
                        `Index ${this.indexName} does not exist, nothing to delete`,
                    );
                } else {
                    throw err;
                }
            }
        } catch (error) {
            this.logger.error(
                `Error deleting index: ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }

    async reindexAll(): Promise<void> {
        try {
            this.logger.log('Re-indexing all articles in Elasticsearch');

            await this.deleteIndex();

            await this.createIndex();

            const countAfterIndexing = await this.countDocuments();
            this.logger.log(
                `Total documents after indexing: ${countAfterIndexing}`,
            );

            this.logger.log('Re-indexing completed successfully');
        } catch (error) {
            this.logger.error('Error re-indexing articles:', error.message);
            throw error;
        }
    }

    async countDocuments(): Promise<number> {
        try {
            const response = await this.client.count({
                index: this.indexName,
            });
            return response.body.count;
        } catch (error) {
            this.logger.error(
                `Error counting documents: ${error.message}`,
                error.stack,
            );
            return 0;
        }
    }
}

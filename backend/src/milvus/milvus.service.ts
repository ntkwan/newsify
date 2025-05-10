import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MilvusClient } from '@zilliz/milvus2-sdk-node';

@Injectable()
export class MilvusService implements OnModuleInit {
    private client: MilvusClient;
    private readonly collectionName = 'articles';

    constructor(private readonly configService: ConfigService) {}

    onModuleInit() {
        this.client = new MilvusClient({
            address: this.configService.get<string>('MILVUS_ADDRESS'),
            token: this.configService.get<string>('MILVUS_TOKEN'),
        });
    }

    async getArticleVectorByUrl(url: string) {
        try {
            console.log(url);
            const searchResponse = await this.client.query({
                collection_name: this.collectionName,
                output_fields: ['article_id', 'url', 'article_embed'],
                limit: 1,
                expr: `url == "${url}"`,
            });
            console.log(searchResponse);
            if (!searchResponse) {
                return null;
            }

            return searchResponse;
        } catch (error) {
            console.error('Error getting article vector:', error);
            throw error;
        }
    }

    async searchSimilarArticles(url: string, topK: number) {
        try {
            // First get the article vector by URL
            const article = await this.getArticleVectorByUrl(url);
            if (!article) {
                throw new Error('Article not found in vector database');
            }

            // Then search for similar articles using the article's vector
            const searchResponse = await this.client.search({
                collection_name: this.collectionName,
                vector: [article.data[0].article_embed],
                output_fields: ['article_id', 'url'],
                limit: topK + 1, // Get one extra to exclude the original article
                metric_type: 'COSINE',
                params: { nprobe: 10 },
            });
            console.log(searchResponse);
            // Filter out the original article and map results
            const newResults = searchResponse.results
                .filter((result) => result.url !== url)
                .slice(0, topK)
                .map((result) => ({
                    article_id: result.article_id,
                    url: result.url,
                    similarity_score: result.score,
                }));
            console.log(newResults);
            return newResults;
        } catch (error) {
            console.error('Error searching similar articles:', error);
            throw error;
        }
    }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { ArticleRepository } from './article.repository';
import { Article } from './entities/article.model';
import { PaginatedArticlesResponseDto } from './dtos/paginated-articles-response.dto';
import { ArticleResponseDto } from './dtos/article-response.dto';
import { OpenAI } from 'openai';
import { ConfigService } from '@nestjs/config';
import { MilvusService } from '../milvus/milvus.service';

@Injectable()
export class ArticlesService {
    private openai: OpenAI;

    constructor(
        private readonly articleRepository: ArticleRepository,
        private readonly configService: ConfigService,
        private readonly milvusService: MilvusService,
    ) {
        this.openai = new OpenAI({
            apiKey: this.configService.get<string>('OPENAI_API_KEY'),
        });
    }

    async getAllArticles(
        page: number = 1,
        pageSize: number = 10,
    ): Promise<PaginatedArticlesResponseDto> {
        const { rows, count } = await this.articleRepository.findAndCountAll(
            page,
            pageSize,
        );
        console.log(rows);
        return {
            articles: this.transformArticles(rows),
            total: count,
            page,
            pageSize,
        };
    }

    async getArticlesBetweenDatesWithPagination(
        startTime: string,
        endTime: string,
        page: number = 1,
        pageSize: number = 10,
    ): Promise<PaginatedArticlesResponseDto> {
        const startDate = new Date(startTime);
        const endDate = new Date(endTime);

        const { rows, count } = await this.articleRepository.findByDateRange(
            startDate,
            endDate,
            page,
            pageSize,
        );

        return {
            articles: this.transformArticles(rows),
            total: count,
            page,
            pageSize,
        };
    }

    async getArticlesByCategory(
        category: string,
        page: number = 1,
        pageSize: number = 10,
    ): Promise<PaginatedArticlesResponseDto> {
        const { rows, count } = await this.articleRepository.findByCategory(
            category,
            page,
            pageSize,
        );

        return {
            articles: this.transformArticles(rows),
            total: count,
            page,
            pageSize,
        };
    }

    async getTrendingArticles(
        page: number = 1,
        pageSize: number = 10,
        minScore: number = 0,
    ): Promise<PaginatedArticlesResponseDto> {
        const { rows, count } =
            await this.articleRepository.findTrendingArticles(
                page,
                pageSize,
                minScore,
            );

        return {
            articles: this.transformArticles(rows),
            total: count,
            page,
            pageSize,
        };
    }

    async getTrendingArticlesByCategory(
        category: string,
        page: number = 1,
        pageSize: number = 10,
        minScore: number = 0,
    ): Promise<PaginatedArticlesResponseDto> {
        const { rows, count } =
            await this.articleRepository.findTrendingArticlesByCategory(
                category,
                page,
                pageSize,
                minScore,
            );

        return {
            articles: this.transformArticles(rows),
            total: count,
            page,
            pageSize,
        };
    }

    async getArticleById(id: string): Promise<ArticleResponseDto> {
        const article = await this.articleRepository.findById(id);

        if (!article) {
            throw new NotFoundException(`Article with ID ${id} not found`);
        }

        if (!article.dataValues.summary) {
            const summary = await this.generateSummary(
                article.dataValues.content,
                article.dataValues.title,
                article.dataValues.mainCategory,
            );

            await this.articleRepository.updateSummary(id, summary);
            article.dataValues.summary = summary;
        }

        return this.transformArticle(article);
    }

    async getRelatedArticles(
        url: string,
        top: number = 5,
    ): Promise<ArticleResponseDto[]> {
        const article = await this.articleRepository.findByUrl(url);
        if (!article) {
            throw new NotFoundException(`Article with URL ${url} not found`);
        }

        // Get related articles using vector search
        const relatedArticles = await this.milvusService.searchSimilarArticles(
            article.dataValues.url,
            top + 1, // Get one extra to exclude the original article
        );
        // Filter out the original article and transform the results

        // Get full article details from the database
        const articleIds = relatedArticles.map((related) => related.article_id);
        //const articles = await this.articleRepository.findByIds(articleIds);
        console.log(articleIds);
        // Transform and return the articles
        //return this.transformArticles(articles);
        return [];
    }

    private async generateSummary(
        content: string,
        title: string,
        category: string,
    ): Promise<string> {
        try {
            const prompt = `
            Generate a brief summary (maximum 3-4 sentences) of the following article.

            Title: ${title}
            Category: ${category}
            Content: ${content}

            Your response should be a concise summary only. Do not include any explanations, introductions, or analysis. No markdown formatting.
            `;

            const response = await this.openai.chat.completions.create({
                model: this.configService.get<string>('OPENAI_MODEL'),
                messages: [
                    {
                        role: 'system',
                        content:
                            'You are a helpful assistant that summarizes news articles concisely.',
                    },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.5,
            });

            return response.choices[0].message.content.trim();
        } catch (error) {
            console.error('Error generating summary with OpenAI:', error);
            return 'Summary generation failed. Please try again later.';
        }
    }

    private transformArticles(articles: Article[]): ArticleResponseDto[] {
        return articles.map((article) => this.transformArticle(article));
    }

    private transformArticle(article: Article): ArticleResponseDto {
        const formattedArticle = article.dataValues;
        return {
            trending_id: formattedArticle.trendingId,
            article_id: formattedArticle.articleId,
            url: formattedArticle.url,
            image_url: formattedArticle.imageUrl,
            categories: formattedArticle.categories || [],
            main_category: formattedArticle.mainCategory || 'General',
            title: formattedArticle.title,
            trend: formattedArticle.trend,
            //content: formattedArticle.content,
            summary: formattedArticle.summary,
            similarity_score: formattedArticle.similarityScore,
            publish_date: formattedArticle.publishDate
                ? formattedArticle.publishDate.toISOString()
                : null,
            analyzed_date: formattedArticle.analyzedDate
                ? formattedArticle.analyzedDate.toISOString()
                : null,
        };
    }
}

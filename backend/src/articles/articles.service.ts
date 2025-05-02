import { Injectable } from '@nestjs/common';
import { ArticleRepository } from './article.repository';
import { Article } from './entities/article.model';

export interface PaginatedArticlesResult {
    articles: any[];
    total: number;
    page: number;
    pageSize: number;
}

@Injectable()
export class ArticlesService {
    constructor(private readonly articleRepository: ArticleRepository) {}

    async getAllArticles(
        page: number = 1,
        pageSize: number = 10,
    ): Promise<PaginatedArticlesResult> {
        const { rows, count } = await this.articleRepository.findAndCountAll(
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

    async getArticlesBetweenDatesWithPagination(
        startTime: string,
        endTime: string,
        page: number = 1,
        pageSize: number = 10,
    ): Promise<PaginatedArticlesResult> {
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

    async getLatestArticles(limit: number = 10): Promise<any[]> {
        const articles = await this.articleRepository.findLatest(limit);
        return this.transformArticles(articles);
    }

    private transformArticles(articles: Article[]): any[] {
        return articles.map((article) => {
            const publishDate = article.publishDate
                ? new Date(article.publishDate)
                : new Date();

            return {
                id: article.articleId,
                trending_id: article.trendingId,
                url: article.url,
                title: article.title,
                content: article.content,
                summary: article.summary,
                trend: article.trend,
                image_url: article.imageUrl,
                similarity_score: article.similarityScore,
                categories: article.categories || [],
                main_category: article.mainCategory,
                publish_date: article.publishDate
                    ? article.publishDate.toISOString()
                    : null,
                analyzed_date: article.analyzedDate
                    ? article.analyzedDate.toISOString()
                    : null,

                // Adding these fields for backward compatibility
                year: publishDate.getFullYear(),
                month: publishDate.toLocaleString('en-US', { month: 'long' }),
                month_number: publishDate.getMonth() + 1,
                day: publishDate.getDate(),
                hour: publishDate.getHours(),
                minute: publishDate.getMinutes(),
                weekday: publishDate.toLocaleString('en-US', {
                    weekday: 'long',
                }),
                time: `${publishDate.getHours()}:${String(publishDate.getMinutes()).padStart(2, '0')}`,
            };
        });
    }
}

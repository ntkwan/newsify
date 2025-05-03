import { Injectable } from '@nestjs/common';
import { ArticleRepository } from './article.repository';
import { Article } from './entities/article.model';
import { PaginatedArticlesResponseDto } from './dtos/paginated-articles-response.dto';
import { ArticleResponseDto } from './dtos/article-response.dto';

@Injectable()
export class ArticlesService {
    constructor(private readonly articleRepository: ArticleRepository) {}

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

    private transformArticles(articles: Article[]): ArticleResponseDto[] {
        return articles.map((article) => {
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
        });
    }
}

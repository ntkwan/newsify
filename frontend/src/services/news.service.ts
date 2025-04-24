import { INewsArticle, INewsResponse } from '../types/news';
import mockData from '../data/mock-data.json';

export interface INewsService {
    getNews(page?: number, pageSize?: number): Promise<INewsResponse>;
    getNewsById(id: string): Promise<INewsArticle | null>;
    getNewsByCategory(
        category: string,
        page?: number,
        pageSize?: number,
    ): Promise<INewsResponse>;
}

export class MockNewsService implements INewsService {
    private articles: INewsArticle[] = mockData;

    async getNews(
        page: number = 1,
        pageSize: number = 10,
    ): Promise<INewsResponse> {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        const paginatedData = this.articles.slice(start, end);

        return {
            articles: paginatedData,
            total: this.articles.length,
            page,
            pageSize,
        };
    }

    async getNewsById(id: string): Promise<INewsArticle | null> {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        const article = this.articles.find((article) => article.url === id);
        return article || null;
    }

    async getNewsByCategory(
        category: string,
        page: number = 1,
        pageSize: number = 10,
    ): Promise<INewsResponse> {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        const filteredArticles = this.articles.filter((article) =>
            article.categories.some(
                (cat) => cat.toLowerCase() === category.toLowerCase(),
            ),
        );

        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        const paginatedData = filteredArticles.slice(start, end);

        return {
            articles: paginatedData,
            total: filteredArticles.length,
            page,
            pageSize,
        };
    }
}

// Export a singleton instance
export const newsService = new MockNewsService();

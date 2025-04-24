import { INewsArticle, INewsResponse } from '../types/news';
import mockData from '../data/mock-data.json';

/**
 * MockNewsService – dịch vụ tin tức giả lập.
 * - Đọc dữ liệu mẫu từ `mock-data.json`.
 * - Tìm kiếm, lọc category và phân trang.
 * - Cung cấp các hàm lấy danh sách, chi tiết bài viết, liệt kê category.
 * - Xuất sẵn một instance `newsService` dùng chung cho toàn app.
 */

export interface INewsService {
    getNews(
        page?: number,
        pageSize?: number,
        search?: string,
        category?: string,
    ): Promise<INewsResponse>;
    getNewsById(id: string): Promise<INewsArticle | null>;
    getNewsByCategory(
        category: string,
        page?: number,
        pageSize?: number,
    ): Promise<INewsResponse>;
    getAllCategories(): string[];
}

export class MockNewsService implements INewsService {
    private articles: INewsArticle[] = mockData;

    async getNews(
        page: number = 1,
        pageSize: number = 10,
        search?: string,
        category?: string,
    ): Promise<INewsResponse> {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        let filteredArticles = [...this.articles];

        // Apply search filter
        if (search) {
            filteredArticles = filteredArticles.filter((article) =>
                article.title.toLowerCase().includes(search.toLowerCase()),
            );
        }

        // Apply category filter
        if (category && category !== 'all') {
            filteredArticles = filteredArticles.filter((article) =>
                article.categories.some(
                    (cat) => cat.toLowerCase() === category.toLowerCase(),
                ),
            );
        }

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

    getAllCategories(): string[] {
        const categories = new Set<string>();
        this.articles.forEach((article) => {
            article.categories.forEach((category) => categories.add(category));
        });
        return Array.from(categories);
    }
}

// Export a singleton instance
export const newsService = new MockNewsService();

import { ArticlesResponse } from '@/types/article';

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

export class ArticleService {
    static async getArticles(
        page: number = 1,
        pageSize: number = 10,
        search?: string,
        dateRange?: string,
    ): Promise<ArticlesResponse> {
        const params = new URLSearchParams({
            page: page.toString(),
            pageSize: pageSize.toString(),
        });

        if (search) {
            params.append('search', search);
        }

        if (dateRange) {
            const [from, to] = dateRange.split(',');
            params.append('from', from);
            params.append('to', to);
        }

        const response = await fetch(
            `${API_BASE_URL}/articles?${params.toString()}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        );

        if (!response.ok) {
            throw new Error('Failed to fetch articles');
        }

        return response.json();
    }
}

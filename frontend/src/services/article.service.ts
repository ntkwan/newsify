import { Article, TrendingArticlesResponse } from '@/types/article';

export class ArticleService {
    static async getArticles(
        page: number,
        pageSize: number,
        search?: string,
        date?: string,
        category?: string,
    ): Promise<{ articles: Article[]; total: number }> {
        let url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/articles`;

        if (category && category !== 'All') {
            url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/articles/categories`;
        }

        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('pageSize', pageSize.toString());

        if (search) {
            params.set('search', search);
        }

        if (date) {
            params.set('date', date);
        }

        if (category && category !== 'All') {
            params.set('category', category);
        }

        const response = await fetch(`${url}?${params.toString()}`);
        if (!response.ok) {
            throw new Error('Failed to fetch articles');
        }

        return response.json();
    }
}

export async function getTrendingArticles(
    page: number = 1,
    pageSize: number = 10,
    minScore: number = 0.3,
): Promise<TrendingArticlesResponse> {
    const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/articles/trending?page=${page}&pageSize=${pageSize}&minScore=${minScore}`;

    const response = await fetch(url, {
        headers: {
            Accept: 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch trending articles');
    }

    return response.json();
}

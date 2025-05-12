export interface Article {
    trending_id: string;
    article_id: string;
    url: string;
    image_url: string;
    categories: string[];
    main_category: string;
    title: string;
    trend: string | null;
    summary: string;
    similarity_score: number;
    publish_date: string;
    analyzed_date: string;
}

export interface ArticlesResponse {
    articles: Article[];
    total: number;
    page: number;
    pageSize: number;
}

export interface TrendingArticle {
    trending_id: string;
    article_id: string;
    url: string;
    image_url: string;
    categories: string[];
    main_category: string;
    title: string;
    trend: string;
    summary: string | null;
    similarity_score: number;
    publish_date: string;
    analyzed_date: string;
}

export interface TrendingArticlesResponse {
    articles: TrendingArticle[];
    total: number;
    page: number;
    pageSize: number;
}

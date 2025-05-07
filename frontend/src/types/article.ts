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

export interface Article {
    url: string;
    src: string;
    title: string;
    content: string;
    image_url: string;
    author: string;
    time_reading: string;
    publish_date: string;
    time: string;
    timezone: string;
    categories: string[];
}

export interface ArticlesResponse {
    articles: Article[];
    total: number;
    page: number;
    pageSize: number;
}

export interface INewsArticle {
    url: string;
    src: string;
    language: string;
    categories: string[];
    title: string;
    content: string;
    image_url: string;
    publish_date: string;
    time: string | null;
    timezone: string | null;
    hour: number | null;
    minute: number | null;
    day: number | null;
    month: string | null;
    month_number: number | null;
    year: number | null;
    weekday: string | null;
    time_reading: string;
    author: string;
}

export interface INewsResponse {
    articles: INewsArticle[];
    total: number;
    page: number;
    pageSize: number;
}

import { Suspense } from 'react';
import { newsService } from '@/services/news.service';
import NewsArticle from '@/components/news-article';
import NewsSkeleton from '@/components/news-skeleton';
import Pagination from '@/components/pagination';

// Thêm ISR với revalidate time là 5 phút
export const revalidate = 300;

async function NewsList({
    page,
    pageSize = 5,
}: {
    page: number;
    pageSize?: number;
}) {
    const { articles, total } = await newsService.getNews(page, pageSize);
    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className="space-y-6">
            <div className="space-y-6">
                {articles.map((article) => (
                    <NewsArticle key={article.url} article={article} />
                ))}
            </div>
            <Pagination totalPages={totalPages} />
        </div>
    );
}

export default function DailyNewsPage({
    searchParams,
}: {
    searchParams: { page?: string };
}) {
    const page = parseInt(searchParams.page || '1', 10);

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Daily News</h1>
            <Suspense key={page} fallback={<NewsSkeleton />}>
                <NewsList page={page} />
            </Suspense>
        </div>
    );
}

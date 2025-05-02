import { Suspense } from 'react';
import { ArticleService } from '@/services/article.service';
import NewsArticle from '@/components/news-article';
import NewsSkeleton from '@/components/news-skeleton';
import Pagination from '@/components/pagination';
import { SearchBar } from '@/components/search-bar';

async function NewsList({
    page,
    pageSize = 10,
}: {
    page: number;
    pageSize?: number;
}) {
    const { articles, total } = await ArticleService.getArticles(
        page,
        pageSize,
    );
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

export default async function DailyNewsPage({
    searchParams,
}: {
    searchParams: { page?: string };
}) {
    const { page = '1' } = await searchParams;
    const currentPage = parseInt(page, 10);

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Daily News</h1>
            <SearchBar categories={[]} />
            <Suspense key={currentPage} fallback={<NewsSkeleton />}>
                <NewsList page={currentPage} />
            </Suspense>
        </div>
    );
}

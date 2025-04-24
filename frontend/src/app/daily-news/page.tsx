import { Suspense } from 'react';
import { newsService } from '@/services/news.service';
import NewsArticle from '@/components/news-article';
import NewsSkeleton from '@/components/news-skeleton';
import Pagination from '@/components/pagination';
import { SearchBar } from '@/components/search-bar';

async function NewsList({
    page,
    pageSize = 5,
    search,
    category,
}: {
    page: number;
    pageSize?: number;
    search?: string;
    category?: string;
}) {
    const { articles, total } = await newsService.getNews(
        page,
        pageSize,
        search,
        category,
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

export default function DailyNewsPage({
    searchParams,
}: {
    searchParams: { page?: string; search?: string; category?: string };
}) {
    const page = parseInt(searchParams.page || '1', 10);
    const search = searchParams.search;
    const category = searchParams.category;
    const categories = newsService.getAllCategories();

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Daily News</h1>
            <SearchBar categories={categories} />
            <Suspense
                key={`${page}-${search}-${category}`}
                fallback={<NewsSkeleton />}
            >
                <NewsList page={page} search={search} category={category} />
            </Suspense>
        </div>
    );
}

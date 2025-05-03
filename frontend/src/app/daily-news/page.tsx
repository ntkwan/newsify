import { Suspense } from 'react';
import { ArticleService } from '@/services/article.service';
import NewsList from '@/components/news-list';
import Pagination from '@/components/pagination';
import Loading from './loading';

async function NewsListWrapper({
    page,
    search,
    date,
}: {
    page: number;
    search?: string;
    date?: string;
}) {
    const response = await ArticleService.getArticles(page, 10, search, date);
    return (
        <>
            <NewsList articles={response.articles} />
            <Pagination
                currentPage={page}
                totalPages={Math.ceil(response.total / 10)}
                totalItems={response.total}
            />
        </>
    );
}

export default async function DailyNewsPage({
    searchParams,
}: {
    searchParams: { page?: string; search?: string; date?: string };
}) {
    const { page = '1', search = '', date = '' } = await searchParams;
    const currentPage = Number(page);

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Daily News</h1>
            <Suspense
                key={`${currentPage}-${search}-${date}`}
                fallback={<Loading />}
            >
                <NewsListWrapper
                    page={currentPage}
                    search={search}
                    date={date}
                />
            </Suspense>
        </div>
    );
}

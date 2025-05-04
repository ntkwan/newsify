import { Suspense } from 'react';
import { ArticleService } from '@/services/article.service';
import NewsList from '@/components/news-list';
import Pagination from '@/components/pagination';
import Loading from '../articles/loading';
import Link from 'next/link';

const CATEGORIES = [
    'All',
    'Autos and Vehicles',
    'Beauty and Fashion',
    'Business and Finance',
    'Climate',
    'Entertainment',
    'Food and Drink',
    'Games',
    'Health',
    'Hobbies and Leisure',
    'Jobs and Education',
    'Law and Government',
    'Other',
    'Pets and Animal',
    'Politics',
    'Science',
    'Shopping',
    'Sports',
    'Technology',
    'Travel and Transportation',
];

async function NewsListWrapper({
    page,
    search,
    date,
    category,
}: {
    page: number;
    search?: string;
    date?: string;
    category?: string;
}) {
    const response = await ArticleService.getArticles(
        page,
        10,
        search,
        date,
        category,
    );
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

type Props = {
    searchParams: Promise<{
        page?: string;
        search?: string;
        date?: string;
        category?: string;
    }>;
};

export default async function DailyNewsPage(props: Props) {
    const searchParams = await props.searchParams;
    const {
        page = '1',
        search = '',
        date = '',
        category = 'All',
    } = searchParams;
    const currentPage = Number(page);

    const createCategoryUrl = (cat: string) => {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (date) params.set('date', date);
        params.set('category', cat);
        params.set('page', '1');
        return `/articles?${params.toString()}`;
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Daily News</h1>

            <div className="flex flex-wrap gap-2 mb-8">
                {CATEGORIES.map((cat) => (
                    <Link
                        key={cat}
                        href={createCategoryUrl(cat)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                            category === cat
                                ? 'bg-[#01aa4f] text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        {cat}
                    </Link>
                ))}
            </div>

            <Suspense
                key={`${currentPage}-${search}-${date}-${category}`}
                fallback={<Loading />}
            >
                <NewsListWrapper
                    page={currentPage}
                    search={search}
                    date={date}
                    category={category}
                />
            </Suspense>
        </div>
    );
}

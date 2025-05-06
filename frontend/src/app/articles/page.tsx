'use client';

import { useEffect, useState } from 'react';
import { ArticleService } from '@/services/article.service';
import NewsList from '@/components/news-list';
import Pagination from '@/components/pagination';
import Loading from '../articles/loading';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Article } from '@/types/article';

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

export default function DailyNewsPage() {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [articles, setArticles] = useState<Article[]>([]);
    const [total, setTotal] = useState(0);

    const page = searchParams.get('page') || '1';
    const search = searchParams.get('search') || '';
    const date = searchParams.get('date') || '';
    const category = searchParams.get('category') || 'All';
    const currentPage = Number(page);

    useEffect(() => {
        const fetchArticles = async () => {
            setLoading(true);
            try {
                const response = await ArticleService.getArticles(
                    currentPage,
                    10,
                    search,
                    date,
                    category,
                );
                setArticles(response.articles);
                setTotal(response.total);
            } catch (error) {
                console.error('Error fetching articles:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchArticles();
    }, [currentPage, search, date, category]);

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

            {loading ? (
                <Loading />
            ) : (
                <>
                    <NewsList articles={articles} />
                    <Pagination
                        currentPage={currentPage}
                        totalPages={Math.ceil(total / 10)}
                        totalItems={total}
                    />
                </>
            )}
        </div>
    );
}

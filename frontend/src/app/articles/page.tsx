/**
 * Daily News Page Component
 *
 * This component displays a paginated list of news articles with filtering capabilities.
 * Features:
 * - Category-based filtering
 * - Search functionality
 * - Date-based filtering
 * - Pagination
 *
 * @component
 */

'use client';

import { useEffect, useState } from 'react';
import { ArticleService } from '@/services/article.service';
import NewsList from '@/components/news-list';
import Pagination from '@/components/pagination';
import Loading from '../articles/loading';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Article } from '@/types/article';

// Constants
const ARTICLES_PER_PAGE = 10;
const CATEGORIES = [
    'All',
    'Beauty and Fashion',
    'Business and Finance',
    'Climate',
    'Entertainment',
    'Games',
    'Health',
    'Social',
    'Politics',
    'Science',
    'Shopping',
    'Sports',
    'Technology',
    'Travel and Transportation',
];

export default function DailyNewsPage() {
    // State management
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [articles, setArticles] = useState<Article[]>([]);
    const [total, setTotal] = useState(0);

    // URL parameters
    const page = searchParams.get('page') || '1';
    const search = searchParams.get('search') || '';
    const date = searchParams.get('date') || '';
    const category = searchParams.get('category') || 'All';
    const currentPage = Number(page);

    /**
     * Fetches articles based on current filters and pagination
     */
    useEffect(() => {
        const fetchArticles = async () => {
            setLoading(true);
            try {
                const response = await ArticleService.getArticles(
                    currentPage,
                    ARTICLES_PER_PAGE,
                    search,
                    date,
                    category === 'Social' ? 'Other' : category,
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

    /**
     * Creates a URL for category filtering while preserving other search parameters
     * @param {string} cat - The category to filter by
     * @returns {string} The constructed URL with query parameters
     */
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

            {/* Category Filter */}
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

            {/* Article List and Pagination */}
            {loading ? (
                <Loading />
            ) : (
                <>
                    <NewsList articles={articles} />
                    <Pagination
                        currentPage={currentPage}
                        totalPages={Math.ceil(total / ARTICLES_PER_PAGE)}
                        totalItems={total}
                    />
                </>
            )}
        </div>
    );
}

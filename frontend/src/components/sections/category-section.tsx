import { TrendingArticle } from '@/types/article';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface CategoryArticle {
    category: string;
    article: TrendingArticle | null;
}

export default function CategorySection() {
    const [categoryArticles, setCategoryArticles] = useState<CategoryArticle[]>(
        [],
    );
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const categories = [
        'Politics',
        'Science',
        'Sports',
        'Technology',
        'Climate',
    ];

    useEffect(() => {
        const fetchCategoryArticles = async () => {
            setLoading(true);
            try {
                const articles = await Promise.all(
                    categories.map(async (category) => {
                        try {
                            const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/articles/trending?page=1&pageSize=1&category=${category}&minScore=0`;
                            const response = await fetch(url);
                            if (!response.ok) {
                                throw new Error(
                                    `Failed to fetch ${category} articles`,
                                );
                            }
                            const data = await response.json();
                            return {
                                category,
                                article: data.articles[0] || null,
                            };
                        } catch (error) {
                            console.error(
                                `Error fetching ${category} articles:`,
                                error,
                            );
                            return {
                                category,
                                article: null,
                            };
                        }
                    }),
                );
                setCategoryArticles(articles);
            } catch (error) {
                console.error('Error fetching category articles:', error);
                setError('Failed to load category articles');
            } finally {
                setLoading(false);
            }
        };

        fetchCategoryArticles();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div className="text-red-500">{error}</div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-[#01aa4f] text-2xl font-bold">
                    Top Picks by Category
                </h2>
                <Link href="/articles" className="text-[#01aa4f] text-sm">
                    See all
                </Link>
            </div>
            <div className="space-y-6">
                {categoryArticles.map((item, index) => (
                    <Link
                        href={
                            item.article
                                ? `/articles/${item.article.trending_id}`
                                : '#'
                        }
                        key={item.category}
                        className={`block transition-all duration-200 hover:bg-gray-100 rounded-lg p-2 -m-2 ${
                            !item.article ? 'cursor-default' : ''
                        }`}
                    >
                        <div className="flex gap-4 py-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-400">
                                {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                {item.article ? (
                                    <>
                                        <h3 className="font-medium mb-2 group-hover:text-[#01aa4f] transition-colors duration-200">
                                            {item.article.title}
                                        </h3>
                                        {item.article.summary && (
                                            <p className="text-sm text-gray-500 line-clamp-1 mb-2">
                                                {item.article.summary}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-4 text-sm text-gray-500 justify-end pr-2">
                                            <span className="flex items-center gap-1">
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="h-4 w-4"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                    />
                                                </svg>
                                                {new Date(
                                                    item.article.publish_date,
                                                ).toLocaleDateString('vi-VN')}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="h-4 w-4"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                                                    />
                                                </svg>
                                                {item.category}
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-sm text-gray-500">
                                        No trending articles found
                                    </p>
                                )}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}

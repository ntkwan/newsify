import { useEffect, useState } from 'react';
import { Article } from '@/types/article';
import { ArticleService } from '@/services/article.service';
import Link from 'next/link';

export default function LatestNewsSection() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchArticles = async () => {
            try {
                const response = await ArticleService.getArticles(1, 5);
                setArticles(response.articles);
            } catch (error) {
                console.error('Error fetching articles:', error);
                setError('Failed to load articles');
                setArticles([]);
            } finally {
                setLoading(false);
            }
        };

        fetchArticles();
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div className="text-red-500">{error}</div>;
    }

    if (!articles.length) {
        return <div>No articles found</div>;
    }

    return (
        <div>
            <h2 className="text-[#01aa4f] text-2xl font-bold mb-6">
                Latest News
            </h2>
            <div className="space-y-6">
                {articles.map((article, index) => (
                    <Link
                        href={`/articles/${article.trending_id}`}
                        key={article.article_id}
                        className="block transition-all duration-200 hover:bg-gray-100 rounded-lg p-2 -m-2"
                    >
                        <div className="flex gap-4 py-1">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-400">
                                {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-medium mb-1 group-hover:text-[#01aa4f] transition-colors duration-200">
                                    {article.title}
                                </h3>
                                <p className="text-sm text-gray-600 mb-2 line-clamp-1">
                                    {article.summary}
                                </p>
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
                                            article.publish_date,
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
                                        {article.main_category}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}

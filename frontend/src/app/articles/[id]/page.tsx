'use client';
import { useEffect, useState } from 'react';
import { Article } from '@/types/article';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function ArticlePage() {
    const params = useParams();
    const articleId = params?.id as string;
    const [article, setArticle] = useState<Article | null>(null);
    const [loadingSummary, setLoadingSummary] = useState(true);

    useEffect(() => {
        if (!articleId) return;

        let ignore = false;
        async function fetchArticle() {
            try {
                const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/articles/${articleId}`;

                const res = await fetch(url, {
                    headers: {
                        accept: 'application/json',
                    },
                });

                if (!res.ok) {
                    throw new Error(`Failed to fetch article: ${res.status}`);
                }
                const data = await res.json();

                if (!ignore) {
                    setArticle(data);
                    setLoadingSummary(!data.summary);
                }
            } catch (error) {
                console.error('Error fetching article:', error);
            }
        }
        fetchArticle();
        return () => {
            ignore = true;
        };
    }, [articleId]);

    // If there is no article yet, show a global loading indicator.
    if (!article) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
                <div className="h-10 bg-gray-200 rounded w-2/3 mb-4" />
                <div className="flex items-center gap-4 mb-4">
                    <div className="h-4 w-24 bg-gray-200 rounded" />
                    <div className="h-4 w-4 bg-gray-200 rounded-full" />
                    <div className="h-4 w-32 bg-gray-200 rounded" />
                </div>
                <div className="w-full h-64 bg-gray-200 rounded mb-6" />
                <div className="h-6 w-1/2 bg-gray-200 rounded mb-4" />
                <div className="h-10 w-40 bg-gray-200 rounded" />
            </div>
        );
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-4">{article.title}</h1>
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <span>{article.main_category}</span>
                    <span>•</span>
                    <span>{formatDate(article.publish_date)}</span>
                </div>
                <Image
                    src={article.image_url || '/placeholder.svg'}
                    alt={article.title}
                    width={800}
                    height={400}
                    className="rounded-lg w-full h-auto object-cover mb-6"
                />
                <div className="prose max-w-none">
                    {loadingSummary ? (
                        <div className="h-6 w-2/3 bg-gray-200 rounded animate-pulse mb-6" />
                    ) : (
                        <p className="text-lg text-gray-700 mb-6">
                            {article.summary}
                        </p>
                    )}
                    {article.url && (
                        <div className="flex justify-end">
                            <Link
                                href={article.url}
                                target="_blank"
                                className="inline-flex items-center px-4 py-2 bg-[#01aa4f] text-white rounded-md hover:bg-[#018f42] transition-colors"
                            >
                                Read original article
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

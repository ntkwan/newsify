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
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="relative mb-8 p-6 rounded-lg bg-green-100 border border-green-200 shadow-sm">
                    <div className="absolute -top-3 left-6 bg-primary text-white px-4 py-1 rounded-md text-sm font-medium">
                        Summary
                    </div>
                    <div className="flex items-center space-x-1">
                        <span className="text-lg text-primary font-bold">
                            Summarizing the article
                        </span>
                        <span className="animate-bounce delay-0 text-primary text-lg font-bold">
                            .
                        </span>
                        <span className="animate-bounce delay-150 text-primary text-lg font-bold">
                            .
                        </span>
                        <span className="animate-bounce delay-300 text-primary text-lg font-bold">
                            .
                        </span>
                    </div>
                </div>
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
                        <div className="relative mb-8 p-6 rounded-lg bg-green-100 border border-green-100 shadow-sm hover:shadow-md transition-all duration-300">
                            <div className="absolute -top-3 left-6 bg-primary text-white px-4 py-1 rounded-md text-sm font-medium">
                                Summary
                            </div>
                            <p className="text-lg text-gray-700 leading-relaxed">
                                {article.summary}
                            </p>
                        </div>
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

/**
 * Article Detail Page
 *
 * This page displays the full content of an article, including:
 * - Article title, category, and publish date
 * - Featured image
 * - Article summary
 * - Link to original article
 * - Related articles carousel
 */

'use client';
import { useEffect, useState } from 'react';
import { Article } from '@/types/article';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';

/**
 * Extended Article interface for related articles
 * Adds similarity score to track relevance
 */
interface RelatedArticle extends Article {
    similarity_score: number;
}

export default function ArticlePage() {
    // Get article ID from URL params
    const params = useParams();
    const articleId = params?.id as string;

    // State management
    const [article, setArticle] = useState<Article | null>(null);
    const [loadingSummary, setLoadingSummary] = useState(true);
    const [relatedArticles, setRelatedArticles] = useState<RelatedArticle[]>(
        [],
    );
    const [loadingRelated, setLoadingRelated] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);

    /**
     * Navigation handlers for related articles carousel
     */
    const handlePrev = () => {
        setCurrentIndex((prev) =>
            prev === 0 ? relatedArticles.length - 3 : prev - 1,
        );
    };

    const handleNext = () => {
        setCurrentIndex((prev) =>
            prev === relatedArticles.length - 3 ? 0 : prev + 1,
        );
    };

    /**
     * Fetch article details when component mounts or articleId changes
     */
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

    /**
     * Fetch related articles when article details are loaded
     */
    useEffect(() => {
        if (!article || !article.url) return;

        let ignore = false;
        async function fetchRelatedArticles() {
            try {
                const encodedUrl = encodeURIComponent(article?.url || '');
                const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/articles/related?url=${encodedUrl}&top=5`;

                const res = await fetch(url, {
                    headers: {
                        accept: 'application/json',
                    },
                });

                if (!res.ok) {
                    throw new Error(
                        `Failed to fetch related articles: ${res.status}`,
                    );
                }
                const data = await res.json();

                if (!ignore) {
                    setRelatedArticles(data);
                    setLoadingRelated(false);
                }
            } catch (error) {
                console.error('Error fetching related articles:', error);
                setLoadingRelated(false);
            }
        }
        fetchRelatedArticles();
        return () => {
            ignore = true;
        };
    }, [article]);

    /**
     * Loading state while article is being fetched
     */
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

    /**
     * Format date to locale string
     */
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
            {/* Article Header */}
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

                {/* Article Summary */}
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

                    {/* Original Article Link */}
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

            {/* Related Articles Carousel */}
            <div className="mt-12">
                <h2 className="text-2xl font-bold mb-6">Related articles</h2>
                {loadingRelated ? (
                    <div className="flex gap-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="animate-pulse flex-1">
                                <div className="bg-gray-200 h-40 rounded-lg mb-4"></div>
                                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="relative">
                        <div className="flex gap-4">
                            {relatedArticles
                                .slice(currentIndex, currentIndex + 3)
                                .map((relatedArticle) => (
                                    <Link
                                        href={`/articles/${relatedArticle.trending_id}`}
                                        key={relatedArticle.article_id}
                                        className="group flex-1"
                                    >
                                        <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden h-full">
                                            <div className="relative h-40">
                                                <Image
                                                    src={
                                                        relatedArticle.image_url ||
                                                        '/placeholder.svg'
                                                    }
                                                    alt={relatedArticle.title}
                                                    fill
                                                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                            </div>
                                            <div className="p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
                                                        {
                                                            relatedArticle.main_category
                                                        }
                                                    </span>
                                                    <span className="text-sm text-gray-500">
                                                        {formatDate(
                                                            relatedArticle.publish_date,
                                                        )}
                                                    </span>
                                                </div>
                                                <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
                                                    {relatedArticle.title}
                                                </h3>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                        </div>

                        {/* Carousel Navigation */}
                        {relatedArticles.length > 3 && (
                            <>
                                <button
                                    onClick={handlePrev}
                                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-16 bg-primary rounded-full p-2 shadow-lg hover:bg-primary-light transition-colors hover:cursor-pointer"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={2}
                                        stroke="#ffffff"
                                        className="w-6 h-6"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M15.75 19.5L8.25 12l7.5-7.5"
                                        />
                                    </svg>
                                </button>
                                <button
                                    onClick={handleNext}
                                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-16 bg-primary rounded-full p-2 shadow-lg hover:bg-primary-light transition-colors hover:cursor-pointer"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={2}
                                        stroke="#ffffff"
                                        className="w-6 h-6"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M8.25 4.5l7.5 7.5-7.5 7.5"
                                        />
                                    </svg>
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

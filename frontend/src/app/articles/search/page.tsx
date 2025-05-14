'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import Pagination from '@/components/pagination';
import { Skeleton } from '@/components/ui/skeleton';

interface Article {
    trendingId: string;
    title: string;
    summary: string;
    mainCategory: string;
    publishDate: string;
    imageUrl: string;
    highlights: {
        title: string[];
        content: string[];
        summary: string[];
    };
}

// Highlight the keywords
const highlightText = (text: string) => {
    return text.replace(
        /<strong>(.*?)<\/strong>/g,
        '<span class="text-[#01aa4f] font-semibold">$1</span>',
    );
};

export default function SearchPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [articles, setArticles] = useState<Article[]>([]);
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const query = searchParams.get('q') || '';
    const pageParam = searchParams.get('page');
    const pageSize = 20;

    useEffect(() => {
        if (pageParam) {
            const page = parseInt(pageParam);
            if (!isNaN(page) && page > 0) {
                setCurrentPage(page);
            }
        } else {
            setCurrentPage(1);
        }
    }, [pageParam]);

    useEffect(() => {
        const fetchArticles = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(
                    `https://backend.id.vn/articles/search?q=${encodeURIComponent(query)}&page=${currentPage}&size=${pageSize}`,
                );
                const data = await response.json();
                setArticles(data.articles || []);
                setTotal(data.total || 0);
            } catch (error) {
                console.error('Error fetching articles:', error);
            } finally {
                setIsLoading(false);
            }
        };

        if (query) {
            fetchArticles();
        }
    }, [query, currentPage]);

    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">
                Search results for &ldquo;{query}&rdquo; ({total} results)
            </h1>
            {isLoading ? (
                <div className="grid gap-6">
                    {[...Array(5)].map((_, index) => (
                        <div
                            key={index}
                            className="flex gap-4 p-4 border rounded-lg"
                        >
                            <Skeleton className="w-48 h-32 rounded-md flex-shrink-0" />
                            <div className="flex-1 min-w-0 space-y-3">
                                <Skeleton className="h-6 w-3/4" />
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-5 w-20" />
                                    <Skeleton className="h-5 w-32" />
                                </div>
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-2/3" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    <div className="grid gap-6">
                        {articles.map((article) => (
                            <div
                                key={article.trendingId}
                                className="flex gap-4 p-4 border rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
                                onClick={() =>
                                    router.push(
                                        `/articles/${article.trendingId}`,
                                    )
                                }
                            >
                                <div className="relative w-48 h-32 flex-shrink-0">
                                    <Image
                                        src={article.imageUrl}
                                        alt={article.title}
                                        fill
                                        className="object-cover rounded-md"
                                        sizes="192px"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h2
                                        className="text-xl font-semibold mb-2"
                                        dangerouslySetInnerHTML={{
                                            __html:
                                                article.highlights.title
                                                    .length > 0
                                                    ? highlightText(
                                                          article.highlights
                                                              .title[0],
                                                      )
                                                    : article.title,
                                        }}
                                    />
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge
                                            className="text-white"
                                            variant="default"
                                        >
                                            {article.mainCategory === 'Other'
                                                ? 'Social'
                                                : article.mainCategory}
                                        </Badge>
                                        <span className="text-sm text-muted-foreground">
                                            {new Date(
                                                article.publishDate,
                                            ).toLocaleDateString('en-US', {
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric',
                                            })}
                                        </span>
                                    </div>
                                    {article.highlights.content.length > 0 && (
                                        <p
                                            className="text-muted-foreground line-clamp-2"
                                            dangerouslySetInnerHTML={{
                                                __html: highlightText(
                                                    article.highlights
                                                        .content[0],
                                                ),
                                            }}
                                        />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    {totalPages > 1 && (
                        <div className="mt-8">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalItems={total}
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

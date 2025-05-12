import NewsCard from '../ui/news-card';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from '@/components/ui/carousel';
import { useEffect, useState } from 'react';
import { type CarouselApi } from '@/components/ui/carousel';
import { TrendingArticle } from '@/types/article';
import { getTrendingArticles } from '@/services/article.service';

export default function TrendingNewsSection() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [api, setApi] = useState<CarouselApi>();
    const [articles, setArticles] = useState<TrendingArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchTrendingArticles() {
            try {
                const response = await getTrendingArticles();
                setArticles(response.articles);
            } catch (err) {
                setError('Failed to load trending articles');
                console.error('Error fetching trending articles:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchTrendingArticles();
    }, []);

    if (loading) {
        return (
            <section>
                <h2 className="text-[#01aa4f] text-2xl font-bold mb-6">
                    Trending News
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
                    {[...Array(4)].map((_, index) => (
                        <div
                            key={index}
                            className="h-64 bg-gray-200 rounded-lg"
                        />
                    ))}
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <section>
                <h2 className="text-[#01aa4f] text-2xl font-bold mb-6">
                    Trending News
                </h2>
                <div className="text-red-500">{error}</div>
            </section>
        );
    }

    return (
        <section>
            <h2 className="text-[#01aa4f] text-2xl font-bold mb-6">
                Trending News
            </h2>
            <div className="relative">
                <Carousel
                    setApi={setApi}
                    opts={{
                        align: 'start',
                        loop: true,
                    }}
                    className="w-full"
                >
                    <CarouselContent className="-ml-4">
                        {articles.map((article) => (
                            <CarouselItem
                                key={article.trending_id}
                                className="pl-4 md:basis-1/2"
                            >
                                <NewsCard
                                    image={article.image_url}
                                    category={article.main_category}
                                    title={article.title}
                                    isLarge
                                    href={`/articles/${article.trending_id}`}
                                />
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    <CarouselPrevious className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 hover:cursor-pointer" />
                    <CarouselNext className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 hover:cursor-pointer" />
                </Carousel>
            </div>
        </section>
    );
}

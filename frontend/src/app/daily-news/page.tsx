'use client';

import type React from 'react';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import CategoryTabs from '@/components/category-tabs';
import NewsArticle from '@/components/news-article';
import { Pagination } from '@/components/ui/pagination';

interface Article {
    id: number;
    image: string;
    title: string;
    excerpt: string;
    time: string;
}

const BrowsePage: React.FC = () => {
    const searchParams = useSearchParams();
    const page = parseInt(searchParams.get('page') || '1', 10);
    const [activeCategory, setActiveCategory] = useState<string>('Today');

    const categories: string[] = [
        'Today',
        'World',
        'Politics',
        'Business',
        'Opinion',
        'Tech',
        'Science',
        'Health',
        'Sports',
        'Entertainment',
        'Travel',
    ];

    const articles: Article[] = [
        {
            id: 1,
            image: '/images/placeholders/podcast-placeholder.png',
            title: "China's top leader Xi Jinping concludes two-day state visit to Vietnam",
            excerpt:
                'Chinese General Party Secretary and President Xi Jinping left Hanoi on Wednesday, concluding his two-day state visit to Vietnam.',
            time: '1h ago',
        },
        {
            id: 2,
            image: '/images/placeholders/podcast-placeholder.png',
            title: 'Vietnam fires 21-gun salute to welcome Chinese leader Xi Jinping',
            excerpt:
                "A formal reception at Hanoi's Presidential Palace by Vietnam's Communist Party leader, on Monday welcomed Beijing with a 21-gun salute, followed by a 19-gun salute, in flag-waving ceremony near the former governor's palace.",
            time: '2h ago',
        },
        {
            id: 3,
            image: '/images/placeholders/podcast-placeholder.png',
            title: 'Vietnam administrative overhaul: Planned mergers to reduce 63 cities and provinces to 34',
            excerpt:
                "The National Assembly's Standing Committee on Monday agreed to reduce the number of provinces and cities in Vietnam, according to the plan.",
            time: '3h ago',
        },
        {
            id: 4,
            image: '/images/placeholders/podcast-placeholder.png',
            title: 'Ho Chi Minh City seeks public opinion on merger with Binh Duong and Ba Ria - Vung Tau',
            excerpt:
                'The Ho Chi Minh City government is gathering public opinion on the planned merger with Binh Duong and Ba Ria - Vung Tau provinces as part of a major administrative overhaul in Vietnam.',
            time: '4h ago',
        },
        {
            id: 5,
            image: '/images/placeholders/podcast-placeholder.png',
            title: 'Ho Chi Minh City seeks public opinion on merger with Binh Duong and Ba Ria - Vung Tau',
            excerpt:
                'The Ho Chi Minh City government is gathering public opinion on the planned merger with Binh Duong and Ba Ria - Vung Tau provinces as part of a major administrative overhaul in Vietnam.',
            time: '5h ago',
        },
    ];

    return (
        <div className="space-y-8">
            <h1 className="text-4xl font-bold text-[#01aa4f] text-center mb-8">
                Browse by Category
            </h1>

            <CategoryTabs
                categories={categories}
                activeCategory={activeCategory}
                onChange={setActiveCategory}
            />

            <div className="space-y-2">
                <h2 className="uppercase text-sm font-bold text-[#01aa4f]">
                    🔥 HOT NEWS
                </h2>

                <div className="space-y-6">
                    {articles.map((article) => (
                        <NewsArticle key={article.id} article={article} />
                    ))}
                </div>

                <div>
                    <Pagination
                        totalPages={10}
                        currentPage={page}
                        baseUrl="/daily-news"
                    />
                </div>
            </div>
        </div>
    );
};

export default BrowsePage;

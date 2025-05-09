'use client';

import HeroSection from '@/components/sections/hero-section';
import TrendingNewsSection from '@/components/sections/trending-news-section';
import LatestPodcastSection from '@/components/sections/latest-podcast-section';
import NewsAndCategorySection from '@/components/sections/news-and-category-section';
import PodcastLibrarySection from '@/components/sections/podcast-library-section';

export default function HomePage() {
    return (
        <div className="space-y-10 pb-16">
            <HeroSection />
            <TrendingNewsSection />
            <LatestPodcastSection />
            <NewsAndCategorySection />
            <PodcastLibrarySection />
        </div>
    );
}

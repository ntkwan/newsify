import NewsCard from '../ui/news-card';

export default function TrendingNewsSection() {
    return (
        <section>
            <h2 className="text-[#01aa4f] text-2xl font-bold mb-6">
                Trending News
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <NewsCard
                    image="/images/news/article-1.png"
                    category="WORLD"
                    title="Inside Vietnam's largest domestic terminal just opened at Tan Son Nhat Airport"
                    description="Vietnam's largest domestic terminal, T3 at Ho Chi Minh City's Tan Son Nhat Airport, has completed final testing and saw its first commercial flight on Thursday."
                    isLarge
                />
                <NewsCard
                    image="/images/news/article-2.png"
                    category="POLITICS"
                    title="Vietnam, China jointly declare"
                    description="Vietnam and China vowed to strengthen ties during Xi Jinping's April visit."
                />
            </div>
        </section>
    );
}

import LatestNewsSection from './latest-news-section';
import CategorySection from './category-section';

export default function NewsAndCategorySection() {
    return (
        <div className="grid grid-cols-2 gap-8">
            <div className="relative pr-8">
                <LatestNewsSection />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 h-[calc(100%-2rem)] w-[3px] bg-[#01aa4f]"></div>
            </div>
            <CategorySection />
        </div>
    );
}

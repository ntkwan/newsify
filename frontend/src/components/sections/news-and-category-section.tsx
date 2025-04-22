import LatestNewsSection from '@/components/sections/latest-news-section';
import CategorySection from '@/components/sections/category-section';

export default function NewsAndCategorySection() {
    return (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <LatestNewsSection />
            <CategorySection />
        </section>
    );
}

import type React from 'react';
import Link from 'next/link';

interface CategoryItem {
    name: string;
    category: string;
}

const CategorySection: React.FC = () => {
    const categories: CategoryItem[] = [
        {
            name: 'Ambiguous Style Tips To Think About a Shift in Market Leadership',
            category: 'BUSINESS',
        },
        {
            name: "Europe's Locked Borders Make the Trust of Its Foreign Workers",
            category: 'POLITICS',
        },
        {
            name: 'Why Back to School Might Look Different Age of Covid-19',
            category: 'HEALTH',
        },
        {
            name: 'Base Appointments Remain Unfilled in the Excessive in High Growth',
            category: 'BUSINESS',
        },
    ];

    return (
        <section>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-[#01aa4f]">
                    Browse by Category
                </h2>
                <Link href="/browse" className="text-sm text-[#01aa4f]">
                    See all
                </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {categories.map((item, index) => (
                    <div key={index} className="border-b border-gray-200 pb-4">
                        <div className="text-xs text-gray-500 mb-1">
                            {item.category}
                        </div>
                        <Link
                            href="#"
                            className="font-medium hover:text-[#01aa4f] transition-colors"
                        >
                            {item.name}
                        </Link>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default CategorySection;

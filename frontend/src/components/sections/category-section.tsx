import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export default function CategorySection() {
    const categories = [
        {
            id: 1,
            category: 'BUSINESS',
            title: 'Goldman Says Time to Think About a Shift in Market Leadership',
            description:
                'Curb cuts may seem like an obvious civic good now. But the protracted battle to enact them reveals a design history.',
        },
        {
            id: 2,
            category: 'POLITICS',
            title: "Hiroshima 75th Anniversary: Preserving Survivors' Message of Peace",
        },
        {
            id: 3,
            category: 'POLITICS',
            title: "Japan's Locked Borders Shake the Trust of Its Foreign Workers",
        },
        {
            id: 4,
            category: 'EDUCATION',
            title: 'What Back to School Might Look Like in the Age of Covid-19',
        },
        {
            id: 5,
            category: 'HEALTH',
            title: 'Even Asymptomatic People Carry the Coronavirus in High Amounts',
        },
    ];

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-[#01aa4f] text-2xl font-bold">
                    Browse by Category
                </h2>
                <Link href="/categories" className="text-[#01aa4f] text-sm">
                    See all
                </Link>
            </div>
            <div className="space-y-6">
                {categories.map((item) => (
                    <div
                        key={item.id}
                        className="border-b border-gray-100 pb-4"
                    >
                        <Badge
                            variant="outline"
                            className="mb-2 text-xs font-normal bg-gray-50 text-gray-500 hover:bg-gray-50"
                        >
                            {item.category}
                        </Badge>
                        <h3 className="font-medium mb-1">{item.title}</h3>
                        {item.description && (
                            <p className="text-sm text-gray-500">
                                {item.description}
                            </p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

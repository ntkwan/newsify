export default function LatestNewsSection() {
    const newsItems = [
        {
            id: 1,
            title: 'Gasoline prices drop to 5-year low',
            description:
                'Vietnam gasoline prices tumbled to the lowest in five years Thursday afternoon.',
        },
        {
            id: 2,
            title: 'Gasoline prices drop to 5-year low',
            description:
                'Vietnam gasoline prices tumbled to the lowest in five years Thursday afternoon.',
        },
        {
            id: 3,
            title: 'Gasoline prices drop to 5-year low',
            description:
                'Vietnam gasoline prices tumbled to the lowest in five years Thursday afternoon.',
        },
        {
            id: 4,
            title: 'Gasoline prices drop to 5-year low',
            description:
                'Vietnam gasoline prices tumbled to the lowest in five years Thursday afternoon.',
        },
        {
            id: 5,
            title: 'Gasoline prices drop to 5-year low',
            description:
                'Vietnam gasoline prices tumbled to the lowest in five years Thursday afternoon.',
        },
    ];

    return (
        <div>
            <h2 className="text-[#01aa4f] text-2xl font-bold mb-6">
                Latest News
            </h2>
            <div className="space-y-6">
                {newsItems.map((item, index) => (
                    <div key={item.id} className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-400">
                            {index + 1}
                        </div>
                        <div>
                            <h3 className="font-medium mb-1">{item.title}</h3>
                            <p className="text-sm text-gray-500">
                                {item.description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

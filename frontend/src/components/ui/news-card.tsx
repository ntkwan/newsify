import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

interface NewsCardProps {
    image: string;
    category: string;
    title: string;
    description: string;
    isLarge?: boolean;
}

export default function NewsCard({
    image,
    category,
    title,
    description,
    isLarge = false,
}: NewsCardProps) {
    return (
        <div className={`group ${isLarge ? 'row-span-2' : ''}`}>
            <Link href="#" className="block">
                <div className="relative overflow-hidden rounded-lg mb-3">
                    <Image
                        src={image || '/placeholder.svg'}
                        alt={title}
                        width={isLarge ? 500 : 300}
                        height={isLarge ? 300 : 200}
                        className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                </div>
                <Badge
                    variant="outline"
                    className="mb-2 text-xs font-normal bg-gray-50 text-gray-500 hover:bg-gray-50"
                >
                    {category}
                </Badge>
                <h3
                    className={`font-bold ${isLarge ? 'text-xl' : 'text-lg'} mb-2`}
                >
                    {title}
                </h3>
                <p className="text-sm text-gray-600">{description}</p>
            </Link>
        </div>
    );
}

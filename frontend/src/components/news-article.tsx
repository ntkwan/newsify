import type React from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface Article {
    id: number;
    image: string;
    title: string;
    excerpt: string;
    time: string;
}

interface NewsArticleProps {
    article: Article;
}

const NewsArticle: React.FC<NewsArticleProps> = ({ article }) => {
    return (
        <div className="flex flex-col md:flex-row gap-4 border-b border-gray-200 pb-6">
            <div className="md:w-1/4 flex-shrink-0">
                <Image
                    src={article.image || '/placeholder.svg'}
                    alt={article.title}
                    width={180}
                    height={120}
                    className="rounded-lg w-full h-auto object-cover"
                />
            </div>
            <div className="md:w-3/4">
                <Link href="#" className="block group">
                    <h3 className="font-bold text-lg mb-2 group-hover:text-[#01aa4f] transition-colors">
                        {article.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-2">
                        {article.excerpt}
                    </p>
                    <div className="text-xs text-gray-500">{article.time}</div>
                </Link>
            </div>
        </div>
    );
};

export default NewsArticle;

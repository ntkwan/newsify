import type React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { INewsArticle } from '../types/news';

interface NewsArticleProps {
    article: INewsArticle;
}

const NewsArticle: React.FC<NewsArticleProps> = ({ article }) => {
    const formatDate = () => {
        if (article.time && article.timezone) {
            return `${article.time} ${article.timezone}`;
        }
        return article.publish_date;
    };

    return (
        <div className="flex flex-col md:flex-row gap-4 border-b border-gray-200 pb-6">
            <div className="md:w-1/4 flex-shrink-0">
                <Image
                    src={article.image_url || '/placeholder.svg'}
                    alt={article.title}
                    width={180}
                    height={120}
                    className="rounded-lg w-full h-auto object-cover"
                />
            </div>
            <div className="md:w-3/4">
                <Link
                    href={article.url}
                    className="block group"
                    target="_blank"
                >
                    <h3 className="font-bold text-lg mb-2 group-hover:text-[#01aa4f] transition-colors">
                        {article.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-2 line-clamp-3">
                        {article.content}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{article.author}</span>
                        <span>•</span>
                        <span>{article.time_reading}</span>
                        <span>•</span>
                        <span>{formatDate()}</span>
                    </div>
                </Link>
            </div>
        </div>
    );
};

export default NewsArticle;

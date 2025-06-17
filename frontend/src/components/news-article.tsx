/**
 * NewsArticle Component
 *
 * A reusable component for displaying individual news articles in a list format.
 * Features:
 * - Responsive layout (mobile and desktop)
 * - Image display with fallback
 * - Formatted date display
 * - Category and metadata display
 *
 * @component
 * @param {Object} props - Component props
 * @param {Article} props.article - The article data to display
 */

import { Article } from '@/types/article';
import Image from 'next/image';
import Link from 'next/link';

interface NewsArticleProps {
    article: Article;
}

/**
 * Formats a date string into a localized date format
 * @param {string} dateString - The date string to format
 * @returns {string} Formatted date string
 */
const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

export default function NewsArticle({ article }: NewsArticleProps) {
    const articleUrl = `/articles/${article.trending_id}`;
    const formattedDate = formatDate(article.publish_date);

    const url =
        article.image_url && article.image_url !== 'No image available'
            ? article.image_url
            : '/placeholder.svg';

    return (
        <article className="flex flex-col md:flex-row gap-4 border-b border-gray-200 pb-6">
            {/* Article Image */}
            <div className="md:w-1/4 flex-shrink-0">
                <Link href={articleUrl}>
                    {url && (
                        <Image
                            src={url}
                            alt={article.title}
                            width={180}
                            height={120}
                            className="rounded-lg w-full h-auto object-cover"
                        />
                    )}
                </Link>
            </div>

            {/* Article Content */}
            <div className="md:w-3/4">
                <Link href={articleUrl} className="block group">
                    <h3 className="font-bold text-lg mb-2 group-hover:text-[#01aa4f] transition-colors">
                        {article.title}
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>
                            {article.main_category === 'Other'
                                ? 'Social'
                                : article.main_category}
                        </span>
                        <span>•</span>
                        <span>{formattedDate}</span>
                    </div>
                </Link>
            </div>
        </article>
    );
}

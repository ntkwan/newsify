import { Article } from '@/types/article';
import Image from 'next/image';
import Link from 'next/link';

interface NewsArticleProps {
    article: Article;
}

export default function NewsArticle({ article }: NewsArticleProps) {
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const articleUrl = `/article/${article.article_id}?title=${encodeURIComponent(article.title)}&summary=${encodeURIComponent(article.summary)}&image_url=${encodeURIComponent(article.image_url)}&main_category=${encodeURIComponent(article.main_category)}&publish_date=${encodeURIComponent(article.publish_date)}${article.url ? `&url=${encodeURIComponent(article.url)}` : ''}`;

    return (
        <div className="flex flex-col md:flex-row gap-4 border-b border-gray-200 pb-6">
            <div className="md:w-1/4 flex-shrink-0">
                <Link href={articleUrl}>
                    <Image
                        src={article.image_url || '/placeholder.svg'}
                        alt={article.title}
                        width={180}
                        height={120}
                        className="rounded-lg w-full h-auto object-cover"
                    />
                </Link>
            </div>
            <div className="md:w-3/4">
                <Link href={articleUrl} className="block group">
                    <h3 className="font-bold text-lg mb-2 group-hover:text-[#01aa4f] transition-colors">
                        {article.title}
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{article.main_category}</span>
                        <span>•</span>
                        <span>{formatDate(article.publish_date)}</span>
                    </div>
                </Link>
            </div>
        </div>
    );
}

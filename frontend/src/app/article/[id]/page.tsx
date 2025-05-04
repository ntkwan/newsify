import { Article } from '@/types/article';
import Image from 'next/image';
import Link from 'next/link';

export default function ArticlePage({
    params,
    searchParams,
}: {
    params: { id: string };
    searchParams: { [key: string]: string | string[] | undefined };
}) {
    const article: Article = {
        article_id: params.id,
        trending_id: '',
        title: searchParams.title as string,
        summary: searchParams.summary as string,
        image_url: searchParams.image_url as string,
        main_category: searchParams.main_category as string,
        publish_date: searchParams.publish_date as string,
        url: searchParams.url as string,
        categories: [],
        trend: null,
        similarity_score: 0,
        analyzed_date: '',
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-4">{article.title}</h1>
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <span>{article.main_category}</span>
                    <span>•</span>
                    <span>{formatDate(article.publish_date)}</span>
                </div>
                <Image
                    src={article.image_url || '/placeholder.svg'}
                    alt={article.title}
                    width={800}
                    height={400}
                    className="rounded-lg w-full h-auto object-cover mb-6"
                />
                <div className="prose max-w-none">
                    <p className="text-lg text-gray-700 mb-6">
                        {article.summary}
                    </p>
                    {article.url && (
                        <Link
                            href={article.url}
                            target="_blank"
                            className="inline-flex items-center px-4 py-2 bg-[#01aa4f] text-white rounded-md hover:bg-[#018f42] transition-colors"
                        >
                            Read original article
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}

import { Article } from '@/types/article';
import NewsArticle from './news-article';

interface NewsListProps {
    articles: Article[];
}

export default function NewsList({ articles }: NewsListProps) {
    return (
        <div className="space-y-6">
            {articles.map((article) => (
                <NewsArticle key={article.url} article={article} />
            ))}
        </div>
    );
}

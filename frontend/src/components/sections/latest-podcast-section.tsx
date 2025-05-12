import Image from 'next/image';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { Podcast } from '@/types/podcast';
import { useRouter } from 'next/navigation';
import { getPodcastLength } from '@/utils/format-helpers';

export default function LatestPodcastSection() {
    const router = useRouter();
    const [latestPodcast, setLatestPodcast] = useState<Podcast | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLatestPodcast = async () => {
            try {
                const response = await fetch('/api/podcasts?page=1&pageSize=1');
                if (!response.ok) {
                    throw new Error('Failed to fetch podcast');
                }
                const data = await response.json();
                if (data.podcasts && data.podcasts.length > 0) {
                    setLatestPodcast(data.podcasts[0]);
                }
            } catch (error) {
                console.error('Error fetching latest podcast:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchLatestPodcast();
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!latestPodcast) {
        return null;
    }

    const publishDate = new Date(latestPodcast.publish_date);
    const formattedDate = publishDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const formattedTime = publishDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });

    const handleClick = () => {
        router.push('/daily-podcasts');
    };

    return (
        <section>
            <h2 className="text-[#01aa4f] text-2xl font-bold mb-6">
                Latest Podcast
            </h2>
            <div
                className="flex flex-col md:flex-row gap-6 bg-white rounded-lg border border-gray-100 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={handleClick}
            >
                <div className="md:w-1/4">
                    <Image
                        src="/images/placeholders/news-placeholder.png"
                        alt="Podcast cover"
                        width={200}
                        height={200}
                        className="w-full h-full object-cover"
                    />
                </div>
                <div className="md:w-3/4 space-y-4">
                    <div className="space-y-1">
                        <div className="text-sm text-gray-500">
                            New Releases • {formattedDate} | {formattedTime}{' '}
                            GMT+7
                        </div>
                        <h3 className="text-2xl font-bold"></h3>
                    </div>
                    <Button
                        variant="outline"
                        className="flex items-center gap-2 rounded-full cursor-pointer"
                        onClick={() => router.push('/daily-podcasts')}
                    >
                        <Play className="h-4 w-4 text-[#01aa4f]" />
                        <span className="text-xs font-medium">
                            LISTEN NOW (
                            {Math.floor(getPodcastLength(latestPodcast) / 60)}{' '}
                            min(s))
                        </span>
                    </Button>
                </div>
            </div>
        </section>
    );
}

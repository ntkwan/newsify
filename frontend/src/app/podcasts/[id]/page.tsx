'use client';

import { useEffect, useState } from 'react';
import { PodcastPlayer } from '@/components/podcast-player';
import { Podcast } from '@/types/podcast';

interface PodcastPageProps {
    params: {
        id: string;
    };
}

export default function PodcastPage({ params }: PodcastPageProps) {
    const [podcast, setPodcast] = useState<Podcast | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPodcast = async () => {
            try {
                const response = await fetch(`/api/podcasts/${params.id}`);
                if (!response.ok) {
                    throw new Error(
                        `Failed to fetch podcast: ${response.status}`,
                    );
                }

                const data = await response.json();
                console.log('API Response:', data); // Debug log

                if (
                    !data.podcasts ||
                    !Array.isArray(data.podcasts) ||
                    data.podcasts.length === 0
                ) {
                    throw new Error('Podcast not found');
                }

                const podcastData = data.podcasts[0];
                if (
                    !podcastData.audio_url ||
                    !podcastData.title ||
                    !podcastData.publish_date
                ) {
                    throw new Error('Invalid podcast data format');
                }

                setPodcast(podcastData);
            } catch (err) {
                console.error('Error fetching podcast:', err); // Debug log
                setError(
                    err instanceof Error ? err.message : 'An error occurred',
                );
            } finally {
                setLoading(false);
            }
        };

        fetchPodcast();
    }, [params.id]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                Loading...
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center min-h-screen text-red-500">
                {error}
            </div>
        );
    }

    if (!podcast) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                Podcast not found
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-bold mb-4">{podcast.title}</h1>
                <div className="text-gray-500 mb-8">
                    {new Date(podcast.publish_date).toLocaleDateString(
                        'vi-VN',
                        {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                        },
                    )}
                </div>
                <PodcastPlayer podcast={podcast} />
            </div>
        </div>
    );
}

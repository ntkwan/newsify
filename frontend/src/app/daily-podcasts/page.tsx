'use client';

import { useState, useEffect } from 'react';
import { PodcastPlayer } from '@/components/podcast-player';
import { Podcast } from '@/types/podcast';
import Image from 'next/image';
import { PodcastGrid } from '@/components/podcast-grid';

export default function DailyPodcastsPage() {
    const [podcasts, setPodcasts] = useState<Podcast[]>([]);
    const [currentPodcast, setCurrentPodcast] = useState<Podcast | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPodcasts = async () => {
            try {
                const response = await fetch('/api/podcasts');
                if (!response.ok) {
                    throw new Error(
                        `Failed to fetch podcasts: ${response.status}`,
                    );
                }

                const data = await response.json();
                if (!data.podcasts || !Array.isArray(data.podcasts)) {
                    throw new Error('Invalid podcasts data format');
                }

                setPodcasts(data.podcasts);
                // Set podcast đầu tiên làm podcast hiện tại
                if (data.podcasts.length > 0) {
                    setCurrentPodcast(data.podcasts[0]);
                }
            } catch (err) {
                console.error('Error fetching podcasts:', err);
                setError(
                    err instanceof Error ? err.message : 'An error occurred',
                );
            } finally {
                setLoading(false);
            }
        };

        fetchPodcasts();
    }, []);

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

    return (
        <div className="space-y-8">
            <h1 className="text-4xl font-bold text-[#01aa4f] text-center mb-8">
                The Daily Recap
            </h1>

            {currentPodcast && (
                <div className="bg-white rounded-lg shadow-lg p-8">
                    <div className="flex gap-8 items-start">
                        <div className="relative w-48 h-48 flex-shrink-0">
                            <Image
                                src="/images/placeholders/podcast-placeholder.png"
                                alt={currentPodcast.title}
                                fill
                                className="object-cover rounded-lg"
                            />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-3xl font-bold text-[#01aa4f] mb-4">
                                {currentPodcast.title}
                            </h2>
                            <div className="text-gray-500 mb-4">
                                {new Date(
                                    currentPodcast.publish_date,
                                ).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </div>
                            <div className="bg-[#01aa4f] text-white rounded-lg p-3 text-center inline-block">
                                <div className="font-bold">Daily News</div>
                                <div className="text-xl font-bold">
                                    {new Date(
                                        currentPodcast.publish_date,
                                    ).toLocaleTimeString('en-US', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-8">
                        <PodcastPlayer podcast={currentPodcast} />
                    </div>
                </div>
            )}

            {podcasts.length > 0 && (
                <PodcastGrid
                    podcasts={podcasts}
                    currentPodcastId={currentPodcast?.podcast_id}
                    onPodcastSelect={setCurrentPodcast}
                />
            )}
        </div>
    );
}

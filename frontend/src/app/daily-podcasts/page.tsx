'use client';

import { useState, useEffect } from 'react';
import { PodcastPlayer } from '@/components/podcast-player';
import { Podcast } from '@/types/podcast';
import Image from 'next/image';

export default function DailyPodcastsPage() {
    const [podcasts, setPodcasts] = useState<Podcast[]>([]);
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

            {podcasts.length > 0 ? (
                <div className="space-y-8">
                    {podcasts.map((podcast) => (
                        <div
                            key={podcast.podcast_id}
                            className="bg-gray-100 rounded-lg p-6"
                        >
                            <div className="flex gap-6 items-start">
                                <div className="relative w-32 h-32 flex-shrink-0">
                                    <Image
                                        src="/images/placeholders/podcast-placeholder.png"
                                        alt={podcast.title}
                                        fill
                                        className="object-cover rounded-lg"
                                    />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h2 className="text-2xl font-bold text-[#01aa4f]">
                                                {podcast.title}
                                            </h2>
                                            <div className="text-gray-500 mt-2">
                                                {new Date(
                                                    podcast.publish_date,
                                                ).toLocaleDateString('en-US', {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </div>
                                        </div>
                                        <div className="bg-[#01aa4f] text-white rounded-lg p-2 text-center">
                                            <div className="font-bold">
                                                Daily News
                                            </div>
                                            <div className="text-xl font-bold">
                                                {new Date(
                                                    podcast.publish_date,
                                                ).toLocaleTimeString('en-US', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-6">
                                <PodcastPlayer podcast={podcast} />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center text-gray-500">
                    No podcasts available
                </div>
            )}
        </div>
    );
}

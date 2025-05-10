'use client';

import { useState, useEffect } from 'react';
import { PodcastPlayer } from '@/components/podcast-player';
import { Podcast } from '@/types/podcast';
import Image from 'next/image';
import { PodcastGrid } from '@/components/podcast-grid';
import Loading from './loading';

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
        return <Loading />;
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
                <div className="bg-white rounded-lg shadow-lg p-4 md:p-8">
                    <div className="flex flex-col md:flex-row gap-4 md:gap-8 items-center">
                        <div className="relative w-32 h-32 md:w-48 md:h-48 flex-shrink-0">
                            <Image
                                src="/images/placeholders/podcast-placeholder.png"
                                alt={currentPodcast.title}
                                fill
                                className="object-cover rounded-lg"
                            />
                        </div>
                        <div className="flex-1 w-full">
                            <h2 className="text-2xl md:text-3xl font-bold text-[#01aa4f] mb-4">
                                {currentPodcast.title}
                            </h2>
                            <div className="text-sm md:text-base text-gray-500 mb-4">
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
                            <div className="flex flex-col md:flex-row gap-4 items-stretch min-h-[192px]">
                                <div className="bg-[#01aa4f] text-white rounded-lg p-3 text-center flex flex-col justify-center">
                                    <div className="font-bold">Daily News</div>
                                    <div className="text-lg md:text-xl font-bold">
                                        {new Date(
                                            currentPodcast.publish_date,
                                        ).toLocaleTimeString('en-US', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </div>
                                </div>
                                {currentPodcast.links &&
                                    currentPodcast.links.length > 0 && (
                                        <div className="bg-white border border-gray-200 rounded-lg p-3 flex-1 flex flex-col">
                                            <div className="flex items-center gap-2 mb-2">
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="h-4 w-4 text-[#01aa4f]"
                                                    viewBox="0 0 20 20"
                                                    fill="currentColor"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                                <span className="text-sm font-medium text-gray-600">
                                                    Sources
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-2 overflow-y-auto max-h-[120px] md:max-h-[160px]">
                                                {currentPodcast.links.map(
                                                    (link, index) => (
                                                        <a
                                                            key={index}
                                                            href={link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 hover:bg-gray-100 text-xs text-[#01aa4f] rounded-full transition-colors duration-200 break-all"
                                                        >
                                                            <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                className="h-3 w-3 flex-shrink-0"
                                                                viewBox="0 0 20 20"
                                                                fill="currentColor"
                                                            >
                                                                <path
                                                                    fillRule="evenodd"
                                                                    d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z"
                                                                    clipRule="evenodd"
                                                                />
                                                            </svg>
                                                            <span className="truncate max-w-[200px] md:max-w-[300px]">
                                                                {link}
                                                            </span>
                                                        </a>
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    )}
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 md:mt-8">
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

'use client';

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { PodcastPlayer } from '@/components/podcast-player';
import { Podcast } from '@/types/podcast';
import Link from 'next/link';

export default function DailyPodcastsPage() {
    const [date, setDate] = useState<Date>();
    const [searchQuery, setSearchQuery] = useState('');
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

    const filteredPodcasts = podcasts.filter((podcast) => {
        const matchesSearch =
            podcast.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            podcast.script.toLowerCase().includes(searchQuery.toLowerCase());

        if (!date) return matchesSearch;

        const podcastDate = new Date(podcast.publish_date);
        return (
            matchesSearch &&
            podcastDate.getDate() === date.getDate() &&
            podcastDate.getMonth() === date.getMonth() &&
            podcastDate.getFullYear() === date.getFullYear()
        );
    });

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

            {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                        placeholder="Search for topics, news, or podcasts..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <DatePicker
                    date={date}
                    onDateChange={setDate}
                    placeholder="Filter by date"
                />
            </div> */}

            {filteredPodcasts.length > 0 ? (
                <div className="space-y-8">
                    {filteredPodcasts.map((podcast) => (
                        <div
                            key={podcast.podcast_id}
                            className="bg-gray-100 rounded-lg p-6"
                        >
                            <div className="flex justify-between items-start mb-4">
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
                                    <div className="font-bold">Daily News</div>
                                    <div className="text-xl font-bold">
                                        {new Date(
                                            podcast.publish_date,
                                        ).toLocaleTimeString('vi-VN', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </div>
                                </div>
                            </div>
                            <PodcastPlayer podcast={podcast} />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center text-gray-500">
                    No podcasts found matching your criteria
                </div>
            )}
        </div>
    );
}

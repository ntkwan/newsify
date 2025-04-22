import Link from 'next/link';
import PodcastCard from '@/components/ui/podcast-card';

export default function PodcastLibrarySection() {
    const podcasts = [
        { id: 1, time: '04:00pm', duration: '15 minutes', day: 16 },
        { id: 2, time: '06:00am', duration: '15 minutes', day: 15 },
        { id: 3, time: '07:00pm', duration: '15 minutes', day: 14 },
        { id: 4, time: '04:00pm', duration: '15 minutes', day: 13 },
    ];

    return (
        <section>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-[#01aa4f] text-2xl font-bold">
                    Podcast Library
                </h2>
                <Link href="/podcasts" className="text-[#01aa4f] text-sm">
                    See all
                </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                {podcasts.map((podcast) => (
                    <PodcastCard
                        key={podcast.id}
                        time={podcast.time}
                        duration={podcast.duration}
                        day={podcast.day}
                    />
                ))}
            </div>
        </section>
    );
}

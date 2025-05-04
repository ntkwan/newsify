import Image from 'next/image';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PodcastCardProps {
    time: string;
    duration: string;
    day: number;
}

export default function PodcastCard({ time, duration, day }: PodcastCardProps) {
    return (
        <div className="flex flex-col items-center space-y-2">
            <div className="relative w-[200px] h-[200px] rounded-lg overflow-hidden">
                <Image
                    src="/images/placeholders/podcast-placeholder.png"
                    alt={`Podcast episode - April ${day}`}
                    width={500}
                    height={500}
                    className="w-full h-full object-cover"
                />
            </div>
            <div className="text-xs text-gray-500">
                <span className="font-semibold text-[#01aa4f]">{time}</span> •{' '}
                {duration}
            </div>
            <div className="font-medium">The Daily Brief - April {day}</div>
            <Button
                variant="ghost"
                size="sm"
                className="w-8 h-8 p-0 rounded-full bg-gray-100 hover:bg-gray-200 cursor-pointer"
            >
                <Play className="h-4 w-4 text-[#01aa4f]" fill="#01aa4f" />
            </Button>
        </div>
    );
}

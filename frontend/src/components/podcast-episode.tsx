import type React from 'react';
import Image from 'next/image';
import { Play } from 'lucide-react';

interface Episode {
    id: number;
    day: number;
    category: string;
    duration: string;
}

interface PodcastEpisodeProps {
    episode: Episode;
}

const PodcastEpisode: React.FC<PodcastEpisodeProps> = ({ episode }) => {
    return (
        <div className="space-y-2">
            <div className="relative group">
                <Image
                    src="/images/placeholders/podcast-placeholder.png"
                    alt={`Podcast episode - April ${episode.day}`}
                    width={200}
                    height={200}
                    className="w-full rounded-lg"
                />
                <div className="absolute inset-0 bg-[#01aa4f]/10 flex items-center justify-center">
                    <div className="bg-[#01aa4f] text-white rounded-lg p-2 text-center">
                        <div className="font-bold text-sm">BẢN TIN THỜI SỰ</div>
                    </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="bg-[#01aa4f] text-white rounded-full p-2">
                        <Play className="h-6 w-6" />
                    </button>
                </div>
            </div>
            <div className="text-xs text-gray-500">
                {episode.category} • {episode.duration}
            </div>
            <div className="font-medium">
                The Daily Brief - April {episode.day}
            </div>
        </div>
    );
};

export default PodcastEpisode;

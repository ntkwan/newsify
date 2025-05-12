import Image from 'next/image';
import { Podcast } from '@/types/podcast';
import { useState } from 'react';
import { getPodcastLength } from '@/utils/format-helpers';

interface PodcastGridProps {
    podcasts: Podcast[];
    currentPodcastId?: string;
    onPodcastSelect: (podcast: Podcast) => void;
}

export const PodcastGrid: React.FC<PodcastGridProps> = ({
    podcasts,
    currentPodcastId,
    onPodcastSelect,
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const itemsPerPage = 4;
    const totalPages = Math.ceil(podcasts.length / itemsPerPage);

    const handlePrevious = () => {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : totalPages - 1));
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev < totalPages - 1 ? prev + 1 : 0));
    };

    const handlePageClick = (pageIndex: number) => {
        setCurrentIndex(pageIndex);
    };

    const visiblePodcasts = podcasts.slice(
        currentIndex * itemsPerPage,
        (currentIndex + 1) * itemsPerPage,
    );

    return (
        <div className="mt-12 mb-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
                You might also like
            </h2>
            <div className="relative">
                <div className="flex items-center gap-6">
                    <button
                        onClick={handlePrevious}
                        className="bg-[#01aa4f] text-white p-2 rounded-full hover:bg-[#018a3f] transition-colors hover:cursor-pointer z-10"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                        >
                            <path
                                fillRule="evenodd"
                                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </button>
                    <div className="flex gap-6 overflow-hidden p-10 w-[1100px] justify-start">
                        {visiblePodcasts.map((podcast) => (
                            <div
                                key={podcast.podcast_id}
                                className={`w-[240px] bg-gradient-to-br flex-shrink-0 from-gray-100 to-gray-150 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer ${
                                    currentPodcastId === podcast.podcast_id
                                        ? 'ring-4 ring-[#01aa4f]'
                                        : ''
                                }`}
                                onClick={() => onPodcastSelect(podcast)}
                            >
                                <div className="p-2">
                                    <div className="relative aspect-square w-full overflow-hidden rounded-lg">
                                        <Image
                                            src="/images/placeholders/podcast-placeholder.png"
                                            alt={podcast.title}
                                            fill
                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                            className="object-cover"
                                            priority={false}
                                        />
                                        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                            <button className="bg-[#01aa4f] text-white p-2 rounded-full hover:bg-[#018a3f] transition-colors hover:cursor-pointer">
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="h-6 w-6"
                                                    viewBox="0 0 20 20"
                                                    fill="currentColor"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-2 text-center">
                                        <h3 className="text-lg font-bold text-[#01aa4f] mb-2 line-clamp-2">
                                            {podcast.title}
                                        </h3>
                                        <div className="flex items-center justify-start pl-2 gap-2 text-gray-500 text-sm mb-2">
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-4 w-4"
                                                viewBox="0 0 20 20"
                                                fill="currentColor"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                            {(() => {
                                                // Subtract 7 hours from the publish date
                                                const date = new Date(
                                                    podcast.publish_date,
                                                );
                                                date.setHours(
                                                    date.getHours() - 7,
                                                );

                                                return date.toLocaleDateString(
                                                    'en-US',
                                                    {
                                                        month: 'long',
                                                        day: 'numeric',
                                                        year: 'numeric',
                                                    },
                                                );
                                            })()}
                                        </div>
                                        <div className="flex items-center justify-start pl-2 gap-2 text-gray-500 text-sm">
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="h-4 w-4"
                                                viewBox="0 0 20 20"
                                                fill="currentColor"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                            {Math.floor(
                                                getPodcastLength(podcast) / 60,
                                            )}
                                            :
                                            {(getPodcastLength(podcast) % 60)
                                                .toString()
                                                .padStart(2, '0')}{' '}
                                            min
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={handleNext}
                        className="bg-[#01aa4f] text-white p-2 rounded-full hover:bg-[#018a3f] transition-colors hover:cursor-pointer z-10"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                        >
                            <path
                                fillRule="evenodd"
                                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </button>
                </div>

                {/* Pagination */}
                <div className="flex justify-center mt-6 gap-2">
                    {Array.from({ length: totalPages }, (_, i) => (
                        <button
                            key={i}
                            onClick={() => handlePageClick(i)}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                                currentIndex === i
                                    ? 'bg-[#01aa4f] text-white shadow-lg scale-110'
                                    : 'bg-white text-gray-600 hover:bg-gray-100 hover:cursor-pointer'
                            }`}
                        >
                            {i + 1}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

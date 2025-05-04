'use client';

import type React from 'react';
import { useState } from 'react';
import { Search, Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { DatePicker } from '@/components/ui/date-picker';
import PodcastEpisode from '@/components/podcast-episode';
import { PodcastPlayer } from '@/components/podcast-player';

interface Episode {
    id: number;
    day: number;
    category: string;
    duration: string;
}

const DailyRecapPage: React.FC = () => {
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [date, setDate] = useState<Date>();

    const episodes: Episode[] = [
        { id: 1, day: 15, category: '04:00pm', duration: '15 minutes' },
        { id: 2, day: 14, category: '02:00pm', duration: '15 minutes' },
        { id: 3, day: 14, category: '12:00pm', duration: '15 minutes' },
        { id: 4, day: 13, category: '04:00pm', duration: '15 minutes' },
        { id: 5, day: 15, category: '02:00pm', duration: '15 minutes' },
        { id: 6, day: 14, category: '12:00pm', duration: '15 minutes' },
        { id: 7, day: 13, category: '04:00pm', duration: '15 minutes' },
        { id: 8, day: 13, category: '04:00pm', duration: '15 minutes' },
    ];

    return (
        <div className="space-y-8">
            <h1 className="text-4xl font-bold text-[#01aa4f] text-center mb-8">
                The Daily Recap
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                        placeholder="Search for topics, news, or podcasts..."
                        className="pl-10"
                    />
                </div>
                <DatePicker
                    date={date}
                    onDateChange={setDate}
                    placeholder="Filter by date"
                />
            </div>

            <div className="bg-gray-100 rounded-lg p-6 mb-8">
                <div className="space-y-4">
                    <div className="flex justify-between items-start">
                        <PodcastPlayer
                            title="Điểm tin 6h"
                            description="Hàn Quốc có quyền Tổng thống mới sau khi hai lãnh đạo liên tiếp từ chức; Ông Trump tiết lộ điều đã nói với ông Zelensky tại Vatican..."
                            thumbnail="https://i1-vnexpress.vnecdn.net/2025/05/02/c536969e59a04ab5a19aee2f9509e2-9862-5570-1746140046.png"
                            audioUrl="https://v.vnecdn.net/vnexpress/video/audio/2025/05/02/diem-tin-6h.mp3"
                            author="Quảng Hường"
                            publishDate="Thứ sáu, 2/5/2025, 06:12 (GMT+7)"
                            duration={427}
                            chapters={[
                                {
                                    time: 12,
                                    title: 'Tổng Bí thư làm Trưởng ban Chỉ đạo Trung ương về hoàn thiện thể chế, pháp luật',
                                },
                                {
                                    time: 91,
                                    title: 'Các đoàn diễu binh rời miền Nam về đơn vị',
                                },
                                // ... các chương khác
                            ]}
                        />
                        <div className="bg-[#01aa4f] text-white rounded-lg p-2 text-center">
                            <div className="font-bold">BẢN TIN THỜI SỰ</div>
                            <div className="text-xl font-bold">07:00</div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>1:22</span>
                            <span>4:35</span>
                        </div>
                        <Slider
                            defaultValue={[30]}
                            max={100}
                            step={1}
                            className="h-1"
                        />
                    </div>

                    <div className="flex justify-center space-x-4">
                        <button className="text-gray-600">
                            <SkipBack className="h-6 w-6" />
                        </button>
                        <button
                            className="bg-[#01aa4f] text-white rounded-full p-2"
                            onClick={() => setIsPlaying(!isPlaying)}
                        >
                            {isPlaying ? (
                                <Pause className="h-6 w-6" />
                            ) : (
                                <Play className="h-6 w-6" />
                            )}
                        </button>
                        <button className="text-gray-600">
                            <SkipForward className="h-6 w-6" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {episodes.map((episode) => (
                    <PodcastEpisode key={episode.id} episode={episode} />
                ))}
            </div>
        </div>
    );
};

export default DailyRecapPage;

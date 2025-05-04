'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import {
    Play,
    Pause,
    Volume2,
    VolumeX,
    SkipBack,
    SkipForward,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { formatTime } from '@/lib/utils';

interface PodcastPlayerProps {
    title: string;
    description: string;
    thumbnail: string;
    audioUrl: string;
    author: string;
    publishDate: string;
    duration: number;
    chapters?: {
        time: number;
        title: string;
    }[];
}

export function PodcastPlayer({
    title,
    description,
    thumbnail,
    audioUrl,
    author,
    publishDate,
    duration,
    chapters = [],
}: PodcastPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('ended', handleEnded);
        };
    }, []);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleVolumeChange = (value: number[]) => {
        const newVolume = value[0];
        setVolume(newVolume);
        if (audioRef.current) {
            audioRef.current.volume = newVolume;
        }
    };

    const toggleMute = () => {
        if (audioRef.current) {
            audioRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const handleSeek = (value: number[]) => {
        if (audioRef.current) {
            audioRef.current.currentTime = value[0];
        }
    };

    const skipBackward = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = Math.max(0, currentTime - 10);
        }
    };

    const skipForward = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = Math.min(duration, currentTime + 10);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6">
                <div className="relative w-full md:w-64 h-64">
                    <Image
                        src={thumbnail}
                        alt={title}
                        fill
                        className="object-cover rounded-lg"
                    />
                </div>
                <div className="flex-1 space-y-4">
                    <div className="space-y-2">
                        <span className="text-sm text-gray-500">
                            {publishDate}
                        </span>
                        <h1 className="text-2xl font-bold">{title}</h1>
                        <p className="text-gray-600">{description}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={skipBackward}
                                className="p-2 rounded-full hover:bg-gray-100"
                            >
                                <SkipBack className="w-5 h-5" />
                            </button>
                            <button
                                onClick={togglePlay}
                                className="p-3 rounded-full bg-[#01aa4f] text-white hover:bg-[#019a45]"
                            >
                                {isPlaying ? (
                                    <Pause className="w-6 h-6" />
                                ) : (
                                    <Play className="w-6 h-6" />
                                )}
                            </button>
                            <button
                                onClick={skipForward}
                                className="p-2 rounded-full hover:bg-gray-100"
                            >
                                <SkipForward className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleMute}
                                className="p-2 rounded-full hover:bg-gray-100"
                            >
                                {isMuted ? (
                                    <VolumeX className="w-5 h-5" />
                                ) : (
                                    <Volume2 className="w-5 h-5" />
                                )}
                            </button>
                            <Slider
                                value={[volume * 100]}
                                onValueChange={(value) =>
                                    handleVolumeChange([value[0] / 100])
                                }
                                max={100}
                                step={1}
                                className="w-24"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Slider
                            value={[currentTime]}
                            onValueChange={handleSeek}
                            max={duration}
                            step={1}
                        />
                        <div className="flex justify-between text-sm text-gray-500">
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>
                    <div className="text-sm text-gray-500">
                        Tác giả: {author}
                    </div>
                </div>
            </div>

            {chapters.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold">Nội dung chính</h2>
                    <p className="text-sm text-gray-500">
                        Bấm để chuyển tới nội dung bạn muốn nghe
                    </p>
                    <ul className="space-y-2">
                        {chapters.map((chapter, index) => (
                            <li key={index} className="flex gap-2">
                                <strong className="text-gray-700">
                                    {formatTime(chapter.time)}
                                </strong>
                                <button
                                    onClick={() => handleSeek([chapter.time])}
                                    className="text-blue-600 hover:underline"
                                >
                                    {chapter.title}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <audio ref={audioRef} src={audioUrl} />
        </div>
    );
}

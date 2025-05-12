'use client';

import { useState, useRef, useEffect } from 'react';
import {
    Play,
    Pause,
    Volume2,
    VolumeX,
    FastForward,
    Rewind,
    Mars,
    Venus,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Podcast, TimestampScript } from '@/types/podcast';
import { motion, AnimatePresence } from 'framer-motion';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface PodcastPlayerProps {
    podcast: Podcast;
}

export const PodcastPlayer: React.FC<PodcastPlayerProps> = ({ podcast }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [volume, setVolume] = useState(1);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [activeSubtitleIndex, setActiveSubtitleIndex] = useState<
        number | null
    >(null);
    const [selectedVoice, setSelectedVoice] = useState<
        'male_voice' | 'female_voice'
    >('male_voice');
    const audioRef = useRef<HTMLAudioElement>(null);
    const subtitleRefs = useRef<(HTMLDivElement | null)[]>([]);

    const getCurrentTranscript = (): TimestampScript[] => {
        if (
            !podcast.timestamp_script ||
            typeof podcast.timestamp_script !== 'object'
        ) {
            console.error(
                'Invalid timestamp_script structure:',
                podcast.timestamp_script,
            );
            return [];
        }

        const voiceData = podcast.timestamp_script[selectedVoice];

        if (typeof voiceData === 'string') {
            try {
                const parsedData = JSON.parse(voiceData as string);
                if (Array.isArray(parsedData)) {
                    return parsedData;
                } else {
                    console.error('Parsed data is not an array:', parsedData);
                    return [];
                }
            } catch (error) {
                console.error('Error parsing voice data string:', error);
                return [];
            }
        }

        if (Array.isArray(voiceData)) {
            return voiceData;
        }

        console.error(
            'Voice data is neither a string nor an array:',
            voiceData,
        );
        return [];
    };

    const getCurrentLengthSeconds = (): number => {
        if (!podcast.length_seconds) {
            return 0;
        }

        if (typeof podcast.length_seconds === 'object') {
            const lengthValue = podcast.length_seconds[selectedVoice];
            if (typeof lengthValue === 'number') {
                return lengthValue;
            }
        }

        if (typeof podcast.length_seconds === 'number') {
            return podcast.length_seconds;
        }

        return 0;
    };

    const currentLengthSeconds = getCurrentLengthSeconds();

    useEffect(() => {
        if (audioRef.current) {
            const currentPosition = audioRef.current.currentTime;

            audioRef.current.pause();
            if (isPlaying) {
                setIsPlaying(false);
            }
            audioRef.current.src = podcast.audio_url?.[selectedVoice] || '';
            audioRef.current.load();
            if (isPlaying) {
                audioRef.current.addEventListener(
                    'loadedmetadata',
                    function onLoadedMetadata() {
                        if (audioRef.current) {
                            audioRef.current.currentTime = currentPosition;
                            audioRef.current.removeEventListener(
                                'loadedmetadata',
                                onLoadedMetadata,
                            );
                        }
                    },
                );
                audioRef.current.addEventListener(
                    'canplaythrough',
                    function onCanPlayThrough() {
                        if (audioRef.current) {
                            audioRef.current
                                .play()
                                .then(() => {
                                    setIsPlaying(true);
                                    setCurrentTime(currentPosition);
                                })
                                .catch((error) => {
                                    console.error(
                                        'Error playing audio after voice switch:',
                                        error,
                                    );
                                    setIsPlaying(false);
                                });

                            audioRef.current.removeEventListener(
                                'canplaythrough',
                                onCanPlayThrough,
                            );
                        }
                    },
                );
            } else {
                audioRef.current.addEventListener(
                    'loadedmetadata',
                    function onLoadedMetadata() {
                        if (audioRef.current) {
                            audioRef.current.currentTime = currentPosition;
                            setCurrentTime(currentPosition);
                            audioRef.current.removeEventListener(
                                'loadedmetadata',
                                onLoadedMetadata,
                            );
                        }
                    },
                );
            }
        }
    }, [selectedVoice, podcast.audio_url]);

    useEffect(() => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.play();
            } else {
                audioRef.current.pause();
            }
        }
    }, [isPlaying]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = isMuted ? 0 : volume;
        }
    }, [volume, isMuted]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = playbackRate;
        }
    }, [playbackRate]);

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const currentTime = audioRef.current.currentTime;
            setCurrentTime(currentTime);

            const transcript = getCurrentTranscript();

            if (Array.isArray(transcript) && transcript.length > 0) {
                const activeIndex = transcript.findIndex(
                    (item) =>
                        currentTime >= item.startTime &&
                        currentTime < item.endTime,
                );
                setActiveSubtitleIndex(activeIndex);
            } else {
                setActiveSubtitleIndex(null);
            }
        }
    };

    const handleSeek = (value: number[]) => {
        if (audioRef.current) {
            audioRef.current.currentTime = value[0];
            setCurrentTime(value[0]);
        }
    };

    const handleVolumeChange = (value: number[]) => {
        setVolume(value[0]);
        setIsMuted(value[0] === 0);
    };

    const handleSkip = (seconds: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime += seconds;
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleSubtitleClick = (startTime: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = startTime;
            setCurrentTime(startTime);
            setIsPlaying(true);
        }
    };

    const formatTime = (seconds: number) => {
        if (typeof seconds !== 'number' || isNaN(seconds)) {
            return '0:00';
        }
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="space-y-4">
            <audio
                ref={audioRef}
                src={podcast.audio_url[selectedVoice] || ''}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
            />

            <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                    {formatTime(currentTime)} /{' '}
                    {formatTime(currentLengthSeconds)}
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 bg-white hover:bg-gray-100"
                        >
                            {selectedVoice === 'male_voice' ? (
                                <>
                                    <Mars className="h-4 w-4 text-blue-600" />
                                    <span>Male voice</span>
                                </>
                            ) : (
                                <>
                                    <Venus className="h-4 w-4 text-pink-600" />
                                    <span>Female voice</span>
                                </>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" side="top">
                        <DropdownMenuItem
                            onClick={() => setSelectedVoice('male_voice')}
                            className={
                                selectedVoice === 'male_voice'
                                    ? 'bg-gray-100'
                                    : ''
                            }
                        >
                            <Mars className="h-4 w-4 mr-2 text-blue-600" />
                            Male voice
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => setSelectedVoice('female_voice')}
                            className={
                                selectedVoice === 'female_voice'
                                    ? 'bg-gray-100'
                                    : ''
                            }
                        >
                            <Venus className="h-4 w-4 mr-2 text-pink-600" />
                            Female voice
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="relative">
                <Slider
                    value={[currentTime]}
                    max={currentLengthSeconds || 1}
                    step={1}
                    onValueChange={handleSeek}
                    className="h-1 hover:cursor-pointer"
                />
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="text-gray-600 hover:bg-gray-200 hover:cursor-pointer p-2 rounded-full transition-colors"
                    >
                        {isMuted ? (
                            <VolumeX className="h-6 w-6" />
                        ) : (
                            <Volume2 className="h-6 w-6" />
                        )}
                    </button>
                    <Slider
                        value={[volume]}
                        max={1}
                        step={0.1}
                        onValueChange={handleVolumeChange}
                        className="w-24 h-1 hover:cursor-pointer"
                    />
                </div>

                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => handleSkip(-10)}
                        className="text-gray-600 hover:cursor-pointer hover:bg-gray-200 p-2 rounded-full transition-colors"
                    >
                        <Rewind className="h-6 w-6" />
                    </button>
                    <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="bg-[#01aa4f] text-white rounded-full p-3 hover:bg-[#018a3f] transition-colors hover:cursor-pointer"
                    >
                        {isPlaying ? (
                            <Pause className="h-8 w-8" />
                        ) : (
                            <Play className="h-8 w-8" />
                        )}
                    </button>
                    <button
                        onClick={() => handleSkip(10)}
                        className="text-gray-600 hover:bg-gray-200 hover:cursor-pointer p-2 rounded-full transition-colors"
                    >
                        <FastForward className="h-6 w-6" />
                    </button>
                </div>

                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setPlaybackRate(0.5)}
                        className={`hover:bg-gray-200 hover:cursor-pointer p-2 rounded-full transition-colors ${playbackRate === 0.5 ? 'text-[#01aa4f]' : ''}`}
                    >
                        0.5x
                    </button>
                    <button
                        onClick={() => setPlaybackRate(1)}
                        className={`hover:bg-gray-200 hover:cursor-pointer p-2 rounded-full transition-colors ${playbackRate === 1 ? 'text-[#01aa4f]' : ''}`}
                    >
                        1x
                    </button>
                    <button
                        onClick={() => setPlaybackRate(1.5)}
                        className={`hover:bg-gray-200 hover:cursor-pointer p-2 rounded-full transition-colors ${playbackRate === 1.5 ? 'text-[#01aa4f]' : ''}`}
                    >
                        1.5x
                    </button>
                    <button
                        onClick={() => setPlaybackRate(2)}
                        className={`hover:bg-gray-200 hover:cursor-pointer p-2 rounded-full transition-colors ${playbackRate === 2 ? 'text-[#01aa4f]' : ''}`}
                    >
                        2x
                    </button>
                </div>
            </div>

            <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto scrollbar-hide">
                {(() => {
                    const transcript = getCurrentTranscript();

                    if (!Array.isArray(transcript) || transcript.length === 0) {
                        return (
                            <div className="p-3 text-center text-gray-500">
                                No transcript available for this recording
                            </div>
                        );
                    }

                    return (
                        <AnimatePresence>
                            {transcript.map((item, index) => (
                                <motion.div
                                    key={index}
                                    ref={(el) => {
                                        subtitleRefs.current[index] = el;
                                    }}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{
                                        opacity: 1,
                                        y: 0,
                                        backgroundColor:
                                            activeSubtitleIndex === index
                                                ? 'rgba(1, 170, 79, 0.1)'
                                                : 'transparent',
                                    }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.2 }}
                                    className={`p-3 rounded-lg cursor-pointer hover:bg-gray-200 hover:cursor-pointer transition-colors ${
                                        activeSubtitleIndex === index
                                            ? 'border-l-4 border-[#01aa4f]'
                                            : ''
                                    }`}
                                    onClick={() => {
                                        if (
                                            typeof item.startTime === 'number'
                                        ) {
                                            handleSubtitleClick(item.startTime);
                                        }
                                    }}
                                >
                                    <div className="flex items-start space-x-2">
                                        <span className="text-xs text-gray-500 min-w-[50px]">
                                            {formatTime(item.startTime)}
                                        </span>
                                        <span
                                            className={`${activeSubtitleIndex === index ? 'font-medium' : ''}`}
                                        >
                                            {item.text || ''}
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    );
                })()}
            </div>
        </div>
    );
};

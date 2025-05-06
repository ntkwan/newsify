'use client';

import type React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CommandMenu } from '@/components/command-menu';
import { useState, useEffect } from 'react';
import { Podcast } from '@/types/podcast';

const Header: React.FC = () => {
    const pathname = usePathname();
    const [podcasts, setPodcasts] = useState<Podcast[]>([]);
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: '2-digit',
        year: 'numeric',
    });

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
                if (data.podcasts && Array.isArray(data.podcasts)) {
                    setPodcasts(data.podcasts);
                }
            } catch (err) {
                console.error('Error fetching podcasts:', err);
            }
        };

        fetchPodcasts();
    }, []);

    return (
        <header className="border-b border-gray-200 mb-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Link href="/" className="flex items-center">
                            <span className="text-[#01aa4f] font-bold text-2xl">
                                Newsify
                            </span>
                        </Link>
                        <span className="text-gray-500 text-sm hidden sm:inline">
                            {formattedDate}
                        </span>
                    </div>

                    <div className="flex items-center space-x-4">
                        <nav className="hidden md:flex space-x-6">
                            <Link
                                href="/"
                                className={`text-sm relative group ${pathname === '/' ? 'font-semibold' : ''}`}
                            >
                                Home
                                <span
                                    className={`absolute bottom-0 left-0 w-full h-0.5 bg-[#01aa4f] transition-all duration-300 ${pathname === '/' ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`}
                                ></span>
                            </Link>
                            <Link
                                href="/articles"
                                className={`text-sm relative group ${pathname === '/daily-news' ? 'font-semibold' : ''}`}
                            >
                                News
                                <span
                                    className={`absolute bottom-0 left-0 w-full h-0.5 bg-[#01aa4f] transition-all duration-300 ${pathname === '/daily-news' ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`}
                                ></span>
                            </Link>
                            <Link
                                href="/daily-podcasts"
                                className={`text-sm relative group ${pathname === '/daily-podcasts' ? 'font-semibold' : ''}`}
                            >
                                Daily Podcasts
                                <span
                                    className={`absolute bottom-0 left-0 w-full h-0.5 bg-[#01aa4f] transition-all duration-300 ${pathname === '/daily-podcasts' ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`}
                                ></span>
                            </Link>
                        </nav>

                        <div className="flex items-center">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 w-[240px] justify-start text-sm text-muted-foreground hover:cursor-pointer"
                                onClick={() => {
                                    const event = new KeyboardEvent('keydown', {
                                        key: 'k',
                                        metaKey: true,
                                    });
                                    document.dispatchEvent(event);
                                }}
                            >
                                <Search className="mr-2 h-4 w-4" />
                                <span>Search for ...</span>
                                <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                                    <span className="text-xs">⌘</span>K
                                </kbd>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
            <CommandMenu podcasts={podcasts} />
        </header>
    );
};

export default Header;

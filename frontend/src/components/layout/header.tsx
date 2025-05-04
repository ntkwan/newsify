'use client';

import type React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Header: React.FC = () => {
    const pathname = usePathname();
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: '2-digit',
        year: 'numeric',
    });

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

                        <div className="flex items-center space-x-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-gray-500 cursor-pointer"
                            >
                                <Search className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-xs cursor-pointer"
                            >
                                Log in
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;

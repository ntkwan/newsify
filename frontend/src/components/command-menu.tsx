'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { useEffect } from 'react';

interface Article {
    trendingId: string;
    title: string;
    summary: string;
    mainCategory: string;
    publishDate: string;
    imageUrl: string;
    highlights: {
        title: string[];
        content: string[];
        summary: string[];
    };
}

export function CommandMenu() {
    const router = useRouter();
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState('');
    const [searchResults, setSearchResults] = React.useState<Article[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);

    // Gọi API search khi search query thay đổi
    useEffect(() => {
        const searchArticles = async () => {
            if (!search.trim()) {
                setSearchResults([]);
                return;
            }

            setIsLoading(true);
            try {
                const response = await fetch(
                    `https://backend.id.vn/articles/search?q=${encodeURIComponent(search)}&page=1&size=20`,
                );
                const data = await response.json();
                setSearchResults(data.articles || []);
            } catch (error) {
                console.error('Error searching articles:', error);
                setSearchResults([]);
            } finally {
                setIsLoading(false);
            }
        };

        // Debounce search để tránh gọi API quá nhiều
        const timeoutId = setTimeout(searchArticles, 300);
        return () => clearTimeout(timeoutId);
    }, [search]);

    // Receive event Ctrl K
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="overflow-hidden p-0 max-w-3xl w-[90vw] h-[80vh]">
                <DialogTitle className="sr-only">
                    Search for articles...
                </DialogTitle>
                <Command className="rounded-lg border shadow-md h-full">
                    <div className="relative w-full max-w-xl mx-auto mt-4">
                        <div className="flex items-center border rounded px-4 py-2 bg-white hover:border-primary transition-colors">
                            <input
                                className="flex-1 border-none outline-none bg-transparent placeholder:text-muted-foreground"
                                placeholder="Searching for ..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && search.trim()) {
                                        e.preventDefault();
                                        router.push(
                                            `/articles/search?q=${encodeURIComponent(search.trim())}`,
                                        );
                                        setOpen(false);
                                    }
                                }}
                            />
                        </div>
                    </div>
                    <CommandList className="h-[calc(100%-3.5rem)] overflow-y-auto mt-4">
                        {isLoading ? (
                            <div className="p-4 text-center text-muted-foreground">
                                Searching...
                            </div>
                        ) : (
                            <>
                                <CommandEmpty>No results found.</CommandEmpty>
                                <CommandGroup
                                    heading="Articles"
                                    className="p-2"
                                >
                                    {searchResults.map((article) => (
                                        <CommandItem
                                            key={article.trendingId}
                                            onSelect={() => {
                                                router.push(
                                                    `/articles/${article.trendingId}`,
                                                );
                                                setOpen(false);
                                            }}
                                            className="p-3 hover:bg-secondary rounded-md cursor-pointer !opacity-80"
                                        >
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="relative w-16 h-16 flex-shrink-0">
                                                        <Image
                                                            src={
                                                                article.imageUrl
                                                            }
                                                            alt={article.title}
                                                            fill
                                                            className="object-cover rounded-md"
                                                            sizes="64px"
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <span className="font-medium text-base line-clamp-2 text-foreground">
                                                            {article.title}
                                                        </span>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Badge
                                                                variant="secondary"
                                                                className="text-xs"
                                                            >
                                                                {
                                                                    article.mainCategory
                                                                }
                                                            </Badge>
                                                            <span className="text-xs text-muted-foreground">
                                                                {new Date(
                                                                    article.publishDate,
                                                                ).toLocaleDateString(
                                                                    'en-US',
                                                                    {
                                                                        day: 'numeric',
                                                                        month: 'long',
                                                                        year: 'numeric',
                                                                    },
                                                                )}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {article.highlights.content
                                                    .length > 0 && (
                                                    <div className="text-sm text-muted-foreground line-clamp-2">
                                                        {article.highlights.content[0].replace(
                                                            /<[^>]*>/g,
                                                            '',
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
            </DialogContent>
        </Dialog>
    );
}

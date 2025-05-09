'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { Podcast } from '@/types/podcast';
import { useEffect, useRef } from 'react';

interface CommandMenuProps {
    podcasts: Podcast[];
}

const CATEGORIES = [
    'Autos and Vehicles',
    'Beauty and Fashion',
    'Business and Finance',
    'Climate',
    'Entertainment',
    'Food and Drink',
    'Games',
    'Health',
    'Hobbies and Leisure',
    'Jobs and Education',
    'Law and Government',
    'Other',
    'Pets and Animal',
    'Politics',
    'Science',
    'Shopping',
    'Sports',
    'Technology',
    'Travel and Transportation',
];

export function CommandMenu({ podcasts }: CommandMenuProps) {
    const router = useRouter();
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState('');
    const [selectedCategories, setSelectedCategories] = React.useState<
        string[]
    >([]);
    const [showDropdown, setShowDropdown] = React.useState(false);
    const searchBarRef = useRef<HTMLDivElement>(null);

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

    // Đóng dropdown khi click ra ngoài
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (
                searchBarRef.current &&
                !searchBarRef.current.contains(e.target as Node)
            ) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const handleCategoryRemove = (category: string) => {
        setSelectedCategories((prev) => prev.filter((c) => c !== category));
    };
    const handleCategoryAdd = (category: string) => {
        if (!selectedCategories.includes(category)) {
            setSelectedCategories((prev) => [...prev, category]);
        }
        setShowDropdown(false);
    };

    const filteredPodcasts = podcasts.filter((podcast) => {
        const matchesSearch = podcast.title
            .toLowerCase()
            .includes(search.toLowerCase());
        if (!('category' in podcast)) return matchesSearch;
        const matchesCategory =
            selectedCategories.length === 0 ||
            selectedCategories.some((cat) => podcast.category === cat);
        return matchesSearch && matchesCategory;
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="overflow-hidden p-0 max-w-3xl w-[90vw] h-[80vh]">
                <DialogTitle className="sr-only">Tìm kiếm podcast</DialogTitle>
                <Command className="rounded-lg border shadow-md h-full">
                    <div
                        ref={searchBarRef}
                        className="relative w-full max-w-xl mx-auto mt-4 category-search-bar"
                    >
                        <div
                            className="flex items-center border rounded px-2 py-1 bg-white min-h-[36px] cursor-text hover:border-primary transition-colors"
                            onClick={() => setShowDropdown(true)}
                        >
                            {selectedCategories.slice(0, 2).map((cat) => (
                                <Badge
                                    key={cat}
                                    variant="secondary"
                                    className="mr-1 max-w-[90px] w-[90px] truncate bg-secondary text-primary hover:bg-primary hover:text-white transition-colors hover:cursor-pointer"
                                >
                                    <span className="truncate">{cat}</span>
                                    <button
                                        className="ml-1 hover:text-secondary transition-colors hover:cursor-pointer"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleCategoryRemove(cat);
                                        }}
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                            {selectedCategories.length > 2 && (
                                <Badge
                                    variant="outline"
                                    className="mr-1 w-[48px] justify-center bg-secondary text-primary border-primary hover:bg-secondary-dark transition-colors hover:cursor-pointer"
                                >
                                    +{selectedCategories.length - 2}
                                </Badge>
                            )}
                            <input
                                className="flex-1 border-none outline-none bg-transparent placeholder:text-muted-foreground"
                                placeholder="Tìm kiếm..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onFocus={() => setShowDropdown(true)}
                            />
                        </div>
                        {showDropdown && (
                            <div className="absolute left-0 right-0 mt-1 bg-white border border-primary rounded shadow z-10 max-h-48 overflow-y-auto">
                                {CATEGORIES.filter(
                                    (cat) => !selectedCategories.includes(cat),
                                ).map((cat) => (
                                    <div
                                        key={cat}
                                        className="px-3 py-2 hover:bg-secondary cursor-pointer text-sm text-primary transition-colors"
                                        onClick={() => handleCategoryAdd(cat)}
                                    >
                                        {cat}
                                    </div>
                                ))}
                                {CATEGORIES.filter(
                                    (cat) => !selectedCategories.includes(cat),
                                ).length === 0 && (
                                    <div className="px-3 py-2 text-muted-foreground text-sm">
                                        No more category
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <CommandList className="h-[calc(100%-3.5rem)] overflow-y-auto mt-4">
                        <CommandEmpty>No result found.</CommandEmpty>
                        <CommandGroup heading="Podcasts" className="p-2">
                            {filteredPodcasts.map((podcast) => (
                                <CommandItem
                                    key={podcast.podcast_id}
                                    onSelect={() => {
                                        router.push(
                                            `/daily-podcasts/${podcast.podcast_id}`,
                                        );
                                        setOpen(false);
                                    }}
                                    className="p-3 hover:bg-secondary/50 rounded-md"
                                >
                                    <div className="flex flex-col">
                                        <span className="font-medium text-base">
                                            {podcast.title}
                                        </span>
                                        <span className="text-sm text-muted-foreground">
                                            {new Date(
                                                podcast.publish_date,
                                            ).toLocaleDateString('vi-VN', {
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric',
                                            })}
                                        </span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </DialogContent>
        </Dialog>
    );
}

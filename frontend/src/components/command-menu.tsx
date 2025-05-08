'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Podcast } from '@/types/podcast';

interface CommandMenuProps {
    podcasts: Podcast[];
}

export function CommandMenu({ podcasts }: CommandMenuProps) {
    const router = useRouter();
    const [open, setOpen] = React.useState(false);

    React.useEffect(() => {
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
                <DialogTitle className="sr-only">Tìm kiếm podcast</DialogTitle>
                <Command className="rounded-lg border shadow-md h-full">
                    <CommandInput
                        placeholder="Tìm kiếm podcast..."
                        className="h-14 text-lg"
                    />
                    <CommandList className="h-[calc(100%-3.5rem)] overflow-y-auto">
                        <CommandEmpty>Không tìm thấy kết quả.</CommandEmpty>
                        <CommandGroup heading="Podcasts" className="p-2">
                            {podcasts.map((podcast) => (
                                <CommandItem
                                    key={podcast.podcast_id}
                                    onSelect={() => {
                                        router.push(
                                            `/daily-podcasts/${podcast.podcast_id}`,
                                        );
                                        setOpen(false);
                                    }}
                                    className="p-3 hover:bg-accent rounded-md"
                                >
                                    <div className="flex flex-col">
                                        <span className="font-medium text-base">
                                            {podcast.title}
                                        </span>
                                        <span className="text-sm text-gray-500">
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

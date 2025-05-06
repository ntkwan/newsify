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
            <DialogContent className="overflow-hidden p-0">
                <DialogTitle className="sr-only">Tìm kiếm podcast</DialogTitle>
                <Command className="rounded-lg border shadow-md">
                    <CommandInput placeholder="Tìm kiếm podcast..." />
                    <CommandList>
                        <CommandEmpty>Không tìm thấy kết quả.</CommandEmpty>
                        <CommandGroup heading="Podcasts">
                            {podcasts.map((podcast) => (
                                <CommandItem
                                    key={podcast.podcast_id}
                                    onSelect={() => {
                                        router.push(
                                            `/daily-podcasts/${podcast.podcast_id}`,
                                        );
                                        setOpen(false);
                                    }}
                                >
                                    <div className="flex flex-col">
                                        <span className="font-medium">
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

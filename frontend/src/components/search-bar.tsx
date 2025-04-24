'use client';

import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useDebounce } from '@/hooks/use-debounce';

interface SearchBarProps {
    categories: string[];
}

export function SearchBar({ categories }: SearchBarProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [category, setCategory] = useState(
        searchParams.get('category') || 'all',
    );
    const debouncedSearch = useDebounce(search, 300);

    const createQueryString = useCallback(
        (name: string, value: string) => {
            const params = new URLSearchParams(searchParams.toString());
            if (value && value !== 'all') {
                params.set(name, value);
            } else {
                params.delete(name);
            }
            return params.toString();
        },
        [searchParams],
    );

    useEffect(() => {
        const queryString = createQueryString('search', debouncedSearch);
        router.push(`?${queryString}`, { scroll: false });
    }, [debouncedSearch, createQueryString, router]);

    const handleCategoryChange = (value: string) => {
        setCategory(value);
        const queryString = createQueryString('category', value);
        router.push(`?${queryString}`, { scroll: false });
    };

    return (
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Input
                placeholder="Tìm kiếm bài viết..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1"
            />
            <Select value={category} onValueChange={handleCategoryChange}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Chọn danh mục" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                            {cat}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { DateRange } from 'react-day-picker';
import { DateRangePicker } from './date-range-picker';

export function SearchBar() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [date, setDate] = useState<DateRange | undefined>(undefined);
    const debouncedSearch = useDebounce(search, 300);

    const createQueryString = useCallback(
        (name: string, value: string) => {
            const params = new URLSearchParams(searchParams.toString());
            if (value) {
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

    const handleDateChange = (newDate: DateRange | undefined) => {
        setDate(newDate);
        if (newDate?.from && newDate?.to) {
            const fromDate = newDate.from.toISOString().split('T')[0];
            const toDate = newDate.to.toISOString().split('T')[0];
            const dateRange = `${fromDate},${toDate}`;
            const queryString = createQueryString('date', dateRange);
            router.push(`?${queryString}`, { scroll: false });
        } else {
            const queryString = createQueryString('date', '');
            router.push(`?${queryString}`, { scroll: false });
        }
    };

    return (
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <input
                type="text"
                placeholder="Search articles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01aa4f]"
            />
            <DateRangePicker
                date={date}
                onDateChange={handleDateChange}
                className="w-full sm:w-[300px]"
            />
        </div>
    );
}

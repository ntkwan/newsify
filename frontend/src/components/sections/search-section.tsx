'use client';

import { Search, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DatePicker } from '../ui/date-picker';
import { useState } from 'react';

export default function SearchSection() {
    const [date, setDate] = useState<Date>();

    return (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                    placeholder="Search for topics, news, or podcasts..."
                    className="pl-10 border-gray-200 rounded-md"
                />
            </div>
            <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <DatePicker
                    date={date}
                    onDateChange={setDate}
                    placeholder="Filter by date"
                />
            </div>
        </section>
    );
}

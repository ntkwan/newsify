'use client';

import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

interface PaginationProps {
    totalPages: number;
}

export default function Pagination({ totalPages }: PaginationProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentPage = Number(searchParams.get('page')) || 1;

    const createPageURL = (pageNumber: number | string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', pageNumber.toString());
        return `${pathname}?${params.toString()}`;
    };

    const generatePageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;
        let startPage = Math.max(
            1,
            currentPage - Math.floor(maxVisiblePages / 2),
        );
        const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(
                <Link
                    key={i}
                    href={createPageURL(i)}
                    className={`px-3 py-1 rounded-md ${
                        i === currentPage
                            ? 'bg-[#01aa4f] text-white'
                            : 'hover:bg-gray-100'
                    }`}
                >
                    {i}
                </Link>,
            );
        }

        return pages;
    };

    return (
        <div className="flex items-center justify-center space-x-2 mt-8">
            <Link
                href={createPageURL(currentPage - 1)}
                className={`p-2 rounded-md ${
                    currentPage === 1
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'hover:bg-gray-100'
                }`}
                aria-disabled={currentPage === 1}
            >
                <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            {generatePageNumbers()}
            <Link
                href={createPageURL(currentPage + 1)}
                className={`p-2 rounded-md ${
                    currentPage === totalPages
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'hover:bg-gray-100'
                }`}
                aria-disabled={currentPage === totalPages}
            >
                <ArrowRightIcon className="h-5 w-5" />
            </Link>
        </div>
    );
}

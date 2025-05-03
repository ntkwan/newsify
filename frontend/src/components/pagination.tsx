'use client';

import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
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

        // Điều chỉnh startPage nếu không đủ 5 trang
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        // Thêm trang đầu tiên
        if (startPage > 1) {
            pages.push(
                <Link
                    key={1}
                    href={createPageURL(1)}
                    className="px-3 py-1 rounded-md hover:bg-gray-100"
                >
                    1
                </Link>,
            );
            if (startPage > 2) {
                pages.push(
                    <span key="start-ellipsis" className="px-2">
                        ...
                    </span>,
                );
            }
        }

        // Thêm các trang chính
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

        // Thêm trang cuối cùng
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                pages.push(
                    <span key="end-ellipsis" className="px-2">
                        ...
                    </span>,
                );
            }
            pages.push(
                <Link
                    key={totalPages}
                    href={createPageURL(totalPages)}
                    className="px-3 py-1 rounded-md hover:bg-gray-100"
                >
                    {totalPages}
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

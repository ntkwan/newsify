/**
 * Pagination Component
 *
 * A reusable pagination component that displays page numbers and navigation controls.
 * Features:
 * - Dynamic page number generation with ellipsis
 * - Previous/Next navigation
 * - Current page highlighting
 * - Responsive design
 *
 * @component
 * @param {Object} props - Component props
 * @param {number} props.totalPages - Total number of pages
 * @param {number} props.currentPage - Current active page
 * @param {number} props.totalItems - Total number of items
 */

'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

interface PaginationProps {
    totalPages: number;
    currentPage: number;
    totalItems: number;
}

export default function Pagination({
    totalPages,
    currentPage,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    totalItems,
}: PaginationProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    /**
     * Creates a URL for a specific page number while preserving other search parameters
     * @param {number} pageNumber - The page number to navigate to
     * @returns {string} The constructed URL with query parameters
     */
    const createPageURL = (pageNumber: number | string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', pageNumber.toString());
        return `${pathname}?${params.toString()}`;
    };

    /**
     * Generates an array of page numbers to display
     * @returns {JSX.Element[]} Array of JSX elements to display
     */
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
            {/* Previous Page Button */}
            {currentPage === 1 ? (
                <button
                    className="p-2 rounded-md text-gray-400 cursor-not-allowed"
                    disabled
                >
                    <ArrowLeftIcon className="h-5 w-5" />
                </button>
            ) : (
                <Link
                    href={createPageURL(currentPage - 1)}
                    className="p-2 rounded-md hover:bg-gray-100"
                >
                    <ArrowLeftIcon className="h-5 w-5" />
                </Link>
            )}

            {/* Page Numbers */}
            {generatePageNumbers()}

            {/* Next Page Button */}
            {currentPage === totalPages ? (
                <button
                    className="p-2 rounded-md text-gray-400 cursor-not-allowed"
                    disabled
                >
                    <ArrowRightIcon className="h-5 w-5" />
                </button>
            ) : (
                <Link
                    href={createPageURL(currentPage + 1)}
                    className="p-2 rounded-md hover:bg-gray-100"
                >
                    <ArrowRightIcon className="h-5 w-5" />
                </Link>
            )}
        </div>
    );
}

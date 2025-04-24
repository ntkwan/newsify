import { useEffect, useState } from 'react';

/**
 * useDebounce – hook trì hoãn cập nhật giá trị.
 * - Trả về `debouncedValue` chỉ thay đổi sau `delay` (ms, mặc định 500 ms).
 */

export function useDebounce<T>(value: T, delay?: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay || 500);

        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}

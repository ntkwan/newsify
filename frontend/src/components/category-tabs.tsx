'use client';

import type React from 'react';
import { Button } from '@/components/ui/button';

interface CategoryTabsProps {
    categories: string[];
    activeCategory: string;
    onChange: (category: string) => void;
}

const CategoryTabs: React.FC<CategoryTabsProps> = ({
    categories,
    activeCategory,
    onChange,
}) => {
    return (
        <div className="overflow-x-auto pb-2">
            <div className="flex space-x-2 min-w-max">
                {categories.map((category) => (
                    <Button
                        key={category}
                        variant={
                            activeCategory === category ? 'default' : 'outline'
                        }
                        className={
                            activeCategory === category
                                ? 'bg-[#01aa4f] hover:bg-[#01aa4f]/90'
                                : ''
                        }
                        onClick={() => onChange(category)}
                    >
                        {category}
                    </Button>
                ))}
            </div>
        </div>
    );
};

export default CategoryTabs;

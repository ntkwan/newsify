import type React from 'react';

const Loading: React.FC = () => {
    return (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
            {/* Header Skeleton */}
            <div className="animate-pulse">
                <div className="h-8 w-48 bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-4 w-3/4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
            </div>

            {/* Content Skeleton */}
            <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                    <div key={item} className="animate-pulse">
                        <div className="h-40 bg-gray-200 rounded-lg mb-3"></div>
                        <div className="h-6 w-3/4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
                    </div>
                ))}
            </div>

            {/* Loading Indicator */}
            <div className="flex justify-center items-center py-8">
                <div className="relative">
                    <div className="h-12 w-12 rounded-full border-4 border-gray-200"></div>
                    <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin absolute top-0"></div>
                </div>
            </div>
        </div>
    );
};

export default Loading;

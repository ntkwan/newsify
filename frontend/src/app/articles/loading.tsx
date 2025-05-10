import type React from 'react';

const Loading: React.FC = () => {
    return (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
            {/* Article List Skeleton */}
            <div className="space-y-6">
                {[1, 2, 3, 4].map((item) => (
                    <div key={item} className="animate-pulse">
                        {/* Article Card */}
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            {/* Title */}
                            <div className="h-6 w-3/4 bg-gray-200 rounded mb-4"></div>

                            {/* Description */}
                            <div className="space-y-2 mb-4">
                                <div className="h-4 w-full bg-gray-200 rounded"></div>
                                <div className="h-4 w-5/6 bg-gray-200 rounded"></div>
                                <div className="h-4 w-4/6 bg-gray-200 rounded"></div>
                            </div>

                            {/* Meta Info */}
                            <div className="flex items-center space-x-4">
                                <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                                <div className="h-4 w-24 bg-gray-200 rounded"></div>
                                <div className="h-4 w-16 bg-gray-200 rounded"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Loading Spinner */}
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

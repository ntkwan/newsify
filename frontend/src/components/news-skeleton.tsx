export default function NewsSkeleton() {
    return (
        <div className="space-y-6">
            {[...Array(5)].map((_, index) => (
                <div
                    key={index}
                    className="flex flex-col md:flex-row gap-4 border-b border-gray-200 pb-6"
                >
                    <div className="md:w-1/4 flex-shrink-0">
                        <div className="w-full h-[120px] bg-gray-200 rounded-lg animate-pulse" />
                    </div>
                    <div className="md:w-3/4 space-y-3">
                        <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse" />
                        <div className="space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
                            <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse" />
                            <div className="h-4 bg-gray-200 rounded w-4/6 animate-pulse" />
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
                            <div className="h-4 bg-gray-200 rounded w-16 animate-pulse" />
                            <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

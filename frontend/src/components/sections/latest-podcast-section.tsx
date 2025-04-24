import Image from 'next/image';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LatestPodcastSection() {
    return (
        <section>
            <h2 className="text-[#01aa4f] text-2xl font-bold mb-6">
                Latest Podcast
            </h2>
            <div className="flex flex-col md:flex-row gap-6 bg-white rounded-lg border border-gray-100 p-4">
                <div className="md:w-1/4">
                    <Image
                        src="/images/placeholders/news-placeholder.png"
                        alt="Podcast cover"
                        width={200}
                        height={200}
                        className="w-full h-full object-cover"
                    />
                </div>
                <div className="md:w-3/4 space-y-4">
                    <div className="space-y-1">
                        <div className="text-sm text-gray-500">
                            New Releases • April 17, 2023 | 06:00 am GMT+7
                        </div>
                        <h3 className="text-2xl font-bold">
                            The Daily Brief – April 17, 2023
                        </h3>
                        <p className="text-gray-600">
                            Your evening recap of today&apos;s top stories.
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        className="flex items-center gap-2 rounded-full cursor-pointer"
                    >
                        <Play className="h-4 w-4 text-[#01aa4f]" />
                        <span className="text-xs font-medium">
                            LISTEN NOW (15 min)
                        </span>
                    </Button>
                </div>
            </div>
        </section>
    );
}

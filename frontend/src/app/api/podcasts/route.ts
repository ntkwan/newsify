import { NextRequest, NextResponse } from 'next/server';
import { Podcast } from '@/types/podcast';

interface RawPodcast extends Omit<Podcast, 'timestamp_script'> {
    timestamp_script: string;
}

export async function GET(request: NextRequest) {
    try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
        if (!apiBaseUrl) {
            throw new Error('API base URL is not configured');
        }

        const searchParams = request.nextUrl.searchParams;
        const page = searchParams.get('page') || '1';
        const pageSize = searchParams.get('pageSize') || '10';

        const response = await fetch(
            `${apiBaseUrl}/podcasts?page=${page}&pageSize=${pageSize}`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
            },
        );

        if (!response.ok) {
            throw new Error(
                `API request failed with status ${response.status}`,
            );
        }

        const data = await response.json();

        // Parse timestamp_script từ string JSON thành array
        if (data.podcasts && Array.isArray(data.podcasts)) {
            data.podcasts = data.podcasts.map((podcast: RawPodcast) => ({
                ...podcast,
                timestamp_script: JSON.parse(podcast.timestamp_script),
            }));
        }

        return NextResponse.json(data);
    } catch (err) {
        console.error('Error fetching podcasts:', err);
        return NextResponse.json(
            { error: 'Failed to fetch podcasts' },
            { status: 500 },
        );
    }
}

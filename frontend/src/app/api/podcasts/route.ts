import { NextRequest, NextResponse } from 'next/server';

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

        return NextResponse.json(data);
    } catch (err) {
        console.error('Error fetching podcasts:', err);
        return NextResponse.json(
            { error: 'Failed to fetch podcasts' },
            { status: 500 },
        );
    }
}

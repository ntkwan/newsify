import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: { id: string } },
) {
    try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
        if (!apiBaseUrl) {
            throw new Error('API base URL is not configured');
        }

        const response = await fetch(`${apiBaseUrl}/podcasts/${params.id}`, {
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(
                `API request failed with status ${response.status}`,
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (err) {
        console.error('Error fetching podcast:', err);
        return NextResponse.json(
            { error: 'Failed to fetch podcast' },
            { status: 500 },
        );
    }
}

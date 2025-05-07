import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = searchParams.get('page') || '1';
        const pageSize = searchParams.get('pageSize') || '10';
        const search = searchParams.get('search') || '';
        const date = searchParams.get('date') || '';

        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE_URL}/articles?page=${page}&pageSize=${pageSize}&search=${search}&date=${date}`,
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch articles: ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching articles:', error);
        return NextResponse.json(
            { error: 'Failed to fetch articles' },
            { status: 500 },
        );
    }
}

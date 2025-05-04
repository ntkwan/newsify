import { NextRequest, NextResponse } from 'next/server';

type Props = {
    params: Promise<{
        id: string;
    }>;
};

export async function GET(request: NextRequest, props: Props) {
    try {
        const params = await props.params;
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE_URL}/podcasts/${params.id}`,
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch podcast: ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching podcast:', error);
        return NextResponse.json(
            { error: 'Failed to fetch podcast' },
            { status: 500 },
        );
    }
}

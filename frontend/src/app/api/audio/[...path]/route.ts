import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: { path: string[] } },
) {
    const path = params.path.join('/');
    const audioUrl = `https://v.vnecdn.net/vnexpress/video/audio/${path}`;

    try {
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();

        return new NextResponse(arrayBuffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': arrayBuffer.byteLength.toString(),
                'Cache-Control': 'public, max-age=31536000',
            },
        });
    } catch (error) {
        console.error('Error fetching audio:', error);
        return new NextResponse('Error fetching audio', { status: 500 });
    }
}

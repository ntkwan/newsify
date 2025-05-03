import { ApiProperty } from '@nestjs/swagger';

export class PodcastResponseDto {
    @ApiProperty({
        description: 'The podcast ID',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    podcast_id: string;

    @ApiProperty({
        description: 'The publication date of the podcast in ISO format',
        example: '2023-04-15T12:30:45.000Z',
        required: false,
    })
    publish_date: string | null;

    @ApiProperty({
        description: 'The title of the podcast',
        example: 'Tech News Weekly',
    })
    title: string;

    @ApiProperty({
        description: 'The script of the podcast',
        example: "Welcome to this week's tech news...",
        required: false,
    })
    script: string | null;

    @ApiProperty({
        description: 'The script with timestamps for navigation',
        example: { '00:00': 'Introduction', '01:30': 'First News Item' },
        required: false,
    })
    timestamp_script: object | null;

    @ApiProperty({
        description: 'The URL of the audio file',
        example: 'https://example.com/podcasts/tech-news-weekly.mp3',
        required: false,
    })
    audio_url: string | null;

    @ApiProperty({
        description: 'The length of the podcast in seconds',
        example: 1800,
        required: false,
    })
    length_seconds: number | null;
}

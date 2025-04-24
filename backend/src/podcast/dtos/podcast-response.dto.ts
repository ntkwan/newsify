import { ApiProperty } from '@nestjs/swagger';

export class TranscriptLine {
    @ApiProperty({
        description: 'Start time of this line in seconds',
        example: 1.5,
    })
    startTime: number;

    @ApiProperty({
        description: 'End time of this line in seconds',
        example: 5.2,
    })
    endTime: number;

    @ApiProperty({
        description: 'Text content of this line',
        example: 'Welcome to Newsify Breaking News.',
    })
    text: string;
}

export class PodcastResponseDto {
    @ApiProperty({
        description: 'URL to the generated podcast audio file',
        example:
            'https://storage.example.com/podcasts/newsify-podcast-2025-04-18.mp3',
    })
    url: string;

    @ApiProperty({
        description: 'Complete transcript of the podcast',
        example:
            "Welcome to Newsify Breaking News. Here are today's top stories...",
    })
    transcript: string;

    @ApiProperty({
        description: 'Transcript with timestamps for each line',
        type: [TranscriptLine],
    })
    timestampedTranscript: TranscriptLine[];
}

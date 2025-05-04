export interface TimestampScript {
    startTime: number;
    endTime: number;
    text: string;
}

export interface Podcast {
    podcast_id: string;
    publish_date: string;
    title: string;
    script: string;
    timestamp_script: TimestampScript[];
    audio_url: string;
    length_seconds: number;
}

export interface PodcastResponse {
    podcasts: Podcast[];
    total: number;
    page: number;
    pageSize: number;
}

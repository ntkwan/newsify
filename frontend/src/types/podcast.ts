export interface TimestampScript {
    startTime: number;
    endTime: number;
    text: string;
}

export interface AudioUrl {
    male_voice: string;
    female_voice: string;
}

export interface Podcast {
    podcast_id: string;
    publish_date: string;
    title: string;
    script: string;
    timestamp_script: TimestampScript[];
    audio_url: AudioUrl;
    length_seconds: number;
    links: string[];
}

export interface PodcastResponse {
    podcasts: Podcast[];
    total: number;
    page: number;
    pageSize: number;
}

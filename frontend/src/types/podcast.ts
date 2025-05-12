export interface TimestampScript {
    startTime: number;
    endTime: number;
    text: string;
}

export interface AudioUrl {
    male_voice: string;
    female_voice: string;
}

export interface VoiceData {
    male_voice: TimestampScript[] | string;
    female_voice: TimestampScript[] | string;
}

export interface LengthSeconds {
    male_voice: number;
    female_voice: number;
}

export interface Podcast {
    podcast_id: string;
    publish_date: string;
    title: string;
    script: string;
    timestamp_script: VoiceData;
    audio_url: AudioUrl;
    length_seconds: LengthSeconds;
    links: string[];
}

export interface PodcastResponse {
    podcasts: Podcast[];
    total: number;
    page: number;
    pageSize: number;
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PodcastRepository } from './podcast.repository';
import { Podcast } from './entities/podcast.model';
import { PaginatedPodcastsResponseDto } from './dtos/paginated-podcasts-response.dto';
import { PodcastResponseDto } from './dtos/podcast-response.dto';

@Injectable()
export class PodcastsService {
    constructor(private readonly podcastRepository: PodcastRepository) {}

    async getAllPodcasts(
        page: number = 1,
        pageSize: number = 10,
    ): Promise<PaginatedPodcastsResponseDto> {
        const { rows, count } = await this.podcastRepository.findAndCountAll(
            page,
            pageSize,
        );

        return {
            podcasts: this.transformPodcasts(rows),
            total: count,
            page,
            pageSize,
        };
    }

    async getPodcastsBetweenDatesWithPagination(
        startTime: string,
        endTime: string,
        page: number = 1,
        pageSize: number = 10,
    ): Promise<PaginatedPodcastsResponseDto> {
        const startDate = new Date(startTime);
        const endDate = new Date(endTime);

        const { rows, count } = await this.podcastRepository.findByDateRange(
            startDate,
            endDate,
            page,
            pageSize,
        );

        return {
            podcasts: this.transformPodcasts(rows),
            total: count,
            page,
            pageSize,
        };
    }

    async getPodcastById(id: string): Promise<PodcastResponseDto | null> {
        const podcast = await this.podcastRepository.findById(id);

        if (!podcast) {
            throw new NotFoundException(`Podcast with ID ${id} not found`);
        }

        return this.transformPodcast(podcast);
    }

    private transformPodcasts(podcasts: Podcast[]): PodcastResponseDto[] {
        return podcasts.map((podcast) => this.transformPodcast(podcast));
    }

    private transformPodcast(podcast: Podcast): PodcastResponseDto {
        const formattedPodcast = podcast.dataValues;
        return {
            podcast_id: formattedPodcast.podcastId,
            publish_date: formattedPodcast.publishDate
                ? formattedPodcast.publishDate.toISOString()
                : null,
            title: formattedPodcast.title,
            script: formattedPodcast.script,
            timestamp_script: formattedPodcast.timestampScript,
            audio_url: formattedPodcast.audioUrl,
            length_seconds: formattedPodcast.lengthSeconds,
        };
    }
}

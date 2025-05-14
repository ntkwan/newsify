import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PodcastRepository } from './podcast.repository';
import { Podcast } from './entities/podcast.model';
import { PaginatedPodcastsResponseDto } from './dtos/paginated-podcasts-response.dto';
import { PodcastResponseDto } from './dtos/podcast-response.dto';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';

@Injectable()
export class PodcastsService {
    private readonly logger = new Logger(PodcastsService.name);
    private readonly CACHE_EXPIRY = 3600; // 1 hour in seconds

    constructor(
        private readonly podcastRepository: PodcastRepository,
        @InjectRedis() private readonly redisClient: Redis,
    ) {}

    async getAllPodcasts(
        page: number = 1,
        pageSize: number = 10,
    ): Promise<PaginatedPodcastsResponseDto> {
        const cacheKey = `podcasts:all:${page}:${pageSize}`;

        try {
            const cachedData = await this.redisClient.get(cacheKey);

            if (cachedData) {
                this.logger.log(`Cache hit for ${cacheKey}`);
                return JSON.parse(cachedData);
            }

            this.logger.log(
                `Cache miss for ${cacheKey}, fetching from database`,
            );

            const { rows, count } =
                await this.podcastRepository.findAndCountAll(page, pageSize);

            const result = {
                podcasts: this.transformPodcasts(rows),
                total: count,
                page,
                pageSize,
            };

            // Cache the result
            await this.redisClient.set(
                cacheKey,
                JSON.stringify(result),
                'EX',
                this.CACHE_EXPIRY,
            );

            return result;
        } catch (error) {
            this.logger.error(
                `Error fetching podcasts: ${error.message}`,
                error.stack,
            );
            // If cache operation fails, still return data from database
            const { rows, count } =
                await this.podcastRepository.findAndCountAll(page, pageSize);

            return {
                podcasts: this.transformPodcasts(rows),
                total: count,
                page,
                pageSize,
            };
        }
    }

    async getPodcastsBetweenDatesWithPagination(
        startTime: string,
        endTime: string,
        page: number = 1,
        pageSize: number = 10,
    ): Promise<PaginatedPodcastsResponseDto> {
        const cacheKey = `podcasts:daterange:${startTime}:${endTime}:${page}:${pageSize}`;

        try {
            const cachedData = await this.redisClient.get(cacheKey);

            if (cachedData) {
                this.logger.log(`Cache hit for ${cacheKey}`);
                return JSON.parse(cachedData);
            }

            this.logger.log(
                `Cache miss for ${cacheKey}, fetching from database`,
            );

            const startDate = new Date(startTime);
            const endDate = new Date(endTime);

            const { rows, count } =
                await this.podcastRepository.findByDateRange(
                    startDate,
                    endDate,
                    page,
                    pageSize,
                );

            const result = {
                podcasts: this.transformPodcasts(rows),
                total: count,
                page,
                pageSize,
            };

            // Cache the result
            await this.redisClient.set(
                cacheKey,
                JSON.stringify(result),
                'EX',
                this.CACHE_EXPIRY,
            );

            return result;
        } catch (error) {
            this.logger.error(
                `Error fetching podcasts by date range: ${error.message}`,
                error.stack,
            );

            const startDate = new Date(startTime);
            const endDate = new Date(endTime);

            const { rows, count } =
                await this.podcastRepository.findByDateRange(
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
    }

    async getPodcastById(id: string): Promise<PodcastResponseDto | null> {
        const cacheKey = `podcasts:id:${id}`;

        try {
            const cachedData = await this.redisClient.get(cacheKey);

            if (cachedData) {
                this.logger.log(`Cache hit for ${cacheKey}`);
                return JSON.parse(cachedData);
            }

            this.logger.log(
                `Cache miss for ${cacheKey}, fetching from database`,
            );

            // If not in cache, get from database
            const podcast = await this.podcastRepository.findById(id);

            if (!podcast) {
                throw new NotFoundException(`Podcast with ID ${id} not found`);
            }

            const result = this.transformPodcast(podcast);

            // Cache the result
            await this.redisClient.set(
                cacheKey,
                JSON.stringify(result),
                'EX',
                this.CACHE_EXPIRY,
            );

            return result;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }

            this.logger.error(
                `Error fetching podcast ${id}: ${error.message}`,
                error.stack,
            );

            const podcast = await this.podcastRepository.findById(id);

            if (!podcast) {
                throw new NotFoundException(`Podcast with ID ${id} not found`);
            }

            return this.transformPodcast(podcast);
        }
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
            links: formattedPodcast.links,
        };
    }

    async invalidateSinglePodcastCache(id: string): Promise<void> {
        try {
            const cacheKey = `podcasts:id:${id}`;
            await this.redisClient.del(cacheKey);
            this.logger.log(`Invalidated cache for podcast ${id}`);

            // Also invalidate all list caches since they might contain this podcast
            await this.invalidateAllPodcastCaches();
        } catch (error) {
            this.logger.error(
                `Error invalidating podcast cache: ${error.message}`,
                error.stack,
            );
            // Non-critical error, can be ignored as it won't affect functionality
        }
    }

    async invalidateAllPodcastCaches(): Promise<void> {
        try {
            // Get all podcast cache keys
            const allKeys = await this.redisClient.keys('podcasts:*');

            if (allKeys.length > 0) {
                await this.redisClient.del(...allKeys);
                this.logger.log(
                    `Invalidated ${allKeys.length} podcast cache entries`,
                );
            }
        } catch (error) {
            this.logger.error(
                `Error invalidating podcast cache: ${error.message}`,
                error.stack,
            );
        }
    }
}

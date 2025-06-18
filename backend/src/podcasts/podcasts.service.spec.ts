import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Redis } from 'ioredis';
import { PaginatedPodcastsResponseDto } from './dtos/paginated-podcasts-response.dto';
import { PodcastResponseDto } from './dtos/podcast-response.dto';
import { Podcast } from './entities/podcast.model';
import { PodcastRepository } from './podcast.repository';
import { PodcastsService } from './podcasts.service';

describe('PodcastsService', () => {
    let service: PodcastsService;
    let podcastRepository: jest.Mocked<PodcastRepository>;
    let redisClient: jest.Mocked<Redis>;

    const mockPodcast = {
        dataValues: {
            podcastId: '1',
            publishDate: new Date('2023-01-01'),
            title: 'Test Podcast',
            timestampScript: {},
            script: '',
            audioUrl: { value: 'http://example.com/audio.mp3' },
            lengthSeconds: { value: 3600 },
            links: [],
        },
    } as Podcast;

    const mockPodcastResponse: PodcastResponseDto = {
        podcast_id: '1',
        title: 'Test Podcast',
        audio_url: { value: 'http://example.com/audio.mp3' } as any,
        length_seconds: { value: 3600 } as any,
        publish_date: new Date('2023-01-01').toISOString(),
        script: '',
        timestamp_script: {},
        links: [],
    };

    const mockPaginatedResponse: PaginatedPodcastsResponseDto = {
        podcasts: [mockPodcastResponse],
        total: 1,
        page: 1,
        pageSize: 10,
    };

    beforeEach(async () => {
        const mockPodcastRepository = {
            findAndCountAll: jest.fn(),
            findByDateRange: jest.fn(),
            findById: jest.fn(),
        };

        const mockRedisClient = {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            keys: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PodcastsService,
                {
                    provide: PodcastRepository,
                    useValue: mockPodcastRepository,
                },
                {
                    provide: 'default_IORedisModuleConnectionToken',
                    useValue: mockRedisClient,
                },
            ],
        }).compile();

        service = module.get<PodcastsService>(PodcastsService);
        podcastRepository = module.get(PodcastRepository);
        redisClient = module.get('default_IORedisModuleConnectionToken');
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getAllPodcasts', () => {
        it('should return cached data when available', async () => {
            // Arrange
            const cacheKey = 'podcasts:all:1:10';
            redisClient.get.mockResolvedValue(
                JSON.stringify(mockPaginatedResponse),
            );

            // Act
            const result = await service.getAllPodcasts(1, 10);

            // Assert
            expect(redisClient.get).toHaveBeenCalledWith(cacheKey);
            expect(result).toEqual(mockPaginatedResponse);
            expect(podcastRepository.findAndCountAll).not.toHaveBeenCalled();
        });

        it('should fetch from database and cache when cache miss', async () => {
            // Arrange
            const cacheKey = 'podcasts:all:1:10';
            redisClient.get.mockResolvedValue(null);
            podcastRepository.findAndCountAll.mockResolvedValue({
                rows: [mockPodcast],
                count: 1,
            });
            redisClient.set.mockResolvedValue('OK');

            // Act
            const result = await service.getAllPodcasts(1, 10);

            // Assert
            expect(redisClient.get).toHaveBeenCalledWith(cacheKey);
            expect(podcastRepository.findAndCountAll).toHaveBeenCalledWith(
                1,
                10,
            );
            expect(redisClient.set).toHaveBeenCalledWith(
                cacheKey,
                JSON.stringify(result),
                'EX',
                3600,
            );
            expect(result).toEqual(mockPaginatedResponse);
        });

        it('should handle cache errors and fallback to database', async () => {
            // Arrange
            redisClient.get.mockRejectedValue(new Error('Redis error'));
            podcastRepository.findAndCountAll.mockResolvedValue({
                rows: [mockPodcast],
                count: 1,
            });

            // Act
            const result = await service.getAllPodcasts(1, 10);

            // Assert
            expect(podcastRepository.findAndCountAll).toHaveBeenCalledWith(
                1,
                10,
            );
            expect(result).toEqual(mockPaginatedResponse);
        });

        it('should handle repository errors', async () => {
            // Arrange
            redisClient.get.mockResolvedValue(null);
            const error = new Error('Database error');
            podcastRepository.findAndCountAll.mockRejectedValue(error);

            // Act & Assert
            await expect(service.getAllPodcasts(1, 10)).rejects.toThrow(error);
        });
    });

    describe('getPodcastsBetweenDatesWithPagination', () => {
        it('should return cached data when available', async () => {
            // Arrange
            const startTime = '2023-01-01';
            const endTime = '2023-01-31';
            const cacheKey = `podcasts:daterange:${startTime}:${endTime}:1:10`;
            redisClient.get.mockResolvedValue(
                JSON.stringify(mockPaginatedResponse),
            );

            // Act
            const result = await service.getPodcastsBetweenDatesWithPagination(
                startTime,
                endTime,
                1,
                10,
            );

            // Assert
            expect(redisClient.get).toHaveBeenCalledWith(cacheKey);
            expect(result).toEqual(mockPaginatedResponse);
            expect(podcastRepository.findByDateRange).not.toHaveBeenCalled();
        });

        it('should fetch from database and cache when cache miss', async () => {
            // Arrange
            const startTime = '2023-01-01';
            const endTime = '2023-01-31';
            const cacheKey = `podcasts:daterange:${startTime}:${endTime}:1:10`;
            redisClient.get.mockResolvedValue(null);
            podcastRepository.findByDateRange.mockResolvedValue({
                rows: [mockPodcast],
                count: 1,
            });
            redisClient.set.mockResolvedValue('OK');

            // Act
            const result = await service.getPodcastsBetweenDatesWithPagination(
                startTime,
                endTime,
                1,
                10,
            );

            // Assert
            expect(redisClient.get).toHaveBeenCalledWith(cacheKey);
            expect(podcastRepository.findByDateRange).toHaveBeenCalledWith(
                new Date(startTime),
                new Date(endTime),
                1,
                10,
            );
            expect(redisClient.set).toHaveBeenCalledWith(
                cacheKey,
                JSON.stringify(result),
                'EX',
                3600,
            );
            expect(result).toEqual(mockPaginatedResponse);
        });

        it('should handle cache errors and fallback to database', async () => {
            // Arrange
            const startTime = '2023-01-01';
            const endTime = '2023-01-31';
            redisClient.get.mockRejectedValue(new Error('Redis error'));
            podcastRepository.findByDateRange.mockResolvedValue({
                rows: [mockPodcast],
                count: 1,
            });

            // Act
            const result = await service.getPodcastsBetweenDatesWithPagination(
                startTime,
                endTime,
                1,
                10,
            );

            // Assert
            expect(podcastRepository.findByDateRange).toHaveBeenCalled();
            expect(result).toEqual(mockPaginatedResponse);
        });
    });

    describe('getPodcastById', () => {
        it('should return cached podcast when available', async () => {
            // Arrange
            const id = '1';
            const cacheKey = `podcasts:id:${id}`;
            redisClient.get.mockResolvedValue(
                JSON.stringify(mockPodcastResponse),
            );

            // Act
            const result = await service.getPodcastById(id);

            // Assert
            expect(redisClient.get).toHaveBeenCalledWith(cacheKey);
            expect(result).toEqual(mockPodcastResponse);
            expect(podcastRepository.findById).not.toHaveBeenCalled();
        });

        it('should fetch from database and cache when cache miss', async () => {
            // Arrange
            const id = '1';
            const cacheKey = `podcasts:id:${id}`;
            redisClient.get.mockResolvedValue(null);
            podcastRepository.findById.mockResolvedValue(mockPodcast);
            redisClient.set.mockResolvedValue('OK');

            // Act
            const result = await service.getPodcastById(id);

            // Assert
            expect(redisClient.get).toHaveBeenCalledWith(cacheKey);
            expect(podcastRepository.findById).toHaveBeenCalledWith(id);
            expect(redisClient.set).toHaveBeenCalledWith(
                cacheKey,
                JSON.stringify(result),
                'EX',
                3600,
            );
            expect(result).toEqual(mockPodcastResponse);
        });

        it('should throw NotFoundException when podcast not found', async () => {
            // Arrange
            const id = '999';
            redisClient.get.mockResolvedValue(null);
            podcastRepository.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(service.getPodcastById(id)).rejects.toThrow(
                NotFoundException,
            );
            expect(podcastRepository.findById).toHaveBeenCalledWith(id);
        });

        it('should handle cache errors and fallback to database', async () => {
            // Arrange
            const id = '1';
            redisClient.get.mockRejectedValue(new Error('Redis error'));
            podcastRepository.findById.mockResolvedValue(mockPodcast);

            // Act
            const result = await service.getPodcastById(id);

            // Assert
            expect(podcastRepository.findById).toHaveBeenCalledWith(id);
            expect(result).toEqual(mockPodcastResponse);
        });
    });

    describe('invalidateSinglePodcastCache', () => {
        it('should delete single podcast cache', async () => {
            // Arrange
            const id = '1';
            const cacheKey = `podcasts:id:${id}`;
            redisClient.del.mockResolvedValue(1);

            // Act
            await service.invalidateSinglePodcastCache(id);

            // Assert
            expect(redisClient.del).toHaveBeenCalledWith(cacheKey);
        });

        it('should handle cache deletion errors gracefully', async () => {
            // Arrange
            const id = '1';
            redisClient.del.mockRejectedValue(new Error('Redis error'));

            // Act
            await service.invalidateSinglePodcastCache(id);

            // Assert
            expect(redisClient.del).toHaveBeenCalledWith(`podcasts:id:${id}`);
            // The service should not throw an error, it should handle it gracefully
        });
    });

    describe('invalidateAllPodcastCaches', () => {
        it('should delete all podcast caches', async () => {
            // Arrange
            const cacheKeys = [
                'podcasts:all:1:10',
                'podcasts:all:2:10',
                'podcasts:id:1',
                'podcasts:id:2',
                'podcasts:daterange:2023-01-01:2023-01-31:1:10',
            ];
            redisClient.keys.mockResolvedValue(cacheKeys);
            redisClient.del.mockResolvedValue(cacheKeys.length);

            // Act
            await service.invalidateAllPodcastCaches();

            // Assert
            expect(redisClient.keys).toHaveBeenCalledWith('podcasts:*');
            expect(redisClient.del).toHaveBeenCalledWith(...cacheKeys);
        });

        it('should handle when no cache keys found', async () => {
            // Arrange
            redisClient.keys.mockResolvedValue([]);

            // Act
            await service.invalidateAllPodcastCaches();

            // Assert
            expect(redisClient.keys).toHaveBeenCalledWith('podcasts:*');
            expect(redisClient.del).not.toHaveBeenCalled();
        });

        it('should handle cache deletion errors gracefully', async () => {
            // Arrange
            redisClient.keys.mockRejectedValue(new Error('Redis error'));

            // Act
            await service.invalidateAllPodcastCaches();

            // Assert
            expect(redisClient.keys).toHaveBeenCalledWith('podcasts:*');
            // The service should not throw an error, it should handle it gracefully
        });
    });
});

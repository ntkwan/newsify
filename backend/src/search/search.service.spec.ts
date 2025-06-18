import { Client } from '@elastic/elasticsearch';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Article } from '../articles/entities/article.model';
import { SearchService } from './search.service';

// Mock the Elasticsearch client
jest.mock('@elastic/elasticsearch');

describe('SearchService', () => {
    let service: SearchService;
    let mockClient: any;

    const mockConfigService = {
        get: jest.fn(),
    };

    const mockElasticsearchClient = {
        indices: {
            exists: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
        },
        bulk: jest.fn(),
        search: jest.fn(),
        count: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        mockConfigService.get.mockImplementation((key: string) => {
            const config = {
                ELS_IP: 'http://localhost:9200',
                ELS_USERNAME: 'elastic',
                ELS_PASSWORD: 'password',
            };
            return config[key];
        });

        (Client as jest.MockedClass<typeof Client>).mockImplementation(
            () => mockElasticsearchClient as any,
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SearchService,
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();

        service = module.get<SearchService>(SearchService);
        mockClient = service['client'];
    });

    describe('createIndex', () => {
        it('should create index successfully when it does not exist', async () => {
            // Arrange
            const error = { statusCode: 404 };
            mockClient.indices.exists.mockRejectedValue(error);
            mockClient.indices.create.mockResolvedValue({});

            // Act
            await service.createIndex();

            // Assert
            expect(mockClient.indices.exists).toHaveBeenCalledWith({
                index: 'title',
            });
            expect(mockClient.indices.create).toHaveBeenCalledWith({
                index: 'title',
                body: expect.objectContaining({
                    settings: expect.any(Object),
                    mappings: expect.any(Object),
                }),
            });
        });

        it('should not create index when it already exists', async () => {
            // Arrange
            mockClient.indices.exists.mockResolvedValue({});

            // Act
            await service.createIndex();

            // Assert
            expect(mockClient.indices.exists).toHaveBeenCalledWith({
                index: 'title',
            });
            expect(mockClient.indices.create).not.toHaveBeenCalled();
        });

        it('should throw error when non-404 error occurs during exists check', async () => {
            // Arrange
            const error = new Error('Server error');
            error['statusCode'] = 500;
            mockClient.indices.exists.mockRejectedValue(error);

            // Act & Assert
            await expect(service.createIndex()).rejects.toThrow(error);
        });

        it('should throw error when index creation fails', async () => {
            // Arrange
            const error = { statusCode: 404 };
            const createError = new Error('Creation failed');
            mockClient.indices.exists.mockRejectedValue(error);
            mockClient.indices.create.mockRejectedValue(createError);

            // Act & Assert
            await expect(service.createIndex()).rejects.toThrow(createError);
        });
    });

    describe('bulkIndexArticles', () => {
        it('should bulk index articles successfully', async () => {
            // Arrange
            const mockArticles: Article[] = [
                {
                    dataValues: {
                        trendingId: '1',
                        articleId: 'article1',
                        title: 'Test Article',
                        content: 'Test content',
                        summary: 'Test summary',
                        mainCategory: 'Technology',
                        categories: ['Tech', 'News'],
                        publishDate: new Date(),
                        url: 'http://example.com',
                        imageUrl: 'http://example.com/image.jpg',
                        similarityScore: 0.8,
                    },
                } as any,
            ];

            mockClient.bulk.mockResolvedValue({
                body: { errors: false, items: [] },
            });

            // Act
            await service.bulkIndexArticles(mockArticles);

            // Assert
            expect(mockClient.bulk).toHaveBeenCalledWith({
                body: expect.arrayContaining([
                    { index: { _index: 'title', _id: '1' } },
                    expect.objectContaining({
                        trendingId: '1',
                        articleId: 'article1',
                        title: 'Test Article',
                    }),
                ]),
                refresh: true,
            });
        });

        it('should handle empty articles array', async () => {
            // Act
            await service.bulkIndexArticles([]);

            // Assert
            expect(mockClient.bulk).not.toHaveBeenCalled();
        });

        it('should handle bulk indexing errors', async () => {
            // Arrange
            const mockArticles: Article[] = [
                {
                    dataValues: {
                        trendingId: '1',
                        articleId: 'article1',
                        title: 'Test Article',
                        content: 'Test content',
                        summary: 'Test summary',
                        mainCategory: 'Technology',
                        categories: ['Tech'],
                        publishDate: new Date(),
                        url: 'http://example.com',
                        imageUrl: 'http://example.com/image.jpg',
                        similarityScore: 0.8,
                    },
                } as any,
            ];

            mockClient.bulk.mockResolvedValue({
                body: {
                    errors: true,
                    items: [
                        {
                            index: {
                                error: { reason: 'Document already exists' },
                            },
                        },
                    ],
                },
            });

            // Act
            await service.bulkIndexArticles(mockArticles);

            // Assert
            expect(mockClient.bulk).toHaveBeenCalled();
        });

        it('should throw error when bulk operation fails', async () => {
            // Arrange
            const mockArticles: Article[] = [
                {
                    dataValues: {
                        trendingId: '1',
                        articleId: 'article1',
                        title: 'Test Article',
                        content: 'Test content',
                        summary: 'Test summary',
                        mainCategory: 'Technology',
                        categories: ['Tech'],
                        publishDate: new Date(),
                        url: 'http://example.com',
                        imageUrl: 'http://example.com/image.jpg',
                        similarityScore: 0.8,
                    },
                } as any,
            ];

            const error = new Error('Bulk operation failed');
            mockClient.bulk.mockRejectedValue(error);

            // Act & Assert
            await expect(
                service.bulkIndexArticles(mockArticles),
            ).rejects.toThrow(error);
        });
    });

    describe('searchArticles', () => {
        it('should search articles successfully', async () => {
            // Arrange
            const query = 'test query';
            const page = 1;
            const size = 10;

            mockClient.count.mockResolvedValue({
                body: { count: 100 },
            });

            mockClient.search.mockResolvedValue({
                body: {
                    hits: {
                        total: { value: 50 },
                        hits: [
                            {
                                _source: {
                                    trendingId: '1',
                                    articleId: 'article1',
                                    title: 'Test Article',
                                    content: 'Test content',
                                    summary: 'Test summary',
                                    mainCategory: 'Technology',
                                    categories: ['Tech'],
                                    publishDate: '2023-01-01',
                                    url: 'http://example.com',
                                    imageUrl: 'http://example.com/image.jpg',
                                    similarityScore: 0.8,
                                },
                            },
                        ],
                    },
                },
            });

            // Act
            const result = await service.searchArticles(query, page, size);

            // Assert
            expect(mockClient.count).toHaveBeenCalledWith({
                index: 'title',
            });
            expect(mockClient.search).toHaveBeenCalledWith({
                index: 'title',
                body: expect.objectContaining({
                    from: 0,
                    size: 10,
                    query: expect.objectContaining({
                        multi_match: expect.objectContaining({
                            query: 'test query',
                            fields: ['title^3', 'summary^2', 'content'],
                        }),
                    }),
                }),
            });
            expect(result).toEqual(
                expect.objectContaining({
                    articles: expect.any(Array),
                    total: 50,
                    page: 1,
                    pageSize: 10,
                }),
            );
        });

        it('should return empty results when index is empty', async () => {
            // Arrange
            mockClient.count.mockResolvedValue({
                body: { count: 0 },
            });

            // Act
            const result = await service.searchArticles('test', 1, 10);

            // Assert
            expect(mockClient.search).not.toHaveBeenCalled();
            expect(result).toEqual({
                articles: [],
                total: 0,
                page: 1,
                pageSize: 10,
            });
        });

        it('should handle search errors', async () => {
            // Arrange
            const error = new Error('Search failed');
            mockClient.count.mockResolvedValue({
                body: { count: 100 },
            });
            mockClient.search.mockRejectedValue(error);

            // Act & Assert
            await expect(service.searchArticles('test', 1, 10)).rejects.toThrow(
                error,
            );
        });
    });

    describe('deleteIndex', () => {
        it('should delete index successfully', async () => {
            // Arrange
            mockClient.indices.exists.mockResolvedValue({});
            mockClient.indices.delete.mockResolvedValue({});

            // Act
            await service.deleteIndex();

            // Assert
            expect(mockClient.indices.exists).toHaveBeenCalledWith({
                index: 'title',
            });
            expect(mockClient.indices.delete).toHaveBeenCalledWith({
                index: 'title',
            });
        });

        it('should handle index not existing gracefully', async () => {
            // Arrange
            const error = { statusCode: 404 };
            mockClient.indices.exists.mockRejectedValue(error);

            // Act
            await service.deleteIndex();

            // Assert
            expect(mockClient.indices.exists).toHaveBeenCalledWith({
                index: 'title',
            });
            expect(mockClient.indices.delete).not.toHaveBeenCalled();
        });

        it('should throw error when delete fails', async () => {
            // Arrange
            const error = new Error('Delete failed');
            mockClient.indices.exists.mockResolvedValue({});
            mockClient.indices.delete.mockRejectedValue(error);

            // Act & Assert
            await expect(service.deleteIndex()).rejects.toThrow(error);
        });
    });

    describe('countDocuments', () => {
        it('should return document count', async () => {
            // Arrange
            mockClient.count.mockResolvedValue({
                body: { count: 150 },
            });

            // Act
            const result = await service.countDocuments();

            // Assert
            expect(mockClient.count).toHaveBeenCalledWith({
                index: 'title',
            });
            expect(result).toBe(150);
        });

        it('should return 0 when count fails', async () => {
            // Arrange
            const error = new Error('Count failed');
            mockClient.count.mockRejectedValue(error);

            // Act
            const result = await service.countDocuments();

            // Assert
            expect(mockClient.count).toHaveBeenCalledWith({
                index: 'title',
            });
            expect(result).toBe(0);
        });
    });
});

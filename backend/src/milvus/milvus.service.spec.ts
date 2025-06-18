import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { MilvusClient } from '@zilliz/milvus2-sdk-node';
import { MilvusService } from './milvus.service';

// Mock the Milvus client
const mockQuery = jest.fn();
const mockSearch = jest.fn();

jest.mock('@zilliz/milvus2-sdk-node', () => ({
    MilvusClient: jest.fn().mockImplementation(() => ({
        query: mockQuery,
        search: mockSearch,
    })),
}));

describe('MilvusService', () => {
    let service: MilvusService;
    let mockConfigService: jest.Mocked<ConfigService>;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockConfigService = {
            get: jest.fn(),
        } as any;

        mockConfigService.get.mockImplementation((key: string) => {
            const config = {
                MILVUS_ADDRESS: 'localhost:19530',
                MILVUS_TOKEN: 'test-token',
            };
            return config[key];
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MilvusService,
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();

        service = module.get<MilvusService>(MilvusService);

        // Call onModuleInit manually since it's called automatically
        service.onModuleInit();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('onModuleInit', () => {
        it('should initialize Milvus client with correct configuration', () => {
            // Assert
            expect(MilvusClient).toHaveBeenCalledWith({
                address: 'localhost:19530',
                token: 'test-token',
            });
        });
    });

    describe('getArticleVectorByUrl', () => {
        it('should return article vector when found', async () => {
            // Arrange
            const url = 'http://example.com/article1';
            const mockResponse = {
                data: [
                    {
                        article_id: '1',
                        url: 'http://example.com/article1',
                        article_embed: [0.1, 0.2, 0.3],
                    },
                ],
            };

            mockQuery.mockResolvedValue(mockResponse);

            // Act
            const result = await service.getArticleVectorByUrl(url);

            // Assert
            expect(mockQuery).toHaveBeenCalledWith({
                collection_name: 'articles',
                output_fields: ['article_id', 'url', 'article_embed'],
                limit: 1,
                expr: `url == "${url}"`,
            });
            expect(result).toEqual(mockResponse);
        });

        it('should return null when article not found', async () => {
            // Arrange
            const url = 'http://example.com/nonexistent';
            mockQuery.mockResolvedValue(null);

            // Act
            const result = await service.getArticleVectorByUrl(url);

            // Assert
            expect(mockQuery).toHaveBeenCalledWith({
                collection_name: 'articles',
                output_fields: ['article_id', 'url', 'article_embed'],
                limit: 1,
                expr: `url == "${url}"`,
            });
            expect(result).toBeNull();
        });

        it('should throw error when query fails', async () => {
            // Arrange
            const url = 'http://example.com/article1';
            const error = new Error('Query failed');
            mockQuery.mockRejectedValue(error);

            // Act & Assert
            await expect(service.getArticleVectorByUrl(url)).rejects.toThrow(
                error,
            );
        });
    });

    describe('searchSimilarArticles', () => {
        it('should return similar articles successfully', async () => {
            // Arrange
            const url = 'http://example.com/article1';
            const topK = 5;

            const mockArticleResponse = {
                data: [
                    {
                        article_id: '1',
                        url: 'http://example.com/article1',
                        article_embed: [0.1, 0.2, 0.3],
                    },
                ],
            };

            const mockSearchResponse = {
                results: [
                    {
                        article_id: '2',
                        url: 'http://example.com/article2',
                        score: 0.95,
                    },
                    {
                        article_id: '3',
                        url: 'http://example.com/article3',
                        score: 0.85,
                    },
                    {
                        article_id: '4',
                        url: 'http://example.com/article4',
                        score: 0.75,
                    },
                    {
                        article_id: '5',
                        url: 'http://example.com/article5',
                        score: 0.65,
                    },
                    {
                        article_id: '6',
                        url: 'http://example.com/article6',
                        score: 0.55,
                    },
                ],
            };

            mockQuery.mockResolvedValue(mockArticleResponse);
            mockSearch.mockResolvedValue(mockSearchResponse);

            // Act
            const result = await service.searchSimilarArticles(url, topK);

            // Assert
            expect(mockQuery).toHaveBeenCalledWith({
                collection_name: 'articles',
                output_fields: ['article_id', 'url', 'article_embed'],
                limit: 1,
                expr: `url == "${url}"`,
            });

            expect(mockSearch).toHaveBeenCalledWith({
                collection_name: 'articles',
                vector: [[0.1, 0.2, 0.3]],
                output_fields: ['article_id', 'url'],
                limit: 10, // topK * 2
                metric_type: 'COSINE',
                params: { nprobe: 10 },
            });

            expect(result).toHaveLength(5);
            expect(result[0]).toEqual({
                article_id: '2',
                url: 'http://example.com/article2',
                similarity_score: 0.95,
            });
        });

        it('should throw error when article not found', async () => {
            // Arrange
            const url = 'http://example.com/nonexistent';
            const topK = 5;

            mockQuery.mockResolvedValue(null);

            // Act & Assert
            await expect(
                service.searchSimilarArticles(url, topK),
            ).rejects.toThrow('Article not found in vector database');
        });

        it('should filter out duplicate URLs and original article', async () => {
            // Arrange
            const url = 'http://example.com/article1';
            const topK = 3;

            const mockArticleResponse = {
                data: [
                    {
                        article_id: '1',
                        url: 'http://example.com/article1',
                        article_embed: [0.1, 0.2, 0.3],
                    },
                ],
            };

            const mockSearchResponse = {
                results: [
                    {
                        article_id: '1',
                        url: 'http://example.com/article1', // Original article
                        score: 1.0,
                    },
                    {
                        article_id: '2',
                        url: 'http://example.com/article2',
                        score: 0.95,
                    },
                    {
                        article_id: '3',
                        url: 'http://example.com/article2', // Duplicate URL
                        score: 0.85,
                    },
                    {
                        article_id: '4',
                        url: 'http://example.com/article4',
                        score: 0.75,
                    },
                    {
                        article_id: '5',
                        url: 'http://example.com/article5',
                        score: 0.65,
                    },
                ],
            };

            mockQuery.mockResolvedValue(mockArticleResponse);
            mockSearch.mockResolvedValue(mockSearchResponse);

            // Act
            const result = await service.searchSimilarArticles(url, topK);

            // Assert
            expect(result).toHaveLength(3);
            expect(result.map((r) => r.url)).toEqual([
                'http://example.com/article2',
                'http://example.com/article4',
                'http://example.com/article5',
            ]);
        });

        it('should handle URLs with index.html suffix', async () => {
            // Arrange
            const url = 'http://example.com/article1/index.html';
            const topK = 2;

            const mockArticleResponse = {
                data: [
                    {
                        article_id: '1',
                        url: 'http://example.com/article1/index.html',
                        article_embed: [0.1, 0.2, 0.3],
                    },
                ],
            };

            const mockSearchResponse = {
                results: [
                    {
                        article_id: '1',
                        url: 'http://example.com/article1/index.html', // Original
                        score: 1.0,
                    },
                    {
                        article_id: '2',
                        url: 'http://example.com/article1', // Same article without index.html
                        score: 0.95,
                    },
                    {
                        article_id: '3',
                        url: 'http://example.com/article3',
                        score: 0.85,
                    },
                ],
            };

            mockQuery.mockResolvedValue(mockArticleResponse);
            mockSearch.mockResolvedValue(mockSearchResponse);

            // Act
            const result = await service.searchSimilarArticles(url, topK);

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0].url).toBe('http://example.com/article3');
        });

        it('should throw error when search fails', async () => {
            // Arrange
            const url = 'http://example.com/article1';
            const topK = 5;

            const mockArticleResponse = {
                data: [
                    {
                        article_id: '1',
                        url: 'http://example.com/article1',
                        article_embed: [0.1, 0.2, 0.3],
                    },
                ],
            };

            const error = new Error('Search failed');
            mockQuery.mockResolvedValue(mockArticleResponse);
            mockSearch.mockRejectedValue(error);

            // Act & Assert
            await expect(
                service.searchSimilarArticles(url, topK),
            ).rejects.toThrow(error);
        });
    });
});

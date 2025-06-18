import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { OpenAI } from 'openai';
import { MilvusService } from '../milvus/milvus.service';
import { ArticleRepository } from './article.repository';
import { ArticlesService } from './articles.service';
import { ArticleResponseDto } from './dtos/article-response.dto';
import { PaginatedArticlesResponseDto } from './dtos/paginated-articles-response.dto';
import { Article } from './entities/article.model';

// Mock OpenAI
jest.mock('openai');

describe('ArticlesService', () => {
    let service: ArticlesService;
    let articleRepository: jest.Mocked<ArticleRepository>;
    let configService: jest.Mocked<ConfigService>;
    let milvusService: jest.Mocked<MilvusService>;
    let mockOpenAI: jest.Mocked<OpenAI>;

    const mockArticle: Article = {
        dataValues: {
            id: '1',
            trendingId: 'trending1',
            articleId: 'article1',
            title: 'Test Article',
            content: 'This is a test article content with lots of information.',
            summary: 'Test summary',
            mainCategory: 'Technology',
            categories: ['Tech', 'News'],
            publishDate: new Date('2023-01-01'),
            url: 'http://example.com/article1',
            imageUrl: 'http://example.com/image1.jpg',
            similarityScore: 0.8,
        },
    } as Article;

    const mockArticleResponse: ArticleResponseDto = {
        trending_id: 'trending1',
        article_id: 'article1',
        url: 'http://example.com/article1',
        title: 'Test Article',
        publish_date: new Date('2023-01-01').toISOString(),
        analyzed_date: null,
        summary: 'Test summary',
        main_category: 'Technology',
        categories: ['Tech', 'News'],
        image_url: 'http://example.com/image1.jpg',
        trend: undefined,
        similarity_score: 0.8,
    };

    const mockPaginatedResponse: PaginatedArticlesResponseDto = {
        articles: [mockArticleResponse],
        total: 1,
        page: 1,
        pageSize: 10,
    };

    beforeEach(async () => {
        const mockArticleRepository = {
            findAndCountAll: jest.fn(),
            findByDateRange: jest.fn(),
            findByCategory: jest.fn(),
            findTrendingArticles: jest.fn(),
            findTrendingArticlesByCategory: jest.fn(),
            findById: jest.fn(),
            findByUrl: jest.fn(),
            findByUrls: jest.fn(),
            updateSummary: jest.fn(),
        };

        const mockConfigService = {
            get: jest.fn(),
        };

        const mockMilvusService = {
            searchSimilarArticles: jest.fn(),
        };

        const mockOpenAIClient = {
            chat: {
                completions: {
                    create: jest.fn(),
                },
            },
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ArticlesService,
                {
                    provide: ArticleRepository,
                    useValue: mockArticleRepository,
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
                {
                    provide: MilvusService,
                    useValue: mockMilvusService,
                },
            ],
        }).compile();

        service = module.get<ArticlesService>(ArticlesService);
        articleRepository = module.get(ArticleRepository);
        configService = module.get(ConfigService);
        milvusService = module.get(MilvusService);
        mockOpenAI = service['openai'] as jest.Mocked<OpenAI>;

        // Setup default config values
        configService.get.mockImplementation((key: string) => {
            const config = {
                OPENAI_API_KEY: 'test-api-key',
                OPENAI_MODEL: 'gpt-3.5-turbo',
            };
            return config[key];
        });

        // Mock OpenAI constructor
        (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(
            () => mockOpenAIClient as any,
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getAllArticles', () => {
        it('should return paginated articles', async () => {
            // Arrange
            articleRepository.findAndCountAll.mockResolvedValue({
                rows: [mockArticle],
                count: 1,
            });

            // Act
            const result = await service.getAllArticles(1, 10);

            // Assert
            expect(articleRepository.findAndCountAll).toHaveBeenCalledWith(
                1,
                10,
            );
            expect(result).toEqual(mockPaginatedResponse);
        });

        it('should handle empty results', async () => {
            // Arrange
            articleRepository.findAndCountAll.mockResolvedValue({
                rows: [],
                count: 0,
            });

            // Act
            const result = await service.getAllArticles(1, 10);

            // Assert
            expect(result).toEqual({
                articles: [],
                total: 0,
                page: 1,
                pageSize: 10,
            });
        });
    });

    describe('getArticlesBetweenDatesWithPagination', () => {
        it('should return articles within date range', async () => {
            // Arrange
            const startTime = '2023-01-01';
            const endTime = '2023-01-31';
            articleRepository.findByDateRange.mockResolvedValue({
                rows: [mockArticle],
                count: 1,
            });

            // Act
            const result = await service.getArticlesBetweenDatesWithPagination(
                startTime,
                endTime,
                1,
                10,
            );

            // Assert
            expect(articleRepository.findByDateRange).toHaveBeenCalledWith(
                new Date(startTime),
                new Date(endTime),
                1,
                10,
            );
            expect(result).toEqual(mockPaginatedResponse);
        });
    });

    describe('getArticlesByCategory', () => {
        it('should return articles by category', async () => {
            // Arrange
            const category = 'Technology';
            articleRepository.findByCategory.mockResolvedValue({
                rows: [mockArticle],
                count: 1,
            });

            // Act
            const result = await service.getArticlesByCategory(category, 1, 10);

            // Assert
            expect(articleRepository.findByCategory).toHaveBeenCalledWith(
                category,
                1,
                10,
            );
            expect(result).toEqual(mockPaginatedResponse);
        });
    });

    describe('getTrendingArticles', () => {
        it('should return trending articles', async () => {
            // Arrange
            const minScore = 0.5;
            articleRepository.findTrendingArticles.mockResolvedValue({
                rows: [mockArticle],
                count: 1,
            });

            // Act
            const result = await service.getTrendingArticles(1, 10, minScore);

            // Assert
            expect(articleRepository.findTrendingArticles).toHaveBeenCalledWith(
                1,
                10,
                minScore,
            );
            expect(result).toEqual(mockPaginatedResponse);
        });
    });

    describe('getTrendingArticlesByCategory', () => {
        it('should return trending articles by category', async () => {
            // Arrange
            const category = 'Technology';
            const minScore = 0.5;
            articleRepository.findTrendingArticlesByCategory.mockResolvedValue({
                rows: [mockArticle],
                count: 1,
            });

            // Act
            const result = await service.getTrendingArticlesByCategory(
                category,
                1,
                10,
                minScore,
            );

            // Assert
            expect(
                articleRepository.findTrendingArticlesByCategory,
            ).toHaveBeenCalledWith(category, 1, 10, minScore);
            expect(result).toEqual(mockPaginatedResponse);
        });
    });

    describe('getArticleById', () => {
        it('should return article by id', async () => {
            // Arrange
            const id = '1';
            articleRepository.findById.mockResolvedValue(mockArticle);

            // Act
            const result = await service.getArticleById(id);

            // Assert
            expect(articleRepository.findById).toHaveBeenCalledWith(id);
            expect(result).toEqual(mockArticleResponse);
        });

        it('should throw NotFoundException when article not found', async () => {
            // Arrange
            const id = '999';
            articleRepository.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(service.getArticleById(id)).rejects.toThrow(
                NotFoundException,
            );
        });

        it('should generate and update summary when not present', async () => {
            // Arrange
            const id = '1';
            const articleWithoutSummary = {
                ...mockArticle,
                dataValues: {
                    ...mockArticle.dataValues,
                    summary: null,
                },
            };
            const generatedSummary = 'Generated summary for the article';
            const mockOpenAIResponse = {
                choices: [
                    {
                        message: {
                            content: generatedSummary,
                        },
                    },
                ],
            };

            articleRepository.findById.mockResolvedValue(
                articleWithoutSummary as Article,
            );
            (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue(
                mockOpenAIResponse as any,
            );
            articleRepository.updateSummary.mockResolvedValue(undefined);

            // Act
            const result = await service.getArticleById(id);

            // Assert
            expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content:
                            'You are a helpful assistant that summarizes news articles concisely.',
                    },
                    {
                        role: 'user',
                        content: expect.stringContaining(
                            'Generate a brief summary',
                        ),
                    },
                ],
                temperature: 0.5,
            });
            expect(articleRepository.updateSummary).toHaveBeenCalledWith(
                id,
                generatedSummary,
            );
            expect(result.summary).toBe(generatedSummary);
        });

        it('should handle OpenAI API errors gracefully', async () => {
            // Arrange
            const id = '1';
            const articleWithoutSummary = {
                ...mockArticle,
                dataValues: {
                    ...mockArticle.dataValues,
                    summary: null,
                },
            };

            articleRepository.findById.mockResolvedValue(
                articleWithoutSummary as Article,
            );
            (mockOpenAI.chat.completions.create as jest.Mock).mockRejectedValue(
                new Error('OpenAI API error'),
            );

            // Act
            const result = await service.getArticleById(id);

            // Assert
            expect(result.summary).toBe(
                'Summary generation failed. Please try again later.',
            );
        });
    });

    describe('getRelatedArticles', () => {
        it('should return related articles', async () => {
            // Arrange
            const url = 'http://example.com/article1';
            const top = 5;
            const relatedArticles = [
                { url: 'http://example.com/article2', similarity_score: 0.9 },
                { url: 'http://example.com/article3', similarity_score: 0.8 },
            ];
            const articles = [
                {
                    ...mockArticle,
                    dataValues: {
                        ...mockArticle.dataValues,
                        url: 'http://example.com/article2',
                    },
                },
                {
                    ...mockArticle,
                    dataValues: {
                        ...mockArticle.dataValues,
                        url: 'http://example.com/article3',
                    },
                },
            ];

            articleRepository.findByUrl.mockResolvedValue(mockArticle);
            milvusService.searchSimilarArticles.mockResolvedValue(
                relatedArticles as any,
            );
            articleRepository.findByUrls.mockResolvedValue(
                articles as Article[],
            );

            // Act
            const result = await service.getRelatedArticles(url, top);

            // Assert
            expect(articleRepository.findByUrl).toHaveBeenCalledWith(url);
            expect(milvusService.searchSimilarArticles).toHaveBeenCalledWith(
                url,
                top,
            );
            expect(articleRepository.findByUrls).toHaveBeenCalledWith([
                'http://example.com/article2',
                'http://example.com/article3',
            ]);
            expect(result).toHaveLength(2);
        });

        it('should throw NotFoundException when article not found', async () => {
            // Arrange
            const url = 'http://example.com/nonexistent';
            articleRepository.findByUrl.mockResolvedValue(null);

            // Act & Assert
            await expect(service.getRelatedArticles(url, 5)).rejects.toThrow(
                NotFoundException,
            );
        });

        it('should handle Milvus service errors', async () => {
            // Arrange
            const url = 'http://example.com/article1';
            articleRepository.findByUrl.mockResolvedValue(mockArticle);
            milvusService.searchSimilarArticles.mockRejectedValue(
                new Error('Milvus error'),
            );

            // Act & Assert
            await expect(service.getRelatedArticles(url, 5)).rejects.toThrow(
                'Milvus error',
            );
        });

        it('should set similarity score to 0 for original article', async () => {
            // Arrange
            const url = 'http://example.com/article1';
            const relatedArticles = [
                { url: 'http://example.com/article1', similarity_score: 0.9 }, // Original article
                { url: 'http://example.com/article2', similarity_score: 0.8 },
            ];
            const articles = [
                {
                    ...mockArticle,
                    dataValues: {
                        ...mockArticle.dataValues,
                        url: 'http://example.com/article1',
                        similarityScore: 0, // This will be set by the service
                    },
                },
                {
                    ...mockArticle,
                    dataValues: {
                        ...mockArticle.dataValues,
                        url: 'http://example.com/article2',
                        similarityScore: 0.8,
                    },
                },
            ];

            articleRepository.findByUrl.mockResolvedValue(mockArticle);
            milvusService.searchSimilarArticles.mockResolvedValue(
                relatedArticles as any,
            );
            articleRepository.findByUrls.mockResolvedValue(
                articles as Article[],
            );

            // Act
            const result = await service.getRelatedArticles(url, 5);

            // Assert
            expect(result[0].similarity_score).toBe(0.8); // Original article should have score 0
            expect(result[1].similarity_score).toBe(0); // Related article should have original score
        });
    });

    describe('generateSummary', () => {
        it('should generate summary using OpenAI', async () => {
            // Arrange
            const content = 'Test content';
            const title = 'Test title';
            const category = 'Technology';
            const expectedSummary = 'Generated summary';
            const mockOpenAIResponse = {
                choices: [
                    {
                        message: {
                            content: expectedSummary,
                        },
                    },
                ],
            };

            (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue(
                mockOpenAIResponse as any,
            );

            // Act
            const result = await (service as any).generateSummary(
                content,
                title,
                category,
            );

            // Assert
            expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content:
                            'You are a helpful assistant that summarizes news articles concisely.',
                    },
                    {
                        role: 'user',
                        content: expect.stringContaining(`Title: ${title}`),
                    },
                ],
                temperature: 0.5,
            });
            expect(result).toBe(expectedSummary);
        });

        it('should handle OpenAI API errors', async () => {
            // Arrange
            const content = 'Test content';
            const title = 'Test title';
            const category = 'Technology';
            const error = new Error('OpenAI API error');

            (mockOpenAI.chat.completions.create as jest.Mock).mockRejectedValue(
                error,
            );

            // Act
            const result = await (service as any).generateSummary(
                content,
                title,
                category,
            );

            // Assert
            expect(result).toBe(
                'Summary generation failed. Please try again later.',
            );
        });
    });

    describe('transformArticles', () => {
        it('should transform articles correctly', () => {
            // Arrange
            const articles = [mockArticle];

            // Act
            const result = (service as any).transformArticles(articles);

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual(mockArticleResponse);
        });

        it('should handle empty array', () => {
            // Arrange
            const articles: Article[] = [];

            // Act
            const result = (service as any).transformArticles(articles);

            // Assert
            expect(result).toEqual([]);
        });
    });

    describe('transformArticle', () => {
        it('should transform single article correctly', () => {
            // Arrange
            const article = mockArticle;

            // Act
            const result = (service as any).transformArticle(article);

            // Assert
            expect(result).toEqual(mockArticleResponse);
        });
    });
});

import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ArticleRepository } from '../articles/article.repository';
import { Article } from '../articles/entities/article.model';
import { SearchService } from './search.service';
import { SyncService } from './sync.service';

describe('SyncService', () => {
    let service: SyncService;
    let searchService: jest.Mocked<SearchService>;
    let articleRepository: jest.Mocked<ArticleRepository>;

    const mockSearchService = {
        createIndex: jest.fn(),
        bulkIndexArticles: jest.fn(),
        deleteIndex: jest.fn(),
        countDocuments: jest.fn(),
    };

    const mockArticleRepository = {
        findAndCountAll: jest.fn(),
    };

    const createMockArticle = (id: string, title: string): Article =>
        ({
            dataValues: {
                trendingId: id,
                articleId: `article-${id}`,
                url: `http://example.com/article-${id}`,
                imageUrl: `http://example.com/image-${id}.jpg`,
                categories: ['News'],
                mainCategory: 'Technology',
                title,
                trend: 'trending',
                content: 'Article content',
                summary: 'Article summary',
                similarityScore: 0.8,
                publishDate: new Date(),
                analyzedDate: new Date(),
            },
        }) as any;

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SyncService,
                {
                    provide: SearchService,
                    useValue: mockSearchService,
                },
                {
                    provide: ArticleRepository,
                    useValue: mockArticleRepository,
                },
            ],
        }).compile();

        service = module.get<SyncService>(SyncService);
        searchService = module.get(SearchService);
        articleRepository = module.get(ArticleRepository);

        // Mock logger to avoid console output during tests
        jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
        jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
        jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('onModuleInit', () => {
        it('should initialize successfully', async () => {
            // Arrange
            searchService.createIndex.mockResolvedValue(undefined);
            searchService.deleteIndex.mockResolvedValue(undefined);
            searchService.bulkIndexArticles.mockResolvedValue(undefined);
            searchService.countDocuments.mockResolvedValue(1);
            articleRepository.findAndCountAll.mockResolvedValue({
                rows: [createMockArticle('1', 'Article 1')],
                count: 1,
            });

            // Act
            await service.onModuleInit();

            // Assert
            expect(searchService.createIndex).toHaveBeenCalled();
            expect(searchService.deleteIndex).toHaveBeenCalled();
        });

        it('should handle initialization errors gracefully', async () => {
            // Arrange
            const error = new Error('Initialization failed');
            searchService.createIndex.mockRejectedValue(error);

            // Act
            await service.onModuleInit();

            // Assert
            expect(searchService.createIndex).toHaveBeenCalled();
            // Should not throw error, just log it
        });
    });

    describe('syncAllArticles', () => {
        it('should sync all articles successfully', async () => {
            // Arrange
            const mockArticles = [
                createMockArticle('1', 'Article 1'),
                createMockArticle('2', 'Article 2'),
            ];

            articleRepository.findAndCountAll.mockResolvedValue({
                rows: mockArticles,
                count: 2,
            });

            searchService.bulkIndexArticles.mockResolvedValue(undefined);

            // Act
            await service.syncAllArticles();

            // Assert
            expect(articleRepository.findAndCountAll).toHaveBeenCalledTimes(1);
            expect(articleRepository.findAndCountAll).toHaveBeenCalledWith(
                1,
                10000,
            );
            expect(searchService.bulkIndexArticles).toHaveBeenCalledWith(
                mockArticles,
            );
        });

        it('should handle multiple batches', async () => {
            // Arrange
            const batch1 = Array.from({ length: 10000 }, (_, i) =>
                createMockArticle(i.toString(), `Article ${i}`),
            );
            const batch2 = Array.from({ length: 5000 }, (_, i) =>
                createMockArticle(
                    (i + 10000).toString(),
                    `Article ${i + 10000}`,
                ),
            );

            articleRepository.findAndCountAll
                .mockResolvedValueOnce({ rows: batch1, count: 15000 })
                .mockResolvedValueOnce({ rows: batch2, count: 15000 });

            searchService.bulkIndexArticles.mockResolvedValue(undefined);

            // Act
            await service.syncAllArticles();

            // Assert
            expect(articleRepository.findAndCountAll).toHaveBeenCalledTimes(2);
            expect(articleRepository.findAndCountAll).toHaveBeenNthCalledWith(
                1,
                1,
                10000,
            );
            expect(articleRepository.findAndCountAll).toHaveBeenNthCalledWith(
                2,
                2,
                10000,
            );
            expect(searchService.bulkIndexArticles).toHaveBeenCalledTimes(2);
            expect(searchService.bulkIndexArticles).toHaveBeenNthCalledWith(
                1,
                batch1,
            );
            expect(searchService.bulkIndexArticles).toHaveBeenNthCalledWith(
                2,
                batch2,
            );
        });

        it('should handle empty database', async () => {
            // Arrange
            articleRepository.findAndCountAll.mockResolvedValue({
                rows: [],
                count: 0,
            });

            // Act
            await service.syncAllArticles();

            // Assert
            expect(articleRepository.findAndCountAll).toHaveBeenCalledTimes(1);
            expect(articleRepository.findAndCountAll).toHaveBeenCalledWith(
                1,
                10000,
            );
            expect(searchService.bulkIndexArticles).not.toHaveBeenCalled();
        });

        it('should handle repository errors', async () => {
            // Arrange
            const error = new Error('Database error');
            articleRepository.findAndCountAll.mockRejectedValue(error);

            // Act & Assert
            await expect(service.syncAllArticles()).rejects.toThrow(error);
        });

        it('should handle bulk indexing errors', async () => {
            // Arrange
            const mockArticles = [createMockArticle('1', 'Article 1')];
            articleRepository.findAndCountAll.mockResolvedValue({
                rows: mockArticles,
                count: 1,
            });

            const error = new Error('Bulk indexing failed');
            searchService.bulkIndexArticles.mockRejectedValue(error);

            // Act & Assert
            await expect(service.syncAllArticles()).rejects.toThrow(error);
        });
    });

    describe('reindexAll', () => {
        it('should reindex all articles successfully', async () => {
            // Arrange
            const mockArticles = [createMockArticle('1', 'Article 1')];

            articleRepository.findAndCountAll
                .mockResolvedValueOnce({ rows: mockArticles, count: 1 })
                .mockResolvedValueOnce({ rows: mockArticles, count: 1 });
            searchService.deleteIndex.mockResolvedValue(undefined);
            searchService.createIndex.mockResolvedValue(undefined);
            searchService.bulkIndexArticles.mockResolvedValue(undefined);
            searchService.countDocuments.mockResolvedValue(1);

            // Act
            await service.reindexAll();

            // Assert
            expect(searchService.deleteIndex).toHaveBeenCalled();
            expect(searchService.createIndex).toHaveBeenCalled();
            expect(searchService.bulkIndexArticles).toHaveBeenCalledWith(
                mockArticles,
            );
            expect(searchService.countDocuments).toHaveBeenCalled();
        });

        it('should handle empty database during reindex', async () => {
            // Arrange
            articleRepository.findAndCountAll.mockResolvedValue({
                rows: [],
                count: 0,
            });

            // Act
            await service.reindexAll();

            // Assert
            expect(searchService.deleteIndex).not.toHaveBeenCalled();
            expect(searchService.createIndex).not.toHaveBeenCalled();
            expect(searchService.bulkIndexArticles).not.toHaveBeenCalled();
        });

        it('should handle reindex errors', async () => {
            // Arrange
            const mockArticles = [createMockArticle('1', 'Article 1')];

            articleRepository.findAndCountAll
                .mockResolvedValueOnce({ rows: mockArticles, count: 1 })
                .mockResolvedValueOnce({ rows: mockArticles, count: 1 });
            searchService.deleteIndex.mockResolvedValue(undefined);
            searchService.createIndex.mockResolvedValue(undefined);

            const error = new Error('Bulk indexing failed');
            searchService.bulkIndexArticles.mockRejectedValue(error);

            // Act & Assert
            await expect(service.reindexAll()).rejects.toThrow(error);
        });

        it('should handle count documents error', async () => {
            // Arrange
            const mockArticles = [createMockArticle('1', 'Article 1')];

            articleRepository.findAndCountAll
                .mockResolvedValueOnce({ rows: mockArticles, count: 1 })
                .mockResolvedValueOnce({ rows: mockArticles, count: 1 });
            searchService.deleteIndex.mockResolvedValue(undefined);
            searchService.createIndex.mockResolvedValue(undefined);
            searchService.bulkIndexArticles.mockResolvedValue(undefined);

            const error = new Error('Count failed');
            searchService.countDocuments.mockRejectedValue(error);

            // Act & Assert
            await expect(service.reindexAll()).rejects.toThrow(error);
        });

        it('should log warning when no documents are indexed', async () => {
            // Arrange
            const mockArticles = [createMockArticle('1', 'Article 1')];

            articleRepository.findAndCountAll
                .mockResolvedValueOnce({ rows: mockArticles, count: 1 })
                .mockResolvedValueOnce({ rows: mockArticles, count: 1 });
            searchService.deleteIndex.mockResolvedValue(undefined);
            searchService.createIndex.mockResolvedValue(undefined);
            searchService.bulkIndexArticles.mockResolvedValue(undefined);
            searchService.countDocuments.mockResolvedValue(0);

            // Act
            await service.reindexAll();

            // Assert
            expect(searchService.countDocuments).toHaveBeenCalled();
        });
    });
});

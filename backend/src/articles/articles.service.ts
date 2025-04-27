import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface Article {
    url: string;
    src: string;
    language: string;
    categories: string[];
    title: string;
    content: string;
    image_url: string;
    publish_date: string;
    time: string;
    timezone: string;
    hour: number;
    minute: number;
    day: number;
    month: string;
    month_number: number;
    year: number;
    weekday: string;
    time_reading: string;
    author: string;
}

export interface PaginatedArticlesResult {
    articles: Article[];
    total: number;
    page: number;
    pageSize: number;
}

@Injectable()
export class ArticlesService {
    private readonly dataDir = path.join(process.cwd(), 'data');

    async getAllArticles(
        page: number = 1,
        pageSize: number = 10,
    ): Promise<PaginatedArticlesResult> {
        const allArticles = await this.loadAllArticles();

        const sortedArticles = this.sortArticlesByDate(allArticles);

        const startIndex = (page - 1) * pageSize;
        const paginatedArticles = sortedArticles.slice(
            startIndex,
            startIndex + pageSize,
        );

        return {
            articles: paginatedArticles,
            total: sortedArticles.length,
            page,
            pageSize,
        };
    }

    async getArticlesBetweenDatesWithPagination(
        startTime: string,
        endTime: string,
        page: number = 1,
        pageSize: number = 10,
    ): Promise<PaginatedArticlesResult> {
        const filteredArticles = await this.getArticlesBetweenDates(
            startTime,
            endTime,
        );

        const sortedArticles = this.sortArticlesByDate(filteredArticles);

        const startIndex = (page - 1) * pageSize;
        const paginatedArticles = sortedArticles.slice(
            startIndex,
            startIndex + pageSize,
        );

        return {
            articles: paginatedArticles,
            total: filteredArticles.length,
            page,
            pageSize,
        };
    }

    private async loadAllArticles(): Promise<Article[]> {
        const files = await fs.promises.readdir(this.dataDir);
        const jsonFiles = files.filter((file) => file.endsWith('.json'));

        let allArticles: Article[] = [];

        for (const file of jsonFiles) {
            const filePath = path.join(this.dataDir, file);
            try {
                const fileContent = await fs.promises.readFile(
                    filePath,
                    'utf8',
                );
                const articles: Article[] = JSON.parse(fileContent);

                if (Array.isArray(articles)) {
                    allArticles = allArticles.concat(articles);
                }
            } catch (error) {
                console.error(`Error reading file ${file}:`, error);
            }
        }

        return allArticles;
    }

    private sortArticlesByDate(articles: Article[]): Article[] {
        return [...articles].sort((a, b) => {
            const dateA = new Date(
                `${a.year}-${a.month_number}-${a.day} ${a.hour}:${a.minute}`,
            );
            const dateB = new Date(
                `${b.year}-${b.month_number}-${b.day} ${b.hour}:${b.minute}`,
            );
            return dateB.getTime() - dateA.getTime(); // Newest first
        });
    }

    async getArticlesBetweenDates(
        startTime: string,
        endTime: string,
    ): Promise<Article[]> {
        const startDate = new Date(startTime);
        const endDate = new Date(endTime);

        const allArticles = await this.loadAllArticles();

        const filteredArticles = allArticles.filter((article) => {
            const articleDate = new Date(
                `${article.year}-${article.month_number}-${article.day} ${article.hour}:${article.minute}`,
            );

            return articleDate >= startDate && articleDate <= endDate;
        });

        return filteredArticles;
    }
}

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

@Injectable()
export class ArticlesService {
    private readonly dataDir = path.join(process.cwd(), '../data');

    async getArticlesBetweenDates(
        startTime: string,
        endTime: string,
    ): Promise<Article[]> {
        const startDate = new Date(startTime);
        const endDate = new Date(endTime);

        const files = await fs.promises.readdir(this.dataDir);
        const jsonFiles = files.filter((file) => file.endsWith('.json'));
        console.log(jsonFiles);
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

        const filteredArticles = allArticles.filter((article) => {
            const articleDate = new Date(
                `${article.year}-${article.month_number}-${article.day} ${article.hour}:${article.minute}`,
            );

            return articleDate >= startDate && articleDate <= endDate;
        });

        return filteredArticles;
    }
}

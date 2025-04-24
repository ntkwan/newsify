import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ArticlesService, Article } from '../articles/articles.service';
import { UploadService } from '../uploader/upload.service';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { Multer } from 'multer';
import OpenAI from 'openai';

@Injectable()
export class PodcastService {
    private openai: OpenAI;

    constructor(
        private readonly articlesService: ArticlesService,
        private readonly uploadService: UploadService,
        private readonly configService: ConfigService,
    ) {
        // Initialize OpenAI with the API key from config
        const openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
        if (!openaiApiKey) {
            console.warn(
                'OpenAI API key is not set. Some features may not work correctly.',
            );
        }

        this.openai = new OpenAI({
            apiKey: openaiApiKey,
        });
    }

    async summarizeArticle(article: Article): Promise<string> {
        try {
            const openaiApiKey =
                this.configService.get<string>('OPENAI_API_KEY');
            if (!openaiApiKey) {
                throw new Error('OpenAI API key is not configured');
            }

            const response = await this.openai.chat.completions.create({
                model: this.configService.get<string>('OPENAI_MODEL'),
                messages: [
                    {
                        role: 'system',
                        content:
                            'You are a news summarizer. Create a concise 2-3 sentence summary of the following article that captures the main points. Keep it objective and factual. Format it for a news broadcast.',
                    },
                    {
                        role: 'user',
                        content: `Title: ${article.title}\n\nContent: ${article.content}`,
                    },
                ],
                max_tokens: 150,
                temperature: 0.5,
            });

            const summary = response.choices[0]?.message?.content?.trim();

            if (!summary) {
                throw new Error('Failed to generate summary');
            }

            return summary;
        } catch (error) {
            console.error('Error summarizing article with OpenAI:', error);
            throw new InternalServerErrorException(error.message as Error);
        }
    }

    async textToSpeech(text: string): Promise<string> {
        try {
            const openaiApiKey =
                this.configService.get<string>('OPENAI_API_KEY');
            if (!openaiApiKey) {
                throw new Error('OpenAI API key is not configured');
            }

            const response = await this.openai.audio.speech.create({
                model: this.configService.get<string>('OPENAI_TTS_MODEL'),
                voice: 'alloy',
                input: text,
                speed: 1.0,
            });

            const buffer = Buffer.from(await response.arrayBuffer());

            const tempFilePath = path.join(
                os.tmpdir(),
                `podcast-${Date.now()}.mp3`,
            );

            await fs.promises.writeFile(tempFilePath, buffer);

            return tempFilePath;
        } catch (error) {
            console.error(
                'Error converting text to speech with OpenAI:',
                error,
            );
            throw new InternalServerErrorException(error.message as Error);
        }
    }

    async generatePodcast(startTime: string, endTime: string): Promise<string> {
        // Get articles within the date range
        const articles = await this.articlesService.getArticlesBetweenDates(
            startTime,
            endTime,
        );

        if (articles.length === 0) {
            throw new Error(
                'No articles found within the specified time range',
            );
        }

        console.log(`Found ${articles.length} articles to include in podcast`);

        let podcastScript =
            "Welcome to Newsify Breaking News. Here are today's top stories.";

        for (const article of articles) {
            console.log(`Summarizing article: ${article.title}`);
            const summary = await this.summarizeArticle(article);
            podcastScript += ' ' + summary + ' ';
        }

        // Add outro
        podcastScript +=
            " That's all for today's breaking news. Thank you for listening to Newsify.";

        console.log('Generated podcast script:', podcastScript);
        console.log('Converting to speech...');

        const audioFilePath = await this.textToSpeech(podcastScript);

        try {
            console.log('Audio file generated, preparing for upload...');

            const fileBuffer = await fs.promises.readFile(audioFilePath);

            const file = {
                buffer: fileBuffer,
                originalname: `newsify-podcast-${new Date().toISOString().slice(0, 10)}.mp3`,
                mimetype: 'audio/mpeg',
            } as Multer;

            const uploadedUrl = await this.uploadService.uploadFile(
                file,
                'podcasts',
            );

            console.log('Podcast uploaded successfully to:', uploadedUrl);

            await fs.promises.unlink(audioFilePath);

            return uploadedUrl;
        } catch (error) {
            console.error('Error uploading podcast:', error);
            try {
                await fs.promises.unlink(audioFilePath);
            } catch (cleanupError) {
                console.error(
                    'Error cleaning up temporary file:',
                    cleanupError,
                );
            }
            throw error;
        }
    }
}

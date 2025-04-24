import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ArticlesService, Article } from '../articles/articles.service';
import { UploadService } from '../uploader/upload.service';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { Multer } from 'multer';
import OpenAI from 'openai';
import { TranscriptLine } from './dtos/podcast-response.dto';
import { File } from 'buffer';

interface ScriptSection {
    text: string;
    type: 'intro' | 'article' | 'outro';
    articleTitle?: string;
}

@Injectable()
export class PodcastService {
    private openai: OpenAI;

    constructor(
        private readonly articlesService: ArticlesService,
        private readonly uploadService: UploadService,
        private readonly configService: ConfigService,
    ) {
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
            throw new InternalServerErrorException(
                error instanceof Error ? error.message : String(error),
            );
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
            throw new InternalServerErrorException(
                error instanceof Error ? error.message : String(error),
            );
        }
    }

    async generateTranscriptWithTimestamps(audioFilePath: string): Promise<{
        fullTranscript: string;
        timestampedTranscript: TranscriptLine[];
    }> {
        try {
            const fileBuffer = await fs.promises.readFile(audioFilePath);

            const audioFile = new File(
                [fileBuffer],
                path.basename(audioFilePath),
                { type: 'audio/mpeg' },
            );

            const transcription = await this.openai.audio.transcriptions.create(
                {
                    file: audioFile,
                    model: this.configService.get<string>(
                        'OPENAI_TRANSCRIPTION_MODEL',
                    ),
                    response_format: 'verbose_json',
                    timestamp_granularities: ['segment'],
                },
            );

            let fullTranscript = '';
            const timestampedTranscript: TranscriptLine[] = [];

            if ('segments' in transcription) {
                transcription.segments.forEach((segment) => {
                    fullTranscript += segment.text + ' ';

                    timestampedTranscript.push({
                        startTime: segment.start,
                        endTime: segment.end,
                        text: segment.text,
                    });
                });
            } else {
                fullTranscript = transcription.text;

                timestampedTranscript.push({
                    startTime: 0,
                    endTime: 60,
                    text: transcription.text,
                });
            }

            return {
                fullTranscript: fullTranscript.trim(),
                timestampedTranscript,
            };
        } catch (error) {
            console.error(
                'Error generating transcript with timestamps:',
                error,
            );
            throw new InternalServerErrorException(
                error instanceof Error ? error.message : String(error),
            );
        }
    }

    createEstimatedTranscriptTimestamps(scriptSections: ScriptSection[]): {
        fullTranscript: string;
        timestampedTranscript: TranscriptLine[];
    } {
        const fullTranscript = scriptSections
            .map((section) => section.text)
            .join(' ');
        const timestampedTranscript: TranscriptLine[] = [];

        const WORDS_PER_MINUTE = 150;
        const MINUTES_PER_WORD = 1 / WORDS_PER_MINUTE;
        const SECONDS_PER_WORD = MINUTES_PER_WORD * 60;

        let currentTime = 0;

        scriptSections.forEach((section) => {
            const sentences = section.text.split(/(?<=[.!?])\s+/);

            sentences.forEach((sentence) => {
                if (!sentence.trim()) return;

                const wordCount = sentence.split(/\s+/).length;
                const duration = wordCount * SECONDS_PER_WORD;

                timestampedTranscript.push({
                    startTime: currentTime,
                    endTime: currentTime + duration,
                    text: sentence.trim(),
                });

                currentTime += duration;
            });
        });

        return { fullTranscript, timestampedTranscript };
    }

    async generatePodcast(
        startTime: string,
        endTime: string,
    ): Promise<{
        url: string;
        transcript: string;
        timestampedTranscript: TranscriptLine[];
    }> {
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

        // Prepare script sections for better tracking and timestamps
        const scriptSections: ScriptSection[] = [];

        // Add intro
        scriptSections.push({
            text: "Welcome to Newsify Breaking News. Here are today's top stories.",
            type: 'intro',
        });

        // Process each article
        for (const article of articles) {
            console.log(`Summarizing article: ${article.title}`);
            const summary = await this.summarizeArticle(article);
            scriptSections.push({
                text: summary,
                type: 'article',
                articleTitle: article.title,
            });
        }

        // Add outro
        scriptSections.push({
            text: "That's all for today's breaking news. Thank you for listening to Newsify.",
            type: 'outro',
        });

        const podcastScript = scriptSections
            .map((section) => section.text)
            .join(' ');

        console.log('Generated podcast script:', podcastScript);
        console.log('Converting to speech...');

        const estimatedTranscript =
            this.createEstimatedTranscriptTimestamps(scriptSections);

        const audioFilePath = await this.textToSpeech(podcastScript);

        try {
            console.log('Audio file generated, preparing for upload...');

            let transcriptData: {
                fullTranscript: string;
                timestampedTranscript: TranscriptLine[];
            };

            try {
                // Generate transcript with timestamps from the audio file
                transcriptData =
                    await this.generateTranscriptWithTimestamps(audioFilePath);
                console.log('Generated transcript with timestamps from audio');
            } catch (transcriptError) {
                console.log(
                    'Error generating transcript from audio, using estimated timestamps:',
                    transcriptError,
                );
                // Fallback to estimated transcript
                transcriptData = estimatedTranscript;
            }

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

            return {
                url: uploadedUrl,
                transcript: transcriptData.fullTranscript,
                timestampedTranscript: transcriptData.timestampedTranscript,
            };
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

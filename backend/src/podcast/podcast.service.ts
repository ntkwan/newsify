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
import { GoogleGenerativeAI } from '@google/generative-ai';

interface ScriptSection {
    text: string;
    type: 'intro' | 'article' | 'outro';
    articleTitle?: string;
}

@Injectable()
export class PodcastService {
    private openai: OpenAI;
    private genAI: GoogleGenerativeAI;

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

        // Initialize Google Generative AI client
        const geminiApiKey = this.configService.get<string>(
            'GOOGLE_GEMINI_API_KEY',
        );
        if (!geminiApiKey) {
            console.warn(
                'Google Gemini API key is not set. Audio transcription features may not work correctly.',
            );
        }
        this.genAI = new GoogleGenerativeAI(geminiApiKey || '');
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
            throw new InternalServerErrorException({
                message: error instanceof Error ? error.message : String(error),
            });
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
            throw new InternalServerErrorException({
                message: error instanceof Error ? error.message : String(error),
            });
        }
    }

    async generateTranscriptWithTimestamps(audioFilePath: string): Promise<{
        fullTranscript: string;
        timestampedTranscript: TranscriptLine[];
    }> {
        try {
            const apiKey = this.configService.get<string>(
                'GOOGLE_GEMINI_API_KEY',
            );
            if (!apiKey) {
                throw new Error('Google Gemini API key is not configured');
            }

            const fileBuffer = await fs.promises.readFile(audioFilePath);
            const base64Audio = fileBuffer.toString('base64');

            // Use Gemini API to transcribe audio
            const model = this.genAI.getGenerativeModel({
                model: this.configService.get<string>('GOOGLE_GEMINI_MODEL'),
            });

            console.log('Transcribing audio with Google Gemini...');

            const prompt =
                'Transcribe this audio with detailed timestamps. For each sentence, provide the start and end time in seconds.';

            const audioContent = {
                inlineData: {
                    data: base64Audio,
                    mimeType: 'audio/mpeg',
                },
            };

            const result = await model.generateContent([prompt, audioContent]);
            const response = result.response;
            const responseText = response.text();

            console.log('Gemini transcription complete, parsing response');

            // Now use Gemini to generate the timestamped transcript from the text
            const timestampPrompt = `
The following is a transcript of an audio file.
Create a detailed timestamped transcript with start and end times for each sentence.
Format the output as valid JSON that matches this TypeScript type:
{
  fullTranscript: string; // The complete text
  timestampedTranscript: Array<{
    startTime: number; // Start time in seconds
    endTime: number; // End time in seconds
    text: string; // The text content of this segment
  }>;
}

Here's the transcript:
${responseText}
`;

            const timestampModel = this.genAI.getGenerativeModel({
                model: this.configService.get<string>('GOOGLE_GEMINI_MODEL'),
            });

            const timestampResult =
                await timestampModel.generateContent(timestampPrompt);
            const timestampResponse = timestampResult.response;
            const jsonText = timestampResponse.text();

            try {
                const jsonMatch = jsonText.match(
                    /```json\s*([\s\S]*?)\s*```/,
                ) ||
                    jsonText.match(/```\s*([\s\S]*?)\s*```/) || [
                        null,
                        jsonText,
                    ];
                const cleanJson = jsonMatch[1].trim();
                const parsedData = JSON.parse(cleanJson);

                return {
                    fullTranscript: parsedData.fullTranscript,
                    timestampedTranscript: parsedData.timestampedTranscript,
                };
            } catch (parseError) {
                console.error('Error parsing transcript JSON:', parseError);
                console.log('Raw JSON response:', jsonText);

                // Fallback to simple text-based transcript
                return this.generateSmartTimestamps(responseText);
            }
        } catch (error) {
            console.error('Error generating transcript with Gemini:', error);
            throw new InternalServerErrorException({
                message: error instanceof Error ? error.message : String(error),
            });
        }
    }

    generateSmartTimestamps(text: string): {
        fullTranscript: string;
        timestampedTranscript: TranscriptLine[];
    } {
        const fullTranscript = text;
        const timestampedTranscript: TranscriptLine[] = [];

        // Split text into sentences
        const sentences = text.split(/(?<=[.!?])\s+/);

        // Constants for speech timing
        const WORDS_PER_MINUTE = 150; // Average speaking rate
        const MINUTES_PER_WORD = 1 / WORDS_PER_MINUTE;
        const SECONDS_PER_WORD = MINUTES_PER_WORD * 60;
        const PAUSE_AFTER_SENTENCE = 0.3; // Seconds of pause after each sentence

        let currentTime = 0;

        sentences.forEach((sentence) => {
            if (!sentence.trim()) return;

            // Count words for duration estimation
            const wordCount = sentence.split(/\s+/).length;

            // Calculate duration based on word count and complexity
            let duration = wordCount * SECONDS_PER_WORD;

            // Adjust for sentence complexity
            if (sentence.length > 100) {
                duration *= 1.1; // Longer sentences are spoken slightly slower
            }
            if (sentence.includes(',')) {
                duration += 0.1 * (sentence.match(/,/g) || []).length; // Add time for commas (pauses)
            }

            // Add the sentence with calculated timestamps
            timestampedTranscript.push({
                startTime: parseFloat(currentTime.toFixed(2)),
                endTime: parseFloat((currentTime + duration).toFixed(2)),
                text: sentence.trim(),
            });

            // Update current time for next sentence
            currentTime += duration + PAUSE_AFTER_SENTENCE;
        });

        return { fullTranscript, timestampedTranscript };
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
                // Generate transcript with timestamps using Gemini
                transcriptData =
                    await this.generateTranscriptWithTimestamps(audioFilePath);
                console.log('Generated transcript with timestamps from Gemini');
            } catch (transcriptError) {
                console.log(
                    'Error generating transcript with Gemini, using estimated timestamps:',
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

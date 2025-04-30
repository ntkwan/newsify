import os
import tempfile
import re
from fastapi import HTTPException
from typing import List, Dict, Any, Tuple
import openai
import google.generativeai as genai
from datetime import datetime
from ..models import Article, TranscriptLine, ScriptSection
from .upload_service import upload_service
from .article_service import article_service
from dotenv import load_dotenv

load_dotenv()

class PodcastService:
    """Service for generating podcasts from articles."""
    
    def __init__(self):
        """Initialize the podcast service with API keys and models."""
        
        openai_api_key = os.getenv('OPENAI_API_KEY')
        if not openai_api_key:
            print("Warning: OPENAI_API_KEY is not configured")
        
        self.openai_client = openai.OpenAI(api_key=openai_api_key)
        self.openai_model = os.getenv('OPENAI_MODEL', 'gpt-4o')
        self.openai_tts_model = os.getenv('OPENAI_TTS_MODEL', 'tts-1')
        
        google_api_key = os.getenv('GOOGLE_GEMINI_API_KEY')
        if not google_api_key:
            print("Warning: GOOGLE_GEMINI_API_KEY is not configured")
        
        genai.configure(api_key=google_api_key)
        self.google_model_name = os.getenv('GOOGLE_GEMINI_MODEL', 'gemini-1.5-pro-latest')
    
    async def summarize_article(self, article: Article) -> str:
        """
        Generate a concise summary of an article using OpenAI.
        
        Args:
            article: Article object containing title and content
            
        Returns:
            Summary text
        """
        try:
            response = self.openai_client.chat.completions.create(
                model=self.openai_model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a news summarizer. Create a concise 2-3 sentence summary of the following article that captures the main points. Keep it objective and factual. Format it for a news broadcast."
                    },
                    {
                        "role": "user",
                        "content": f"Title: {article.title}\n\nContent: {article.content}"
                    }
                ],
                max_tokens=150,
                temperature=0.5
            )
            
            summary = response.choices[0].message.content.strip()
            
            if not summary:
                raise HTTPException(status_code=500, detail="Failed to generate summary")
                
            return summary
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error summarizing article: {str(e)}")
    
    async def text_to_speech(self, text: str) -> str:
        """
        Convert text to speech using OpenAI's TTS API.
        
        Args:
            text: The text to convert to speech
            
        Returns:
            Path to the temporary audio file
        """
        try:
            response = self.openai_client.audio.speech.create(
                model=self.openai_tts_model,
                voice="alloy",
                input=text,
                speed=1.0
            )
            
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
            temp_file.close()
            
            response.stream_to_file(temp_file.name)
            
            return temp_file.name
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error converting text to speech: {str(e)}")
    
    async def generate_transcript_with_timestamps(self, audio_file_path: str) -> Dict[str, Any]:
        """
        Generate a transcript with timestamps from an audio file using Google Gemini.
        
        Args:
            audio_file_path: Path to the audio file
            
        Returns:
            Dictionary with fullTranscript and timestampedTranscript
        """
        try:
            with open(audio_file_path, "rb") as f:
                audio_data = f.read()
            
            model = genai.GenerativeModel(self.google_model_name)
            
            print("Transcribing audio with Google Gemini...")
            
            prompt = 'Transcribe this audio with detailed timestamps. For each sentence, provide the start and end time in seconds.'
            
            contents = [
                prompt,
                {"mime_type": "audio/mpeg", "data": audio_data}
            ]
            
            response = model.generate_content(contents)
            response_text = response.text
            
            print("Gemini transcription complete, parsing response")
            
            # Create timestamp model
            timestamp_prompt = f"""
The following is a transcript of an audio file.
Create a detailed timestamped transcript with start and end times for each sentence.
Format the output as valid JSON that matches this type:
{{
  fullTranscript: string; // The complete text
  timestampedTranscript: Array<{{
    startTime: number; // Start time in seconds
    endTime: number; // End time in seconds
    text: string; // The text content of this segment
  }}>;
}}

Here's the transcript:
{response_text}
"""
            
            timestamp_response = model.generate_content(timestamp_prompt)
            json_text = timestamp_response.text
            
            try:
                json_match = re.search(r'```json\s*([\s\S]*?)\s*```', json_text) or \
                             re.search(r'```\s*([\s\S]*?)\s*```', json_text) or \
                             [None, json_text]
                clean_json = json_match[1].strip()
                
                import json
                parsed_data = json.loads(clean_json)
                
                return {
                    "fullTranscript": parsed_data["fullTranscript"],
                    "timestampedTranscript": parsed_data["timestampedTranscript"]
                }
                
            except Exception as parse_error:
                print(f"Error parsing transcript JSON: {parse_error}")
                print(f"Raw JSON response: {json_text}")
                
                # Fallback to simple text-based transcript
                return self.generate_smart_timestamps(response_text)
                
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error generating transcript: {str(e)}")
    
    def generate_smart_timestamps(self, text: str) -> Dict[str, Any]:
        """
        Generate estimated timestamps for a transcript.
        
        Args:
            text: The transcript text
            
        Returns:
            Dictionary with fullTranscript and timestampedTranscript
        """
        full_transcript = text
        timestamped_transcript = []
        
        sentences = re.split(r'(?<=[.!?])\s+', text)
        
        WORDS_PER_MINUTE = 150  # Average speaking rate
        MINUTES_PER_WORD = 1 / WORDS_PER_MINUTE
        SECONDS_PER_WORD = MINUTES_PER_WORD * 60
        PAUSE_AFTER_SENTENCE = 0.3  # Seconds of pause after each sentence
        
        current_time = 0
        
        for sentence in sentences:
            if not sentence.strip():
                continue
                
            word_count = len(sentence.split())
            
            duration = word_count * SECONDS_PER_WORD
            
            if len(sentence) > 100:
                duration *= 1.1  # Longer sentences are spoken slightly slower
                
            if ',' in sentence:
                duration += 0.1 * sentence.count(',')  # Add time for commas (pauses)
            
            # Add the sentence with calculated timestamps
            timestamped_transcript.append({
                "startTime": round(current_time, 2),
                "endTime": round(current_time + duration, 2),
                "text": sentence.strip()
            })
            
            # Update current time for next sentence
            current_time += duration + PAUSE_AFTER_SENTENCE
        
        return {
            "fullTranscript": full_transcript,
            "timestampedTranscript": timestamped_transcript
        }
    
    def create_estimated_transcript_timestamps(self, script_sections: List[ScriptSection]) -> Dict[str, Any]:
        """
        Create estimated timestamps for script sections.
        
        Args:
            script_sections: List of script sections
            
        Returns:
            Dictionary with fullTranscript and timestampedTranscript
        """
        full_transcript = ' '.join([section.text for section in script_sections])
        timestamped_transcript = []
        
        WORDS_PER_MINUTE = 150
        MINUTES_PER_WORD = 1 / WORDS_PER_MINUTE
        SECONDS_PER_WORD = MINUTES_PER_WORD * 60
        
        current_time = 0
        
        for section in script_sections:
            sentences = re.split(r'(?<=[.!?])\s+', section.text)
            
            for sentence in sentences:
                if not sentence.strip():
                    continue
                    
                word_count = len(sentence.split())
                duration = word_count * SECONDS_PER_WORD
                
                timestamped_transcript.append({
                    "startTime": current_time,
                    "endTime": current_time + duration,
                    "text": sentence.strip()
                })
                
                current_time += duration
        
        return {
            "fullTranscript": full_transcript,
            "timestampedTranscript": timestamped_transcript
        }
    
    async def generate_podcast(self, start_time: str, end_time: str) -> Dict[str, Any]:
        """
        Generate a podcast from articles within a date range.
        
        Args:
            start_time: ISO format start date
            end_time: ISO format end date
            
        Returns:
            Dictionary with url, transcript, and timestampedTranscript
        """
        articles = await article_service.get_articles_between_dates(start_time, end_time)
        
        if not articles:
            raise HTTPException(status_code=404, detail="No articles found within the specified time range")
            
        print(f"Found {len(articles)} articles to include in podcast")
        
        script_sections = []
        
        script_sections.append(
            ScriptSection(
                text="Welcome to Newsify Breaking News. Here are today's top stories.",
                type="intro"
            )
        )
        
        for article in articles:
            print(f"Summarizing article: {article.title}")
            summary = await self.summarize_article(article)
            script_sections.append(
                ScriptSection(
                    text=summary,
                    type="article",
                    article_title=article.title
                )
            )
        
        # Add outro
            script_sections.append(
            ScriptSection(
                text="That's all for today's breaking news. Thank you for listening to Newsify.",
                type="outro"
            )
        )
        
        podcast_script = ' '.join([section.text for section in script_sections])
        
        print("Generated podcast script:", podcast_script)
        print("Converting to speech...")
        
        estimated_transcript = self.create_estimated_transcript_timestamps(script_sections)
        
        audio_file_path = await self.text_to_speech(podcast_script)
        
        try:
            print("Audio file generated, preparing for upload...")
            
            transcript_data = {}
            
            try:
                transcript_data = await self.generate_transcript_with_timestamps(audio_file_path)
                print("Generated transcript with timestamps from Gemini")
            except Exception as transcript_error:
                print(f"Error generating transcript with Gemini, using estimated timestamps: {transcript_error}")
                transcript_data = estimated_transcript
            
            with open(audio_file_path, "rb") as f:
                file_data = f.read()
            
            filename = f"newsify-podcast-{datetime.now().strftime('%Y-%m-%d')}.mp3"
            
            uploaded_url = await upload_service.upload_file(
                file_data,
                filename,
                "podcasts"
            )
            
            print("Podcast uploaded successfully to:", uploaded_url)
            
            os.unlink(audio_file_path)
            
            return {
                "url": uploaded_url,
                "transcript": transcript_data["fullTranscript"],
                "timestampedTranscript": transcript_data["timestampedTranscript"]
            }
            
        except Exception as e:
            try:
                os.unlink(audio_file_path)
            except:
                pass
                
            raise HTTPException(status_code=500, detail=f"Error generating podcast: {str(e)}")

podcast_service = PodcastService() 
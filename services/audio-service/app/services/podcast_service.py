import os
import tempfile
import re
import json
from fastapi import HTTPException
from typing import List, Dict, Any, Tuple, Optional
import openai
import google.generativeai as genai
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from ..models import Article, TranscriptLine, ScriptSection
from .upload_service import upload_service
from .article_service import article_service
from .database import get_digitalocean_db, get_digitalocean_session, podcasts_table
from dotenv import load_dotenv
from sqlalchemy import create_engine, MetaData, inspect


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
        self._db_session = None
    
    def _get_db_session(self) -> Optional[Session]:
        """Get a singleton database session."""
        if self._db_session is None:
            try:
                self._db_session = get_digitalocean_db()
                return self._db_session
            except Exception as e:
                print(f"Error creating Digital Ocean session: {str(e)}")
                return None
        return self._db_session
    
    async def _ensure_table_exists(self, session):
        """Ensure that the Podcast table exists in the Digital Ocean database."""
        try:
            from app.services.database import podcasts_table, metadata, digitalocean_engine
            
            inspector = inspect(digitalocean_engine)
            table_exists = "Podcast" in inspector.get_table_names()
            
            if not table_exists:
                print("Podcast table does not exist. Creating...")
                metadata.create_all(digitalocean_engine, tables=[podcasts_table])
                print("Podcast table created successfully.")
            
            return True
        except Exception as e:
            print(f"Error ensuring table exists: {str(e)}")
            return False
    
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
    
    async def text_to_speech(self, text: str, voice: str = "alloy") -> str:
        """
        Convert text to speech using OpenAI's TTS API.
        
        Args:
            text: The text to convert to speech
            voice: The voice to use (default: "alloy" for female, "echo" for male)
            
        Returns:
            Path to the temporary audio file
        """
        try:
            response = self.openai_client.audio.speech.create(
                model=self.openai_tts_model,
                voice=voice,
                input=text,
                speed=1.0
            )
            
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
            temp_file.close()
            
            response.stream_to_file(temp_file.name)
            
            return temp_file.name
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error converting text to speech: {str(e)}")
    
    async def generate_dual_voice_podcasts(self, podcast_script: str) -> dict:
        """
        Generate podcasts with both male and female voices.
        
        Args:
            podcast_script: The text content for the podcast
            
        Returns:
            Dictionary with paths to both audio files
        """
        female_audio_path = await self.text_to_speech(podcast_script, voice="alloy")
        male_audio_path = await self.text_to_speech(podcast_script, voice="echo")
        
        return {
            "female_voice": female_audio_path,
            "male_voice": male_audio_path
        }
    
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
    
    async def generate_podcast(self, start_time: str, end_time: str, db: Optional[Session] = None) -> Dict[str, Any]:
        """
        Generate a podcast from articles within a date range.
        
        Args:
            start_time: ISO format start date
            end_time: ISO format end date
            db: Digital Ocean database session
            
        Returns:
            Dictionary with url, title, transcript, and timestampedTranscript
        """
        if db is None:
            db = self._get_db_session()
            
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
        
        script_sections.append(
            ScriptSection(
                text="That's all for today's breaking news. Thank you for listening to Newsify.",
                type="outro"
            )
        )
        
        podcast_script = ' '.join([section.text for section in script_sections])
        
        print("Generated podcast script:", podcast_script)
        print("Converting to speech with both male and female voices...")
        
        estimated_transcript = self.create_estimated_transcript_timestamps(script_sections)
        
        audio_files = await self.generate_dual_voice_podcasts(podcast_script)
        
        try:
            print("Audio files generated, preparing for upload...")
            
            # Generate transcripts for both male and female voices
            transcript_data = {
                "female_voice": {},
                "male_voice": {}
            }
            
            # Transcribe female voice
            try:
                transcript_data["female_voice"] = await self.generate_transcript_with_timestamps(audio_files["female_voice"])
                print("Generated female voice transcript with timestamps from Gemini")
            except Exception as transcript_error:
                print(f"Error generating female voice transcript with Gemini, using estimated timestamps: {transcript_error}")
                transcript_data["female_voice"] = estimated_transcript
            
            # Transcribe male voice
            try:
                transcript_data["male_voice"] = await self.generate_transcript_with_timestamps(audio_files["male_voice"])
                print("Generated male voice transcript with timestamps from Gemini")
            except Exception as transcript_error:
                print(f"Error generating male voice transcript with Gemini, using estimated timestamps: {transcript_error}")
                transcript_data["male_voice"] = estimated_transcript
            
            # Upload both audio files
            female_filename = f"female-newsify-podcast-{datetime.now().strftime('%Y-%m-%d')}.mp3"
            male_filename = f"male-newsify-podcast-{datetime.now().strftime('%Y-%m-%d')}.mp3"
            
            uploaded_urls = {}
            
            # Upload female voice
            with open(audio_files["female_voice"], "rb") as f:
                female_data = f.read()
                
            uploaded_urls["female_voice"] = await upload_service.upload_file(
                female_data,
                female_filename,
                "podcasts"
            )
            
            # Upload male voice
            with open(audio_files["male_voice"], "rb") as f:
                male_data = f.read()
                
            uploaded_urls["male_voice"] = await upload_service.upload_file(
                male_data,
                male_filename,
                "podcasts"
            )
            
            print("Podcasts uploaded successfully:", uploaded_urls)
            
            try:
                await self._ensure_table_exists(db)
                
                # Convert timestamp scripts to JSONB
                timestamp_script_json = {
                    "female_voice": json.dumps([
                        {
                            "startTime": line["startTime"],
                            "endTime": line["endTime"],
                            "text": line["text"]
                        } for line in transcript_data["female_voice"]["timestampedTranscript"]
                    ]),
                    "male_voice": json.dumps([
                        {
                            "startTime": line["startTime"],
                            "endTime": line["endTime"],
                            "text": line["text"]
                        } for line in transcript_data["male_voice"]["timestampedTranscript"]
                    ])
                }
                
                # Calculate lengths for both audios
                podcast_length = {
                    "female_voice": self.calculate_podcast_length(transcript_data["female_voice"]["timestampedTranscript"]),
                    "male_voice": self.calculate_podcast_length(transcript_data["male_voice"]["timestampedTranscript"])
                }
                
                newest_date = None
                
                for article in articles:
                    if article.publish_date:
                        try:
                            if isinstance(article.publish_date, datetime):
                                article_date = article.publish_date
                            else:
                                article_date = datetime.fromisoformat(article.publish_date.replace('Z', '+00:00'))
                                
                            if newest_date is None or article_date > newest_date:
                                newest_date = article_date
                        except (ValueError, TypeError) as e:
                            print(f"Could not parse date {article.publish_date}: {e}")
                
                if newest_date is None:
                    newest_date = datetime.now()
                
                podcast_title = await self.generate_podcast_title(articles, newest_date)
                
                stmt = podcasts_table.insert().values(
                    publish_date=newest_date,
                    title=podcast_title,
                    script=podcast_script,
                    timestamp_script=timestamp_script_json,
                    audio_url=uploaded_urls,  # Now storing the JSON with both URLs
                    length_seconds=podcast_length,
                    links=[article.url for article in articles if hasattr(article, 'url') and article.url],
                )
                print(stmt)
                db.execute(stmt)
                db.commit()
                print(f"Podcast saved to database with title '{podcast_title}' and publish_date {newest_date}")
            except Exception as db_error:
                print(f"Error saving podcast to database: {str(db_error)}")
            
            # Cleanup temp files
            os.unlink(audio_files["female_voice"])
            os.unlink(audio_files["male_voice"])
            
            return {
                "url": uploaded_urls,  # Return both URLs in JSON format
                "title": podcast_title,
                "script": podcast_script,
                "timestampedTranscript": timestamp_script_json,
                "length_seconds": podcast_length,
                "links": [article.url for article in articles if hasattr(article, 'url') and article.url],
            }
            
        except Exception as e:
            # Cleanup temp files
            try:
                os.unlink(audio_files["female_voice"])
                os.unlink(audio_files["male_voice"])
            except:
                pass
                
            raise HTTPException(status_code=500, detail=f"Error generating podcast: {str(e)}")
    
    async def generate_podcast_title(self, articles: List[Article], date: datetime) -> str:
        """
        Generate a title for the podcast based on the articles and date.
        
        Args:
            articles: List of articles to include in the podcast
            date: Date of the podcast
            
        Returns:
            Generated podcast title
        """
        try:
            formatted_date = date.strftime("%B %d, %Y")
            formatted_time = date.strftime("%I:%M %p")
            
            hour = date.hour
            
            if 5 <= hour < 12:
                time_descriptor = "Morning"
            elif 12 <= hour < 17:
                time_descriptor = "Afternoon"
            elif 17 <= hour < 21:
                time_descriptor = "Evening"
            else:
                time_descriptor = "Night"
                
            title = f"Newsify {time_descriptor} Update - {formatted_date} {formatted_time}"
            
            return title
            
        except Exception as e:
            print(f"Error generating podcast title: {str(e)}")
            return f"Newsify News Update - {date.strftime('%Y-%m-%d %H:00')}"
            
    def calculate_podcast_length(self, timestamped_transcript: List[Dict[str, Any]]) -> int:
        """
        Calculate the length of the podcast in seconds based on the timestamped transcript.
        
        Args:
            timestamped_transcript: List of transcript lines with timestamps
            
        Returns:
            Length of the podcast in seconds
        """
        if not timestamped_transcript:
            return 0
            
        return int(timestamped_transcript[-1]["endTime"])

podcast_service = PodcastService() 
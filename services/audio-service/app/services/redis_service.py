import redis
import threading
import time
import os
import logging
from dotenv import load_dotenv
from typing import Callable, Dict, Any

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("redis_service")

load_dotenv()

class RedisService:
    """Service for Redis pub/sub messaging."""
    
    def __init__(self):
        """Initialize the Redis service with connection details."""
        self.host = os.getenv('REDIS_HOST')
        self.port = int(os.getenv('REDIS_PORT'))
        self.username = os.getenv('REDIS_USERNAME')
        self.password = os.getenv('REDIS_PASSWORD')
        
        self.reconnect_delay = 5 
        self.running = False
        self.client = None
        self.pubsub = None
        self.thread = None
        self.handlers = {}
        
    def connect(self) -> bool:
        """
        Connect to Redis server.
        
        Returns:
            bool: True if connection successful, False otherwise
        """
        try:
            logger.info(f"Connecting to Redis at {self.host}:{self.port}...")
            self.client = redis.Redis(
                host=self.host,
                port=self.port,
                username=self.username,
                password=self.password,
                ssl=True,
                decode_responses=True
            )
            self.client.ping()
            logger.info("Connected to Redis successfully")
            return True
        except redis.RedisError as e:
            logger.error(f"Failed to connect to Redis: {str(e)}")
            return False
            
    def register_handler(self, channel: str, handler: Callable[[Dict[str, Any]], None]) -> None:
        """
        Register a handler function for a specific channel.
        
        Args:
            channel: Redis channel name
            handler: Callback function that accepts a message dictionary
        """
        self.handlers[channel] = handler
        logger.info(f"Registered handler for channel: {channel}")
        
        if self.pubsub and self.running:
            self.pubsub.subscribe(channel)
            logger.info(f"Subscribed to channel: {channel}")
    
    def _message_listener(self) -> None:
        """Background thread that listens for new messages."""
        while self.running:
            try:
                if not self.client or not self.pubsub:
                    logger.warning("Connection lost. Attempting to reconnect...")
                    if not self.connect():
                        time.sleep(self.reconnect_delay)
                        continue
                    
                    self.pubsub = self.client.pubsub()
                    for channel in self.handlers.keys():
                        self.pubsub.subscribe(channel)
                        logger.info(f"Resubscribed to channel: {channel}")
                
                message = self.pubsub.get_message(timeout=1.0)
                if message and message['type'] == 'message':
                    channel = message['channel']
                    if channel in self.handlers:
                        try:
                            self.handlers[channel](message)
                        except Exception as e:
                            logger.error(f"Error in message handler: {str(e)}")
                
                time.sleep(0.01)
                
            except redis.RedisError as e:
                logger.error(f"Redis error in listener: {str(e)}")
                self.pubsub = None
                self.client = None
                time.sleep(self.reconnect_delay)
            except Exception as e:
                logger.error(f"Unexpected error in listener: {str(e)}")
                time.sleep(self.reconnect_delay)
                
    def start(self) -> bool:
        """
        Start the Redis listener in a background thread.
        
        Returns:
            bool: True if started successfully, False otherwise
        """
        if self.running:
            logger.warning("Redis service is already running")
            return True
            
        if not self.connect():
            logger.error("Cannot start Redis service: connection failed")
            return False
            
        self.pubsub = self.client.pubsub()
        
        for channel in self.handlers.keys():
            self.pubsub.subscribe(channel)
            logger.info(f"Subscribed to channel: {channel}")
            
        self.running = True
        self.thread = threading.Thread(target=self._message_listener, daemon=True)
        self.thread.start()
        logger.info("Redis listener thread started")
        return True
        
    def stop(self) -> None:
        """Stop the Redis listener thread."""
        self.running = False
        if self.thread:
            self.thread.join(timeout=2.0)
            self.thread = None
            
        if self.pubsub:
            self.pubsub.close()
            self.pubsub = None
            
        if self.client:
            self.client.close()
            self.client = None
            
        logger.info("Redis service stopped")
        
    def publish(self, channel: str, message: str) -> bool:
        """
        Publish a message to a Redis channel.
        
        Args:
            channel: Redis channel name
            message: String message to publish
            
        Returns:
            bool: True if published successfully, False otherwise
        """
        try:
            if not self.client:
                if not self.connect():
                    logger.error("Cannot publish: not connected to Redis")
                    return False
                    
            self.client.publish(channel, message)
            logger.info(f"Published message to channel {channel}: {message}")
            return True
        except redis.RedisError as e:
            logger.error(f"Error publishing to Redis: {str(e)}")
            self.client = None 
            return False

redis_service = RedisService() 
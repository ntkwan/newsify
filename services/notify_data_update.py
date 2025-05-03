#!/usr/bin/env python3
"""
This script sends a notification to the Redis pub/sub system when your data pipeline
has updated the processed data database. 

Usage:
    python notify_data_update.py [--type TYPE]

    TYPE: Type of update (articles, trending, podcasts, etc.)
          Default is "general"
"""

import os
import sys
import json
import redis
import argparse
import datetime
from dotenv import load_dotenv

load_dotenv()

REDIS_HOST = os.getenv('REDIS_HOST')
REDIS_PORT = int(os.getenv('REDIS_PORT'))
REDIS_USERNAME = os.getenv('REDIS_USERNAME')
REDIS_PASSWORD = os.getenv('REDIS_PASSWORD')
REDIS_CHANNEL = "data-updates"

def send_notification(update_type="general"):
    """
    Send a notification to Redis about data updates.
    
    Args:
        update_type: Type of update (articles, trending, podcasts, etc.)
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        print(f"Connecting to Redis at {REDIS_HOST}:{REDIS_PORT}...")
        client = redis.Redis(
            host=REDIS_HOST,
            port=REDIS_PORT,
            username=REDIS_USERNAME,
            password=REDIS_PASSWORD,
            ssl=True,
            decode_responses=True
        )
        
        client.ping()
        print("Connected to Redis successfully")
        
        message = {
            "update_type": update_type,
            "timestamp": datetime.datetime.now().isoformat(),
            "message": f"Data update of type '{update_type}' completed"
        }
        
        json_message = json.dumps(message)
        
        client.publish(REDIS_CHANNEL, json_message)
        print(f"Published update notification to channel '{REDIS_CHANNEL}'")
        print(f"Message: {json_message}")
        
        return True
    except redis.RedisError as e:
        print(f"Redis error: {str(e)}")
        return False
    except Exception as e:
        print(f"Error: {str(e)}")
        return False
    finally:
        if 'client' in locals():
            client.close()

def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Send a data update notification to Redis pub/sub'
    )
    parser.add_argument(
        '--type', 
        default='general',
        help='Type of update (articles, trending, podcasts, etc.)'
    )
    
    args = parser.parse_args()
    
    success = send_notification(args.type)
    
    if success:
        print("Notification sent successfully")
        sys.exit(0)
    else:
        print("Failed to send notification")
        sys.exit(1)

if __name__ == "__main__":
    main() 
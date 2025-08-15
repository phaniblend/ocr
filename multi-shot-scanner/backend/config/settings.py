# File: backend/config/settings.py
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Flask settings
    DEBUG = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    
    # Anthropic API
    ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')
    
    # Image processing limits
    MAX_IMAGE_SIZE = int(os.getenv('MAX_IMAGE_SIZE', '10485760'))  # 10MB default
    MAX_IMAGE_WIDTH = int(os.getenv('MAX_IMAGE_WIDTH', '4096'))
    MAX_IMAGE_HEIGHT = int(os.getenv('MAX_IMAGE_HEIGHT', '4096'))
    
    # Rate limiting
    RATE_LIMIT = int(os.getenv('RATE_LIMIT', '100'))  # requests per hour
    
    # CORS settings
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', '*')
    
    @classmethod
    def validate(cls):
        """Validate required configuration"""
        if not cls.ANTHROPIC_API_KEY:
            raise ValueError("ANTHROPIC_API_KEY is required in environment variables")
        return True
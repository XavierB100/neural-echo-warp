"""
Configuration settings for Neural Echo application
"""
import os
from pathlib import Path

# Base directory
BASE_DIR = Path(__file__).parent

# Flask Configuration
class Config:
    """Base configuration"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    DEBUG = False
    TESTING = False
    
    # CORS settings
    CORS_ORIGINS = ['http://localhost:5000', 'http://127.0.0.1:5000']
    
    # File upload settings
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5MB max file size
    ALLOWED_EXTENSIONS = {'txt', 'md'}
    
    # Model settings
    DEFAULT_MODEL = 'distilbert'
    MAX_TEXT_LENGTH = 512  # Maximum tokens
    BATCH_SIZE = 8
    
    # Cache settings
    CACHE_DIR = BASE_DIR / 'data' / 'cache'
    CACHE_SIZE = 1000  # Number of cached results
    CACHE_TTL = 3600  # Cache time-to-live in seconds
    
    # Data paths
    EXAMPLE_TEXTS_DIR = BASE_DIR / 'data' / 'example_texts'
    EXPORTS_DIR = BASE_DIR / 'data' / 'exports'
    
    # Model configurations
    MODELS = {
        'distilbert': {
            'name': 'distilbert-base-uncased',
            'display_name': 'DistilBERT Base',
            'description': 'Lightweight BERT model, 66M parameters',
            'max_length': 512,
            'embedding_dim': 768,
            'num_layers': 6,
            'num_heads': 12
        },
        'gpt2': {
            'name': 'gpt2',
            'display_name': 'GPT-2 Small',
            'description': 'OpenAI GPT-2 model, 124M parameters',
            'max_length': 1024,
            'embedding_dim': 768,
            'num_layers': 12,
            'num_heads': 12
        }
    }
    
    # Visualization settings
    VIZ_SETTINGS = {
        'network': {
            'max_nodes': 100,
            'physics_enabled': True,
            'default_layout': 'force'
        },
        'attention': {
            'default_layer': 0,
            'default_head': 0,
            'color_scheme': 'viridis'
        },
        'embedding': {
            'reduction_method': 'UMAP',
            'dimensions': 3,
            'perplexity': 30
        }
    }


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    DEVELOPMENT = True
    
    # Use local cache
    CACHE_TYPE = 'simple'
    
    # Enable hot reloading
    TEMPLATES_AUTO_RELOAD = True
    SEND_FILE_MAX_AGE_DEFAULT = 0


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False
    
    # Use Redis cache in production (optional)
    # CACHE_TYPE = 'redis'
    # CACHE_REDIS_URL = os.environ.get('REDIS_URL')
    
    # Security headers
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'


class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    DEBUG = True
    
    # Use temporary cache for tests
    CACHE_TYPE = 'null'
    
    # Disable CSRF for testing
    WTF_CSRF_ENABLED = False


# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}


def get_config(config_name=None):
    """Get configuration object based on environment"""
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')
    return config.get(config_name, config['default'])

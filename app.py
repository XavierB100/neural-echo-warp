"""
Neural Echo - Interactive Neural Network Text Visualization
Main Flask application
"""
import os
import json
import logging
from pathlib import Path
from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import time

from config import get_config

# Import our modules (we'll create these next)
from models.model_loader import ModelManager
from models.text_processor import TextProcessor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(get_config())

# Enable CORS
CORS(app, origins=app.config['CORS_ORIGINS'])

# Initialize model manager and text processor
model_manager = ModelManager(app.config)
text_processor = TextProcessor(app.config)


def allowed_file(filename):
    """Check if uploaded file has allowed extension"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']


@app.route('/')
def index():
    """Render main application page"""
    return render_template('index.html', 
                         models=app.config['MODELS'],
                         default_model=app.config['DEFAULT_MODEL'])


@app.route('/api/process_text', methods=['POST'])
def process_text():
    """Process text through neural network model"""
    try:
        start_time = time.time()
        
        # Get request data
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        text = data.get('text', '')
        model_name = data.get('model', app.config['DEFAULT_MODEL'])
        options = data.get('options', {})
        
        # Validate input
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        if len(text) > 10000:  # Basic length check
            return jsonify({'error': 'Text too long (max 10000 characters)'}), 400
        
        # Load model if not already loaded
        model, tokenizer = model_manager.get_model(model_name)
        
        # Process text
        result = text_processor.process(
            text=text,
            model=model,
            tokenizer=tokenizer,
            options=options
        )
        
        # Add metadata
        result['metadata'] = {
            'model_name': model_name,
            'processing_time': time.time() - start_time,
            'text_length': len(text),
            'num_tokens': len(result.get('tokens', []))
        }
        
        logger.info(f"Processed text with {model_name}: {result['metadata']['num_tokens']} tokens in {result['metadata']['processing_time']:.2f}s")
        
        # Use Flask's json response with proper configuration for large data
        response = jsonify({
            'success': True,
            'data': result
        })
        response.headers['Content-Type'] = 'application/json'
        return response
        
    except Exception as e:
        logger.error(f"Error processing text: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/upload_file', methods=['POST'])
def upload_file():
    """Handle file upload and process text"""
    try:
        # Check if file is in request
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        # Check if file is selected
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Check file extension
        if not allowed_file(file.filename):
            return jsonify({'error': f'Invalid file type. Allowed: {", ".join(app.config["ALLOWED_EXTENSIONS"])}'}), 400
        
        # Read file content
        text = file.read().decode('utf-8')
        
        # Get model from form data
        model_name = request.form.get('model', app.config['DEFAULT_MODEL'])
        
        # Process text (reuse the process_text logic)
        model, tokenizer = model_manager.get_model(model_name)
        result = text_processor.process(
            text=text,
            model=model,
            tokenizer=tokenizer,
            options={}
        )
        
        # Add file info to metadata
        result['metadata'] = {
            'model_name': model_name,
            'filename': secure_filename(file.filename),
            'file_size': len(text),
            'num_tokens': len(result.get('tokens', []))
        }
        
        return jsonify({
            'success': True,
            'data': result
        })
        
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/models', methods=['GET'])
def get_models():
    """Get list of available models"""
    models = []
    for model_id, config in app.config['MODELS'].items():
        models.append({
            'id': model_id,
            'name': config['display_name'],
            'description': config['description'],
            'loaded': model_manager.is_loaded(model_id)
        })
    
    return jsonify({
        'success': True,
        'models': models,
        'default': app.config['DEFAULT_MODEL']
    })


@app.route('/api/example_texts', methods=['GET'])
def get_example_texts():
    """Get example texts for demonstration"""
    examples = [
        {
            'id': 'simple_1',
            'title': 'Simple Sentence',
            'text': 'The quick brown fox jumps over the lazy dog.',
            'category': 'basic'
        },
        {
            'id': 'simple_2',
            'title': 'Question',
            'text': 'What is the meaning of life, the universe, and everything?',
            'category': 'basic'
        },
        {
            'id': 'tech_1',
            'title': 'Technical Description',
            'text': 'Neural networks process information through layers of interconnected nodes, transforming input data into meaningful outputs.',
            'category': 'technical'
        },
        {
            'id': 'story_1',
            'title': 'Short Story Opening',
            'text': 'Once upon a time, in a land far away, there lived a wise old wizard who knew the secrets of the universe.',
            'category': 'narrative'
        },
        {
            'id': 'code_1',
            'title': 'Code Comment',
            'text': 'This function calculates the attention weights between tokens in a sequence using scaled dot-product attention.',
            'category': 'technical'
        }
    ]
    
    return jsonify({
        'success': True,
        'examples': examples
    })


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'models_loaded': model_manager.get_loaded_models(),
        'config': app.config['FLASK_ENV'] if 'FLASK_ENV' in app.config else 'development'
    })


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    if request.path.startswith('/api/'):
        return jsonify({'error': 'Endpoint not found'}), 404
    return render_template('404.html'), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    logger.error(f"Internal server error: {str(error)}")
    if request.path.startswith('/api/'):
        return jsonify({'error': 'Internal server error'}), 500
    return render_template('500.html'), 500


if __name__ == '__main__':
    # Create necessary directories
    Path(app.config['CACHE_DIR']).mkdir(parents=True, exist_ok=True)
    Path(app.config['EXPORTS_DIR']).mkdir(parents=True, exist_ok=True)
    
    # Pre-load default model for faster first request
    logger.info("Pre-loading default model...")
    model_manager.get_model(app.config['DEFAULT_MODEL'])
    logger.info("Model loaded successfully!")
    
    # Run the application
    app.run(
        host='127.0.0.1',
        port=5000,
        debug=app.config['DEBUG']
    )

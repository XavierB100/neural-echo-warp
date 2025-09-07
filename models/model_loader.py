"""
Model loading and management for Neural Echo
Handles loading, caching, and serving of transformer models
"""
import logging
from typing import Dict, Tuple, Optional, Any
import torch
from transformers import (
    AutoModel,
    AutoTokenizer,
    DistilBertModel,
    DistilBertTokenizer,
    GPT2Model,
    GPT2Tokenizer
)
from cachetools import LRUCache
import gc

logger = logging.getLogger(__name__)


class ModelManager:
    """
    Manages loading and caching of transformer models
    """
    
    # Model mapping for specific model types
    MODEL_CLASSES = {
        'distilbert': (DistilBertModel, DistilBertTokenizer),
        'gpt2': (GPT2Model, GPT2Tokenizer)
    }
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize model manager
        
        Args:
            config: Application configuration
        """
        self.config = config
        self.models: Dict[str, Tuple[Any, Any]] = {}
        self.cache = LRUCache(maxsize=config.get('CACHE_SIZE', 1000))
        
        # Set device (CPU for now, GPU support can be added later)
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        logger.info(f"Using device: {self.device}")
        
        # Set torch to not compute gradients (inference only)
        torch.set_grad_enabled(False)
    
    def get_model(self, model_name: str) -> Tuple[Any, Any]:
        """
        Get or load a model and its tokenizer
        
        Args:
            model_name: Name of the model to load
            
        Returns:
            Tuple of (model, tokenizer)
        """
        # Check if model is already loaded
        if model_name in self.models:
            logger.debug(f"Using cached model: {model_name}")
            return self.models[model_name]
        
        # Load the model
        logger.info(f"Loading model: {model_name}")
        model, tokenizer = self._load_model(model_name)
        
        # Cache the model
        self.models[model_name] = (model, tokenizer)
        
        return model, tokenizer
    
    def _load_model(self, model_name: str) -> Tuple[Any, Any]:
        """
        Load a model from disk or HuggingFace hub
        
        Args:
            model_name: Name of the model to load
            
        Returns:
            Tuple of (model, tokenizer)
        """
        if model_name not in self.config['MODELS']:
            raise ValueError(f"Unknown model: {model_name}")
        
        model_config = self.config['MODELS'][model_name]
        model_path = model_config['name']
        
        try:
            # Get model and tokenizer classes
            if model_name in self.MODEL_CLASSES:
                model_class, tokenizer_class = self.MODEL_CLASSES[model_name]
                
                # Load tokenizer
                logger.info(f"Loading tokenizer: {model_path}")
                tokenizer = tokenizer_class.from_pretrained(model_path)
                
                # Load model
                logger.info(f"Loading model weights: {model_path}")
                model = model_class.from_pretrained(
                    model_path,
                    output_attentions=True,  # We need attention weights for visualization
                    output_hidden_states=True  # We might need hidden states for some visualizations
                )
            else:
                # Fallback to AutoModel for other model types
                logger.info(f"Loading model with AutoModel: {model_path}")
                tokenizer = AutoTokenizer.from_pretrained(model_path)
                model = AutoModel.from_pretrained(
                    model_path,
                    output_attentions=True,
                    output_hidden_states=True
                )
            
            # Move model to device
            model = model.to(self.device)
            
            # Set model to evaluation mode
            model.eval()
            
            logger.info(f"Successfully loaded model: {model_name}")
            
            # Log model info
            param_count = sum(p.numel() for p in model.parameters())
            logger.info(f"Model parameters: {param_count:,}")
            
            return model, tokenizer
            
        except Exception as e:
            logger.error(f"Error loading model {model_name}: {str(e)}")
            raise RuntimeError(f"Failed to load model {model_name}: {str(e)}")
    
    def is_loaded(self, model_name: str) -> bool:
        """
        Check if a model is already loaded
        
        Args:
            model_name: Name of the model
            
        Returns:
            True if model is loaded, False otherwise
        """
        return model_name in self.models
    
    def get_loaded_models(self) -> list:
        """
        Get list of currently loaded models
        
        Returns:
            List of loaded model names
        """
        return list(self.models.keys())
    
    def unload_model(self, model_name: str) -> bool:
        """
        Unload a model to free memory
        
        Args:
            model_name: Name of the model to unload
            
        Returns:
            True if model was unloaded, False if it wasn't loaded
        """
        if model_name in self.models:
            logger.info(f"Unloading model: {model_name}")
            del self.models[model_name]
            
            # Force garbage collection to free memory
            gc.collect()
            
            # Clear CUDA cache if using GPU
            if self.device.type == 'cuda':
                torch.cuda.empty_cache()
            
            return True
        
        return False
    
    def clear_cache(self):
        """Clear the result cache"""
        self.cache.clear()
        logger.info("Cleared model cache")
    
    def get_model_info(self, model_name: str) -> Dict[str, Any]:
        """
        Get information about a model
        
        Args:
            model_name: Name of the model
            
        Returns:
            Dictionary with model information
        """
        if model_name not in self.config['MODELS']:
            raise ValueError(f"Unknown model: {model_name}")
        
        info = self.config['MODELS'][model_name].copy()
        info['loaded'] = self.is_loaded(model_name)
        info['device'] = str(self.device)
        
        if self.is_loaded(model_name):
            model, tokenizer = self.models[model_name]
            info['vocab_size'] = tokenizer.vocab_size
            info['param_count'] = sum(p.numel() for p in model.parameters())
        
        return info

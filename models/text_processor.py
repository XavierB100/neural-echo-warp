"""
Text processing module for Neural Echo
Handles tokenization, attention extraction, and data preparation
"""
import logging
from typing import Dict, List, Any, Optional
import torch
import numpy as np
from cachetools import LRUCache
import hashlib
import json

logger = logging.getLogger(__name__)


class TextProcessor:
    """
    Processes text through transformer models and extracts visualization data
    """
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize text processor
        
        Args:
            config: Application configuration
        """
        self.config = config
        self.max_length = config.get('MAX_TEXT_LENGTH', 512)
        
        # Cache for processed results
        self.cache = LRUCache(maxsize=config.get('CACHE_SIZE', 1000))
        
        # Device for tensor operations
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    
    def process(self, 
                text: str, 
                model: Any, 
                tokenizer: Any,
                options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Process text through model and extract visualization data
        
        Args:
            text: Input text to process
            model: Transformer model
            tokenizer: Model tokenizer
            options: Processing options
            
        Returns:
            Dictionary containing tokens, embeddings, attention weights, etc.
        """
        options = options or {}
        
        # Create cache key
        cache_key = self._get_cache_key(text, model.__class__.__name__, options)
        
        # Check cache
        if cache_key in self.cache:
            logger.debug("Using cached result")
            return self.cache[cache_key]
        
        # Process the text
        result = self._process_text(text, model, tokenizer, options)
        
        # Cache the result
        self.cache[cache_key] = result
        
        return result
    
    def _process_text(self,
                      text: str,
                      model: Any,
                      tokenizer: Any,
                      options: Dict[str, Any]) -> Dict[str, Any]:
        """
        Internal method to process text through model
        
        Args:
            text: Input text
            model: Transformer model
            tokenizer: Model tokenizer
            options: Processing options
            
        Returns:
            Processed data dictionary
        """
        try:
            # Tokenize the text
            logger.debug(f"Tokenizing text: {text[:100]}...")
            
            # Use tokenizer with proper settings
            inputs = tokenizer(
                text,
                return_tensors='pt',
                max_length=self.max_length,
                truncation=True,
                padding=True,
                return_attention_mask=True
            )
            
            # Move inputs to device
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            
            # Get model outputs
            logger.debug("Running model inference...")
            with torch.no_grad():
                outputs = model(**inputs)
            
            # Extract data based on options
            result = self._extract_visualization_data(
                inputs=inputs,
                outputs=outputs,
                tokenizer=tokenizer,
                options=options
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Error processing text: {str(e)}")
            raise RuntimeError(f"Failed to process text: {str(e)}")
    
    def _extract_visualization_data(self,
                                   inputs: Dict[str, torch.Tensor],
                                   outputs: Any,
                                   tokenizer: Any,
                                   options: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract visualization data from model outputs
        
        Args:
            inputs: Model inputs
            outputs: Model outputs
            tokenizer: Model tokenizer
            options: Extraction options
            
        Returns:
            Dictionary with visualization data
        """
        result = {}
        
        # Get tokens
        token_ids = inputs['input_ids'][0].cpu().numpy().tolist()
        tokens = tokenizer.convert_ids_to_tokens(token_ids)
        
        # Clean up tokens (remove special tokens markers)
        clean_tokens = []
        for token in tokens:
            if token in ['[CLS]', '[SEP]', '[PAD]', '<s>', '</s>', '<pad>']:
                clean_tokens.append(token)
            elif token.startswith('##'):
                # Handle subword tokens (BERT-style)
                clean_tokens.append(token[2:])
            elif token.startswith('Ġ'):
                # Handle subword tokens (GPT-style)
                clean_tokens.append(token[1:])
            else:
                clean_tokens.append(token)
        
        result['tokens'] = clean_tokens
        result['token_ids'] = token_ids
        
        # Get attention mask
        attention_mask = inputs['attention_mask'][0].cpu().numpy().tolist()
        result['attention_mask'] = attention_mask
        
        # Extract embeddings if requested
        if options.get('return_embeddings', True):
            # Get the last hidden state (embeddings)
            if hasattr(outputs, 'last_hidden_state'):
                embeddings = outputs.last_hidden_state[0].cpu().numpy()
                result['embeddings'] = embeddings.tolist()
                
                # Calculate some embedding statistics
                result['embedding_stats'] = {
                    'mean': float(np.mean(embeddings)),
                    'std': float(np.std(embeddings)),
                    'shape': list(embeddings.shape)
                }
        
        # Extract attention weights if requested
        if options.get('return_attention', True) and hasattr(outputs, 'attentions'):
            attention_data = self._process_attention(outputs.attentions)
            result['attention'] = attention_data
        
        # Extract hidden states if requested
        if options.get('return_hidden_states', False) and hasattr(outputs, 'hidden_states'):
            hidden_states_data = self._process_hidden_states(outputs.hidden_states)
            result['hidden_states'] = hidden_states_data
        
        return result
    
    def _process_attention(self, attentions: tuple) -> Dict[str, Any]:
        """
        Process attention weights from model output
        
        Args:
            attentions: Tuple of attention tensors from each layer
            
        Returns:
            Dictionary with processed attention data
        """
        attention_data = {
            'num_layers': len(attentions),
            'layers': {}
        }
        
        for layer_idx, layer_attention in enumerate(attentions):
            # layer_attention shape: (batch, num_heads, seq_len, seq_len)
            layer_attention = layer_attention[0].cpu().numpy()  # Remove batch dimension
            
            # Store attention for each head
            layer_data = {
                'num_heads': layer_attention.shape[0],
                'heads': {}
            }
            
            for head_idx in range(layer_attention.shape[0]):
                head_attention = layer_attention[head_idx]
                
                # Convert to list and calculate statistics
                layer_data['heads'][f'head_{head_idx}'] = {
                    'weights': head_attention.tolist(),
                    'stats': {
                        'max': float(np.max(head_attention)),
                        'min': float(np.min(head_attention)),
                        'mean': float(np.mean(head_attention)),
                        'std': float(np.std(head_attention))
                    }
                }
            
            # Calculate average attention across heads
            avg_attention = np.mean(layer_attention, axis=0)
            layer_data['average'] = {
                'weights': avg_attention.tolist(),
                'stats': {
                    'max': float(np.max(avg_attention)),
                    'min': float(np.min(avg_attention)),
                    'mean': float(np.mean(avg_attention)),
                    'std': float(np.std(avg_attention))
                }
            }
            
            attention_data['layers'][f'layer_{layer_idx}'] = layer_data
        
        return attention_data
    
    def _process_hidden_states(self, hidden_states: tuple) -> Dict[str, Any]:
        """
        Process hidden states from model output
        
        Args:
            hidden_states: Tuple of hidden state tensors from each layer
            
        Returns:
            Dictionary with processed hidden states data
        """
        hidden_states_data = {
            'num_layers': len(hidden_states),
            'layers': {}
        }
        
        for layer_idx, layer_hidden in enumerate(hidden_states):
            # layer_hidden shape: (batch, seq_len, hidden_dim)
            layer_hidden = layer_hidden[0].cpu().numpy()  # Remove batch dimension
            
            # Store summary statistics (full hidden states would be too large)
            hidden_states_data['layers'][f'layer_{layer_idx}'] = {
                'shape': list(layer_hidden.shape),
                'stats': {
                    'mean': float(np.mean(layer_hidden)),
                    'std': float(np.std(layer_hidden)),
                    'min': float(np.min(layer_hidden)),
                    'max': float(np.max(layer_hidden))
                },
                # Store norms for each token position (useful for visualization)
                'token_norms': np.linalg.norm(layer_hidden, axis=1).tolist()
            }
        
        return hidden_states_data
    
    def _get_cache_key(self, text: str, model_name: str, options: Dict[str, Any]) -> str:
        """
        Generate cache key for processed result
        
        Args:
            text: Input text
            model_name: Name of the model
            options: Processing options
            
        Returns:
            Cache key string
        """
        # Create a unique key based on text, model, and options
        key_data = {
            'text': text,
            'model': model_name,
            'options': options
        }
        key_string = json.dumps(key_data, sort_keys=True)
        return hashlib.md5(key_string.encode()).hexdigest()
    
    def clear_cache(self):
        """Clear the processing cache"""
        self.cache.clear()
        logger.info("Cleared text processing cache")

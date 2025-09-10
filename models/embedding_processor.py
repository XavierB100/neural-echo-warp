"""
Embedding processor module for Neural Echo
Handles dimensionality reduction and embedding visualization preparation
"""
import logging
from typing import Dict, List, Any, Optional, Tuple
import numpy as np
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE

# UMAP is optional - currently using PCA/t-SNE due to compatibility issues
UMAP_AVAILABLE = False

logger = logging.getLogger(__name__)


class EmbeddingProcessor:
    """
    Processes high-dimensional embeddings for visualization
    """
    
    def __init__(self):
        """Initialize embedding processor"""
        self.reducers = {
            'pca': self._reduce_pca,
            'tsne': self._reduce_tsne,
            'umap': self._reduce_umap
        }
    
    def reduce_embeddings(self,
                         embeddings: np.ndarray,
                         method: str = 'umap',
                         n_components: int = 3,
                         **kwargs) -> Dict[str, Any]:
        """
        Reduce high-dimensional embeddings to 2D or 3D
        
        Args:
            embeddings: Array of shape (n_tokens, embedding_dim)
            method: Reduction method ('pca', 'tsne', 'umap')
            n_components: Number of dimensions (2 or 3)
            **kwargs: Additional parameters for reduction method
            
        Returns:
            Dictionary with reduced coordinates and metadata
        """
        if method not in self.reducers:
            raise ValueError(f"Unknown reduction method: {method}")
        
        if n_components not in [2, 3]:
            raise ValueError("n_components must be 2 or 3")
        
        logger.info(f"Reducing {embeddings.shape[0]} embeddings from {embeddings.shape[1]}D to {n_components}D using {method.upper()}")
        
        # Apply reduction
        reduced = self.reducers[method](embeddings, n_components, **kwargs)
        
        # Normalize to [-1, 1] range for better visualization
        reduced_normalized = self._normalize_coordinates(reduced)
        
        # Calculate statistics
        stats = self._calculate_stats(embeddings, reduced_normalized)
        
        return {
            'coordinates': reduced_normalized.tolist(),
            'method': method,
            'n_components': n_components,
            'original_dim': embeddings.shape[1],
            'stats': stats
        }
    
    def _reduce_pca(self, embeddings: np.ndarray, n_components: int, **kwargs) -> np.ndarray:
        """Apply PCA reduction"""
        pca = PCA(n_components=n_components, random_state=42)
        return pca.fit_transform(embeddings)
    
    def _reduce_tsne(self, embeddings: np.ndarray, n_components: int, **kwargs) -> np.ndarray:
        """Apply t-SNE reduction"""
        perplexity = kwargs.get('perplexity', min(30, embeddings.shape[0] - 1))
        
        # For large datasets, use PCA first to speed up t-SNE
        if embeddings.shape[0] > 50 and embeddings.shape[1] > 50:
            pca = PCA(n_components=50, random_state=42)
            embeddings = pca.fit_transform(embeddings)
        
        tsne = TSNE(
            n_components=n_components,
            perplexity=perplexity,
            random_state=42,
            n_iter=1000
        )
        return tsne.fit_transform(embeddings)
    
    def _reduce_umap(self, embeddings: np.ndarray, n_components: int, **kwargs) -> np.ndarray:
        """Apply UMAP reduction"""
        if not UMAP_AVAILABLE:
            logger.warning("UMAP not available, falling back to PCA")
            return self._reduce_pca(embeddings, n_components, **kwargs)
        
        n_neighbors = kwargs.get('n_neighbors', min(15, embeddings.shape[0] - 1))
        min_dist = kwargs.get('min_dist', 0.1)
        
        reducer = umap.UMAP(
            n_components=n_components,
            n_neighbors=n_neighbors,
            min_dist=min_dist,
            random_state=42
        )
        return reducer.fit_transform(embeddings)
    
    def _normalize_coordinates(self, coords: np.ndarray) -> np.ndarray:
        """Normalize coordinates to [-1, 1] range"""
        min_vals = coords.min(axis=0)
        max_vals = coords.max(axis=0)
        range_vals = max_vals - min_vals
        
        # Avoid division by zero
        range_vals[range_vals == 0] = 1
        
        normalized = 2 * (coords - min_vals) / range_vals - 1
        return normalized
    
    def _calculate_stats(self, original: np.ndarray, reduced: np.ndarray) -> Dict[str, Any]:
        """Calculate statistics about the reduction"""
        # Calculate pairwise distances preservation (sample for large datasets)
        n_samples = min(100, original.shape[0])
        if n_samples > 1:
            indices = np.random.choice(original.shape[0], n_samples, replace=False)
            orig_sample = original[indices]
            reduced_sample = reduced[indices]
            
            # Calculate correlation of pairwise distances
            from scipy.spatial.distance import pdist
            from scipy.stats import spearmanr
            
            orig_distances = pdist(orig_sample)
            reduced_distances = pdist(reduced_sample)
            
            if len(orig_distances) > 0:
                correlation, _ = spearmanr(orig_distances, reduced_distances)
            else:
                correlation = 0.0
        else:
            correlation = 0.0
        
        return {
            'distance_correlation': float(correlation) if not np.isnan(correlation) else 0.0,
            'n_tokens': original.shape[0],
            'original_dim': original.shape[1],
            'reduced_dim': reduced.shape[1]
        }
    
    def get_layer_embeddings(self,
                           hidden_states: List[np.ndarray],
                           layer_indices: Optional[List[int]] = None) -> Dict[str, np.ndarray]:
        """
        Extract embeddings from specific layers
        
        Args:
            hidden_states: List of hidden states from each layer
            layer_indices: Specific layers to extract (None = all layers)
            
        Returns:
            Dictionary mapping layer names to embeddings
        """
        if layer_indices is None:
            layer_indices = list(range(len(hidden_states)))
        
        layer_embeddings = {}
        for idx in layer_indices:
            if idx < len(hidden_states):
                layer_embeddings[f'layer_{idx}'] = hidden_states[idx]
        
        return layer_embeddings
    
    def prepare_flow_data(self,
                         hidden_states: List[np.ndarray],
                         tokens: List[str],
                         max_tokens: int = 50) -> Dict[str, Any]:
        """
        Prepare data for layer flow visualization
        
        Args:
            hidden_states: List of hidden states from each layer
            tokens: List of token strings
            max_tokens: Maximum number of tokens to visualize
            
        Returns:
            Dictionary with flow visualization data
        """
        # Limit tokens for performance
        n_tokens = min(len(tokens), max_tokens)
        tokens = tokens[:n_tokens]
        
        layers_data = []
        
        for layer_idx, layer_state in enumerate(hidden_states):
            # Reduce dimensionality for visualization (to 2D for simplicity)
            if layer_state.shape[1] > 2:
                pca = PCA(n_components=2, random_state=42)
                reduced = pca.fit_transform(layer_state[:n_tokens])
            else:
                reduced = layer_state[:n_tokens]
            
            # Normalize
            reduced = self._normalize_coordinates(reduced)
            
            layer_data = {
                'layer_id': f'layer_{layer_idx}',
                'layer_index': layer_idx,
                'tokens': [
                    {
                        'id': f'token_{i}_layer_{layer_idx}',
                        'token': tokens[i],
                        'position': i,
                        'x': float(reduced[i, 0]),
                        'y': float(reduced[i, 1]) if reduced.shape[1] > 1 else 0.0
                    }
                    for i in range(n_tokens)
                ]
            }
            layers_data.append(layer_data)
        
        return {
            'layers': layers_data,
            'n_layers': len(hidden_states),
            'n_tokens': n_tokens,
            'total_tokens': len(tokens)
        }

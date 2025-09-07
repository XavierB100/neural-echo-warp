# 🧠 Neural Echo - Development Documentation
*Internal Technical Reference - Last Updated: January 2025*

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Technical Architecture](#technical-architecture)
3. [Implementation Phases](#implementation-phases)
4. [API Endpoints](#api-endpoints)
5. [Data Structures](#data-structures)
6. [Visualization Specifications](#visualization-specifications)
7. [Dependencies & Setup](#dependencies-setup)
8. [Development Workflow](#development-workflow)
9. [Testing Strategy](#testing-strategy)
10. [Performance Considerations](#performance-considerations)

---

## 🎯 Project Overview

### Core Concept
Neural Echo visualizes how transformer-based neural networks (specifically DistilBERT and GPT-2) process text input. Users input text and explore multiple interactive visualization modes showing tokenization, embeddings, attention mechanisms, and layer-by-layer processing.

### Key Features
- **Input Methods**: Direct text input or file upload (.txt, .md)
- **Multiple Visualization Modes**: 5 distinct visualization types
- **Real-time Interactivity**: Zoom, pan, click, hover, drag
- **Educational Focus**: Tooltips, explanations, guided exploration
- **Local-First**: Optimized for laptop deployment

### Success Criteria
- Response time < 2 seconds for 512 tokens
- Smooth 60fps interactions
- Clear educational value
- Intuitive UI/UX
- Maintainable codebase

---

## 🏗️ Technical Architecture

### Directory Structure
```
neural-echo/
├── app.py                          # Flask application entry point
├── config.py                       # Configuration settings
├── requirements.txt                # Python dependencies
├── package.json                    # JavaScript dependencies
│
├── models/
│   ├── __init__.py
│   ├── model_loader.py            # Load and cache models
│   ├── text_processor.py          # Tokenization and preprocessing
│   ├── attention_extractor.py     # Extract attention weights
│   ├── embedding_processor.py     # Handle embedding operations
│   └── cache_manager.py           # Cache frequently used computations
│
├── visualizers/
│   ├── __init__.py
│   ├── network_builder.py         # Convert model data to vis format
│   ├── attention_mapper.py        # Map attention to visual connections
│   ├── embedding_projector.py     # Project high-dim embeddings to 2D/3D
│   ├── layer_flow_builder.py      # Build layer-by-layer visualization
│   └── data_formatter.py          # Format data for frontend
│
├── static/
│   ├── css/
│   │   ├── main.css              # Main stylesheet
│   │   ├── themes.css            # Dark/light themes
│   │   └── visualizations.css    # Visualization-specific styles
│   │
│   ├── js/
│   │   ├── app.js                # Main application logic
│   │   ├── network-vis.js        # Force-directed network graph
│   │   ├── attention-heatmap.js  # Attention matrix visualization
│   │   ├── embedding-space.js    # 3D/2D embedding visualization
│   │   ├── layer-flow.js         # Layer progression visualization
│   │   ├── interactions.js       # User interaction handlers
│   │   ├── api-client.js         # Backend communication
│   │   └── utils.js              # Utility functions
│   │
│   └── libs/                     # Third-party libraries
│       ├── d3.v7.min.js
│       ├── three.min.js
│       └── vis-network.min.js
│
├── templates/
│   ├── index.html                # Main application template
│   ├── components/
│   │   ├── input_panel.html      # Text input interface
│   │   ├── viz_controls.html     # Visualization controls
│   │   └── info_panel.html       # Educational information panel
│   └── base.html                 # Base template
│
├── data/
│   ├── example_texts/            # Pre-loaded example texts
│   ├── cache/                    # Cached computations
│   └── exports/                  # User exports
│
└── tests/
    ├── test_models.py
    ├── test_visualizers.py
    └── test_api.py
```

### Backend Architecture (Flask + PyTorch)

#### Core Components
```python
# Model Management
model_manager = {
    'distilbert': DistilBertModel,
    'gpt2-small': GPT2Model,
    'current_model': None,
    'tokenizer': None,
    'cache': LRUCache(maxsize=1000)
}

# Request Processing Pipeline
1. Receive text input
2. Validate and sanitize
3. Check cache for existing computation
4. Tokenize text
5. Process through model
6. Extract visualization data
7. Format for frontend
8. Return JSON response
```

### Frontend Architecture

#### Visualization Library Stack
- **D3.js v7**: Primary visualization library
- **Three.js**: 3D embedding space
- **Vis.js**: Alternative network graphs
- **Native Canvas**: Performance-critical rendering

#### State Management
```javascript
const appState = {
    currentText: '',
    currentMode: 'network',  // network | attention | embedding | flow | similarity
    modelData: null,
    visualizationData: null,
    interactionState: {
        selectedNode: null,
        hoveredConnection: null,
        zoomLevel: 1,
        panOffset: {x: 0, y: 0}
    },
    settings: {
        theme: 'dark',
        animationSpeed: 'medium',
        detailLevel: 'standard'
    }
};
```

---

## 📊 Data Structures

### Model Output Format
```python
{
    "tokens": ["The", "cat", "sat", "on", "the", "mat"],
    "token_ids": [101, 1996, 4937, 2938, 2006, 1996, 13523, 102],
    "embeddings": [
        [0.123, -0.456, ...],  # 768-dimensional vectors
        ...
    ],
    "attention_weights": {
        "layer_0": {
            "head_0": [[0.1, 0.2, ...], ...],
            "head_1": [[0.15, 0.25, ...], ...],
            ...
        },
        ...
    },
    "hidden_states": [...],  # Per-layer hidden states
    "metadata": {
        "model_name": "distilbert-base-uncased",
        "num_layers": 6,
        "num_heads": 12,
        "embedding_dim": 768,
        "processing_time": 0.234
    }
}
```

### Visualization Data Format
```javascript
// Network Graph Format
{
    "nodes": [
        {
            "id": "token_0",
            "label": "The",
            "group": "determiner",
            "size": 10,
            "x": null,  // Let force-directed layout determine
            "y": null,
            "data": {
                "embedding": [...],
                "position": 0,
                "attention_received": 0.15,
                "pos_tag": "DET"
            }
        },
        ...
    ],
    "edges": [
        {
            "id": "edge_0_1",
            "source": "token_0",
            "target": "token_1",
            "weight": 0.23,
            "layer": 0,
            "head": 0,
            "data": {
                "attention_value": 0.23,
                "normalized_value": 0.45,
                "percentile": 85
            }
        },
        ...
    ]
}

// Attention Heatmap Format
{
    "matrix": [[...]],  // 2D attention matrix
    "labels": ["The", "cat", ...],
    "layer": 0,
    "head": 0,
    "statistics": {
        "max": 0.89,
        "min": 0.01,
        "mean": 0.15,
        "std": 0.12
    }
}

// Embedding Space Format
{
    "points": [
        {
            "token": "cat",
            "coordinates": {
                "x": 0.234,  // After dimensionality reduction
                "y": -0.123,
                "z": 0.456   // For 3D mode
            },
            "original_embedding": [...],
            "cluster": 0,
            "neighbors": ["dog", "kitten", "pet"]
        },
        ...
    ],
    "clusters": [...],
    "reduction_method": "UMAP"  // or "t-SNE", "PCA"
}
```

---

## 🎨 Visualization Specifications

### Mode 1: Token Network Graph
```javascript
// Configuration
const networkConfig = {
    physics: {
        enabled: true,
        forceAtlas2Based: {
            gravitationalConstant: -50,
            centralGravity: 0.01,
            springLength: 100,
            springConstant: 0.08
        }
    },
    interaction: {
        hover: true,
        zoomView: true,
        dragNodes: true,
        dragView: true
    },
    nodes: {
        shape: 'circle',
        scaling: {
            min: 10,
            max: 30,
            label: {
                enabled: true,
                min: 14,
                max: 30
            }
        }
    },
    edges: {
        width: 1,
        color: {
            opacity: 0.5
        },
        smooth: {
            type: 'curvedCW',
            roundness: 0.2
        }
    }
};
```

### Mode 2: Attention Heatmap
```javascript
// Heatmap Configuration
const heatmapConfig = {
    colorScale: d3.scaleSequential(d3.interpolateViridis),
    cellSize: 30,
    margin: {top: 100, right: 50, bottom: 50, left: 100},
    showValues: true,
    interactive: true,
    animations: {
        duration: 300,
        easing: 'easeQuadInOut'
    }
};
```

### Mode 3: Embedding Space (3D/2D)
```javascript
// Three.js Scene Configuration
const embeddingConfig = {
    camera: {
        fov: 75,
        near: 0.1,
        far: 1000,
        position: [0, 0, 500]
    },
    controls: {
        enableDamping: true,
        dampingFactor: 0.05,
        rotateSpeed: 0.5,
        zoomSpeed: 1.2
    },
    points: {
        size: 5,
        sizeAttenuation: true,
        vertexColors: true
    },
    dimensionReduction: {
        method: 'UMAP',  // or 't-SNE', 'PCA'
        dimensions: 3,    // or 2
        parameters: {
            n_neighbors: 15,
            min_dist: 0.1
        }
    }
};
```

### Mode 4: Layer-by-Layer Flow
```javascript
// Flow Visualization Configuration
const flowConfig = {
    layout: 'vertical',
    layerSpacing: 150,
    nodeSpacing: 50,
    showAllConnections: false,  // Too many connections can clutter
    highlightPath: true,
    animation: {
        stepDuration: 500,
        autoPlay: false
    }
};
```

### Mode 5: Semantic Similarity Network
```javascript
// Similarity Network Configuration
const similarityConfig = {
    threshold: 0.7,  // Minimum similarity to show connection
    layout: 'force',
    clustering: {
        enabled: true,
        method: 'louvain'
    },
    nodeSize: 'betweenness',  // Size by centrality metric
    edgeWidth: 'similarity'   // Width by similarity score
};
```

---

## 🔌 API Endpoints

### Text Processing Endpoints

#### POST /api/process_text
```python
# Request
{
    "text": "The cat sat on the mat",
    "model": "distilbert",  # or "gpt2"
    "options": {
        "max_length": 512,
        "return_attention": true,
        "return_embeddings": true,
        "return_hidden_states": false
    }
}

# Response
{
    "success": true,
    "data": {
        "tokens": [...],
        "embeddings": [...],
        "attention": {...},
        "metadata": {...}
    },
    "processing_time": 0.234
}
```

#### POST /api/upload_file
```python
# Multipart form data
file: (binary)
model: "distilbert"

# Response: Same as process_text
```

### Visualization Endpoints

#### POST /api/get_visualization
```python
# Request
{
    "model_output": {...},  # From process_text
    "visualization_type": "network",  # network|attention|embedding|flow|similarity
    "options": {
        "layer": 0,
        "head": 0,
        "reduction_method": "UMAP"
    }
}

# Response
{
    "success": true,
    "visualization_data": {...},  # Format depends on type
    "suggestions": [...],  # Suggested interactions/insights
    "render_time": 0.123
}
```

#### GET /api/export_visualization
```python
# Query parameters
?format=png|svg|json
&visualization_id=xxx

# Response: Binary data or JSON
```

### Utility Endpoints

#### GET /api/models
```python
# Response
{
    "available_models": [
        {
            "id": "distilbert",
            "name": "DistilBERT Base",
            "size": "66M parameters",
            "capabilities": ["embeddings", "attention"],
            "loaded": true
        },
        ...
    ]
}
```

#### GET /api/example_texts
```python
# Response
{
    "examples": [
        {
            "id": "simple_1",
            "title": "Simple Sentence",
            "text": "The quick brown fox jumps over the lazy dog.",
            "category": "basic"
        },
        ...
    ]
}
```

---

## 🚀 Implementation Phases

### Phase 1: Foundation (Week 1)
**Goal**: Basic Flask app with text processing

#### Tasks
- [ ] Set up Flask application structure
- [ ] Install and configure PyTorch + Transformers
- [ ] Load DistilBERT model
- [ ] Create basic text tokenization endpoint
- [ ] Build simple HTML interface with text input
- [ ] Implement basic API communication

#### Deliverables
- Working Flask server
- Text input → tokenization → response
- Basic web interface

### Phase 2: Core Visualization (Week 2-3)
**Goal**: Implement primary network visualization

#### Tasks
- [ ] Extract attention weights from model
- [ ] Build network graph data structure
- [ ] Implement D3.js force-directed graph
- [ ] Add basic zoom/pan functionality
- [ ] Create node hover tooltips
- [ ] Add edge weight visualization

#### Deliverables
- Interactive network graph
- Attention weight visualization
- Basic interactivity

### Phase 3: Multiple Visualization Modes (Week 4)
**Goal**: Add remaining visualization types

#### Tasks
- [ ] Implement attention heatmap
- [ ] Add embedding space visualization (2D first)
- [ ] Create layer flow diagram
- [ ] Build mode switching UI
- [ ] Optimize switching performance

#### Deliverables
- All 5 visualization modes working
- Smooth mode transitions
- Consistent interaction patterns

### Phase 4: Advanced Interactivity (Week 5)
**Goal**: Rich interaction features

#### Tasks
- [ ] Add node clicking for detailed view
- [ ] Implement connection filtering
- [ ] Add search/highlight functionality
- [ ] Create comparison mode
- [ ] Build animation controls
- [ ] Add 3D embedding view

#### Deliverables
- Full interaction suite
- Comparison capabilities
- 3D visualization option

### Phase 5: Polish & Optimization (Week 6+)
**Goal**: Production-ready application

#### Tasks
- [ ] Implement caching system
- [ ] Add dark/light themes
- [ ] Create guided tutorials
- [ ] Build export functionality
- [ ] Optimize performance
- [ ] Add comprehensive error handling
- [ ] Write user documentation

#### Deliverables
- Polished, performant application
- Export capabilities
- User documentation

---

## 🔧 Dependencies & Setup

### Python Dependencies
```txt
# Core
Flask==2.3.3
Flask-CORS==4.0.0
torch==2.0.1
transformers==4.33.0

# Processing
numpy==1.24.3
scipy==1.11.2
scikit-learn==1.3.0
umap-learn==0.5.3

# Utilities
python-dotenv==1.0.0
cachetools==5.3.1
```

### JavaScript Dependencies
```json
{
  "dependencies": {
    "d3": "^7.8.5",
    "three": "^0.155.0",
    "vis-network": "^9.1.6"
  }
}
```

### Environment Setup
```bash
# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Download models (run once)
python -c "from transformers import AutoModel, AutoTokenizer; AutoModel.from_pretrained('distilbert-base-uncased'); AutoTokenizer.from_pretrained('distilbert-base-uncased')"
```

---

## 💻 Development Workflow

### Git Branch Strategy
```
main
├── develop
│   ├── feature/phase-1-foundation
│   ├── feature/phase-2-visualization
│   ├── feature/phase-3-modes
│   ├── feature/phase-4-interactivity
│   └── feature/phase-5-polish
└── hotfix/*
```

### Commit Message Format
```
type(scope): description

- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Formatting
- refactor: Code restructuring
- test: Adding tests
- chore: Maintenance
```

### Code Style Guidelines

#### Python
- Follow PEP 8
- Use type hints
- Docstrings for all functions
- Max line length: 100

#### JavaScript
- Use ES6+ features
- Semicolons required
- 2-space indentation
- JSDoc comments

### Development Commands
```bash
# Run development server
flask run --debug

# Run tests
pytest tests/

# Format code
black . --line-length 100
prettier --write "static/**/*.js"

# Check types
mypy app.py
```

---

## 🧪 Testing Strategy

### Unit Tests
```python
# Test model loading
def test_model_loads_correctly():
    model = load_model('distilbert')
    assert model is not None

# Test tokenization
def test_tokenization():
    tokens = tokenize_text("Hello world")
    assert len(tokens) > 0

# Test attention extraction
def test_attention_extraction():
    attention = extract_attention(model_output)
    assert attention.shape[0] == num_layers
```

### Integration Tests
```python
# Test API endpoints
def test_process_text_endpoint():
    response = client.post('/api/process_text', json={
        'text': 'Test text',
        'model': 'distilbert'
    })
    assert response.status_code == 200
    assert 'tokens' in response.json['data']
```

### Frontend Tests
```javascript
// Test visualization rendering
describe('Network Visualization', () => {
    it('should render nodes', () => {
        const viz = new NetworkVisualization(testData);
        expect(viz.nodes.length).toBe(6);
    });
});
```

### Performance Tests
```python
# Test response time
def test_processing_speed():
    start = time.time()
    process_text("x" * 512)  # Max length
    elapsed = time.time() - start
    assert elapsed < 2.0  # Under 2 seconds
```

---

## ⚡ Performance Considerations

### Backend Optimization

#### Model Loading
```python
# Singleton pattern for model loading
class ModelManager:
    _instance = None
    _models = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def get_model(self, model_name):
        if model_name not in self._models:
            self._models[model_name] = self._load_model(model_name)
        return self._models[model_name]
```

#### Caching Strategy
```python
# LRU Cache for repeated queries
from functools import lru_cache

@lru_cache(maxsize=1000)
def cached_process_text(text, model_name):
    return process_text_internal(text, model_name)

# Redis for persistent cache (optional)
cache_config = {
    'CACHE_TYPE': 'simple',  # or 'redis'
    'CACHE_DEFAULT_TIMEOUT': 3600
}
```

#### Batch Processing
```python
# Process multiple texts efficiently
def batch_process(texts, batch_size=8):
    results = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i+batch_size]
        batch_results = model.process_batch(batch)
        results.extend(batch_results)
    return results
```

### Frontend Optimization

#### Rendering Performance
```javascript
// Use requestAnimationFrame for smooth animations
function animate() {
    requestAnimationFrame(animate);
    updateVisualization();
}

// Debounce expensive operations
const debouncedUpdate = debounce(updateVisualization, 16);

// Virtual DOM for large datasets
const virtualNodes = new VirtualList(nodes, {
    height: 500,
    rowHeight: 30
});
```

#### Data Management
```javascript
// Use Web Workers for heavy computations
const worker = new Worker('processor.js');
worker.postMessage({cmd: 'process', data: largeDataset});

// Lazy loading for visualization modes
const loadVisualizationMode = async (mode) => {
    const module = await import(`./modes/${mode}.js`);
    return module.default;
};
```

### Memory Management
```python
# Clear cache periodically
def clear_old_cache():
    current_time = time.time()
    for key in list(cache.keys()):
        if current_time - cache[key]['timestamp'] > 3600:
            del cache[key]

# Limit model memory usage
torch.cuda.empty_cache()  # If using GPU
gc.collect()  # Force garbage collection
```

---

## 📝 Common Issues & Solutions

### Issue: Slow model loading
```python
# Solution: Pre-load models on startup
def create_app():
    app = Flask(__name__)
    with app.app_context():
        load_all_models()  # Load during initialization
    return app
```

### Issue: Memory overflow with large texts
```python
# Solution: Chunk processing
def process_large_text(text, chunk_size=512):
    chunks = split_into_chunks(text, chunk_size)
    results = [process_chunk(chunk) for chunk in chunks]
    return merge_results(results)
```

### Issue: Visualization lag with many nodes
```javascript
// Solution: Use canvas instead of SVG for >1000 nodes
if (nodes.length > 1000) {
    renderer = new CanvasRenderer();
} else {
    renderer = new SVGRenderer();
}
```

---

## 🔍 Debugging Tools

### Backend Debugging
```python
# Enable debug mode
app.config['DEBUG'] = True

# Logging configuration
import logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Performance profiling
from flask_profiler import Profiler
profiler = Profiler()
profiler.init_app(app)
```

### Frontend Debugging
```javascript
// Performance monitoring
const perfObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
        console.log(`${entry.name}: ${entry.duration}ms`);
    }
});
perfObserver.observe({entryTypes: ['measure']});

// Visualization debugging
window.DEBUG_MODE = true;
if (DEBUG_MODE) {
    showDebugOverlay();
    logInteractions();
}
```

---

## 📚 Reference Links

### Documentation
- [Transformers Library](https://huggingface.co/docs/transformers)
- [D3.js Documentation](https://d3js.org/)
- [Three.js Documentation](https://threejs.org/docs/)
- [Flask Documentation](https://flask.palletsprojects.com/)

### Model Information
- [DistilBERT Paper](https://arxiv.org/abs/1910.01108)
- [GPT-2 Paper](https://openai.com/blog/better-language-models/)
- [Attention Visualization Papers](https://arxiv.org/abs/1906.05714)

### Visualization Examples
- [BertViz](https://github.com/jessevig/bertviz)
- [Tensor2Tensor Visualization](https://github.com/tensorflow/tensor2tensor)
- [Understanding LSTM Networks](https://colah.github.io/posts/2015-08-Understanding-LSTMs/)

---

## 🚧 TODO Tracker

### Immediate Tasks
- [ ] Set up basic project structure
- [ ] Install core dependencies
- [ ] Create Flask app skeleton
- [ ] Load DistilBERT model
- [ ] Build basic HTML template

### Next Steps
- [ ] Implement tokenization endpoint
- [ ] Extract attention weights
- [ ] Create first D3.js visualization
- [ ] Add basic interactivity
- [ ] Implement caching

### Future Enhancements
- [ ] Add GPT-2 support
- [ ] Implement comparison mode
- [ ] Add export functionality
- [ ] Create video tutorials
- [ ] Build Chrome extension

---

## 💡 Design Decisions Log

### Decision 1: Using DistilBERT over BERT
**Date**: January 2025
**Reasoning**: 
- 40% smaller, 60% faster
- Retains 97% of BERT's performance
- Better for laptop deployment
- Sufficient for educational purposes

### Decision 2: D3.js as primary viz library
**Date**: January 2025
**Reasoning**:
- Most flexible for custom visualizations
- Large community and examples
- Good performance with proper optimization
- Can fallback to Canvas if needed

### Decision 3: Local-first approach
**Date**: January 2025
**Reasoning**:
- No deployment complexity
- No API rate limits
- Full control over compute resources
- Similar to HomeMade GPT success

---

## 📈 Progress Tracking

### Phase 1: Foundation ⏳
- [x] Documentation created
- [ ] Project structure
- [ ] Dependencies installed
- [ ] Basic Flask app
- [ ] Model loading
- [ ] Simple UI

### Phase 2: Core Visualization 🔜
- [ ] Attention extraction
- [ ] Network graph data
- [ ] D3.js implementation
- [ ] Basic interactions
- [ ] Tooltips

### Phase 3: Multiple Modes 🔜
- [ ] Heatmap visualization
- [ ] Embedding space
- [ ] Layer flow
- [ ] Mode switching
- [ ] Performance optimization

### Phase 4: Advanced Features 🔜
- [ ] Rich interactions
- [ ] Filtering controls
- [ ] Search functionality
- [ ] Comparison mode
- [ ] 3D views

### Phase 5: Polish 🔜
- [ ] Themes
- [ ] Caching
- [ ] Export
- [ ] Documentation
- [ ] Testing

---

*This document is a living reference and will be updated throughout development.*

# 🧠 Neural Echo - Interactive Neural Network Visualization

[![Python 3.11+](https://img.shields.io/badge/python-3.11%2B-blue.svg)](https://www.python.org/downloads/)
[![Flask](https://img.shields.io/badge/flask-2.3.3-green.svg)](https://flask.palletsprojects.com/)
[![PyTorch](https://img.shields.io/badge/pytorch-2.0%2B-orange.svg)](https://pytorch.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Neural Echo** is an interactive web application that visualizes how transformer-based neural networks process and understand text. Watch in real-time as DistilBERT and GPT-2 models tokenize, embed, and analyze your text through multiple stunning visualization modes.

## ✨ Features

### 🎯 Core Capabilities
- **Real-time Text Processing**: Instant tokenization and analysis of text up to 512 tokens
- **Multiple Model Support**: DistilBERT and GPT-2 models for different perspectives
- **Smart Performance Optimization**: Automatic optimization for texts of any length
- **Beautiful Modern UI**: Glassmorphism design with dark/light themes
- **Responsive Design**: Works seamlessly on desktop and mobile devices

### 🎨 Four Visualization Modes

#### 1. **Network Graph** - Token Relationship Network
- Force-directed graph showing attention connections between tokens
- Interactive nodes with drag, zoom, and pan capabilities
- Color-coded tokens by type (special, capitalized, number, punctuation, word)
- Automatic Canvas/SVG switching for optimal performance

#### 2. **Attention Heatmap** - Layer-by-Layer Analysis
- Interactive matrix visualization of attention weights
- Navigate through 6 layers and 12 attention heads
- Smart downsampling for large sequences
- Cell-level interaction with detailed tooltips

#### 3. **3D Embedding Space** - Semantic Relationships
- Three.js-powered 3D scatter plot
- PCA and t-SNE dimensionality reduction
- OrbitControls for intuitive 3D navigation
- Glowing points with semantic clustering

#### 4. **Layer Flow** - Token Transformation Journey
- Animated progression through neural network layers
- See how token representations evolve
- Beautiful gradient backgrounds with smooth animations
- Interactive layer selection and exploration

## 📸 Screenshots

### Network Graph Visualization
![Network Graph](screenshots/network-graph.png)
*Interactive force-directed graph showing attention patterns between tokens*

### Attention Heatmap
![Attention Heatmap](screenshots/attention-heatmap.png)
*Layer-by-layer attention weight matrices with interactive exploration*

### 3D Embedding Space
![3D Embedding Space](screenshots/embedding-space.png)
*Three-dimensional semantic space showing token relationships*

### Layer Flow Diagram
![Layer Flow](screenshots/layer-flow.png)
*Animated visualization of token transformation through network layers*

## 🚀 Installation

### Prerequisites
- Python 3.11 or 3.12 (recommended)
- 4GB+ RAM
- Modern web browser (Chrome, Firefox, Safari, Edge)

> ⚠️ **Python 3.13 Note**: Currently has compatibility issues with UMAP dimensionality reduction. Use Python 3.11 or 3.12 for full functionality.

### Quick Start

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/neural-echo.git
cd neural-echo
```

2. **Create virtual environment**
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Run the application**
```bash
python app.py
```

5. **Open in browser**
Navigate to `http://localhost:5000`

### First Run
On first run, the application will automatically download the required models (DistilBERT and GPT-2). This may take a few minutes depending on your internet connection.

## 🛠️ Technology Stack

### Backend
- **Flask 2.3.3** - Web framework
- **PyTorch 2.0+** - Deep learning framework
- **Transformers 4.30+** - State-of-the-art NLP models
- **NumPy & SciPy** - Numerical computing
- **scikit-learn** - Machine learning utilities

### Frontend
- **D3.js v7** - Data visualization library
- **Three.js** - 3D graphics library
- **Vanilla JavaScript** - No framework dependencies
- **CSS3** - Modern styling with glassmorphism effects

### Models
- **DistilBERT** - Distilled version of BERT (66M parameters)
- **GPT-2** - Generative Pre-trained Transformer 2 (124M parameters)

## 📖 Usage

### Basic Workflow
1. **Enter Text**: Type or paste text into the input field (up to 512 tokens)
2. **Select Model**: Choose between DistilBERT or GPT-2
3. **Process**: Click "Process Text" to analyze
4. **Explore**: Switch between visualization modes using the floating controls
5. **Interact**: Zoom, pan, drag, and hover to explore the visualizations
6. **Export**: Save visualizations as PNG or export data as JSON

### Input Methods
- **Direct Text Input**: Type or paste text directly
- **File Upload**: Upload .txt or .md files
- **Example Texts**: Choose from pre-loaded examples

### Performance Modes
- **Auto**: Automatically optimizes based on text length
- **Quality**: Maximum visual quality (best for <150 tokens)
- **Speed**: Optimized performance (recommended for >150 tokens)

## 🎮 Controls

### Common Controls
- **Mouse Wheel**: Zoom in/out
- **Left Click + Drag**: Pan (2D) or Rotate (3D)
- **Right Click + Drag**: Pan in 3D views
- **Hover**: View detailed information

### Visualization-Specific
- **Network Graph**: Drag nodes to reposition
- **Attention Heatmap**: Click cells for details
- **3D Embedding**: Use OrbitControls for full 3D navigation
- **Layer Flow**: Click "Animate Flow" to see progression

## 📊 Performance

- **Processing Speed**: <1 second for most texts
- **Maximum Tokens**: 512 (texts are truncated if longer)
- **Optimal Range**: 50-200 tokens for best interactivity
- **Memory Usage**: ~500MB with models loaded

## 🐛 Known Issues

- **Python 3.13**: UMAP dimensionality reduction unavailable (uses PCA fallback)
- **Large Texts**: Performance may degrade with 400+ tokens
- **GPU Support**: Currently CPU-only for broader compatibility

## 📚 Case Study

For a comprehensive technical deep-dive into the Neural Echo project's architecture, implementation details, and development journey, visit our [Case Study page](/case_study).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Hugging Face** for the Transformers library
- **D3.js** community for visualization tools
- **Three.js** team for 3D graphics capabilities
- **DistilBERT** and **GPT-2** research teams

## 📬 Contact

For questions or feedback, please open an issue on GitHub.

---

**Built with ❤️ for understanding neural networks better**

/**
 * Neural Echo - Main Application JavaScript
 * Handles user interactions and API communication
 */

// Global state
const state = {
    currentText: '',
    currentModel: 'distilbert',
    processingData: null,
    theme: localStorage.getItem('theme') || 'light',
    currentVisualization: null,
    visualizationMode: 'network', // 'network' or 'attention'
    performanceMode: 'auto', // 'auto', 'quality', 'performance'
    useCanvas: false // Will be set based on token count or manual override
};

// API endpoints
const API = {
    PROCESS_TEXT: '/api/process_text',
    UPLOAD_FILE: '/api/upload_file',
    GET_MODELS: '/api/models',
    GET_EXAMPLES: '/api/example_texts'
};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    console.log('Neural Echo initialized');
    
    // Initialize theme
    initTheme();
    
    // Load examples
    loadExamples();
    
    // Set up event listeners
    setupEventListeners();
    
    // Update initial counts
    updateTextCounts();
});

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Text input
    const textInput = document.getElementById('textInput');
    if (textInput) {
        textInput.addEventListener('input', (e) => {
            state.currentText = e.target.value;
            updateTextCounts();
        });
    }
    
    // Model selection
    const modelSelect = document.getElementById('modelSelect');
    if (modelSelect) {
        modelSelect.addEventListener('change', (e) => {
            state.currentModel = e.target.value;
            console.log('Model changed to:', state.currentModel);
        });
    }
    
    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.currentTarget.dataset.tab;
            switchTab(tab);
        });
    });
    
    // Process button
    const processBtn = document.getElementById('processBtn');
    if (processBtn) {
        processBtn.addEventListener('click', processText);
    }
    
    // File upload
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }
    
    // Drag and drop
    const fileUploadArea = document.querySelector('.file-upload-area');
    if (fileUploadArea) {
        fileUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileUploadArea.classList.add('dragover');
        });
        
        fileUploadArea.addEventListener('dragleave', () => {
            fileUploadArea.classList.remove('dragover');
        });
        
        fileUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            fileUploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFile(files[0]);
            }
        });
    }
    
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Help button
    const helpBtn = document.getElementById('helpBtn');
    if (helpBtn) {
        helpBtn.addEventListener('click', showHelp);
    }
    
    // Case Study button - navigate to case study page
    const caseStudyBtn = document.getElementById('caseStudyBtn');
    if (caseStudyBtn) {
        caseStudyBtn.addEventListener('click', () => {
            window.location.href = '/case_study';
        });
    }
    
    // Visualization controls
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportVisualization);
    }
    
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', toggleFullscreen);
    }
    
    // Listen for fullscreen changes (including ESC key)
    document.addEventListener('fullscreenchange', () => {
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        if (fullscreenBtn) {
            if (document.fullscreenElement) {
                fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
                fullscreenBtn.title = 'Exit Fullscreen';
            } else {
                fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
                fullscreenBtn.title = 'Fullscreen';
            }
        }
    });
    
    // Floating visualization mode buttons
    document.querySelectorAll('.floating-mode-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const mode = e.currentTarget.dataset.mode;
            switchVisualizationMode(mode);
        });
    });
    
    // Toggle floating controls visibility
    const toggleBtn = document.querySelector('.floating-toggle-btn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const selector = document.querySelector('.floating-mode-selector');
            if (selector) {
                selector.style.display = selector.style.display === 'none' ? 'flex' : 'none';
                toggleBtn.querySelector('i').className = 
                    selector.style.display === 'none' ? 'fas fa-eye-slash' : 'fas fa-eye';
            }
        });
    }
    
    // Performance mode toggle
    const perfBtn = document.querySelector('.floating-perf-btn');
    if (perfBtn) {
        perfBtn.addEventListener('click', () => {
            // Cycle through modes: auto -> quality -> performance -> auto
            if (state.performanceMode === 'auto') {
                state.performanceMode = 'quality';
                perfBtn.title = 'Performance Mode (Quality)';
                perfBtn.classList.add('quality');
                perfBtn.classList.remove('performance');
            } else if (state.performanceMode === 'quality') {
                state.performanceMode = 'performance';
                perfBtn.title = 'Performance Mode (Speed)';
                perfBtn.classList.add('performance');
                perfBtn.classList.remove('quality');
            } else {
                state.performanceMode = 'auto';
                perfBtn.title = 'Performance Mode (Auto)';
                perfBtn.classList.remove('quality', 'performance');
            }
            
            // Re-render if we have data
            if (state.processingData) {
                initializeVisualization(state.processingData);
            }
        });
    }
}

/**
 * Switch between input tabs
 */
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const activeTab = document.getElementById(`${tabName}Tab`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
}

/**
 * Update text character and word counts
 */
function updateTextCounts() {
    const text = state.currentText;
    const charCount = text.length;
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    
    // Estimate tokens (rough approximation: 1 token ≈ 4 characters or 0.75 words)
    // This is a simplified estimate; actual tokenization varies
    const tokenEstimate = Math.ceil(Math.max(charCount / 4, wordCount * 0.75));
    
    document.getElementById('charCount').textContent = charCount;
    document.getElementById('wordCount').textContent = wordCount;
    
    // Update token estimate with color coding
    const tokenElement = document.getElementById('tokenEstimate');
    const tokenWarning = document.getElementById('tokenWarning');
    
    tokenElement.textContent = `~${tokenEstimate} tokens`;
    
    // Remove all state classes
    tokenElement.classList.remove('warning', 'danger');
    
    // Apply appropriate styling based on token count
    if (tokenEstimate > 512) {
        tokenElement.classList.add('danger');
        tokenWarning.style.display = 'block';
        tokenWarning.querySelector('span').textContent = `Text will be truncated (${tokenEstimate} tokens, 512 max)`;
    } else if (tokenEstimate > 400) {
        tokenElement.classList.add('warning');
        tokenWarning.style.display = 'block';
        tokenWarning.querySelector('span').textContent = 'Approaching token limit (512 max)';
    } else {
        tokenWarning.style.display = 'none';
    }
}

/**
 * Process text through neural network
 */
async function processText() {
    const text = state.currentText;
    
    if (!text.trim()) {
        showError('Please enter some text to process');
        return;
    }
    
    try {
        showLoading(true);
        
        // Create an AbortController with timeout for longer texts
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        const response = await fetch(API.PROCESS_TEXT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                model: state.currentModel,
                options: {
                    return_embeddings: true,
                    return_attention: true,
                    return_hidden_states: false
                }
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server error:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            state.processingData = result.data;
            displayResults(result.data);
        } else {
            showError(result.error || 'Processing failed');
        }
        
    } catch (error) {
        console.error('Error processing text:', error);
        if (error.name === 'AbortError') {
            showError('Request timed out. The text might be too long. Please try a shorter text.');
        } else {
            showError('Failed to process text. Please try again.');
        }
    } finally {
        showLoading(false);
    }
}

/**
 * Handle file upload
 */
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        handleFile(file);
    }
}

/**
 * Process uploaded file
 */
async function handleFile(file) {
    // Validate file type
    const allowedTypes = ['.txt', '.md'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
        showError('Invalid file type. Please upload a .txt or .md file');
        return;
    }
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
        showError('File too large. Maximum size is 5MB');
        return;
    }
    
    // Display file info
    const fileInfo = document.getElementById('fileInfo');
    fileInfo.innerHTML = `
        <strong>File:</strong> ${file.name}<br>
        <strong>Size:</strong> ${(file.size / 1024).toFixed(2)} KB
    `;
    fileInfo.classList.add('active');
    
    // Read file content
    const reader = new FileReader();
    reader.onload = (e) => {
        state.currentText = e.target.result;
        
        // Switch to text tab and update display
        switchTab('text');
        document.getElementById('textInput').value = state.currentText;
        updateTextCounts();
    };
    reader.readAsText(file);
}

/**
 * Load example texts
 */
async function loadExamples() {
    try {
        const response = await fetch(API.GET_EXAMPLES);
        const result = await response.json();
        
        if (result.success) {
            displayExamples(result.examples);
        }
    } catch (error) {
        console.error('Error loading examples:', error);
    }
}

/**
 * Display example texts
 */
function displayExamples(examples) {
    const grid = document.getElementById('examplesGrid');
    if (!grid) return;
    
    grid.innerHTML = examples.map(example => `
        <div class="example-card" onclick="selectExample('${example.id}')">
            <h4>${example.title}</h4>
            <p>${example.text}</p>
        </div>
    `).join('');
    
    // Store examples globally for selection
    window.examples = examples;
}

/**
 * Select an example text
 */
window.selectExample = function(exampleId) {
    const example = window.examples.find(e => e.id === exampleId);
    if (example) {
        state.currentText = example.text;
        
        // Switch to text tab and update display
        switchTab('text');
        document.getElementById('textInput').value = state.currentText;
        updateTextCounts();
        
        // Auto-process the example
        processText();
    }
};

/**
 * Display processing results
 */
function displayResults(data) {
    console.log('Processing results:', data);
    
    // Show floating visualization controls
    const floatingControls = document.querySelector('.viz-floating-controls');
    if (floatingControls) {
        floatingControls.style.display = 'flex';
    }
    
    // Update model info
    const modelInfo = document.getElementById('modelInfo');
    if (modelInfo && data.metadata) {
        modelInfo.innerHTML = `
            <p><strong>Model:</strong> ${data.metadata.model_name}</p>
            <p><strong>Processing Time:</strong> ${data.metadata.processing_time.toFixed(3)}s</p>
            <p><strong>Number of Tokens:</strong> ${data.metadata.num_tokens}</p>
        `;
    }
    
    // Update processing results
    const resultsDiv = document.getElementById('processingResults');
    if (resultsDiv) {
        // Check if text was likely truncated (if we had a long input)
        const inputTokenEstimate = Math.ceil(Math.max(state.currentText.length / 4, state.currentText.split(/\s+/).length * 0.75));
        const wasTruncated = inputTokenEstimate > 512;
        
        resultsDiv.innerHTML = `
            ${wasTruncated ? `
                <div style="background: rgba(255, 190, 11, 0.1); border: 1px solid var(--warning); padding: 8px; border-radius: 4px; margin-bottom: 12px; font-size: 0.875rem;">
                    <i class="fas fa-info-circle"></i> Text was truncated to 512 tokens for processing
                </div>
            ` : ''}
            <p><strong>Tokens Processed: ${data.tokens.length}</strong></p>
            <div style="font-family: monospace; font-size: 0.875rem; padding: 8px; background: var(--bg-tertiary); border-radius: 4px; margin-top: 8px;">
                ${data.tokens.slice(0, 50).join(' ')}${data.tokens.length > 50 ? '...' : ''}
            </div>
            ${data.embedding_stats ? `
                <p style="margin-top: 12px;"><strong>Embedding Statistics:</strong></p>
                <ul style="font-size: 0.875rem; margin-left: 20px;">
                    <li>Mean: ${data.embedding_stats.mean.toFixed(4)}</li>
                    <li>Std Dev: ${data.embedding_stats.std.toFixed(4)}</li>
                    <li>Shape: [${data.embedding_stats.shape.join(', ')}]</li>
                </ul>
            ` : ''}
            ${data.attention ? `
                <p style="margin-top: 12px;"><strong>Attention Layers:</strong> ${data.attention.num_layers}</p>
            ` : ''}
        `;
    }
    
    // Initialize visualization
    initializeVisualization(data);
}

/**
 * Initialize visualization based on current mode
 */
function initializeVisualization(data) {
    const vizContainer = document.getElementById('vizContainer');
    if (!vizContainer || !data) return;
    
    // Clear existing visualization
    if (state.currentVisualization) {
        if (typeof state.currentVisualization.destroy === 'function') {
            state.currentVisualization.destroy();
        }
        state.currentVisualization = null;
    }
    
    // Save floating controls before clearing
    const floatingControls = vizContainer.querySelector('.viz-floating-controls');
    
    // Clear container but preserve floating controls
    Array.from(vizContainer.children).forEach(child => {
        if (!child.classList.contains('viz-floating-controls')) {
            child.remove();
        }
    });
    
    // Make sure floating controls are visible
    if (floatingControls) {
        floatingControls.style.display = 'flex';
    }
    
    // Create a wrapper div for the visualization
    const vizWrapper = document.createElement('div');
    vizWrapper.style.width = 'calc(100% - 20px)';  // Account for padding
    vizWrapper.style.height = 'calc(100% - 20px)';
    vizWrapper.style.position = 'absolute';
    vizWrapper.style.top = '10px';
    vizWrapper.style.left = '10px';
    vizContainer.appendChild(vizWrapper);
    
    // Get container dimensions
    const rect = vizContainer.getBoundingClientRect();
    const width = rect.width || 800;
    const height = rect.height || 600;
    
    // Determine if we should use Canvas based on performance mode
    if (state.performanceMode === 'auto') {
        state.useCanvas = data.tokens.length > 150;
    } else if (state.performanceMode === 'performance') {
        state.useCanvas = true;
    } else {
        state.useCanvas = false;
    }
    
    // Show performance indicator
    if (data.tokens.length > 150) {
        console.log(`Performance Mode: Using ${state.useCanvas ? 'Canvas' : 'SVG'} rendering for ${data.tokens.length} tokens`);
    }
    
    // Create visualization based on mode
    try {
        if (state.visualizationMode === 'network') {
            // Choose renderer based on performance needs
            const VisualizationClass = state.useCanvas ? 
                window.NetworkVisualizationCanvas : 
                window.NetworkVisualization;
            
            if (VisualizationClass) {
                state.currentVisualization = new VisualizationClass(
                    vizWrapper,  // Use wrapper instead of container
                    data,
                    {
                        width: width,
                        height: height,
                        showLabels: data.tokens.length <= 50,  // Only show labels for smaller texts
                        maxLinks: state.useCanvas ? 300 : 500  // Fewer links in canvas mode for performance
                    }
                );
                
                // Add event listener for node clicks
                vizContainer.addEventListener('nodeClicked', (event) => {
                    console.log('Node clicked event:', event.detail);
                });
                
                // Ensure floating controls are on top
                if (floatingControls) {
                    vizContainer.appendChild(floatingControls);
                }
            } else {
                console.error('NetworkVisualization not loaded');
                showError('Network visualization module not loaded');
            }
        } else if (state.visualizationMode === 'attention') {
            // Create attention heatmap
            if (window.AttentionHeatmap) {
                state.currentVisualization = new AttentionHeatmap(
                    vizWrapper,  // Use wrapper instead of container
                    data,
                    {
                        width: Math.min(width, height),
                        height: Math.min(width, height)
                    }
                );
                
                // Add event listener for cell clicks
                vizContainer.addEventListener('cellClicked', (event) => {
                    console.log('Cell clicked event:', event.detail);
                });
                
                // Ensure floating controls are on top
                if (floatingControls) {
                    vizContainer.appendChild(floatingControls);
                }
            } else {
                console.error('AttentionHeatmap not loaded');
                showError('Attention heatmap module not loaded');
            }
        } else if (state.visualizationMode === 'embedding') {
            // Create embedding space visualization
            if (window.EmbeddingSpaceVisualization) {
                state.currentVisualization = new EmbeddingSpaceVisualization(
                    vizWrapper,
                    data,
                    {
                        width: width,
                        height: height,
                        dimensions: 3,  // Default to 3D
                        method: 'pca',  // Using PCA due to UMAP compatibility issues with Python 3.13
                        pointSize: 8,
                        showLabels: data.tokens.length <= 30
                    }
                );
                
                // Ensure floating controls are on top
                if (floatingControls) {
                    vizContainer.appendChild(floatingControls);
                }
            } else {
                console.error('EmbeddingSpaceVisualization not loaded');
                showError('Embedding space visualization module not loaded');
            }
        } else if (state.visualizationMode === 'flow') {
            // Create layer flow visualization
            if (window.LayerFlowVisualization) {
                state.currentVisualization = new LayerFlowVisualization(
                    vizWrapper,
                    data,
                    {
                        width: width,
                        height: height,
                        maxTokens: 50,  // Limit for performance
                        showConnections: data.tokens.length <= 30,
                        animationDuration: 500
                    }
                );
                
                // Ensure floating controls are on top
                if (floatingControls) {
                    vizContainer.appendChild(floatingControls);
                }
            } else {
                console.error('LayerFlowVisualization not loaded');
                showError('Layer flow visualization module not loaded');
            }
        }
    } catch (error) {
        console.error('Error creating visualization:', error);
        showError('Failed to create visualization. Please try again.');
    }
}

/**
 * Theme management
 */
function initTheme() {
    document.body.setAttribute('data-theme', state.theme);
    updateThemeIcon();
}

function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', state.theme);
    localStorage.setItem('theme', state.theme);
    updateThemeIcon();
}

function updateThemeIcon() {
    const icon = document.querySelector('#themeToggle i');
    if (icon) {
        icon.className = state.theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }
}

/**
 * Switch visualization mode
 */
function switchVisualizationMode(mode) {
    // Update floating button states
    document.querySelectorAll('.floating-mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    
    // Update state
    state.visualizationMode = mode;
    
    // Reinitialize visualization if we have data
    if (state.processingData) {
        initializeVisualization(state.processingData);
    }
}

/**
 * Visualization controls
 */
function resetVisualization() {
    if (state.currentVisualization && typeof state.currentVisualization.reset === 'function') {
        state.currentVisualization.reset();
    } else if (state.processingData) {
        // Reinitialize visualization
        initializeVisualization(state.processingData);
    }
}

function exportVisualization() {
    // Create export menu
    const existingMenu = document.querySelector('.export-menu');
    if (existingMenu) {
        existingMenu.remove();
        return;
    }
    
    const menu = document.createElement('div');
    menu.className = 'export-menu';
    menu.innerHTML = `
        <div class="export-menu-content">
            <button onclick="exportAsPNG()" class="export-option">
                <i class="fas fa-image"></i> Export as PNG
            </button>
            <button onclick="exportAsJSON()" class="export-option">
                <i class="fas fa-code"></i> Export as JSON
            </button>
        </div>
    `;
    
    // Position above the export button (not below)
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        const rect = exportBtn.getBoundingClientRect();
        menu.style.position = 'fixed';
        // Position ABOVE the button instead of below
        menu.style.bottom = `${window.innerHeight - rect.top + 10}px`;
        menu.style.right = '20px';
        menu.style.zIndex = '10000';
    }
    
    document.body.appendChild(menu);
    
    // Close menu when clicking outside
    setTimeout(() => {
        document.addEventListener('click', closeExportMenuOnClickOutside);
    }, 100);
}

function closeExportMenu() {
    const menu = document.querySelector('.export-menu');
    if (menu) {
        menu.remove();
        document.removeEventListener('click', closeExportMenuOnClickOutside);
    }
}

function closeExportMenuOnClickOutside(e) {
    const menu = document.querySelector('.export-menu');
    const exportBtn = document.getElementById('exportBtn');
    if (menu && !menu.contains(e.target) && e.target !== exportBtn && !exportBtn.contains(e.target)) {
        closeExportMenu();
    }
}

function exportAsPNG() {
    closeExportMenu();
    
    if (!state.processingData) {
        showError('No visualization to export. Please process text first.');
        return;
    }
    
    const vizWrapper = document.querySelector('#vizWrapper');
    if (!vizWrapper) {
        showError('No visualization found to export.');
        return;
    }
    
    // Handle different visualization types
    if (state.visualizationMode === 'network' || state.visualizationMode === 'attention') {
        // For SVG visualizations
        const svg = vizWrapper.querySelector('svg');
        if (svg) {
            exportSVGAsPNG(svg, `neural-echo-${state.visualizationMode}-${Date.now()}.png`);
        } else {
            // For canvas visualizations
            const canvas = vizWrapper.querySelector('canvas');
            if (canvas) {
                exportCanvasAsPNG(canvas, `neural-echo-${state.visualizationMode}-${Date.now()}.png`);
            } else {
                showError('Unable to export this visualization as PNG.');
            }
        }
    } else if (state.visualizationMode === 'embedding' || state.visualizationMode === 'flow') {
        // For Three.js or complex visualizations
        const canvas = vizWrapper.querySelector('canvas');
        if (canvas) {
            exportCanvasAsPNG(canvas, `neural-echo-${state.visualizationMode}-${Date.now()}.png`);
        } else {
            // Try to capture SVG if it's a flow visualization
            const svg = vizWrapper.querySelector('svg');
            if (svg) {
                exportSVGAsPNG(svg, `neural-echo-${state.visualizationMode}-${Date.now()}.png`);
            } else {
                showError('Unable to export this visualization as PNG.');
            }
        }
    }
}

function exportSVGAsPNG(svgElement, filename) {
    // Clone the SVG to avoid modifying the original
    const svgClone = svgElement.cloneNode(true);
    
    // Get SVG dimensions
    const bbox = svgElement.getBoundingClientRect();
    svgClone.setAttribute('width', bbox.width);
    svgClone.setAttribute('height', bbox.height);
    
    // Convert SVG to string
    const svgString = new XMLSerializer().serializeToString(svgClone);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    
    // Create image and canvas
    const img = new Image();
    img.onload = function() {
        const canvas = document.createElement('canvas');
        canvas.width = bbox.width * 2; // Higher resolution
        canvas.height = bbox.height * 2;
        
        const ctx = canvas.getContext('2d');
        ctx.scale(2, 2); // Scale for higher resolution
        
        // White background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, bbox.width, bbox.height);
        
        // Draw the image
        ctx.drawImage(img, 0, 0, bbox.width, bbox.height);
        
        // Export as PNG
        canvas.toBlob(function(blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        }, 'image/png');
        
        URL.revokeObjectURL(svgUrl);
    };
    
    img.src = svgUrl;
}

function exportCanvasAsPNG(canvasElement, filename) {
    canvasElement.toBlob(function(blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }, 'image/png');
}

function exportAsJSON() {
    closeExportMenu();
    
    if (!state.processingData) {
        showError('No data to export. Please process text first.');
        return;
    }
    
    // Prepare export data
    const exportData = {
        metadata: {
            exportDate: new Date().toISOString(),
            model: state.currentModel,
            visualizationMode: state.visualizationMode,
            version: '1.0.0'
        },
        input: {
            text: state.currentText,
            tokenCount: state.processingData.tokens.length
        },
        tokens: state.processingData.tokens,
        embeddings: state.processingData.embeddings,
        attention: state.processingData.attention,
        processingMetadata: state.processingData.metadata
    };
    
    // Create and download JSON file
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `neural-echo-data-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    
    // Show success message
    console.log('Data exported successfully');
}

// Make functions globally accessible
window.exportAsPNG = exportAsPNG;
window.exportAsJSON = exportAsJSON;
window.closeExportMenu = closeExportMenu;

function toggleFullscreen() {
    const vizContainer = document.getElementById('vizContainer');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    
    if (vizContainer) {
        if (!document.fullscreenElement) {
            vizContainer.requestFullscreen().then(() => {
                // Update button icon when entering fullscreen
                if (fullscreenBtn) {
                    fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
                    fullscreenBtn.title = 'Exit Fullscreen';
                }
            }).catch(err => {
                console.error('Error entering fullscreen:', err);
            });
        } else {
            document.exitFullscreen().then(() => {
                // Update button icon when exiting fullscreen
                if (fullscreenBtn) {
                    fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
                    fullscreenBtn.title = 'Fullscreen';
                }
            });
        }
    }
}

/**
 * Loading and error handling
 */
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.toggle('active', show);
    }
}

function showError(message) {
    const modal = document.getElementById('errorModal');
    const messageDiv = document.getElementById('errorMessage');
    
    if (modal && messageDiv) {
        messageDiv.textContent = message;
        modal.classList.add('active');
    }
}

window.closeErrorModal = function() {
    const modal = document.getElementById('errorModal');
    if (modal) {
        modal.classList.remove('active');
    }
};

function showHelp() {
    const modal = document.getElementById('helpModal');
    if (modal) {
        modal.classList.add('active');
    }
}

window.closeHelpModal = function() {
    const modal = document.getElementById('helpModal');
    if (modal) {
        modal.classList.remove('active');
    }
};

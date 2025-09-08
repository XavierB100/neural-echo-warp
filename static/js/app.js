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
    visualizationMode: 'network' // 'network' or 'attention'
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
    
    // Visualization controls
    const resetZoomBtn = document.getElementById('resetZoomBtn');
    if (resetZoomBtn) {
        resetZoomBtn.addEventListener('click', resetVisualization);
    }
    
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportVisualization);
    }
    
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', toggleFullscreen);
    }
    
    // Visualization mode buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const mode = e.currentTarget.dataset.mode;
            switchVisualizationMode(mode);
        });
    });
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
    
    // Show visualization mode tabs
    const vizModes = document.querySelector('.viz-modes');
    if (vizModes) {
        vizModes.style.display = 'flex';
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
    
    // Clear container
    vizContainer.innerHTML = '';
    
    // Get container dimensions
    const rect = vizContainer.getBoundingClientRect();
    const width = rect.width || 800;
    const height = rect.height || 600;
    
    // Create visualization based on mode
    try {
        if (state.visualizationMode === 'network') {
            // Create network visualization
            if (window.NetworkVisualization) {
                state.currentVisualization = new NetworkVisualization(
                    vizContainer,
                    data,
                    {
                        width: width,
                        height: height,
                        showLabels: data.tokens.length <= 50  // Only show labels for smaller texts
                    }
                );
                
                // Add event listener for node clicks
                vizContainer.addEventListener('nodeClicked', (event) => {
                    console.log('Node clicked event:', event.detail);
                });
            } else {
                console.error('NetworkVisualization not loaded');
                showError('Network visualization module not loaded');
            }
        } else if (state.visualizationMode === 'attention') {
            // Create attention heatmap
            if (window.AttentionHeatmap) {
                state.currentVisualization = new AttentionHeatmap(
                    vizContainer,
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
            } else {
                console.error('AttentionHeatmap not loaded');
                showError('Attention heatmap module not loaded');
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
    // Update button states
    document.querySelectorAll('.mode-btn').forEach(btn => {
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
    console.log('Export visualization (Phase 2)');
}

function toggleFullscreen() {
    const vizContainer = document.getElementById('vizContainer');
    if (vizContainer) {
        if (!document.fullscreenElement) {
            vizContainer.requestFullscreen().catch(err => {
                console.error('Error entering fullscreen:', err);
            });
        } else {
            document.exitFullscreen();
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

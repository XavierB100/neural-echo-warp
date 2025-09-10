/**
 * Neural Echo - Layer Flow Visualization Module
 * Visualizes token transformation through neural network layers
 */

class LayerFlowVisualization {
    constructor(container, data, options = {}) {
        this.container = container;
        this.data = data;
        this.options = {
            width: options.width || 800,
            height: options.height || 600,
            margin: options.margin || { top: 60, right: 60, bottom: 60, left: 80 },
            layerSpacing: options.layerSpacing || 100, // Reduced for better use of space
            nodeRadius: options.nodeRadius || 10, // Larger for better visibility
            maxTokens: options.maxTokens || 40, // Slightly reduced for performance
            animationDuration: options.animationDuration || 800, // Slower, smoother animation
            showConnections: options.showConnections !== false,
            connectionOpacity: options.connectionOpacity || 0.5, // More visible connections
            colorScheme: options.colorScheme || d3.schemeCategory10,
            ...options
        };
        
        // D3 components
        this.svg = null;
        this.g = null;
        this.layerGroups = [];
        this.nodes = [];
        this.links = [];
        this.tooltip = null;
        
        // Data
        this.tokens = [];
        this.layers = [];
        this.currentLayer = 0;
        
        // Animation state
        this.animationTimer = null;
        this.isAnimating = false;
        
        this.init();
    }
    
    init() {
        // Clear container
        d3.select(this.container).selectAll("*").remove();
        
        // Process data
        this.processData();
        
        // Setup SVG
        this.setupSVG();
        
        // Create visualization
        this.createVisualization();
        
        // Setup interactions
        this.setupInteractions();
        
        // Add controls
        this.addControls();
    }
    
    processData() {
        // Extract tokens
        this.tokens = this.data.tokens || [];
        
        // Limit tokens for performance
        const maxTokens = Math.min(this.tokens.length, this.options.maxTokens);
        this.tokens = this.tokens.slice(0, maxTokens);
        
        // Process layers - for DistilBERT we have 6 layers
        this.layers = [];
        const numLayers = 6; // DistilBERT has 6 layers
        
        for (let layerIdx = 0; layerIdx < numLayers; layerIdx++) {
            const layerNodes = this.tokens.map((token, tokenIdx) => {
                // Calculate position with some randomness to show transformation
                const baseX = this.options.margin.left + 
                    (tokenIdx / (this.tokens.length - 1)) * 
                    (this.options.width - this.options.margin.left - this.options.margin.right);
                
                // Add increasing randomness as we go through layers
                const randomOffset = (Math.random() - 0.5) * 20 * (layerIdx / numLayers);
                
                return {
                    id: `layer_${layerIdx}_token_${tokenIdx}`,
                    layer: layerIdx,
                    tokenIndex: tokenIdx,
                    token: token,
                    x: baseX + randomOffset,
                    y: this.options.margin.top + layerIdx * this.options.layerSpacing,
                    radius: this.options.nodeRadius,
                    color: this.getTokenColor(token, tokenIdx)
                };
            });
            
            this.layers.push({
                index: layerIdx,
                name: `Layer ${layerIdx}`,
                nodes: layerNodes
            });
        }
        
        // Create connections between layers
        this.createConnections();
    }
    
    getTokenColor(token, index) {
        // Color based on token type
        if (['[CLS]', '[SEP]', '[PAD]', '<s>', '</s>', '<pad>'].includes(token)) {
            return '#ff6b6b'; // Red for special tokens
        } else if (/^[A-Z]/.test(token)) {
            return '#4ecdc4'; // Teal for capitalized
        } else if (/^\d+$/.test(token)) {
            return '#ffe66d'; // Yellow for numbers
        } else if (/^[^\w\s]/.test(token)) {
            return '#a8e6cf'; // Light green for punctuation
        }
        return '#00ff88'; // Default green for words
    }
    
    createConnections() {
        this.links = [];
        
        // Create connections between adjacent layers
        for (let i = 0; i < this.layers.length - 1; i++) {
            const sourceLayer = this.layers[i];
            const targetLayer = this.layers[i + 1];
            
            sourceLayer.nodes.forEach((sourceNode, sourceIdx) => {
                // Connect to same token in next layer (primary connection)
                this.links.push({
                    source: sourceNode,
                    target: targetLayer.nodes[sourceIdx],
                    strength: 1.0,
                    type: 'primary'
                });
                
                // Add some cross-connections to show attention (weaker)
                if (this.options.showConnections && sourceIdx > 0) {
                    this.links.push({
                        source: sourceNode,
                        target: targetLayer.nodes[sourceIdx - 1],
                        strength: 0.3,
                        type: 'attention'
                    });
                }
                
                if (this.options.showConnections && sourceIdx < targetLayer.nodes.length - 1) {
                    this.links.push({
                        source: sourceNode,
                        target: targetLayer.nodes[sourceIdx + 1],
                        strength: 0.3,
                        type: 'attention'
                    });
                }
            });
        }
    }
    
    setupSVG() {
        // Get container dimensions
        const rect = this.container.getBoundingClientRect();
        this.options.width = rect.width;
        this.options.height = Math.max(
            rect.height,
            this.options.margin.top + this.options.margin.bottom + 
            (this.layers.length - 1) * this.options.layerSpacing + 100
        );
        
        // Create SVG with gradient background
        this.svg = d3.select(this.container)
            .append('svg')
            .attr('width', this.options.width)
            .attr('height', this.options.height)
            .style('background', 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)');
        
        // Create main group
        this.g = this.svg.append('g')
            .attr('class', 'layer-flow-main');
        
        // Add defs for gradients and filters
        const defs = this.svg.append('defs');
        
        // Add glow filter
        const filter = defs.append('filter')
            .attr('id', 'glow');
        
        filter.append('feGaussianBlur')
            .attr('stdDeviation', '3')
            .attr('result', 'coloredBlur');
        
        const feMerge = filter.append('feMerge');
        feMerge.append('feMergeNode')
            .attr('in', 'coloredBlur');
        feMerge.append('feMergeNode')
            .attr('in', 'SourceGraphic');
    }
    
    createVisualization() {
        // Create layer backgrounds
        const layerBackgrounds = this.g.append('g')
            .attr('class', 'layer-backgrounds');
        
        layerBackgrounds.selectAll('.layer-bg')
            .data(this.layers)
            .enter()
            .append('rect')
            .attr('class', 'layer-bg')
            .attr('x', 10)
            .attr('y', d => d.index * this.options.layerSpacing - 5)
            .attr('width', this.options.width - 20)
            .attr('height', this.options.layerSpacing - 10)
            .attr('rx', 8) // Rounded corners
            .attr('ry', 8)
            .attr('fill', 'rgba(0, 255, 136, 0.03)')
            .attr('stroke', 'rgba(0, 255, 136, 0.15)')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '5,5');
        
        // Create layer labels
        const layerLabels = this.g.append('g')
            .attr('class', 'layer-labels');
        
        layerLabels.selectAll('.layer-label')
            .data(this.layers)
            .enter()
            .append('text')
            .attr('class', 'layer-label')
            .attr('x', 20)
            .attr('y', d => d.index * this.options.layerSpacing + 20)
            .attr('fill', 'var(--text-primary)')
            .attr('font-size', '14px')
            .attr('font-weight', 'bold')
            .text(d => d.name);
        
        // Create connections
        if (this.options.showConnections) {
            const linkGroup = this.g.append('g')
                .attr('class', 'links');
            
            const links = linkGroup.selectAll('.link')
                .data(this.links)
                .enter()
                .append('line')
                .attr('class', d => `link link-${d.type}`)
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y)
                .attr('stroke', d => d.type === 'primary' ? '#00ff88' : '#4ecdc4')
                .attr('stroke-width', d => d.strength * 2)
                .attr('stroke-opacity', d => d.strength * this.options.connectionOpacity);
        }
        
        // Create nodes for each layer
        this.layers.forEach((layer, layerIdx) => {
            const layerGroup = this.g.append('g')
                .attr('class', `layer-group layer-${layerIdx}`)
                .attr('opacity', layerIdx === 0 ? 1 : 0.3);
            
            // Add nodes
            const nodes = layerGroup.selectAll('.node')
                .data(layer.nodes)
                .enter()
                .append('g')
                .attr('class', 'node')
                .attr('transform', d => `translate(${d.x}, ${d.y})`);
            
            // Add circles
            nodes.append('circle')
                .attr('r', d => d.radius)
                .attr('fill', d => d.color)
                .attr('stroke', 'white')
                .attr('stroke-width', 2)
                .attr('filter', layerIdx === 0 ? 'url(#glow)' : null);
            
            // Add labels for small token counts
            if (this.tokens.length <= 20) {
                nodes.append('text')
                    .attr('y', -12)
                    .attr('text-anchor', 'middle')
                    .attr('fill', 'var(--text-primary)')
                    .attr('font-size', '10px')
                    .text(d => d.token);
            }
            
            this.layerGroups.push(layerGroup);
        });
    }
    
    setupInteractions() {
        // Create tooltip
        this.tooltip = d3.select(this.container)
            .append('div')
            .attr('class', 'layer-flow-tooltip')
            .style('position', 'absolute')
            .style('padding', '8px')
            .style('background', 'rgba(0, 0, 0, 0.8)')
            .style('color', 'white')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('display', 'none')
            .style('z-index', '1000');
        
        // Add hover interactions to nodes
        this.g.selectAll('.node')
            .on('mouseenter', (event, d) => {
                // Show tooltip
                this.tooltip
                    .style('display', 'block')
                    .html(`
                        <strong>Token:</strong> ${d.token}<br>
                        <strong>Layer:</strong> ${d.layer}<br>
                        <strong>Position:</strong> ${d.tokenIndex}
                    `);
                
                // Highlight node
                d3.select(event.currentTarget)
                    .select('circle')
                    .transition()
                    .duration(200)
                    .attr('r', d.radius * 1.5);
            })
            .on('mousemove', (event) => {
                const [x, y] = d3.pointer(event, this.container);
                this.tooltip
                    .style('left', (x + 10) + 'px')
                    .style('top', (y - 30) + 'px');
            })
            .on('mouseleave', (event, d) => {
                // Hide tooltip
                this.tooltip.style('display', 'none');
                
                // Reset node size
                d3.select(event.currentTarget)
                    .select('circle')
                    .transition()
                    .duration(200)
                    .attr('r', d.radius);
            });
    }
    
    addControls() {
        // Add control panel
        const controlPanel = d3.select(this.container)
            .append('div')
            .attr('class', 'layer-flow-controls')
            .style('position', 'absolute')
            .style('top', '10px')
            .style('right', '10px')
            .style('background', 'rgba(0, 0, 0, 0.7)')
            .style('color', 'white')
            .style('padding', '10px')
            .style('border-radius', '4px')
            .style('display', 'flex')
            .style('flex-direction', 'column')
            .style('gap', '10px');
        
        // Add title
        controlPanel.append('div')
            .style('font-weight', 'bold')
            .text('Layer Flow Controls');
        
        // Add animation buttons
        const buttonGroup = controlPanel.append('div')
            .style('display', 'flex')
            .style('gap', '5px');
        
        // Play button
        const playBtn = buttonGroup.append('button')
            .style('padding', '5px 10px')
            .style('background', '#00ff88')
            .style('color', 'black')
            .style('border', 'none')
            .style('border-radius', '4px')
            .style('cursor', 'pointer')
            .text('Animate Flow')
            .on('click', () => this.animateFlow());
        
        // Reset button
        const resetBtn = buttonGroup.append('button')
            .style('padding', '5px 10px')
            .style('background', '#4ecdc4')
            .style('color', 'black')
            .style('border', 'none')
            .style('border-radius', '4px')
            .style('cursor', 'pointer')
            .text('Reset')
            .on('click', () => this.resetAnimation());
        
        // Add layer selector
        const layerSelector = controlPanel.append('div');
        
        layerSelector.append('label')
            .style('display', 'block')
            .style('margin-bottom', '5px')
            .text('Highlight Layer:');
        
        const select = layerSelector.append('select')
            .style('width', '100%')
            .style('padding', '5px')
            .style('background', 'rgba(255, 255, 255, 0.1)')
            .style('color', 'white')
            .style('border', '1px solid rgba(255, 255, 255, 0.3)')
            .style('border-radius', '4px')
            .on('change', (event) => {
                const layerIdx = parseInt(event.target.value);
                this.highlightLayer(layerIdx);
            });
        
        // Add options
        select.append('option')
            .attr('value', '-1')
            .text('All Layers');
        
        this.layers.forEach((layer, idx) => {
            select.append('option')
                .attr('value', idx)
                .text(layer.name);
        });
        
        // Add info
        controlPanel.append('div')
            .style('font-size', '11px')
            .style('color', 'rgba(255, 255, 255, 0.7)')
            .html(`
                <div>Tokens: ${this.tokens.length}</div>
                <div>Layers: ${this.layers.length}</div>
            `);
    }
    
    animateFlow() {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        this.currentLayer = 0;
        
        // Reset all layers to low opacity
        this.layerGroups.forEach(group => {
            group.transition()
                .duration(300)
                .attr('opacity', 0.3);
        });
        
        // Animate through layers
        const animateNextLayer = () => {
            if (this.currentLayer >= this.layers.length) {
                this.isAnimating = false;
                return;
            }
            
            // Highlight current layer
            this.layerGroups[this.currentLayer]
                .transition()
                .duration(this.options.animationDuration)
                .attr('opacity', 1)
                .on('end', () => {
                    // Fade previous layer
                    if (this.currentLayer > 0) {
                        this.layerGroups[this.currentLayer - 1]
                            .transition()
                            .duration(this.options.animationDuration / 2)
                            .attr('opacity', 0.5);
                    }
                    
                    this.currentLayer++;
                    animateNextLayer();
                });
        };
        
        animateNextLayer();
    }
    
    resetAnimation() {
        this.isAnimating = false;
        this.currentLayer = 0;
        
        // Reset all layers
        this.layerGroups.forEach((group, idx) => {
            group.transition()
                .duration(300)
                .attr('opacity', idx === 0 ? 1 : 0.3);
        });
    }
    
    highlightLayer(layerIdx) {
        if (layerIdx === -1) {
            // Show all layers
            this.layerGroups.forEach(group => {
                group.transition()
                    .duration(300)
                    .attr('opacity', 1);
            });
        } else {
            // Highlight specific layer
            this.layerGroups.forEach((group, idx) => {
                group.transition()
                    .duration(300)
                    .attr('opacity', idx === layerIdx ? 1 : 0.3);
            });
        }
    }
    
    destroy() {
        // Stop any ongoing animations
        this.isAnimating = false;
        
        // Clear container
        d3.select(this.container).selectAll("*").remove();
    }
}

// Register the class globally
window.LayerFlowVisualization = LayerFlowVisualization;

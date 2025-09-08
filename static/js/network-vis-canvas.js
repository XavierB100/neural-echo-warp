/**
 * Neural Echo - Canvas Network Visualization Module
 * High-performance canvas-based network graph for large token sets
 */

class NetworkVisualizationCanvas {
    constructor(container, data, options = {}) {
        this.container = container;
        this.data = data;
        this.options = {
            width: options.width || 800,
            height: options.height || 600,
            nodeRadius: options.nodeRadius || 6,
            linkDistance: options.linkDistance || 100,
            chargeStrength: options.chargeStrength || -200,
            showLabels: options.showLabels !== false,
            maxLinks: options.maxLinks || 500,  // Limit connections for performance
            linkThreshold: options.linkThreshold || 0.1,
            ...options
        };
        
        this.canvas = null;
        this.ctx = null;
        this.simulation = null;
        this.nodes = [];
        this.links = [];
        this.hoveredNode = null;
        this.selectedNode = null;
        this.transform = d3.zoomIdentity;
        
        this.init();
    }
    
    init() {
        // Clear container
        d3.select(this.container).selectAll("*").remove();
        
        // Create canvas
        this.canvas = d3.select(this.container)
            .append('canvas')
            .attr('width', this.options.width)
            .attr('height', this.options.height)
            .style('width', '100%')
            .style('height', '100%')
            .style('cursor', 'grab');
        
        this.ctx = this.canvas.node().getContext('2d');
        
        // Add info overlay
        this.infoDiv = d3.select(this.container)
            .append('div')
            .style('position', 'absolute')
            .style('top', '10px')
            .style('left', '10px')
            .style('background', 'rgba(0,0,0,0.7)')
            .style('color', 'white')
            .style('padding', '5px 10px')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('display', 'none');
        
        // Process data
        this.processData();
        
        // Setup interactions
        this.setupInteractions();
        
        // Start simulation
        this.startSimulation();
    }
    
    processData() {
        // Create nodes
        const tokens = this.data.tokens || [];
        this.nodes = tokens.map((token, i) => ({
            id: i,
            name: token,
            x: Math.random() * this.options.width,
            y: Math.random() * this.options.height,
            vx: 0,
            vy: 0,
            group: this.getTokenGroup(token)
        }));
        
        // Create links (with performance limits)
        this.links = [];
        let linkCount = 0;
        
        if (this.data.attention && this.data.attention.layers) {
            const firstLayer = this.data.attention.layers.layer_0;
            
            if (firstLayer && firstLayer.average) {
                if (firstLayer.average.weights) {
                    // Full weights - extract top connections
                    const weights = firstLayer.average.weights;
                    const allLinks = [];
                    
                    for (let i = 0; i < weights.length && i < this.nodes.length; i++) {
                        for (let j = 0; j < weights[i].length && j < this.nodes.length; j++) {
                            if (i !== j && weights[i][j] > this.options.linkThreshold) {
                                allLinks.push({
                                    source: i,
                                    target: j,
                                    value: weights[i][j]
                                });
                            }
                        }
                    }
                    
                    // Sort by weight and take top N
                    allLinks.sort((a, b) => b.value - a.value);
                    this.links = allLinks.slice(0, this.options.maxLinks);
                    
                } else if (firstLayer.average.sparse_weights) {
                    // Sparse weights - already limited
                    const { indices, values, shape } = firstLayer.average.sparse_weights;
                    const [rows, cols] = shape;
                    
                    indices.forEach((flatIndex, idx) => {
                        if (linkCount < this.options.maxLinks) {
                            const value = values[idx];
                            if (value > this.options.linkThreshold) {
                                const i = Math.floor(flatIndex / cols);
                                const j = flatIndex % cols;
                                if (i !== j && i < this.nodes.length && j < this.nodes.length) {
                                    this.links.push({
                                        source: i,
                                        target: j,
                                        value: value
                                    });
                                    linkCount++;
                                }
                            }
                        }
                    });
                }
            }
        }
        
        console.log(`Canvas Network: ${this.nodes.length} nodes, ${this.links.length} links`);
    }
    
    getTokenGroup(token) {
        if (['[CLS]', '[SEP]', '[PAD]', '<s>', '</s>', '<pad>'].includes(token)) {
            return 'special';
        } else if (/^[A-Z]/.test(token)) {
            return 'capitalized';
        } else if (/^\d+$/.test(token)) {
            return 'number';
        } else if (/^[^\w\s]/.test(token)) {
            return 'punctuation';
        }
        return 'word';
    }
    
    startSimulation() {
        this.simulation = d3.forceSimulation(this.nodes)
            .force("link", d3.forceLink(this.links)
                .id(d => d.id)
                .distance(this.options.linkDistance)
                .strength(d => Math.min(1, d.value * 2)))
            .force("charge", d3.forceManyBody()
                .strength(this.options.chargeStrength))
            .force("center", d3.forceCenter(this.options.width / 2, this.options.height / 2))
            .force("collision", d3.forceCollide().radius(this.options.nodeRadius + 2))
            .on("tick", () => this.render());
    }
    
    setupInteractions() {
        const canvas = this.canvas.node();
        
        // Mouse move for hover
        d3.select(canvas).on('mousemove', (event) => {
            const [x, y] = d3.pointer(event);
            const node = this.getNodeAtPosition(x, y);
            
            if (node !== this.hoveredNode) {
                this.hoveredNode = node;
                canvas.style.cursor = node ? 'pointer' : 'grab';
                
                if (node) {
                    this.showNodeInfo(node);
                } else {
                    this.hideNodeInfo();
                }
                
                this.render();
            }
        });
        
        // Click for selection
        d3.select(canvas).on('click', (event) => {
            const [x, y] = d3.pointer(event);
            const node = this.getNodeAtPosition(x, y);
            
            if (node) {
                this.selectedNode = this.selectedNode === node ? null : node;
                this.render();
            }
        });
        
        // Zoom and pan
        const zoom = d3.zoom()
            .scaleExtent([0.1, 10])
            .on('zoom', (event) => {
                this.transform = event.transform;
                this.render();
            });
        
        this.canvas.call(zoom);
        
        // Drag nodes
        const drag = d3.drag()
            .subject(() => {
                const [x, y] = d3.pointer(event);
                return this.getNodeAtPosition(x, y);
            })
            .on('start', (event) => {
                if (!event.active) this.simulation.alphaTarget(0.3).restart();
                const node = event.subject;
                if (node) {
                    node.fx = node.x;
                    node.fy = node.y;
                }
            })
            .on('drag', (event) => {
                const node = event.subject;
                if (node) {
                    node.fx = event.x;
                    node.fy = event.y;
                }
            })
            .on('end', (event) => {
                if (!event.active) this.simulation.alphaTarget(0);
                const node = event.subject;
                if (node) {
                    node.fx = null;
                    node.fy = null;
                }
            });
        
        this.canvas.call(drag);
    }
    
    getNodeAtPosition(x, y) {
        // Transform mouse coordinates
        const point = this.transform.invert([x, y]);
        
        // Find closest node
        for (const node of this.nodes) {
            const dx = node.x - point[0];
            const dy = node.y - point[1];
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < this.options.nodeRadius + 2) {
                return node;
            }
        }
        return null;
    }
    
    showNodeInfo(node) {
        const connections = this.links.filter(
            l => l.source.id === node.id || l.target.id === node.id
        ).length;
        
        this.infoDiv
            .style('display', 'block')
            .html(`
                <strong>Token:</strong> ${node.name}<br>
                <strong>Position:</strong> ${node.id}<br>
                <strong>Type:</strong> ${node.group}<br>
                <strong>Connections:</strong> ${connections}
            `);
    }
    
    hideNodeInfo() {
        this.infoDiv.style('display', 'none');
    }
    
    render() {
        const ctx = this.ctx;
        const width = this.options.width;
        const height = this.options.height;
        
        // Clear canvas
        ctx.save();
        ctx.clearRect(0, 0, width, height);
        
        // Apply zoom transform
        ctx.translate(this.transform.x, this.transform.y);
        ctx.scale(this.transform.k, this.transform.k);
        
        // Draw links
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 0.5;
        
        this.links.forEach(link => {
            const opacity = this.hoveredNode ? 
                (link.source.id === this.hoveredNode.id || link.target.id === this.hoveredNode.id ? 0.8 : 0.1) : 
                0.3;
            
            ctx.globalAlpha = opacity;
            ctx.lineWidth = 0.5 + link.value * 2;
            
            ctx.beginPath();
            ctx.moveTo(link.source.x, link.source.y);
            ctx.lineTo(link.target.x, link.target.y);
            ctx.stroke();
        });
        
        // Draw nodes
        ctx.globalAlpha = 1;
        const colors = {
            special: '#ff6b6b',
            capitalized: '#4ecdc4',
            number: '#45b7d1',
            punctuation: '#ffd93d',
            word: '#6bcf7f'
        };
        
        this.nodes.forEach(node => {
            const isHovered = this.hoveredNode === node;
            const isSelected = this.selectedNode === node;
            const isConnected = this.hoveredNode && this.links.some(
                l => (l.source.id === this.hoveredNode.id && l.target.id === node.id) ||
                     (l.target.id === this.hoveredNode.id && l.source.id === node.id)
            );
            
            // Node opacity
            ctx.globalAlpha = this.hoveredNode ? 
                (isHovered || isConnected ? 1 : 0.3) : 1;
            
            // Draw node
            ctx.fillStyle = colors[node.group] || colors.word;
            ctx.beginPath();
            ctx.arc(node.x, node.y, this.options.nodeRadius, 0, 2 * Math.PI);
            ctx.fill();
            
            // Draw border
            if (isHovered || isSelected) {
                ctx.strokeStyle = isSelected ? '#fff' : '#333';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            
            // Draw label if enabled and close enough
            if (this.options.showLabels && this.transform.k > 0.8) {
                ctx.fillStyle = '#000';
                ctx.font = `${10 / this.transform.k}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText(node.name, node.x, node.y - this.options.nodeRadius - 3);
            }
        });
        
        ctx.restore();
    }
    
    // Public methods
    reset() {
        this.transform = d3.zoomIdentity;
        this.simulation.alpha(1).restart();
        this.render();
    }
    
    destroy() {
        if (this.simulation) {
            this.simulation.stop();
        }
        d3.select(this.container).selectAll("*").remove();
    }
}

// Export
window.NetworkVisualizationCanvas = NetworkVisualizationCanvas;

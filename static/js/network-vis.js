/**
 * Neural Echo - Network Visualization Module
 * Force-directed graph showing token relationships based on attention weights
 */

class NetworkVisualization {
    constructor(container, data, options = {}) {
        this.container = container;
        this.data = data;
        this.options = {
            width: options.width || 800,
            height: options.height || 600,
            nodeRadius: options.nodeRadius || 8,
            linkDistance: options.linkDistance || 100,
            chargeStrength: options.chargeStrength || -300,
            colorScheme: options.colorScheme || 'schemeCategory10',
            showLabels: options.showLabels !== false,
            animationDuration: options.animationDuration || 750,
            ...options
        };
        
        this.simulation = null;
        this.svg = null;
        this.g = null;
        this.nodes = [];
        this.links = [];
        this.tooltip = null;
        
        this.init();
    }
    
    init() {
        // Clear existing content
        d3.select(this.container).selectAll("*").remove();
        
        // Create SVG
        this.svg = d3.select(this.container)
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", [0, 0, this.options.width, this.options.height]);
        
        // Create container group for zoom/pan
        this.g = this.svg.append("g");
        
        // Add zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.1, 10])
            .on("zoom", (event) => {
                this.g.attr("transform", event.transform);
            });
        
        this.svg.call(zoom);
        
        // Create tooltip
        this.tooltip = d3.select("body").append("div")
            .attr("class", "network-tooltip")
            .style("opacity", 0)
            .style("position", "absolute")
            .style("padding", "10px")
            .style("background", "rgba(0, 0, 0, 0.8)")
            .style("color", "white")
            .style("border-radius", "5px")
            .style("pointer-events", "none")
            .style("font-size", "12px");
        
        // Process data and render
        this.processData();
        this.render();
    }
    
    processData() {
        // Extract tokens and create nodes
        const tokens = this.data.tokens || [];
        this.nodes = tokens.map((token, i) => ({
            id: i,
            name: token,
            group: this.getTokenGroup(token),
            index: i
        }));
        
        // Extract attention weights and create links
        this.links = [];
        
        if (this.data.attention && this.data.attention.layers) {
            // Use the first layer's average attention for initial visualization
            const firstLayer = this.data.attention.layers.layer_0;
            
            if (firstLayer && firstLayer.average) {
                if (firstLayer.average.weights) {
                    // Full attention weights (sequences <= 150 tokens)
                    this.processFullAttention(firstLayer.average.weights);
                } else if (firstLayer.average.sparse_weights) {
                    // Sparse attention weights (sequences > 150 tokens)
                    this.processSparseAttention(firstLayer.average.sparse_weights);
                }
            }
        }
    }
    
    processFullAttention(weights) {
        const threshold = this.calculateThreshold(weights);
        
        for (let i = 0; i < weights.length; i++) {
            for (let j = 0; j < weights[i].length; j++) {
                if (i !== j && weights[i][j] > threshold) {
                    this.links.push({
                        source: i,
                        target: j,
                        value: weights[i][j],
                        strength: this.normalizeWeight(weights[i][j])
                    });
                }
            }
        }
    }
    
    processSparseAttention(sparseData) {
        const { indices, values, shape } = sparseData;
        const [rows, cols] = shape;
        
        // Calculate threshold from sparse values
        const threshold = this.calculateThreshold(values);
        
        indices.forEach((flatIndex, idx) => {
            const value = values[idx];
            if (value > threshold) {
                const i = Math.floor(flatIndex / cols);
                const j = flatIndex % cols;
                
                if (i !== j && i < this.nodes.length && j < this.nodes.length) {
                    this.links.push({
                        source: i,
                        target: j,
                        value: value,
                        strength: this.normalizeWeight(value)
                    });
                }
            }
        });
    }
    
    calculateThreshold(values) {
        // Use 75th percentile as threshold to show only strong connections
        const sorted = Array.isArray(values) 
            ? [...values].flat().sort((a, b) => a - b)
            : [...values].sort((a, b) => a - b);
        const percentileIndex = Math.floor(sorted.length * 0.75);
        return sorted[percentileIndex] || 0;
    }
    
    normalizeWeight(weight) {
        // Normalize to 0-1 range for visual encoding
        return Math.min(1, Math.max(0, weight * 5));
    }
    
    getTokenGroup(token) {
        // Categorize tokens for coloring
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
    
    render() {
        // Color scale
        const color = d3.scaleOrdinal(d3[this.options.colorScheme]);
        
        // Create force simulation
        this.simulation = d3.forceSimulation(this.nodes)
            .force("link", d3.forceLink(this.links)
                .id(d => d.id)
                .distance(this.options.linkDistance)
                .strength(d => d.strength))
            .force("charge", d3.forceManyBody()
                .strength(this.options.chargeStrength))
            .force("center", d3.forceCenter(this.options.width / 2, this.options.height / 2))
            .force("collision", d3.forceCollide().radius(this.options.nodeRadius + 2));
        
        // Create links
        const link = this.g.append("g")
            .attr("class", "links")
            .selectAll("line")
            .data(this.links)
            .join("line")
            .attr("stroke", "#999")
            .attr("stroke-opacity", d => 0.2 + d.strength * 0.6)
            .attr("stroke-width", d => 0.5 + d.strength * 2);
        
        // Create nodes
        const node = this.g.append("g")
            .attr("class", "nodes")
            .selectAll("g")
            .data(this.nodes)
            .join("g")
            .call(this.drag());
        
        // Add circles to nodes
        node.append("circle")
            .attr("r", this.options.nodeRadius)
            .attr("fill", d => color(d.group))
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5);
        
        // Add labels if enabled
        if (this.options.showLabels) {
            node.append("text")
                .text(d => d.name)
                .attr("x", 0)
                .attr("y", -this.options.nodeRadius - 3)
                .attr("text-anchor", "middle")
                .attr("font-size", "10px")
                .attr("fill", "var(--text-primary)")
                .style("pointer-events", "none");
        }
        
        // Add hover effects
        node.on("mouseover", (event, d) => this.handleNodeHover(event, d))
            .on("mouseout", () => this.handleNodeOut())
            .on("click", (event, d) => this.handleNodeClick(event, d));
        
        // Update positions on simulation tick
        this.simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);
            
            node.attr("transform", d => `translate(${d.x},${d.y})`);
        });
    }
    
    drag() {
        return d3.drag()
            .on("start", (event, d) => {
                if (!event.active) this.simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on("drag", (event, d) => {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on("end", (event, d) => {
                if (!event.active) this.simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            });
    }
    
    handleNodeHover(event, d) {
        // Highlight connected nodes and edges
        const connectedNodes = new Set();
        connectedNodes.add(d.id);
        
        this.links.forEach(link => {
            if (link.source.id === d.id) connectedNodes.add(link.target.id);
            if (link.target.id === d.id) connectedNodes.add(link.source.id);
        });
        
        // Dim non-connected elements
        d3.selectAll(".nodes g")
            .style("opacity", node => connectedNodes.has(node.id) ? 1 : 0.3);
        
        d3.selectAll(".links line")
            .style("opacity", link => 
                (link.source.id === d.id || link.target.id === d.id) ? 0.8 : 0.1);
        
        // Show tooltip
        this.tooltip.transition()
            .duration(200)
            .style("opacity", .9);
        
        this.tooltip.html(`
            <strong>Token:</strong> ${d.name}<br>
            <strong>Position:</strong> ${d.index}<br>
            <strong>Type:</strong> ${d.group}<br>
            <strong>Connections:</strong> ${connectedNodes.size - 1}
        `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
    }
    
    handleNodeOut() {
        // Reset opacity
        d3.selectAll(".nodes g").style("opacity", 1);
        d3.selectAll(".links line").style("opacity", d => 0.2 + d.strength * 0.6);
        
        // Hide tooltip
        this.tooltip.transition()
            .duration(500)
            .style("opacity", 0);
    }
    
    handleNodeClick(event, d) {
        console.log("Node clicked:", d);
        // Emit custom event for parent to handle
        const customEvent = new CustomEvent('nodeClicked', { 
            detail: { node: d, data: this.data }
        });
        this.container.dispatchEvent(customEvent);
    }
    
    // Public methods
    updateData(newData) {
        this.data = newData;
        this.processData();
        this.render();
    }
    
    reset() {
        // Reset zoom
        this.svg.transition()
            .duration(750)
            .call(d3.zoom().transform, d3.zoomIdentity);
        
        // Restart simulation
        this.simulation.alpha(1).restart();
    }
    
    destroy() {
        if (this.simulation) {
            this.simulation.stop();
        }
        if (this.tooltip) {
            this.tooltip.remove();
        }
        d3.select(this.container).selectAll("*").remove();
    }
}

// Export for use in main app
window.NetworkVisualization = NetworkVisualization;

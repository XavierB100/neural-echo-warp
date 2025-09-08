/**
 * Neural Echo - Attention Heatmap Visualization Module
 * Interactive heatmap showing attention weights between tokens
 */

class AttentionHeatmap {
    constructor(container, data, options = {}) {
        this.container = container;
        this.data = data;
        this.options = {
            width: options.width || 800,
            height: options.height || 800,
            margin: options.margin || {top: 100, right: 50, bottom: 50, left: 100},
            colorScheme: options.colorScheme || 'interpolateViridis',
            showValues: options.showValues !== false,
            animationDuration: options.animationDuration || 300,
            currentLayer: options.currentLayer || 0,
            currentHead: options.currentHead || 'average',
            ...options
        };
        
        this.svg = null;
        this.g = null;
        this.colorScale = null;
        this.xScale = null;
        this.yScale = null;
        this.tooltip = null;
        this.attentionMatrix = null;
        
        this.init();
    }
    
    init() {
        // Clear existing content
        d3.select(this.container).selectAll("*").remove();
        
        // Adjust dimensions to prevent cutoff
        this.options.width = this.options.width - 40;  // Account for container padding
        this.options.height = this.options.height - 40;
        
        // Calculate dimensions
        const innerWidth = this.options.width - this.options.margin.left - this.options.margin.right;
        const innerHeight = this.options.height - this.options.margin.top - this.options.margin.bottom;
        
        // Create SVG
        this.svg = d3.select(this.container)
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", [0, 0, this.options.width, this.options.height]);
        
        // Create main group
        this.g = this.svg.append("g")
            .attr("transform", `translate(${this.options.margin.left},${this.options.margin.top})`);
        
        // Create scales
        const tokens = this.data.tokens || [];
        this.xScale = d3.scaleBand()
            .domain(d3.range(tokens.length))
            .range([0, innerWidth])
            .padding(0.05);
        
        this.yScale = d3.scaleBand()
            .domain(d3.range(tokens.length))
            .range([0, innerHeight])
            .padding(0.05);
        
        // Create color scale
        this.colorScale = d3.scaleSequential(d3[this.options.colorScheme])
            .domain([0, 1]);
        
        // Create tooltip
        this.tooltip = d3.select("body").append("div")
            .attr("class", "heatmap-tooltip")
            .style("opacity", 0)
            .style("position", "absolute")
            .style("padding", "10px")
            .style("background", "rgba(0, 0, 0, 0.8)")
            .style("color", "white")
            .style("border-radius", "5px")
            .style("pointer-events", "none")
            .style("font-size", "12px");
        
        // Add layer/head selector
        this.addControls();
        
        // Process and render data
        this.processData();
        this.render();
    }
    
    addControls() {
        // Add control panel for layer/head selection
        const controlPanel = d3.select(this.container)
            .insert("div", ":first-child")
            .attr("class", "heatmap-controls")
            .style("padding", "10px")
            .style("background", "var(--bg-secondary)")
            .style("border-radius", "8px")
            .style("margin-bottom", "10px")
            .style("display", "flex")
            .style("gap", "20px")
            .style("align-items", "center");
        
        // Layer selector
        if (this.data.attention && this.data.attention.layers) {
            const layers = Object.keys(this.data.attention.layers);
            
            controlPanel.append("div")
                .style("display", "flex")
                .style("align-items", "center")
                .style("gap", "10px")
                .html(`
                    <label for="layerSelect" style="font-weight: 500;">Layer:</label>
                    <select id="layerSelect" style="padding: 5px; border-radius: 4px; border: 1px solid var(--border);">
                        ${layers.map((layer, i) => 
                            `<option value="${layer}" ${i === this.options.currentLayer ? 'selected' : ''}>
                                Layer ${i}
                            </option>`
                        ).join('')}
                    </select>
                `);
            
            // Head selector
            const firstLayer = this.data.attention.layers[layers[0]];
            const heads = ['average', ...Object.keys(firstLayer.heads || {})];
            
            controlPanel.append("div")
                .style("display", "flex")
                .style("align-items", "center")
                .style("gap", "10px")
                .html(`
                    <label for="headSelect" style="font-weight: 500;">Head:</label>
                    <select id="headSelect" style="padding: 5px; border-radius: 4px; border: 1px solid var(--border);">
                        <option value="average" selected>Average</option>
                        ${Object.keys(firstLayer.heads || {}).map(head => 
                            `<option value="${head}">${head.replace('head_', 'Head ')}</option>`
                        ).join('')}
                    </select>
                `);
            
            // Add event listeners
            d3.select("#layerSelect").on("change", (event) => {
                this.options.currentLayer = event.target.selectedIndex;
                this.processData();
                this.update();
            });
            
            d3.select("#headSelect").on("change", (event) => {
                this.options.currentHead = event.target.value;
                this.processData();
                this.update();
            });
        }
    }
    
    processData() {
        // Extract attention matrix for current layer and head
        if (this.data.attention && this.data.attention.layers) {
            const layers = Object.keys(this.data.attention.layers);
            const currentLayerKey = layers[this.options.currentLayer];
            const layerData = this.data.attention.layers[currentLayerKey];
            
            if (this.options.currentHead === 'average') {
                // Use average attention
                if (layerData.average) {
                    if (layerData.average.weights) {
                        // Full weights
                        this.attentionMatrix = layerData.average.weights;
                    } else if (layerData.average.sparse_weights) {
                        // Reconstruct from sparse
                        this.attentionMatrix = this.reconstructSparseMatrix(layerData.average.sparse_weights);
                    }
                }
            } else {
                // Use specific head
                const headData = layerData.heads[this.options.currentHead];
                if (headData) {
                    if (headData.weights) {
                        // Full weights
                        this.attentionMatrix = headData.weights;
                    } else if (headData.sparse_weights) {
                        // Reconstruct from sparse
                        this.attentionMatrix = this.reconstructSparseMatrix(headData.sparse_weights);
                    }
                }
            }
            
            // Downsample if matrix is too large (>100x100)
            const maxSize = 100;
            if (this.attentionMatrix && this.attentionMatrix.length > maxSize) {
                console.log(`Downsampling attention matrix from ${this.attentionMatrix.length}x${this.attentionMatrix.length} to ${maxSize}x${maxSize}`);
                this.attentionMatrix = this.downsampleMatrix(this.attentionMatrix, maxSize);
                this.isDownsampled = true;
                this.originalSize = this.data.tokens.length;
            } else {
                this.isDownsampled = false;
            }
        }
        
        // Ensure we have a matrix
        if (!this.attentionMatrix) {
            const tokenLength = this.data.tokens.length;
            this.attentionMatrix = Array(tokenLength).fill().map(() => Array(tokenLength).fill(0));
        }
    }
    
    reconstructSparseMatrix(sparseData) {
        const { indices, values, shape } = sparseData;
        const [rows, cols] = shape;
        
        // Initialize matrix with zeros
        const matrix = Array(rows).fill().map(() => Array(cols).fill(0));
        
        // Fill in the sparse values
        indices.forEach((flatIndex, idx) => {
            const i = Math.floor(flatIndex / cols);
            const j = flatIndex % cols;
            if (i < rows && j < cols) {
                matrix[i][j] = values[idx];
            }
        });
        
        return matrix;
    }
    
    downsampleMatrix(matrix, targetSize) {
        const sourceSize = matrix.length;
        const blockSize = Math.ceil(sourceSize / targetSize);
        const actualSize = Math.ceil(sourceSize / blockSize);
        
        const downsampled = Array(actualSize).fill().map(() => Array(actualSize).fill(0));
        
        for (let i = 0; i < actualSize; i++) {
            for (let j = 0; j < actualSize; j++) {
                let sum = 0;
                let count = 0;
                
                // Average the block
                for (let bi = 0; bi < blockSize; bi++) {
                    for (let bj = 0; bj < blockSize; bj++) {
                        const si = i * blockSize + bi;
                        const sj = j * blockSize + bj;
                        if (si < sourceSize && sj < sourceSize) {
                            sum += matrix[si][sj];
                            count++;
                        }
                    }
                }
                
                downsampled[i][j] = count > 0 ? sum / count : 0;
            }
        }
        
        return downsampled;
    }
    
    render() {
        let tokens = this.data.tokens || [];
        
        // If downsampled, create aggregated token labels
        if (this.isDownsampled) {
            const blockSize = Math.ceil(this.originalSize / this.attentionMatrix.length);
            const downsampledTokens = [];
            for (let i = 0; i < this.attentionMatrix.length; i++) {
                const start = i * blockSize;
                const end = Math.min(start + blockSize, tokens.length);
                if (start < tokens.length) {
                    // Show range or first token
                    if (blockSize > 1) {
                        downsampledTokens.push(`[${start}-${end-1}]`);
                    } else {
                        downsampledTokens.push(tokens[start]);
                    }
                }
            }
            tokens = downsampledTokens;
        }
        
        // ALWAYS use full available space regardless of matrix size
        const innerWidth = this.options.width - this.options.margin.left - this.options.margin.right;
        const innerHeight = this.options.height - this.options.margin.top - this.options.margin.bottom;
        
        // Create cells
        const cells = [];
        for (let i = 0; i < this.attentionMatrix.length; i++) {
            for (let j = 0; j < this.attentionMatrix[i].length; j++) {
                cells.push({
                    x: j,
                    y: i,
                    value: this.attentionMatrix[i][j],
                    fromToken: tokens[i],
                    toToken: tokens[j]
                });
            }
        }
        
        // Draw cells
        this.g.selectAll(".cell")
            .data(cells)
            .join("rect")
            .attr("class", "cell")
            .attr("x", d => this.xScale(d.x))
            .attr("y", d => this.yScale(d.y))
            .attr("width", this.xScale.bandwidth())
            .attr("height", this.yScale.bandwidth())
            .attr("fill", d => this.colorScale(d.value))
            .attr("stroke", "none")
            .on("mouseover", (event, d) => this.handleCellHover(event, d))
            .on("mouseout", () => this.handleCellOut())
            .on("click", (event, d) => this.handleCellClick(event, d));
        
        // Add X axis labels
        const xAxis = this.g.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0, -5)`);
        
        xAxis.selectAll("text")
            .data(tokens)
            .join("text")
            .attr("x", (d, i) => this.xScale(i) + this.xScale.bandwidth() / 2)
            .attr("y", 0)
            .attr("text-anchor", "end")
            .attr("transform", (d, i) => `rotate(-45, ${this.xScale(i) + this.xScale.bandwidth() / 2}, 0)`)
            .attr("font-size", "10px")
            .attr("fill", "var(--text-primary)")
            .text(d => d.length > 10 ? d.substring(0, 10) + "..." : d);
        
        // Add Y axis labels
        const yAxis = this.g.append("g")
            .attr("class", "y-axis")
            .attr("transform", `translate(-5, 0)`);
        
        yAxis.selectAll("text")
            .data(tokens)
            .join("text")
            .attr("x", 0)
            .attr("y", (d, i) => this.yScale(i) + this.yScale.bandwidth() / 2)
            .attr("text-anchor", "end")
            .attr("dominant-baseline", "middle")
            .attr("font-size", "10px")
            .attr("fill", "var(--text-primary)")
            .text(d => d.length > 10 ? d.substring(0, 10) + "..." : d);
        
        // Add color legend
        this.addColorLegend();
        
        // Add axis labels
        this.svg.append("text")
            .attr("transform", `translate(${this.options.width / 2}, ${this.options.height - 10})`)
            .style("text-anchor", "middle")
            .style("font-size", "12px")
            .style("fill", "var(--text-primary)")
            .text("To Token →");
        
        this.svg.append("text")
            .attr("transform", `rotate(-90) translate(${-this.options.height / 2}, 15)`)
            .style("text-anchor", "middle")
            .style("font-size", "12px")
            .style("fill", "var(--text-primary)")
            .text("From Token →");
    }
    
    addColorLegend() {
        const legendWidth = 200;
        const legendHeight = 20;
        
        const legend = this.svg.append("g")
            .attr("class", "color-legend")
            .attr("transform", `translate(${this.options.width - legendWidth - 50}, 20)`);
        
        // Create gradient
        const gradientId = "attention-gradient";
        const gradient = this.svg.append("defs")
            .append("linearGradient")
            .attr("id", gradientId)
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "100%")
            .attr("y2", "0%");
        
        // Add gradient stops
        const numStops = 10;
        for (let i = 0; i <= numStops; i++) {
            const value = i / numStops;
            gradient.append("stop")
                .attr("offset", `${value * 100}%`)
                .attr("stop-color", this.colorScale(value));
        }
        
        // Draw gradient rectangle
        legend.append("rect")
            .attr("width", legendWidth)
            .attr("height", legendHeight)
            .attr("fill", `url(#${gradientId})`);
        
        // Add labels
        legend.append("text")
            .attr("x", 0)
            .attr("y", legendHeight + 15)
            .style("font-size", "10px")
            .style("fill", "var(--text-primary)")
            .text("0.0");
        
        legend.append("text")
            .attr("x", legendWidth)
            .attr("y", legendHeight + 15)
            .attr("text-anchor", "end")
            .style("font-size", "10px")
            .style("fill", "var(--text-primary)")
            .text("1.0");
        
        legend.append("text")
            .attr("x", legendWidth / 2)
            .attr("y", -5)
            .attr("text-anchor", "middle")
            .style("font-size", "11px")
            .style("font-weight", "500")
            .style("fill", "var(--text-primary)")
            .text("Attention Weight");
    }
    
    update() {
        const tokens = this.data.tokens || [];
        
        // Update cells with transition
        const cells = [];
        for (let i = 0; i < this.attentionMatrix.length; i++) {
            for (let j = 0; j < this.attentionMatrix[i].length; j++) {
                cells.push({
                    x: j,
                    y: i,
                    value: this.attentionMatrix[i][j],
                    fromToken: tokens[i],
                    toToken: tokens[j]
                });
            }
        }
        
        this.g.selectAll(".cell")
            .data(cells)
            .transition()
            .duration(this.options.animationDuration)
            .attr("fill", d => this.colorScale(d.value));
    }
    
    handleCellHover(event, d) {
        // Highlight row and column
        this.g.selectAll(".cell")
            .style("opacity", cell => 
                (cell.x === d.x || cell.y === d.y) ? 1 : 0.3);
        
        // Show tooltip
        this.tooltip.transition()
            .duration(200)
            .style("opacity", .9);
        
        this.tooltip.html(`
            <strong>From:</strong> ${d.fromToken} [${d.y}]<br>
            <strong>To:</strong> ${d.toToken} [${d.x}]<br>
            <strong>Attention:</strong> ${d.value.toFixed(4)}
        `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
    }
    
    handleCellOut() {
        // Reset opacity
        this.g.selectAll(".cell")
            .style("opacity", 1);
        
        // Hide tooltip
        this.tooltip.transition()
            .duration(500)
            .style("opacity", 0);
    }
    
    handleCellClick(event, d) {
        console.log("Cell clicked:", d);
        // Emit custom event
        const customEvent = new CustomEvent('cellClicked', { 
            detail: { cell: d, layer: this.options.currentLayer, head: this.options.currentHead }
        });
        this.container.dispatchEvent(customEvent);
    }
    
    // Public methods
    updateData(newData) {
        this.data = newData;
        this.processData();
        this.update();
    }
    
    destroy() {
        if (this.tooltip) {
            this.tooltip.remove();
        }
        d3.select(this.container).selectAll("*").remove();
    }
}

// Export for use in main app
window.AttentionHeatmap = AttentionHeatmap;

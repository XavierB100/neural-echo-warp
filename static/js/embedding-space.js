/**
 * Neural Echo - Embedding Space Visualization Module
 * 3D/2D scatter plot visualization of token embeddings using Three.js
 */

class EmbeddingSpaceVisualization {
    constructor(container, data, options = {}) {
        this.container = container;
        this.data = data;
        this.options = {
            width: options.width || 800,
            height: options.height || 600,
            dimensions: options.dimensions || 3, // 2 or 3
            pointSize: options.pointSize || 10, // Increased for better visibility
            showLabels: options.showLabels !== false,
            animationSpeed: options.animationSpeed || 0.5,
            method: options.method || 'pca', // 'pca', 'tsne', 'umap' - defaulting to PCA due to UMAP compatibility issues
            backgroundColor: options.backgroundColor || 0x1a1a2e, // Softer dark blue
            pointColor: options.pointColor || 0x00ff88,
            showConnections: options.showConnections !== false, // Add connections between similar tokens
            ...options
        };
        
        // Three.js components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.points = null;
        this.labels = [];
        this.raycaster = null;
        this.mouse = null;
        this.hoveredPoint = null;
        this.tooltip = null;
        
        // Data
        this.embeddings = null;
        this.reducedCoordinates = null;
        this.tokens = [];
        
        this.init();
    }
    
    async init() {
        // Clear container
        d3.select(this.container).selectAll("*").remove();
        
        // Create wrapper div
        this.wrapper = d3.select(this.container)
            .append('div')
            .style('position', 'relative')
            .style('width', '100%')
            .style('height', '100%');
        
        // Add loading indicator
        this.showLoading();
        
        // Process embeddings
        await this.processEmbeddings();
        
        // Setup Three.js scene
        this.setupScene();
        
        // Create visualization
        this.createVisualization();
        
        // Setup interactions
        this.setupInteractions();
        
        // Add controls UI
        this.addControlsUI();
        
        // Hide loading
        this.hideLoading();
        
        // Start animation
        this.animate();
    }
    
    showLoading() {
        this.loadingDiv = this.wrapper.append('div')
            .attr('class', 'embedding-loading')
            .style('position', 'absolute')
            .style('top', '50%')
            .style('left', '50%')
            .style('transform', 'translate(-50%, -50%)')
            .style('text-align', 'center')
            .style('color', '#fff')
            .style('z-index', '1000');
        
        this.loadingDiv.append('div')
            .attr('class', 'loader-spinner')
            .style('margin', '0 auto 10px');
        
        this.loadingDiv.append('div')
            .text('Reducing embeddings...');
    }
    
    hideLoading() {
        if (this.loadingDiv) {
            this.loadingDiv.remove();
        }
    }
    
    async processEmbeddings() {
        // Extract tokens and embeddings from data
        this.tokens = this.data.tokens || [];
        
        // Check if we have embeddings or need to request reduction
        if (this.data.embeddings) {
            // We have full embeddings, need to reduce them
            try {
                const response = await fetch('/api/reduce_embeddings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        embeddings: this.data.embeddings,
                        method: this.options.method,
                        n_components: this.options.dimensions
                    })
                });
                
                const result = await response.json();
                if (result.success) {
                    this.reducedCoordinates = result.data.coordinates;
                } else {
                    console.error('Failed to reduce embeddings:', result.error);
                    this.generateRandomCoordinates();
                }
            } catch (error) {
                console.error('Error reducing embeddings:', error);
                this.generateRandomCoordinates();
            }
        } else {
            // No embeddings available, generate random positions for demo
            console.warn('No embeddings available, using random positions');
            this.generateRandomCoordinates();
        }
    }
    
    generateRandomCoordinates() {
        // Generate random coordinates for demonstration
        this.reducedCoordinates = this.tokens.map(() => {
            if (this.options.dimensions === 3) {
                return [
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 2
                ];
            } else {
                return [
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 2
                ];
            }
        });
    }
    
    setupScene() {
        // Get container dimensions
        const rect = this.container.getBoundingClientRect();
        this.options.width = rect.width;
        this.options.height = rect.height;
        
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.options.backgroundColor);
        
        // Create camera
        const aspect = this.options.width / this.options.height;
        if (this.options.dimensions === 3) {
            this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
            this.camera.position.set(0, 0, 3);
        } else {
            // For 2D, use orthographic camera
            const frustumSize = 2;
            this.camera = new THREE.OrthographicCamera(
                frustumSize * aspect / -2,
                frustumSize * aspect / 2,
                frustumSize / 2,
                frustumSize / -2,
                0.1,
                1000
            );
            this.camera.position.set(0, 0, 5);
        }
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.options.width, this.options.height);
        this.wrapper.node().appendChild(this.renderer.domElement);
        
        // Add controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.rotateSpeed = 0.5;
        
        if (this.options.dimensions === 2) {
            // Disable rotation for 2D view
            this.controls.enableRotate = false;
        }
        
        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
        directionalLight.position.set(1, 1, 1);
        this.scene.add(directionalLight);
        
        // Setup raycaster for interactions
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
    }
    
    createVisualization() {
        // Create geometry for points
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];
        
        // Token type colors
        const tokenColors = {
            'special': new THREE.Color(0xff6b6b),    // Red for special tokens
            'capitalized': new THREE.Color(0x4ecdc4), // Teal for capitalized
            'number': new THREE.Color(0xffe66d),      // Yellow for numbers
            'punctuation': new THREE.Color(0xa8e6cf), // Light green for punctuation
            'word': new THREE.Color(0x00ff88)         // Default green for words
        };
        
        // Process each token
        this.reducedCoordinates.forEach((coords, i) => {
            // Add position
            positions.push(coords[0], coords[1], this.options.dimensions === 3 ? (coords[2] || 0) : 0);
            
            // Determine color based on token type
            const token = this.tokens[i];
            let color = tokenColors.word;
            
            if (['[CLS]', '[SEP]', '[PAD]', '<s>', '</s>', '<pad>'].includes(token)) {
                color = tokenColors.special;
            } else if (/^[A-Z]/.test(token)) {
                color = tokenColors.capitalized;
            } else if (/^\d+$/.test(token)) {
                color = tokenColors.number;
            } else if (/^[^\w\s]/.test(token)) {
                color = tokenColors.punctuation;
            }
            
            colors.push(color.r, color.g, color.b);
        });
        
        // Set attributes
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        // Create material with better visual properties
        const material = new THREE.PointsMaterial({
            size: this.options.pointSize / 100,
            vertexColors: true,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending, // Makes points glow
            depthWrite: false // Prevents z-fighting
        });
        
        // Create points mesh
        this.points = new THREE.Points(geometry, material);
        this.scene.add(this.points);
        
        // Animate points appearing
        this.animateEntry();
        
        // Add axes helper for 3D
        if (this.options.dimensions === 3) {
            const axesHelper = new THREE.AxesHelper(1);
            this.scene.add(axesHelper);
        }
        
        // Add subtle grid
        const gridHelper = new THREE.GridHelper(4, 20, 0x2a2a3e, 0x16213e);
        gridHelper.material.opacity = 0.2;
        gridHelper.material.transparent = true;
        if (this.options.dimensions === 2) {
            gridHelper.rotation.x = Math.PI / 2;
        }
        this.scene.add(gridHelper);
        
        // Add subtle fog for depth
        this.scene.fog = new THREE.Fog(this.options.backgroundColor, 2, 8);
    }
    
    setupInteractions() {
        // Create tooltip
        this.tooltip = d3.select(this.container)
            .append('div')
            .attr('class', 'embedding-tooltip')
            .style('position', 'absolute')
            .style('padding', '8px')
            .style('background', 'rgba(0, 0, 0, 0.8)')
            .style('color', 'white')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('display', 'none')
            .style('z-index', '1000');
        
        // Mouse move handler
        this.renderer.domElement.addEventListener('mousemove', (event) => {
            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            
            // Update raycaster
            this.raycaster.setFromCamera(this.mouse, this.camera);
            
            // Check for intersections
            const intersects = this.raycaster.intersectObject(this.points);
            
            if (intersects.length > 0) {
                const index = intersects[0].index;
                const token = this.tokens[index];
                const coords = this.reducedCoordinates[index];
                
                // Show tooltip
                this.tooltip
                    .style('display', 'block')
                    .style('left', (event.clientX - rect.left + 10) + 'px')
                    .style('top', (event.clientY - rect.top - 30) + 'px')
                    .html(`
                        <strong>Token:</strong> ${token}<br>
                        <strong>Index:</strong> ${index}<br>
                        <strong>Position:</strong> [${coords.map(c => c.toFixed(3)).join(', ')}]
                    `);
                
                this.renderer.domElement.style.cursor = 'pointer';
            } else {
                this.tooltip.style('display', 'none');
                this.renderer.domElement.style.cursor = 'grab';
            }
        });
        
        // Mouse leave handler
        this.renderer.domElement.addEventListener('mouseleave', () => {
            this.tooltip.style('display', 'none');
        });
        
        // Window resize handler
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    addControlsUI() {
        // Add control panel
        const controlPanel = this.wrapper.append('div')
            .attr('class', 'embedding-controls')
            .style('position', 'absolute')
            .style('top', '10px')
            .style('right', '10px')
            .style('background', 'rgba(0, 0, 0, 0.7)')
            .style('color', 'white')
            .style('padding', '10px')
            .style('border-radius', '4px')
            .style('font-size', '12px');
        
        // Add dimension toggle
        if (this.options.dimensions === 3) {
            controlPanel.append('div')
                .html(`
                    <strong>3D View</strong><br>
                    <small>Left click: Rotate | Right click: Pan | Scroll: Zoom</small>
                `);
        } else {
            controlPanel.append('div')
                .html(`
                    <strong>2D View</strong><br>
                    <small>Left click: Pan | Scroll: Zoom</small>
                `);
        }
        
        // Add method info
        controlPanel.append('div')
            .style('margin-top', '10px')
            .html(`<strong>Method:</strong> ${this.options.method.toUpperCase()}`);
        
        // Add token count
        controlPanel.append('div')
            .style('margin-top', '5px')
            .html(`<strong>Tokens:</strong> ${this.tokens.length}`);
        
        // Add reset button
        controlPanel.append('button')
            .style('margin-top', '10px')
            .style('padding', '5px 10px')
            .style('background', '#00ff88')
            .style('color', 'black')
            .style('border', 'none')
            .style('border-radius', '4px')
            .style('cursor', 'pointer')
            .text('Reset View')
            .on('click', () => this.resetView());
    }
    
    resetView() {
        // Reset camera position
        if (this.options.dimensions === 3) {
            this.camera.position.set(0, 0, 3);
        } else {
            this.camera.position.set(0, 0, 5);
        }
        
        // Reset controls
        this.controls.reset();
    }
    
    animateEntry() {
        // Animate points scaling in
        let scale = 0;
        const targetScale = 1;
        const animationSpeed = 0.05;
        
        const scaleAnimation = () => {
            if (scale < targetScale) {
                scale += animationSpeed;
                if (scale > targetScale) scale = targetScale;
                
                this.points.scale.set(scale, scale, scale);
                
                requestAnimationFrame(scaleAnimation);
            }
        };
        
        scaleAnimation();
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Update controls
        this.controls.update();
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
    
    onWindowResize() {
        const rect = this.container.getBoundingClientRect();
        this.options.width = rect.width;
        this.options.height = rect.height;
        
        // Update camera
        if (this.camera.isPerspectiveCamera) {
            this.camera.aspect = this.options.width / this.options.height;
            this.camera.updateProjectionMatrix();
        } else {
            // Update orthographic camera
            const aspect = this.options.width / this.options.height;
            const frustumSize = 2;
            this.camera.left = frustumSize * aspect / -2;
            this.camera.right = frustumSize * aspect / 2;
            this.camera.top = frustumSize / 2;
            this.camera.bottom = frustumSize / -2;
            this.camera.updateProjectionMatrix();
        }
        
        // Update renderer
        this.renderer.setSize(this.options.width, this.options.height);
    }
    
    destroy() {
        // Clean up Three.js resources
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        if (this.scene) {
            this.scene.traverse((child) => {
                if (child.geometry) {
                    child.geometry.dispose();
                }
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => material.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }
        
        // Remove event listeners
        window.removeEventListener('resize', () => this.onWindowResize());
        
        // Clear container
        d3.select(this.container).selectAll("*").remove();
    }
}

// Register the class globally
window.EmbeddingSpaceVisualization = EmbeddingSpaceVisualization;

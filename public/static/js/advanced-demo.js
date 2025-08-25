// Demo functionality
class AdvancedDemo {
    constructor() {
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupPerformanceMonitoring();
        this.setupIntersectionObserver();
        this.setupScrollListener();
        this.generateDemoData();
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('.demo-nav-item a');
        const navToggle = document.getElementById('nav-toggle');
        const navigation = document.querySelector('.demo-navigation');
        const navProgress = document.getElementById('nav-progress');
        const navStatus = document.getElementById('nav-status');
        
        // Setup navigation toggle for mobile
        if (navToggle) {
            navToggle.addEventListener('click', () => {
                navigation.classList.toggle('expanded');
                navToggle.classList.toggle('active');
            });
        }
        
        // Setup navigation links
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                const targetSection = document.getElementById(targetId);
                
                if (targetSection) {
                    // Update active nav
                    navLinks.forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                    
                    // Update navigation status
                    navStatus.textContent = `Navigating to ${link.querySelector('.nav-text').textContent}`;
                    
                    // Smooth scroll to section
                    targetSection.scrollIntoView({ behavior: 'smooth' });
                    
                    // Update progress bar
                    this.updateNavigationProgress();
                    
                    // Close mobile navigation
                    if (navigation.classList.contains('expanded')) {
                        navigation.classList.remove('expanded');
                        navToggle.classList.remove('active');
                    }
                }
            });
        });
        
        // Setup scroll spy for navigation highlighting
        this.setupScrollSpy(navLinks);
        
        // Setup keyboard navigation
        this.setupKeyboardNavigation(navLinks);
    }

    setupScrollSpy(navLinks) {
        const sections = document.querySelectorAll('.demo-section');
        const sectionIndicator = document.getElementById('current-section');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const sectionId = entry.target.id;
                    const activeLink = document.querySelector(`[href="#${sectionId}"]`);
                    
                    if (activeLink) {
                        navLinks.forEach(link => link.classList.remove('active'));
                        activeLink.classList.add('active');
                        this.updateNavigationProgress();
                        
                        // Update section indicator
                        if (sectionIndicator) {
                            const sectionName = activeLink.querySelector('.nav-text').textContent;
                            sectionIndicator.textContent = sectionName;
                        }
                    }
                }
            });
        }, { threshold: 0.3 });
        
        sections.forEach(section => observer.observe(section));
    }

    setupKeyboardNavigation(navLinks) {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab' && e.target.closest('.demo-navigation')) {
                e.preventDefault();
                const currentActive = document.querySelector('.demo-nav-item a.active');
                const currentIndex = Array.from(navLinks).indexOf(currentActive);
                
                let nextIndex;
                if (e.shiftKey) {
                    nextIndex = currentIndex > 0 ? currentIndex - 1 : navLinks.length - 1;
                } else {
                    nextIndex = currentIndex < navLinks.length - 1 ? currentIndex + 1 : 0;
                }
                
                navLinks[nextIndex].focus();
            }
        });
    }

    updateNavigationProgress() {
        const navProgress = document.getElementById('nav-progress');
        const sections = document.querySelectorAll('.demo-section');
        const totalSections = sections.length;
        let visibleSections = 0;
        
        sections.forEach(section => {
            const rect = section.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                visibleSections++;
            }
        });
        
        const progress = (visibleSections / totalSections) * 100;
        if (navProgress) {
            navProgress.style.width = `${progress}%`;
        }
    }

    setupScrollListener() {
        let scrollTimeout;
        const backToTop = document.getElementById('back-to-top');
        
        window.addEventListener('scroll', () => {
            // Throttle scroll events for performance
            if (scrollTimeout) return;
            
            scrollTimeout = setTimeout(() => {
                this.updateNavigationProgress();
                
                // Show/hide back to top button
                if (backToTop) {
                    if (window.pageYOffset > 300) {
                        backToTop.classList.add('visible');
                    } else {
                        backToTop.classList.remove('visible');
                    }
                }
                
                scrollTimeout = null;
            }, 100);
        });
        
        // Back to top functionality
        if (backToTop) {
            backToTop.addEventListener('click', () => {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
                
                // Update navigation to first section
                const firstLink = document.querySelector('.demo-nav-item a');
                if (firstLink) {
                    document.querySelectorAll('.demo-nav-item a').forEach(link => link.classList.remove('active'));
                    firstLink.classList.add('active');
                }
            });
        }
    }

    setupPerformanceMonitoring() {
        let frameCount = 0;
        let lastTime = performance.now();
        
        const measurePerformance = () => {
            frameCount++;
            const currentTime = performance.now();
            
            if (currentTime - lastTime >= 1000) {
                const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
                document.getElementById('fps').textContent = fps;
                
                // Memory usage (if available)
                if (performance.memory) {
                    const memoryMB = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
                    document.getElementById('memory').textContent = `${memoryMB} MB`;
                }
                
                frameCount = 0;
                lastTime = currentTime;
            }
            
            requestAnimationFrame(measurePerformance);
        };
        
        requestAnimationFrame(measurePerformance);
    }

    setupIntersectionObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-slide-up');
                }
            });
        }, { threshold: 0.1 });
        
        document.querySelectorAll('.demo-section').forEach(section => {
            observer.observe(section);
        });
    }

    generateDemoData() {
        this.demoData = [];
        for (let i = 0; i < 1000; i++) {
            this.demoData.push({
                id: i + 1,
                name: `Item ${i + 1}`,
                value: Math.random() * 1000,
                category: ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)],
                status: ['active', 'inactive', 'pending'][Math.floor(Math.random() * 3)],
                timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString()
            });
        }
    }
}

// Demo toggle functions
function toggleAISmartForm() {
    const container = document.getElementById('ai-smart-form-demo');
    if (window.AdvancedComponents) {
        container.innerHTML = '';
        const aiForm = window.AdvancedComponents.createAIComponent(container, {
            type: 'smart-form',
            enableLearning: true
        });
        container.classList.add('active');
    }
}

function hideAISmartForm() {
    const container = document.getElementById('ai-smart-form-demo');
    container.innerHTML = 'Click "Show Smart Form" to see AI-powered form suggestions';
    container.classList.remove('active');
}

function toggleAIContentGenerator() {
    const container = document.getElementById('ai-content-generator-demo');
    if (window.AdvancedComponents) {
        container.innerHTML = `
            <div class="ai-smart-form">
                <div class="form-header">
                    <h3>AI Content Generator</h3>
                    <div class="ai-status">Ready</div>
                </div>
                <form class="advanced-form">
                    <div class="form-group">
                        <label>Content Prompt</label>
                        <textarea placeholder="Describe what you want to generate..." rows="3"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Content Type</label>
                        <select>
                            <option value="article">Article</option>
                            <option value="summary">Summary</option>
                            <option value="description">Description</option>
                        </select>
                    </div>
                    <button type="submit" class="btn-advanced primary">Generate Content</button>
                </form>
            </div>
        `;
        container.classList.add('active');
    }
}

function hideAIContentGenerator() {
    const container = document.getElementById('ai-content-generator-demo');
    container.innerHTML = 'Click "Show Generator" to see AI content generation';
    container.classList.remove('active');
}

function toggleAIDataAnalyzer() {
    const container = document.getElementById('ai-data-analyzer-demo');
    if (window.AdvancedComponents) {
        container.innerHTML = `
            <div class="ai-smart-form">
                <div class="form-header">
                    <h3>AI Data Analyzer</h3>
                    <div class="ai-status">Analyzing</div>
                </div>
                <div class="ai-insights">
                    <div class="ai-insight distribution">
                        <div class="insight-header">
                            <span class="insight-title">Data Distribution</span>
                            <span class="insight-confidence">85%</span>
                        </div>
                        <div class="insight-description">Data is well-balanced across categories</div>
                    </div>
                    <div class="ai-insight trend">
                        <div class="insight-header">
                            <span class="insight-title">Trend Analysis</span>
                            <span class="insight-confidence">92%</span>
                        </div>
                        <div class="insight-description">Strong upward trend detected</div>
                    </div>
                </div>
            </div>
        `;
        container.classList.add('active');
    }
}

function hideAIDataAnalyzer() {
    const container = document.getElementById('ai-data-analyzer-demo');
    container.innerHTML = 'Click "Show Analyzer" to see AI data analysis';
    container.classList.remove('active');
}

function toggleVirtualScroller() {
    const container = document.getElementById('virtual-scroller-demo');
    if (window.AdvancedComponents) {
        container.innerHTML = '';
        const scroller = window.AdvancedComponents.createVirtualScroller(container, {
            itemHeight: 50,
            data: window.demo?.demoData || [],
            renderItem: (item, index) => {
                const div = document.createElement('div');
                div.className = 'virtual-scroller-item';
                div.innerHTML = `
                    <strong>${item.name}</strong> - ${item.category} - $${item.value.toFixed(2)}
                `;
                return div;
            },
            enableInfiniteScroll: true
        });
        container.classList.add('active');
    }
}

function hideVirtualScroller() {
    const container = document.getElementById('virtual-scroller-demo');
    container.innerHTML = 'Click "Show Scroller" to see virtual scrolling in action';
    container.classList.remove('active');
}

function toggleInfiniteScroll() {
    const container = document.getElementById('infinite-scroll-demo');
    container.innerHTML = `
        <div class="virtual-scroller-container" style="height: 300px;">
            <div class="virtual-scroller-viewport">
                ${Array.from({ length: 50 }, (_, i) => `
                    <div class="virtual-scroller-item">
                        <strong>Infinite Item ${i + 1}</strong> - This demonstrates infinite scrolling capabilities
                    </div>
                `).join('')}
            </div>
            <div class="demo-actions" style="margin-top: 1rem;">
                <button class="demo-toggle" onclick="loadMoreItems()">Load More</button>
            </div>
        </div>
    `;
    container.classList.add('active');
}

function hideInfiniteScroll() {
    const container = document.getElementById('infinite-scroll-demo');
    container.innerHTML = 'Click "Show Infinite" to see infinite scrolling';
    container.classList.remove('active');
}

function loadMoreItems() {
    // Simulate loading more items
    const viewport = document.querySelector('.virtual-scroller-viewport');
    const newItems = Array.from({ length: 10 }, (_, i) => {
        const index = viewport.children.length + i;
        return `
            <div class="virtual-scroller-item">
                <strong>New Item ${index + 1}</strong> - Dynamically loaded content
            </div>
        `;
    });
    viewport.insertAdjacentHTML('beforeend', newItems.join(''));
}

function toggleRealTimeChart() {
    const container = document.getElementById('real-time-chart-demo');
    if (window.AdvancedComponents) {
        container.innerHTML = '<canvas id="real-time-chart"></canvas>';
        const chart = window.AdvancedComponents.createAdvancedChart(
            document.getElementById('real-time-chart'),
            {
                type: 'line',
                realTime: true,
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    datasets: [{
                        label: 'Real-time Data',
                        data: [65, 59, 80, 81, 56, 55],
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)'
                    }]
                }
            }
        );
        container.classList.add('active');
    }
}

function hideRealTimeChart() {
    const container = document.getElementById('real-time-chart-demo');
    container.innerHTML = 'Click "Show Chart" to see real-time chart updates';
    container.classList.remove('active');
}

function toggleInteractiveChart() {
    const container = document.getElementById('interactive-chart-demo');
    container.innerHTML = `
        <div class="advanced-chart-container">
            <div class="chart-header">
                <h3 class="chart-title">Interactive Chart</h3>
                <div class="chart-controls">
                    <button class="chart-control active" onclick="toggleChartType('line')">Line</button>
                    <button class="chart-control" onclick="toggleChartType('bar')">Bar</button>
                    <button class="chart-control" onclick="toggleChartType('doughnut')">Doughnut</button>
                </div>
            </div>
            <div class="chart-canvas">
                <canvas id="interactive-chart"></canvas>
            </div>
        </div>
    `;
    
    // Initialize chart
    const ctx = document.getElementById('interactive-chart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Q1', 'Q2', 'Q3', 'Q4'],
            datasets: [{
                label: 'Sales',
                data: [12, 19, 3, 5],
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            }
        }
    });
    
    container.classList.add('active');
}

function hideInteractiveChart() {
    const container = document.getElementById('interactive-chart-demo');
    container.innerHTML = 'Click "Show Chart" to see interactive chart';
    container.classList.remove('active');
}

function toggleChartType(type) {
    const chart = Chart.getChart('interactive-chart');
    if (chart) {
        chart.destroy();
        const ctx = document.getElementById('interactive-chart').getContext('2d');
        new Chart(ctx, {
            type: type,
            data: {
                labels: ['Q1', 'Q2', 'Q3', 'Q4'],
                datasets: [{
                    label: 'Sales',
                    data: [12, 19, 3, 5],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }
    
    // Update active button
    document.querySelectorAll('.chart-control').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

function toggleAIDataTable() {
    const container = document.getElementById('ai-data-table-demo');
    if (window.AdvancedComponents) {
        container.innerHTML = '';
        const aiTable = window.AdvancedComponents.createAIDataTable(container, {
            data: window.demo?.demoData || [],
            columns: [
                { key: 'id', label: 'ID', type: 'number' },
                { key: 'name', label: 'Name', type: 'string' },
                { key: 'value', label: 'Value', type: 'currency' },
                { key: 'category', label: 'Category', type: 'string' },
                { key: 'status', label: 'Status', type: 'string' }
            ],
            enableAI: true,
            smartSorting: true,
            predictiveSearch: true,
            anomalyDetection: true,
            autoGrouping: true
        });
        container.classList.add('active');
    }
}

function hideAIDataTable() {
    const container = document.getElementById('ai-data-table-demo');
    container.innerHTML = 'Click "Show Table" to see AI-powered data table';
    container.classList.remove('active');
}

function togglePredictiveSearch() {
    const container = document.getElementById('predictive-search-demo');
    container.innerHTML = `
        <div class="ai-smart-form">
            <div class="form-header">
                <h3>AI Predictive Search</h3>
                <div class="ai-status">Ready</div>
            </div>
            <div class="form-group">
                <label>Search Query</label>
                <input type="text" placeholder="Type to get AI-powered search suggestions..." id="predictive-search-input">
                <div class="ai-suggestions" id="predictive-suggestions"></div>
            </div>
            <div class="demo-actions">
                <button class="demo-toggle" onclick="performPredictiveSearch()">Search</button>
            </div>
        </div>
    `;
    
    // Setup search input
    const input = document.getElementById('predictive-search-input');
    const suggestions = document.getElementById('predictive-suggestions');
    
    input.addEventListener('input', (e) => {
        const query = e.target.value;
        if (query.length > 2) {
            showSearchSuggestions(query);
        } else {
            suggestions.innerHTML = '';
        }
    });
    
    container.classList.add('active');
}

function hidePredictiveSearch() {
    const container = document.getElementById('predictive-search-demo');
    container.innerHTML = 'Click "Show Search" to see predictive search';
    container.classList.remove('active');
}

function showSearchSuggestions(query) {
    const suggestions = document.getElementById('predictive-suggestions');
    const demoData = window.demo?.demoData || [];
    
    const filtered = demoData.filter(item =>
        Object.values(item).some(value =>
            String(value).toLowerCase().includes(query.toLowerCase())
        )
    ).slice(0, 5);
    
    suggestions.innerHTML = filtered.map(item => `
        <div class="ai-suggestion" onclick="selectSearchSuggestion('${item.name}')">
            <span class="suggestion-text">${item.name} - ${item.category}</span>
            <span class="suggestion-confidence">${Math.round(Math.random() * 30 + 70)}%</span>
        </div>
    `).join('');
}

function selectSearchSuggestion(text) {
    document.getElementById('predictive-search-input').value = text;
    document.getElementById('predictive-suggestions').innerHTML = '';
}

function performPredictiveSearch() {
    const query = document.getElementById('predictive-search-input').value;
    if (query.trim()) {
        alert(`AI Search performed for: "${query}"\nThis would trigger intelligent search algorithms.`);
    }
}

function togglePerformanceMonitor() {
    const container = document.getElementById('performance-monitor-demo');
    container.innerHTML = `
        <div class="performance-monitor" style="position: static; box-shadow: none;">
            <div class="performance-header">
                <h3 class="performance-title">Performance Metrics</h3>
            </div>
            <div class="performance-metrics">
                <div class="performance-metric">
                    <span class="metric-label">FPS</span>
                    <span class="metric-value good" id="demo-fps">60</span>
                </div>
                <div class="performance-metric">
                    <span class="metric-label">Memory Usage</span>
                    <span class="metric-value warning" id="demo-memory">45 MB</span>
                </div>
                <div class="performance-metric">
                    <span class="metric-label">Load Time</span>
                    <span class="metric-value good" id="demo-load-time">1.2s</span>
                </div>
                <div class="performance-metric">
                    <span class="metric-label">DOM Nodes</span>
                    <span class="metric-value good" id="demo-dom-nodes">1,247</span>
                </div>
            </div>
        </div>
    `;
    container.classList.add('active');
    
    // Simulate real-time updates
    setInterval(() => {
        const fps = Math.round(Math.random() * 20 + 50);
        const memory = Math.round(Math.random() * 20 + 40);
        const loadTime = (Math.random() * 0.5 + 1.0).toFixed(1);
        const domNodes = Math.round(Math.random() * 200 + 1200);
        
        document.getElementById('demo-fps').textContent = fps;
        document.getElementById('demo-memory').textContent = `${memory} MB`;
        document.getElementById('demo-load-time').textContent = `${loadTime}s`;
        document.getElementById('demo-dom-nodes').textContent = domNodes.toLocaleString();
    }, 2000);
}

function hidePerformanceMonitor() {
    const container = document.getElementById('performance-monitor-demo');
    container.innerHTML = 'Click "Show Monitor" to see performance metrics';
    container.classList.remove('active');
}

function toggleMemoryProfiler() {
    const container = document.getElementById('memory-profiler-demo');
    container.innerHTML = `
        <div class="ai-smart-form">
            <div class="form-header">
                <h3>Memory Profiler</h3>
                <div class="ai-status">Profiling</div>
            </div>
            <div class="ai-insights">
                <div class="ai-insight distribution">
                    <div class="insight-header">
                        <span class="insight-title">Memory Usage</span>
                        <span class="insight-confidence">92%</span>
                    </div>
                    <div class="insight-description">Memory usage is within normal range</div>
                </div>
                <div class="ai-insight trend">
                    <div class="insight-header">
                        <span class="insight-title">Optimization</span>
                        <span class="insight-confidence">78%</span>
                    </div>
                    <div class="insight-description">Consider lazy loading for better performance</div>
                </div>
            </div>
        </div>
    `;
    container.classList.add('active');
}

function hideMemoryProfiler() {
    const container = document.getElementById('memory-profiler-demo');
    container.innerHTML = 'Click "Show Profiler" to see memory profiling';
    container.classList.remove('active');
}

function toggleIntersectionAnimations() {
    const container = document.getElementById('intersection-animations-demo');
    container.innerHTML = `
        <div style="height: 400px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--border-radius); padding: 1rem;">
            <div class="intersection-trigger" style="height: 100px; background: var(--bg-secondary); margin: 1rem 0; padding: 1rem; border-radius: var(--border-radius);">
                <h4>Scroll Down to See Animations</h4>
                <p>This element will animate when it comes into view</p>
            </div>
            <div class="intersection-trigger" style="height: 100px; background: var(--bg-secondary); margin: 1rem 0; padding: 1rem; border-radius: var(--border-radius);">
                <h4>Another Animated Element</h4>
                <p>Each element animates with a slight delay</p>
            </div>
            <div class="intersection-trigger" style="height: 100px; background: var(--bg-secondary); margin: 1rem 0; padding: 1rem; border-radius: var(--border-radius);">
                <h4>Third Animated Element</h4>
                <p>Creating a cascading animation effect</p>
            </div>
            <div class="intersection-trigger" style="height: 100px; background: var(--bg-secondary); margin: 1rem 0; padding: 1rem; border-radius: var(--border-radius);">
                <h4>Final Animated Element</h4>
                <p>All elements use intersection observer for performance</p>
            </div>
        </div>
    `;
    
    // Setup intersection observer for demo
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.5 });
    
    container.querySelectorAll('.intersection-trigger').forEach(el => {
        observer.observe(el);
    });
    
    container.classList.add('active');
}

function hideIntersectionAnimations() {
    const container = document.getElementById('intersection-animations-demo');
    container.innerHTML = 'Click "Show Animations" to see intersection observer animations';
    container.classList.remove('active');
}

function toggleHoverEffects() {
    const container = document.getElementById('hover-effects-demo');
    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
            <div class="demo-card hover-lift">
                <h4>Hover Lift Effect</h4>
                <p>Hover to see the lift animation</p>
            </div>
            <div class="demo-card hover-glow">
                <h4>Hover Glow Effect</h4>
                <p>Hover to see the glow effect</p>
            </div>
            <div class="demo-card hover-rotate">
                <h4>Hover Rotate Effect</h4>
                <p>Hover to see the rotation</p>
            </div>
            <div class="demo-card hover-scale">
                <h4>Hover Scale Effect</h4>
                <p>Hover to see the scaling</p>
            </div>
        </div>
    `;
    container.classList.add('active');
}

function hideHoverEffects() {
    const container = document.getElementById('hover-effects-demo');
    container.innerHTML = 'Click "Show Effects" to see advanced hover animations';
    container.classList.remove('active');
}

// Initialize demo
document.addEventListener('DOMContentLoaded', () => {
    window.demo = new AdvancedDemo();
});

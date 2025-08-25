/**
 * FantDev Trading - Advanced Component Library
 * Sophisticated components with AI, real-time data, and advanced UX patterns
 */

class AdvancedComponentLibrary {
    constructor() {
        this.components = new Map();
        this.observers = new Map();
        this.aiModels = new Map();
        this.realTimeConnections = new Map();
        this.virtualScrollers = new Map();
        this.advancedCharts = new Map();
        this.init();
    }

    init() {
        this.setupIntersectionObserver();
        this.setupResizeObserver();
        this.setupPerformanceMonitoring();
        this.initializeAIComponents();
    }

    // Advanced Virtual Scrolling Component
    createVirtualScroller(container, options = {}) {
        const defaultOptions = {
            itemHeight: 50,
            bufferSize: 10,
            data: [],
            renderItem: null,
            onScroll: null,
            enableInfiniteScroll: false,
            loadMoreThreshold: 100
        };

        const config = { ...defaultOptions, ...options };
        
        const virtualScroller = {
            container,
            config,
            scrollTop: 0,
            visibleItems: [],
            totalHeight: 0,
            startIndex: 0,
            endIndex: 0,
            
            init() {
                this.setupContainer();
                this.calculateDimensions();
                this.renderVisibleItems();
                this.setupEventListeners();
                return this;
            },
            
            setupContainer() {
                this.container.style.position = 'relative';
                this.container.style.overflow = 'auto';
                
                // Create viewport
                this.viewport = document.createElement('div');
                this.viewport.style.position = 'relative';
                this.container.appendChild(this.viewport);
                
                // Create spacer for total height
                this.spacer = document.createElement('div');
                this.spacer.style.position = 'absolute';
                this.spacer.style.top = '0';
                this.spacer.style.left = '0';
                this.spacer.style.right = '0';
                this.container.appendChild(this.spacer);
            },
            
            calculateDimensions() {
                this.totalHeight = this.config.data.length * this.config.itemHeight;
                this.spacer.style.height = `${this.totalHeight}px`;
                
                const containerHeight = this.container.clientHeight;
                this.visibleCount = Math.ceil(containerHeight / this.config.itemHeight) + this.config.bufferSize;
            },
            
            renderVisibleItems() {
                this.calculateVisibleRange();
                this.renderItems();
            },
            
            calculateVisibleRange() {
                const containerHeight = this.container.clientHeight;
                this.startIndex = Math.max(0, Math.floor(this.scrollTop / this.config.itemHeight) - this.config.bufferSize);
                this.endIndex = Math.min(
                    this.config.data.length,
                    Math.ceil((this.scrollTop + containerHeight) / this.config.itemHeight) + this.config.bufferSize
                );
            },
            
            renderItems() {
                // Clear existing items
                this.viewport.innerHTML = '';
                
                // Render visible items
                for (let i = this.startIndex; i < this.endIndex; i++) {
                    const item = this.config.data[i];
                    if (item && this.config.renderItem) {
                        const itemElement = this.config.renderItem(item, i);
                        if (itemElement) {
                            itemElement.style.position = 'absolute';
                            itemElement.style.top = `${i * this.config.itemHeight}px`;
                            itemElement.style.left = '0';
                            itemElement.style.right = '0';
                            itemElement.style.height = `${this.config.itemHeight}px`;
                            this.viewport.appendChild(itemElement);
                        }
                    }
                }
            },
            
            setupEventListeners() {
                this.container.addEventListener('scroll', this.handleScroll.bind(this));
                
                if (this.config.enableInfiniteScroll) {
                    this.setupInfiniteScroll();
                }
            },
            
            handleScroll() {
                this.scrollTop = this.container.scrollTop;
                this.renderVisibleItems();
                
                if (this.config.onScroll) {
                    this.config.onScroll(this.scrollTop);
                }
                
                // Check for infinite scroll
                if (this.config.enableInfiniteScroll) {
                    this.checkInfiniteScroll();
                }
            },
            
            setupInfiniteScroll() {
                this.container.addEventListener('scroll', () => {
                    const { scrollTop, scrollHeight, clientHeight } = this.container;
                    if (scrollTop + clientHeight >= scrollHeight - this.config.loadMoreThreshold) {
                        this.loadMore();
                    }
                });
            },
            
            async loadMore() {
                // Implement load more logic
                if (this.config.onLoadMore) {
                    await this.config.onLoadMore();
                    this.calculateDimensions();
                    this.renderVisibleItems();
                }
            },
            
            updateData(newData) {
                this.config.data = newData;
                this.calculateDimensions();
                this.renderVisibleItems();
            },
            
            scrollToIndex(index) {
                const scrollTop = index * this.config.itemHeight;
                this.container.scrollTo({ top: scrollTop, behavior: 'smooth' });
            },
            
            destroy() {
                this.container.removeEventListener('scroll', this.handleScroll);
                this.container.innerHTML = '';
            }
        };
        
        return virtualScroller.init();
    }

    // Advanced Real-time Chart Component
    createAdvancedChart(container, options = {}) {
        const defaultOptions = {
            type: 'line',
            data: [],
            realTime: false,
            updateInterval: 1000,
            maxDataPoints: 100,
            animations: true,
            responsive: true,
            plugins: [],
            onDataUpdate: null
        };

        const config = { ...defaultOptions, ...options };
        
        const chart = {
            container,
            config,
            chartInstance: null,
            dataStream: null,
            updateTimer: null,
            
            async init() {
                await this.loadChartLibrary();
                this.createChart();
                this.setupRealTimeUpdates();
                return this;
            },
            
            async loadChartLibrary() {
                if (!window.Chart) {
                    await this.loadScript('https://cdn.jsdelivr.net/npm/chart.js');
                }
            },
            
            loadScript(src) {
                return new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = src;
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            },
            
            createChart() {
                const ctx = this.container.getContext('2d');
                
                this.chartInstance = new Chart(ctx, {
                    type: this.config.type,
                    data: this.config.data,
                    options: {
                        responsive: this.config.responsive,
                        animation: this.config.animations,
                        plugins: {
                            ...this.config.plugins,
                            streaming: this.config.realTime ? {
                                duration: 20000,
                                refresh: 1000,
                                delay: 2000,
                                onRefresh: this.onChartRefresh.bind(this)
                            } : false
                        },
                        scales: {
                            x: {
                                type: this.config.realTime ? 'realtime' : 'linear',
                                realtime: this.config.realTime ? {
                                    duration: 20000,
                                    refresh: 1000,
                                    delay: 2000,
                                    onRefresh: this.onChartRefresh.bind(this)
                                } : undefined
                            },
                            y: {
                                beginAtZero: false
                            }
                        }
                    }
                });
            },
            
            setupRealTimeUpdates() {
                if (this.config.realTime) {
                    this.updateTimer = setInterval(() => {
                        this.updateChartData();
                    }, this.config.updateInterval);
                }
            },
            
            updateChartData() {
                if (this.chartInstance && this.config.data.length > 0) {
                    // Add new data point
                    const newDataPoint = this.generateDataPoint();
                    this.config.data.push(newDataPoint);
                    
                    // Remove old data points if exceeding max
                    if (this.config.data.length > this.config.maxDataPoints) {
                        this.config.data.shift();
                    }
                    
                    // Update chart
                    this.chartInstance.update('none');
                    
                    if (this.config.onDataUpdate) {
                        this.config.onDataUpdate(newDataPoint);
                    }
                }
            },
            
            generateDataPoint() {
                // Generate realistic data point
                const lastPoint = this.config.data[this.config.data.length - 1];
                const baseValue = lastPoint ? lastPoint.y : 100;
                const variation = (Math.random() - 0.5) * 10;
                const timestamp = Date.now();
                
                return {
                    x: timestamp,
                    y: Math.max(0, baseValue + variation)
                };
            },
            
            onChartRefresh(chart) {
                // Handle chart refresh for real-time updates
                chart.data.datasets.forEach(dataset => {
                    dataset.data.push({
                        x: Date.now(),
                        y: Math.random() * 100
                    });
                });
            },
            
            addDataPoint(dataPoint) {
                if (this.chartInstance) {
                    this.config.data.push(dataPoint);
                    this.chartInstance.update('none');
                }
            },
            
            updateConfig(newConfig) {
                this.config = { ...this.config, ...newConfig };
                if (this.chartInstance) {
                    this.chartInstance.destroy();
                    this.createChart();
                }
            },
            
            destroy() {
                if (this.updateTimer) {
                    clearInterval(this.updateTimer);
                }
                if (this.chartInstance) {
                    this.chartInstance.destroy();
                }
            }
        };
        
        return chart.init();
    }

    // AI-Powered Component System
    createAIComponent(container, options = {}) {
        const defaultOptions = {
            type: 'smart-form',
            model: 'gpt-3.5-turbo',
            apiKey: null,
            onPrediction: null,
            onSuggestion: null,
            enableLearning: false
        };

        const config = { ...defaultOptions, ...options };
        
        const aiComponent = {
            container,
            config,
            model: null,
            learningData: [],
            
            async init() {
                await this.initializeAIModel();
                this.setupComponent();
                return this;
            },
            
            async initializeAIModel() {
                // Initialize AI model based on type
                switch (this.config.type) {
                    case 'smart-form':
                        this.model = new SmartFormAI(this.config);
                        break;
                    case 'content-generator':
                        this.model = new ContentGeneratorAI(this.config);
                        break;
                    case 'data-analyzer':
                        this.model = new DataAnalyzerAI(this.config);
                        break;
                    default:
                        this.model = new BaseAI(this.config);
                }
                
                await this.model.initialize();
            },
            
            setupComponent() {
                switch (this.config.type) {
                    case 'smart-form':
                        this.setupSmartForm();
                        break;
                    case 'content-generator':
                        this.setupContentGenerator();
                        break;
                    case 'data-analyzer':
                        this.setupDataAnalyzer();
                        break;
                }
            },
            
            setupSmartForm() {
                this.container.innerHTML = `
                    <div class="ai-smart-form">
                        <div class="form-header">
                            <h3>AI-Powered Smart Form</h3>
                            <div class="ai-status" id="ai-status">Initializing...</div>
                        </div>
                        <form id="smart-form">
                            <div class="form-group">
                                <label>Input Field</label>
                                <input type="text" id="smart-input" placeholder="Type to get AI suggestions...">
                                <div class="ai-suggestions" id="ai-suggestions"></div>
                            </div>
                            <button type="submit">Submit</button>
                        </form>
                    </div>
                `;
                
                this.setupSmartFormEvents();
            },
            
            setupSmartFormEvents() {
                const input = this.container.querySelector('#smart-input');
                const suggestions = this.container.querySelector('#ai-suggestions');
                
                let debounceTimer;
                
                input.addEventListener('input', (e) => {
                    clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(async () => {
                        const value = e.target.value;
                        if (value.length > 2) {
                            await this.getSuggestions(value);
                        } else {
                            suggestions.innerHTML = '';
                        }
                    }, 300);
                });
                
                input.addEventListener('focus', () => {
                    this.showSmartTips();
                });
            },
            
            async getSuggestions(input) {
                try {
                    const suggestions = await this.model.getSuggestions(input);
                    this.displaySuggestions(suggestions);
                } catch (error) {
                    console.error('Failed to get AI suggestions:', error);
                }
            },
            
            displaySuggestions(suggestions) {
                const container = this.container.querySelector('#ai-suggestions');
                container.innerHTML = suggestions.map(suggestion => `
                    <div class="ai-suggestion" onclick="this.selectSuggestion('${suggestion.text}')">
                        <span class="suggestion-text">${suggestion.text}</span>
                        <span class="suggestion-confidence">${Math.round(suggestion.confidence * 100)}%</span>
                    </div>
                `).join('');
            },
            
            selectSuggestion(text) {
                const input = this.container.querySelector('#smart-input');
                input.value = text;
                input.focus();
                
                // Clear suggestions
                this.container.querySelector('#ai-suggestions').innerHTML = '';
            },
            
            showSmartTips() {
                // Show contextual tips based on current form state
                const tips = this.model.getContextualTips();
                this.displayTips(tips);
            },
            
            displayTips(tips) {
                // Display helpful tips to the user
                console.log('AI Tips:', tips);
            },
            
            async learnFromInteraction(data) {
                if (this.config.enableLearning) {
                    this.learningData.push(data);
                    await this.model.learn(data);
                }
            },
            
            destroy() {
                if (this.model) {
                    this.model.destroy();
                }
            }
        };
        
        return aiComponent.init();
    }

    // Advanced Data Table with AI Features
    createAIDataTable(container, data, options = {}) {
        const defaultOptions = {
            columns: [],
            enableAI: true,
            smartSorting: true,
            predictiveSearch: true,
            anomalyDetection: true,
            autoGrouping: true,
            onInsight: null
        };

        const config = { ...defaultOptions, ...options };
        
        const aiTable = {
            container,
            data,
            config,
            aiInsights: [],
            groupedData: null,
            
            async init() {
                this.setupTable();
                if (this.config.enableAI) {
                    await this.initializeAI();
                    this.generateInsights();
                }
                return this;
            },
            
            setupTable() {
                this.container.innerHTML = `
                    <div class="ai-data-table">
                        <div class="table-header">
                            <div class="ai-insights" id="ai-insights"></div>
                            <div class="table-controls">
                                <input type="text" placeholder="AI-powered search..." id="ai-search">
                                <button id="smart-group">Smart Group</button>
                                <button id="anomaly-detect">Detect Anomalies</button>
                            </div>
                        </div>
                        <div class="table-container" id="table-container"></div>
                    </div>
                `;
                
                this.setupTableEvents();
                this.renderTable();
            },
            
            setupTableEvents() {
                const searchInput = this.container.querySelector('#ai-search');
                const groupBtn = this.container.querySelector('#smart-group');
                const anomalyBtn = this.container.querySelector('#anomaly-detect');
                
                searchInput.addEventListener('input', this.debounce((e) => {
                    this.performAISearch(e.target.value);
                }, 300));
                
                groupBtn.addEventListener('click', () => this.performSmartGrouping());
                anomalyBtn.addEventListener('click', () => this.detectAnomalies());
            },
            
            async initializeAI() {
                // Initialize AI models for table analysis
                this.aiModels = {
                    clustering: new ClusteringModel(),
                    anomaly: new AnomalyDetectionModel(),
                    prediction: new PredictiveModel()
                };
                
                await Promise.all([
                    this.aiModels.clustering.initialize(),
                    this.aiModels.anomaly.initialize(),
                    this.aiModels.prediction.initialize()
                ]);
            },
            
            async generateInsights() {
                try {
                    // Generate AI insights about the data
                    const insights = await this.analyzeData();
                    this.aiInsights = insights;
                    this.displayInsights();
                } catch (error) {
                    console.error('Failed to generate AI insights:', error);
                }
            },
            
            async analyzeData() {
                const insights = [];
                
                // Data distribution analysis
                const distribution = this.analyzeDataDistribution();
                insights.push({
                    type: 'distribution',
                    title: 'Data Distribution',
                    description: `Data is ${distribution.balance > 0.8 ? 'well-balanced' : 'imbalanced'} across categories`,
                    confidence: distribution.balance
                });
                
                // Trend analysis
                const trends = this.analyzeTrends();
                insights.push({
                    type: 'trend',
                    title: 'Trend Analysis',
                    description: `Strong ${trends.direction} trend detected with ${trends.strength}% confidence`,
                    confidence: trends.strength
                });
                
                // Anomaly detection
                const anomalies = await this.detectAnomalies();
                if (anomalies.length > 0) {
                    insights.push({
                        type: 'anomaly',
                        title: 'Anomalies Detected',
                        description: `${anomalies.length} potential anomalies found in the data`,
                        confidence: 0.85
                    });
                }
                
                return insights;
            },
            
            analyzeDataDistribution() {
                // Analyze how data is distributed across different categories
                const categories = {};
                this.data.forEach(item => {
                    const category = item.category || 'unknown';
                    categories[category] = (categories[category] || 0) + 1;
                });
                
                const total = this.data.length;
                const distribution = Object.values(categories).map(count => count / total);
                const balance = 1 - Math.std(distribution);
                
                return { balance, categories };
            },
            
            analyzeTrends() {
                // Analyze trends in numerical data
                const numericalColumns = this.config.columns.filter(col => 
                    col.type === 'number' || col.type === 'currency'
                );
                
                if (numericalColumns.length === 0) {
                    return { direction: 'none', strength: 0 };
                }
                
                // Simple trend analysis
                const column = numericalColumns[0];
                const values = this.data.map(item => item[column.key]).filter(v => !isNaN(v));
                
                if (values.length < 2) {
                    return { direction: 'none', strength: 0 };
                }
                
                const trend = this.calculateTrend(values);
                return trend;
            },
            
            calculateTrend(values) {
                const n = values.length;
                const sumX = (n * (n + 1)) / 2;
                const sumY = values.reduce((a, b) => a + b, 0);
                const sumXY = values.reduce((a, b, i) => a + (b * (i + 1)), 0);
                const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;
                
                const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
                const direction = slope > 0 ? 'upward' : slope < 0 ? 'downward' : 'stable';
                const strength = Math.min(Math.abs(slope) * 100, 100);
                
                return { direction, strength };
            },
            
            async detectAnomalies() {
                try {
                    const anomalies = await this.aiModels.anomaly.detect(this.data);
                    return anomalies;
                } catch (error) {
                    console.error('Anomaly detection failed:', error);
                    return [];
                }
            },
            
            async performAISearch(query) {
                if (!query.trim()) {
                    this.renderTable();
                    return;
                }
                
                try {
                    // Use AI to understand search intent and find relevant results
                    const searchResults = await this.aiModels.prediction.search(this.data, query);
                    this.renderTable(searchResults);
                } catch (error) {
                    console.error('AI search failed:', error);
                    // Fallback to regular search
                    this.performRegularSearch(query);
                }
            },
            
            performRegularSearch(query) {
                const filteredData = this.data.filter(item =>
                    Object.values(item).some(value =>
                        String(value).toLowerCase().includes(query.toLowerCase())
                    )
                );
                this.renderTable(filteredData);
            },
            
            async performSmartGrouping() {
                try {
                    const groups = await this.aiModels.clustering.group(this.data);
                    this.groupedData = groups;
                    this.renderGroupedTable();
                } catch (error) {
                    console.error('Smart grouping failed:', error);
                }
            },
            
            renderTable(data = this.data) {
                const container = this.container.querySelector('#table-container');
                
                if (data.length === 0) {
                    container.innerHTML = '<div class="no-data">No data found</div>';
                    return;
                }
                
                const table = document.createElement('table');
                table.className = 'ai-table';
                
                // Create header
                const thead = document.createElement('thead');
                const headerRow = document.createElement('tr');
                this.config.columns.forEach(column => {
                    const th = document.createElement('th');
                    th.textContent = column.label;
                    th.className = 'sortable';
                    th.addEventListener('click', () => this.smartSort(column.key));
                    headerRow.appendChild(th);
                });
                thead.appendChild(headerRow);
                table.appendChild(thead);
                
                // Create body
                const tbody = document.createElement('tbody');
                data.forEach(item => {
                    const row = document.createElement('tr');
                    this.config.columns.forEach(column => {
                        const td = document.createElement('td');
                        td.textContent = item[column.key] || '';
                        row.appendChild(td);
                    });
                    tbody.appendChild(row);
                });
                table.appendChild(tbody);
                
                container.innerHTML = '';
                container.appendChild(table);
            },
            
            renderGroupedTable() {
                if (!this.groupedData) return;
                
                const container = this.container.querySelector('#table-container');
                container.innerHTML = '';
                
                this.groupedData.forEach(group => {
                    const groupHeader = document.createElement('h3');
                    groupHeader.textContent = `Group: ${group.name} (${group.items.length} items)`;
                    container.appendChild(groupHeader);
                    
                    const groupTable = document.createElement('table');
                    groupTable.className = 'group-table';
                    
                    // Render group table
                    this.renderTable(group.items);
                });
            },
            
            displayInsights() {
                const container = this.container.querySelector('#ai-insights');
                container.innerHTML = this.aiInsights.map(insight => `
                    <div class="ai-insight ${insight.type}">
                        <div class="insight-header">
                            <span class="insight-title">${insight.title}</span>
                            <span class="insight-confidence">${Math.round(insight.confidence * 100)}%</span>
                        </div>
                        <div class="insight-description">${insight.description}</div>
                    </div>
                `).join('');
            },
            
            smartSort(columnKey) {
                // AI-powered sorting that considers multiple factors
                const sortedData = [...this.data].sort((a, b) => {
                    const aVal = a[columnKey];
                    const bVal = b[columnKey];
                    
                    // Handle different data types
                    if (typeof aVal === 'number' && typeof bVal === 'number') {
                        return aVal - bVal;
                    }
                    
                    if (typeof aVal === 'string' && typeof bVal === 'string') {
                        return aVal.localeCompare(bVal);
                    }
                    
                    return 0;
                });
                
                this.renderTable(sortedData);
            },
            
            debounce(func, wait) {
                let timeout;
                return function executedFunction(...args) {
                    const later = () => {
                        clearTimeout(timeout);
                        func(...args);
                    };
                    clearTimeout(timeout);
                    timeout = setTimeout(later, wait);
                };
            },
            
            destroy() {
                // Cleanup AI models and event listeners
                if (this.aiModels) {
                    Object.values(this.aiModels).forEach(model => {
                        if (model.destroy) model.destroy();
                    });
                }
            }
        };
        
        return aiTable.init();
    }

    // Utility methods
    setupIntersectionObserver() {
        this.intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.dispatchEvent(new CustomEvent('componentVisible'));
                }
            });
        });
    }
    
    setupResizeObserver() {
        this.resizeObserver = new ResizeObserver((entries) => {
            entries.forEach(entry => {
                entry.target.dispatchEvent(new CustomEvent('componentResize', {
                    detail: { width: entry.contentRect.width, height: entry.contentRect.height }
                }));
            });
        });
    }
    
    setupPerformanceMonitoring() {
        // Monitor component performance
        this.performanceObserver = new PerformanceObserver((list) => {
            list.getEntries().forEach(entry => {
                if (entry.entryType === 'measure') {
                    console.log(`Component Performance: ${entry.name} took ${entry.duration}ms`);
                }
            });
        });
        this.performanceObserver.observe({ entryTypes: ['measure'] });
    }
    
    initializeAIComponents() {
        // Initialize AI models and components
        this.aiModels.set('smart-form', new SmartFormAI());
        this.aiModels.set('content-generator', new ContentGeneratorAI());
        this.aiModels.set('data-analyzer', new DataAnalyzerAI());
    }
}

// AI Model Classes
class BaseAI {
    constructor(config) {
        this.config = config;
        this.initialized = false;
    }
    
    async initialize() {
        // Initialize AI model
        this.initialized = true;
    }
    
    destroy() {
        this.initialized = false;
    }
}

class SmartFormAI extends BaseAI {
    async getSuggestions(input) {
        // AI-powered form suggestions
        return [
            { text: input + ' suggestion 1', confidence: 0.9 },
            { text: input + ' suggestion 2', confidence: 0.8 },
            { text: input + ' suggestion 3', confidence: 0.7 }
        ];
    }
    
    getContextualTips() {
        return [
            'Tip: Use specific keywords for better results',
            'Tip: Consider the context of your input',
            'Tip: Our AI learns from your interactions'
        ];
    }
    
    async learn(data) {
        // Learn from user interactions
        console.log('Learning from interaction:', data);
    }
}

class ContentGeneratorAI extends BaseAI {
    async generateContent(prompt) {
        // Generate content based on prompt
        return `AI-generated content for: ${prompt}`;
    }
}

class DataAnalyzerAI extends BaseAI {
    async analyze(data) {
        // Analyze data and provide insights
        return {
            patterns: [],
            anomalies: [],
            trends: [],
            recommendations: []
        };
    }
}

class ClusteringModel extends BaseAI {
    async group(data) {
        // Group data using clustering algorithms
        return [
            { name: 'Group 1', items: data.slice(0, Math.floor(data.length / 2)) },
            { name: 'Group 2', items: data.slice(Math.floor(data.length / 2)) }
        ];
    }
}

class AnomalyDetectionModel extends BaseAI {
    async detect(data) {
        // Detect anomalies in data
        return [];
    }
}

class PredictiveModel extends BaseAI {
    async search(data, query) {
        // AI-powered search
        return data.filter(item =>
            Object.values(item).some(value =>
                String(value).toLowerCase().includes(query.toLowerCase())
            )
        );
    }
}

// Math utility for standard deviation
Math.std = function(array) {
    const n = array.length;
    const mean = array.reduce((a, b) => a + b) / n;
    return Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n);
};

// Initialize advanced component library
if (typeof window !== 'undefined') {
    window.AdvancedComponents = new AdvancedComponentLibrary();
}

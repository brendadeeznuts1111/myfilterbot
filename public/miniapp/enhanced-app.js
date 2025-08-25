/**
 * FantDev Trading - Enhanced Mini App
 * Modern Telegram Web App with advanced features
 */

class EnhancedMiniApp {
    constructor() {
        this.app = null;
        this.user = null;
        this.balance = 0;
        this.transactions = [];
        this.tradingData = [];
        this.analytics = {};
        this.referrals = [];
        this.currentTab = 'transactions';
        this.isLoading = false;
        this.notifications = [];
        this.settings = {};
        
        this.init();
    }

    async init() {
        try {
            await this.initializeTelegramApp();
            await this.loadUserData();
            await this.loadInitialData();
            this.setupEventListeners();
            this.setupWebSocket();
            this.hideLoader();
            this.showMainApp();
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Failed to initialize app. Please refresh and try again.');
        }
    }

    async initializeTelegramApp() {
        // Initialize Telegram Web App
        if (window.Telegram && window.Telegram.WebApp) {
            this.app = window.Telegram.WebApp;
            this.app.ready();
            this.app.expand();
            
            // Set theme
            this.app.setHeaderColor(this.app.themeParams.bg_color || '#667eea');
            this.app.setBackgroundColor(this.app.themeParams.bg_color || '#ffffff');
            
            // Enable closing confirmation
            this.app.enableClosingConfirmation();
            
            // Set main button if needed
            this.setupMainButton();
        } else {
            throw new Error('Telegram Web App SDK not available');
        }
    }

    async loadUserData() {
        try {
            // Get user data from Telegram
            if (this.app.initDataUnsafe && this.app.initDataUnsafe.user) {
                this.user = this.app.initDataUnsafe.user;
                this.updateUserInterface();
            } else {
                // Fallback to mock data for development
                this.user = {
                    id: 123456789,
                    first_name: 'Demo User',
                    last_name: 'Trading',
                    username: 'demouser',
                    photo_url: 'https://via.placeholder.com/100'
                };
                this.updateUserInterface();
            }
        } catch (error) {
            console.error('Failed to load user data:', error);
            throw error;
        }
    }

    async loadInitialData() {
        this.setLoading(true);
        
        try {
            // Load data in parallel
            const [balanceData, transactionsData, tradingData, analyticsData, referralsData] = await Promise.all([
                this.fetchBalance(),
                this.fetchTransactions(),
                this.fetchTradingData(),
                this.fetchAnalytics(),
                this.fetchReferrals()
            ]);

            this.balance = balanceData.balance;
            this.transactions = transactionsData.transactions;
            this.tradingData = tradingData.data;
            this.analytics = analyticsData;
            this.referrals = referralsData.referrals;

            this.updateInterface();
        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.showError('Failed to load data. Please check your connection.');
        } finally {
            this.setLoading(false);
        }
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Quick action buttons
        document.getElementById('deposit-btn').addEventListener('click', () => this.handleDeposit());
        document.getElementById('withdraw-btn').addEventListener('click', () => this.handleWithdraw());
        document.getElementById('trade-btn').addEventListener('click', () => this.handleTrade());
        document.getElementById('p2p-btn').addEventListener('click', () => this.handleP2P());

        // Header actions
        document.getElementById('notifications-btn').addEventListener('click', () => this.showNotifications());
        document.getElementById('settings-btn').addEventListener('click', () => this.showSettings());
        document.getElementById('refresh-balance').addEventListener('click', () => this.refreshBalance());

        // Form submissions
        this.setupFormHandlers();
    }

    setupFormHandlers() {
        // Handle deposit form
        const depositForm = document.getElementById('deposit-form');
        if (depositForm) {
            depositForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitDeposit();
            });
        }

        // Handle withdraw form
        const withdrawForm = document.getElementById('withdraw-form');
        if (withdrawForm) {
            withdrawForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitWithdraw();
            });
        }

        // Handle trade form
        const tradeForm = document.getElementById('trade-form');
        if (tradeForm) {
            tradeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitTrade();
            });
        }
    }

    setupWebSocket() {
        // Setup real-time updates via WebSocket
        if (window.io) {
            this.socket = io('/miniapp', {
                auth: {
                    userId: this.user.id,
                    token: this.app.initData
                }
            });

            this.socket.on('connect', () => {
                console.log('WebSocket connected');
                this.updateConnectionStatus(true);
            });

            this.socket.on('disconnect', () => {
                console.log('WebSocket disconnected');
                this.updateConnectionStatus(false);
            });

            this.socket.on('balance_update', (data) => {
                this.updateBalance(data.balance);
            });

            this.socket.on('transaction_update', (data) => {
                this.addTransaction(data.transaction);
            });

            this.socket.on('notification', (data) => {
                this.addNotification(data);
            });

            this.socket.on('trading_update', (data) => {
                this.updateTradingData(data);
            });
        }
    }

    setupMainButton() {
        if (this.app.MainButton) {
            this.app.MainButton.setText('OPEN TRADING');
            this.app.MainButton.onClick(() => {
                this.handleTrade();
            });
            this.app.MainButton.show();
        }
    }

    switchTab(tabName) {
        // Update active tab
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Hide all tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });

        // Show selected tab content
        const selectedContent = document.getElementById(`${tabName}-tab`);
        if (selectedContent) {
            selectedContent.classList.remove('hidden');
        }

        this.currentTab = tabName;
        this.loadTabData(tabName);
    }

    async loadTabData(tabName) {
        switch (tabName) {
            case 'transactions':
                await this.loadTransactions();
                break;
            case 'trading':
                await this.loadTradingData();
                break;
            case 'analytics':
                await this.loadAnalytics();
                break;
            case 'referrals':
                await this.loadReferrals();
                break;
        }
    }

    async fetchBalance() {
        // Simulate API call
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    balance: 1250.75,
                    currency: 'USD',
                    dailyPnl: 45.20,
                    weeklyPnl: 128.50
                });
            }, 500);
        });
    }

    async fetchTransactions() {
        // Simulate API call
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    transactions: [
                        {
                            id: 1,
                            type: 'deposit',
                            amount: 500.00,
                            currency: 'USD',
                            status: 'completed',
                            timestamp: new Date(Date.now() - 86400000).toISOString(),
                            description: 'Bank transfer'
                        },
                        {
                            id: 2,
                            type: 'trade',
                            amount: -25.50,
                            currency: 'USD',
                            status: 'completed',
                            timestamp: new Date(Date.now() - 172800000).toISOString(),
                            description: 'BTC/USD trade'
                        }
                    ]
                });
            }, 300);
        });
    }

    async fetchTradingData() {
        // Simulate API call
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    data: [
                        { symbol: 'BTC/USD', price: 45000, change: 2.5, volume: 1000000 },
                        { symbol: 'ETH/USD', price: 3200, change: -1.2, volume: 500000 },
                        { symbol: 'ADA/USD', price: 1.20, change: 5.8, volume: 200000 }
                    ]
                });
            }, 400);
        });
    }

    async fetchAnalytics() {
        // Simulate API call
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    totalTrades: 45,
                    winRate: 68.5,
                    avgProfit: 12.5,
                    totalVolume: 25000,
                    monthlyGrowth: 15.2
                });
            }, 600);
        });
    }

    async fetchReferrals() {
        // Simulate API call
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    referrals: [
                        { id: 1, username: '@user1', joined: '2024-01-15', status: 'active' },
                        { id: 2, username: '@user2', joined: '2024-01-20', status: 'pending' }
                    ],
                    totalReferrals: 2,
                    totalEarnings: 45.00
                });
            }, 200);
        });
    }

    updateUserInterface() {
        if (this.user) {
            // Update user info
            document.getElementById('user-name').textContent = `${this.user.first_name} ${this.user.last_name || ''}`;
            document.getElementById('user-id').textContent = `ID: ${this.user.id}`;
            
            // Update avatar
            const avatar = document.getElementById('user-avatar');
            if (this.user.photo_url) {
                avatar.style.backgroundImage = `url(${this.user.photo_url})`;
            } else {
                avatar.textContent = this.user.first_name.charAt(0);
            }
        }
    }

    updateInterface() {
        this.updateBalanceDisplay();
        this.updateTransactionsList();
        this.updateTradingTable();
        this.updateAnalytics();
        this.updateReferralsList();
    }

    updateBalanceDisplay() {
        document.getElementById('balance-value').textContent = this.balance.toFixed(2);
        document.getElementById('daily-pnl').textContent = `+$${this.analytics.dailyPnl || 0}`;
        document.getElementById('weekly-pnl').textContent = `+$${this.analytics.weeklyPnl || 0}`;
    }

    updateTransactionsList() {
        const container = document.getElementById('transactions-list');
        if (!container) return;

        container.innerHTML = this.transactions.map(tx => `
            <div class="transaction-item ${tx.type}">
                <div class="transaction-icon">
                    ${this.getTransactionIcon(tx.type)}
                </div>
                <div class="transaction-details">
                    <div class="transaction-description">${tx.description}</div>
                    <div class="transaction-time">${this.formatTime(tx.timestamp)}</div>
                </div>
                <div class="transaction-amount ${tx.type === 'deposit' ? 'positive' : 'negative'}">
                    ${tx.type === 'deposit' ? '+' : ''}$${tx.amount.toFixed(2)}
                </div>
                <div class="transaction-status ${tx.status}">
                    ${tx.status}
                </div>
            </div>
        `).join('');
    }

    updateTradingTable() {
        const container = document.getElementById('trading-table');
        if (!container) return;

        container.innerHTML = `
            <table class="trading-table">
                <thead>
                    <tr>
                        <th>Symbol</th>
                        <th>Price</th>
                        <th>Change</th>
                        <th>Volume</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.tradingData.map(item => `
                        <tr>
                            <td>${item.symbol}</td>
                            <td>$${item.price.toLocaleString()}</td>
                            <td class="${item.change >= 0 ? 'positive' : 'negative'}">
                                ${item.change >= 0 ? '+' : ''}${item.change}%
                            </td>
                            <td>$${item.volume.toLocaleString()}</td>
                            <td>
                                <button class="trade-btn" onclick="app.handleQuickTrade('${item.symbol}')">
                                    Trade
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    updateAnalytics() {
        const container = document.getElementById('analytics-content');
        if (!container) return;

        container.innerHTML = `
            <div class="analytics-grid">
                <div class="analytics-card">
                    <div class="analytics-value">${this.analytics.totalTrades || 0}</div>
                    <div class="analytics-label">Total Trades</div>
                </div>
                <div class="analytics-card">
                    <div class="analytics-value">${this.analytics.winRate || 0}%</div>
                    <div class="analytics-label">Win Rate</div>
                </div>
                <div class="analytics-card">
                    <div class="analytics-value">${this.analytics.avgProfit || 0}%</div>
                    <div class="analytics-label">Avg Profit</div>
                </div>
                <div class="analytics-card">
                    <div class="analytics-value">$${this.analytics.totalVolume || 0}</div>
                    <div class="analytics-label">Total Volume</div>
                </div>
            </div>
            <div class="analytics-chart">
                <canvas id="performance-chart"></canvas>
            </div>
        `;

        // Initialize chart if Chart.js is available
        if (window.Chart) {
            this.initializePerformanceChart();
        }
    }

    updateReferralsList() {
        const container = document.getElementById('referrals-list');
        if (!container) return;

        container.innerHTML = `
            <div class="referrals-summary">
                <div class="referral-stat">
                    <span class="stat-value">${this.referrals.length}</span>
                    <span class="stat-label">Total Referrals</span>
                </div>
                <div class="referral-stat">
                    <span class="stat-value">$${this.analytics.totalEarnings || 0}</span>
                    <span class="stat-label">Total Earnings</span>
                </div>
            </div>
            <div class="referrals-items">
                ${this.referrals.map(ref => `
                    <div class="referral-item">
                        <div class="referral-username">${ref.username}</div>
                        <div class="referral-date">${this.formatDate(ref.joined)}</div>
                        <div class="referral-status ${ref.status}">${ref.status}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    getTransactionIcon(type) {
        const icons = {
            deposit: '💰',
            withdraw: '💸',
            trade: '📈',
            referral: '🤝',
            bonus: '🎁'
        };
        return icons[type] || '📊';
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString();
    }

    setLoading(loading) {
        this.isLoading = loading;
        const loader = document.getElementById('loader');
        if (loader) {
            loader.classList.toggle('hidden', !loading);
        }
    }

    hideLoader() {
        document.getElementById('loader').classList.add('hidden');
    }

    showMainApp() {
        document.getElementById('main-app').classList.remove('hidden');
    }

    showError(message) {
        if (window.FantDevComponents) {
            window.FantDevComponents.showToast(message, 'error', 5000);
        } else {
            alert(message);
        }
    }

    showSuccess(message) {
        if (window.FantDevComponents) {
            window.FantDevComponents.showToast(message, 'success', 3000);
        } else {
            alert(message);
        }
    }

    updateConnectionStatus(connected) {
        const indicator = document.getElementById('connection-indicator');
        if (indicator) {
            indicator.className = `connection-indicator ${connected ? 'connected' : 'disconnected'}`;
            indicator.title = connected ? 'Connected' : 'Disconnected';
        }
    }

    updateBalance(newBalance) {
        this.balance = newBalance;
        this.updateBalanceDisplay();
        
        // Animate balance change
        const balanceElement = document.getElementById('balance-value');
        balanceElement.classList.add('balance-update');
        setTimeout(() => {
            balanceElement.classList.remove('balance-update');
        }, 1000);
    }

    addTransaction(transaction) {
        this.transactions.unshift(transaction);
        this.updateTransactionsList();
        
        // Show notification
        this.showSuccess(`New ${transaction.type}: $${transaction.amount}`);
    }

    addNotification(notification) {
        this.notifications.unshift(notification);
        this.updateNotificationBadge();
        
        // Show toast
        this.showSuccess(notification.message);
    }

    updateNotificationBadge() {
        const badge = document.getElementById('notification-badge');
        if (badge) {
            const count = this.notifications.filter(n => !n.read).length;
            badge.textContent = count;
            badge.classList.toggle('hidden', count === 0);
        }
    }

    // Action handlers
    async handleDeposit() {
        this.showModal('deposit-modal', {
            title: 'Deposit Funds',
            content: this.getDepositFormHTML(),
            size: 'md'
        });
    }

    async handleWithdraw() {
        this.showModal('withdraw-modal', {
            title: 'Withdraw Funds',
            content: this.getWithdrawFormHTML(),
            size: 'md'
        });
    }

    async handleTrade() {
        this.switchTab('trading');
        this.app.MainButton.setText('CONFIRM TRADE');
    }

    async handleP2P() {
        this.showModal('p2p-modal', {
            title: 'P2P Trading',
            content: this.getP2PFormHTML(),
            size: 'lg'
        });
    }

    async handleQuickTrade(symbol) {
        this.showModal('quick-trade-modal', {
            title: `Quick Trade - ${symbol}`,
            content: this.getQuickTradeFormHTML(symbol),
            size: 'md'
        });
    }

    showNotifications() {
        this.showModal('notifications-modal', {
            title: 'Notifications',
            content: this.getNotificationsHTML(),
            size: 'md'
        });
    }

    showSettings() {
        this.showModal('settings-modal', {
            title: 'Settings',
            content: this.getSettingsHTML(),
            size: 'md'
        });
    }

    async refreshBalance() {
        try {
            const balanceData = await this.fetchBalance();
            this.updateBalance(balanceData.balance);
            this.showSuccess('Balance updated');
        } catch (error) {
            this.showError('Failed to refresh balance');
        }
    }

    // Modal management
    showModal(id, options) {
        if (window.FantDevComponents) {
            window.FantDevComponents.createModal(id, options);
            window.FantDevComponents.openModal(id);
        } else {
            // Fallback modal implementation
            this.showFallbackModal(options);
        }
    }

    showFallbackModal(options) {
        const modal = document.createElement('div');
        modal.className = 'fallback-modal';
        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${options.title}</h3>
                    <button onclick="this.closest('.fallback-modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    ${options.content}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Form HTML generators
    getDepositFormHTML() {
        return `
            <form id="deposit-form" class="enhanced-form">
                <div class="form-group">
                    <label>Amount (USD)</label>
                    <input type="number" name="amount" min="10" step="0.01" required>
                </div>
                <div class="form-group">
                    <label>Payment Method</label>
                    <select name="method" required>
                        <option value="">Select method...</option>
                        <option value="bank">Bank Transfer</option>
                        <option value="card">Credit/Debit Card</option>
                        <option value="crypto">Cryptocurrency</option>
                    </select>
                </div>
                <button type="submit" class="btn-primary">Deposit</button>
            </form>
        `;
    }

    getWithdrawFormHTML() {
        return `
            <form id="withdraw-form" class="enhanced-form">
                <div class="form-group">
                    <label>Amount (USD)</label>
                    <input type="number" name="amount" min="10" max="${this.balance}" step="0.01" required>
                </div>
                <div class="form-group">
                    <label>Withdrawal Method</label>
                    <select name="method" required>
                        <option value="">Select method...</option>
                        <option value="bank">Bank Transfer</option>
                        <option value="crypto">Cryptocurrency</option>
                    </select>
                </div>
                <button type="submit" class="btn-primary">Withdraw</button>
            </form>
        `;
    }

    getP2PFormHTML() {
        return `
            <div class="p2p-container">
                <div class="p2p-tabs">
                    <button class="p2p-tab active" data-tab="buy">Buy</button>
                    <button class="p2p-tab" data-tab="sell">Sell</button>
                </div>
                <div class="p2p-content">
                    <div class="p2p-form">
                        <div class="form-group">
                            <label>Amount</label>
                            <input type="number" name="amount" min="10" step="0.01" required>
                        </div>
                        <div class="form-group">
                            <label>Price per USD</label>
                            <input type="number" name="price" min="0.01" step="0.01" required>
                        </div>
                        <button type="submit" class="btn-primary">Find Offers</button>
                    </div>
                </div>
            </div>
        `;
    }

    getQuickTradeFormHTML(symbol) {
        return `
            <form id="quick-trade-form" class="enhanced-form">
                <div class="trade-info">
                    <h4>${symbol}</h4>
                    <p>Current Price: $${this.tradingData.find(item => item.symbol === symbol)?.price || 0}</p>
                </div>
                <div class="form-group">
                    <label>Trade Type</label>
                    <select name="type" required>
                        <option value="buy">Buy</option>
                        <option value="sell">Sell</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Amount (USD)</label>
                    <input type="number" name="amount" min="10" step="0.01" required>
                </div>
                <button type="submit" class="btn-primary">Execute Trade</button>
            </form>
        `;
    }

    getNotificationsHTML() {
        return `
            <div class="notifications-list">
                ${this.notifications.map(notification => `
                    <div class="notification-item ${notification.read ? 'read' : 'unread'}">
                        <div class="notification-icon">${notification.icon || '🔔'}</div>
                        <div class="notification-content">
                            <div class="notification-message">${notification.message}</div>
                            <div class="notification-time">${this.formatTime(notification.timestamp)}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    getSettingsHTML() {
        return `
            <div class="settings-list">
                <div class="setting-item">
                    <label>Notifications</label>
                    <input type="checkbox" ${this.settings.notifications ? 'checked' : ''}>
                </div>
                <div class="setting-item">
                    <label>Dark Mode</label>
                    <input type="checkbox" ${this.settings.darkMode ? 'checked' : ''}>
                </div>
                <div class="setting-item">
                    <label>Auto-refresh</label>
                    <input type="checkbox" ${this.settings.autoRefresh ? 'checked' : ''}>
                </div>
            </div>
        `;
    }

    // Form submission handlers
    async submitDeposit() {
        const form = document.getElementById('deposit-form');
        const formData = new FormData(form);
        
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            this.showSuccess('Deposit request submitted successfully');
            this.closeModal('deposit-modal');
        } catch (error) {
            this.showError('Failed to submit deposit request');
        }
    }

    async submitWithdraw() {
        const form = document.getElementById('withdraw-form');
        const formData = new FormData(form);
        
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            this.showSuccess('Withdrawal request submitted successfully');
            this.closeModal('withdraw-modal');
        } catch (error) {
            this.showError('Failed to submit withdrawal request');
        }
    }

    async submitTrade() {
        const form = document.getElementById('quick-trade-form');
        const formData = new FormData(form);
        
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            this.showSuccess('Trade executed successfully');
            this.closeModal('quick-trade-modal');
        } catch (error) {
            this.showError('Failed to execute trade');
        }
    }

    closeModal(id) {
        if (window.FantDevComponents) {
            window.FantDevComponents.closeModal(id);
        } else {
            // Remove fallback modal
            const modal = document.querySelector(`#${id}`);
            if (modal) modal.remove();
        }
    }

    // Chart initialization
    initializePerformanceChart() {
        const ctx = document.getElementById('performance-chart');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Portfolio Value',
                    data: [1000, 1100, 1050, 1200, 1180, 1250],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false
                    }
                }
            }
        });
    }

    // Utility methods
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
    }

    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// Initialize the enhanced mini app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new EnhancedMiniApp();
});

// Export for global access
if (typeof window !== 'undefined') {
    window.EnhancedMiniApp = EnhancedMiniApp;
    window.app = app;
}

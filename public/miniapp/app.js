/**
 * Fantdev Trading Mini App - Main JavaScript
 * Telegram Web App Integration
 */

// Initialize Telegram Web App
const tg = window.Telegram.WebApp;

// App Configuration
const CONFIG = {
    API_BASE_URL: window.location.origin + '/api',
    WS_URL: window.location.origin.replace('http', 'ws').replace('https', 'wss') + '/ws',
    UPDATE_INTERVAL: 30000, // 30 seconds
    THEME: tg.colorScheme || 'light'
};

// App State
const state = {
    user: null,
    balance: 0,
    transactions: [],
    notifications: [],
    isLoading: true,
    activeTab: 'transactions',
    ws: null
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    try {
        // Configure Telegram Web App
        tg.ready();
        tg.expand();
        tg.enableClosingConfirmation();
        
        // Set theme
        applyTheme(CONFIG.THEME);
        
        // Initialize user
        await initializeUser();
        
        // Load initial data
        await loadUserData();
        
        // Setup event listeners
        setupEventListeners();
        
        // Initialize WebSocket
        initializeWebSocket();
        
        // Hide loader and show app
        hideLoader();
        
        // Setup periodic updates
        setupPeriodicUpdates();
        
    } catch (error) {
        console.error('Failed to initialize app:', error);
        showToast('Failed to initialize app', 'error');
    }
}

// User Initialization
async function initializeUser() {
    const webAppUser = tg.initDataUnsafe?.user;
    
    if (!webAppUser) {
        throw new Error('User data not available');
    }
    
    state.user = {
        id: webAppUser.id,
        firstName: webAppUser.first_name,
        lastName: webAppUser.last_name || '',
        username: webAppUser.username || '',
        photoUrl: webAppUser.photo_url || '',
        languageCode: webAppUser.language_code || 'en'
    };
    
    // Display user info
    updateUserDisplay();
}

// Update User Display
function updateUserDisplay() {
    const nameEl = document.getElementById('user-name');
    const idEl = document.getElementById('user-id');
    const avatarEl = document.getElementById('user-avatar');
    
    nameEl.textContent = `${state.user.firstName} ${state.user.lastName}`.trim();
    idEl.textContent = `ID: ${state.user.id}`;
    
    if (state.user.photoUrl) {
        avatarEl.style.backgroundImage = `url(${state.user.photoUrl})`;
    } else {
        avatarEl.textContent = state.user.firstName[0];
    }
}

// Load User Data
async function loadUserData() {
    try {
        // Validate init data
        const authData = tg.initData;
        
        // Load balance
        const balanceData = await apiCall('/customer/balance', {
            headers: {
                'X-Telegram-Init-Data': authData,
                'X-Customer-ID': state.user.id.toString()
            }
        });
        
        if (balanceData.success) {
            updateBalance(balanceData.balance);
        }
        
        // Load transactions
        const transactionsData = await apiCall('/customer/transactions', {
            headers: {
                'X-Telegram-Init-Data': authData,
                'X-Customer-ID': state.user.id.toString()
            }
        });
        
        if (transactionsData.success) {
            updateTransactions(transactionsData.transactions);
        }
        
        // Load notifications
        await loadNotifications();
        
    } catch (error) {
        console.error('Failed to load user data:', error);
        showToast('Failed to load data', 'error');
    }
}

// API Call Helper
async function apiCall(endpoint, options = {}) {
    const url = CONFIG.API_BASE_URL + endpoint;
    
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    });
    
    if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
    }
    
    return response.json();
}

// Update Balance
function updateBalance(balanceData) {
    state.balance = balanceData.current || 0;
    
    document.getElementById('balance-value').textContent = formatCurrency(state.balance);
    document.getElementById('daily-pnl').textContent = formatPnL(balanceData.daily_pnl || 0);
    document.getElementById('weekly-pnl').textContent = formatPnL(balanceData.weekly_pnl || 0);
    document.getElementById('available-for-withdrawal').textContent = formatCurrency(state.balance);
}

// Update Transactions
function updateTransactions(transactions) {
    state.transactions = transactions;
    renderTransactionsList(transactions.slice(0, 10)); // Show last 10
}

// Render Transactions List
function renderTransactionsList(transactions) {
    const listEl = document.getElementById('transactions-list');
    
    if (!transactions.length) {
        listEl.innerHTML = '<div class="empty-state">No transactions yet</div>';
        return;
    }
    
    listEl.innerHTML = transactions.map(tx => `
        <div class="transaction-item ${tx.type}">
            <div class="tx-icon">${getTransactionIcon(tx.type)}</div>
            <div class="tx-details">
                <div class="tx-type">${tx.type.toUpperCase()}</div>
                <div class="tx-time">${formatDate(tx.timestamp)}</div>
            </div>
            <div class="tx-amount ${tx.amount > 0 ? 'positive' : 'negative'}">
                ${formatCurrency(Math.abs(tx.amount))}
            </div>
        </div>
    `).join('');
}

// Setup Event Listeners
function setupEventListeners() {
    // Tab Navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchTab(e.target.dataset.tab);
        });
    });
    
    // Quick Actions
    document.getElementById('deposit-btn').addEventListener('click', showDepositModal);
    document.getElementById('withdraw-btn').addEventListener('click', showWithdrawModal);
    document.getElementById('trade-btn').addEventListener('click', () => switchTab('trading'));
    document.getElementById('p2p-btn').addEventListener('click', handleP2P);
    
    // Balance Refresh
    document.getElementById('refresh-balance').addEventListener('click', refreshBalance);
    
    // Notifications & Settings
    document.getElementById('notifications-btn').addEventListener('click', toggleNotifications);
    document.getElementById('settings-btn').addEventListener('click', toggleSettings);
    
    // Modal Close Buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            closeModal(e.target.dataset.modal);
        });
    });
    
    // Deposit & Withdraw Confirmation
    document.getElementById('confirm-deposit').addEventListener('click', handleDeposit);
    document.getElementById('confirm-withdraw').addEventListener('click', handleWithdraw);
    
    // Trading Interface
    document.querySelectorAll('.trade-type-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            setTradeType(e.target.dataset.type);
        });
    });
    
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            setTradeAmount(e.target.dataset.amount);
        });
    });
    
    document.getElementById('execute-trade').addEventListener('click', executeTrade);
    
    // Referral
    document.getElementById('copy-referral').addEventListener('click', copyReferralLink);
    document.getElementById('share-referral').addEventListener('click', shareReferralLink);
    
    // Settings
    document.getElementById('theme-toggle').addEventListener('change', toggleTheme);
    document.getElementById('close-notifications').addEventListener('click', () => toggleNotifications(false));
    document.getElementById('close-settings').addEventListener('click', () => toggleSettings(false));
    
    // Back Button Handler
    tg.BackButton.onClick(() => {
        if (hasOpenModals()) {
            closeAllModals();
        } else {
            tg.close();
        }
    });
}

// Tab Switching
function switchTab(tabName) {
    state.activeTab = tabName;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Update tab panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `${tabName}-tab`);
        panel.classList.toggle('hidden', panel.id !== `${tabName}-tab`);
    });
    
    // Load tab-specific data
    if (tabName === 'analytics') {
        loadAnalytics();
    } else if (tabName === 'referrals') {
        loadReferralData();
    }
}

// WebSocket Connection
function initializeWebSocket() {
    try {
        state.ws = new WebSocket(CONFIG.WS_URL);
        
        state.ws.onopen = () => {
            console.log('WebSocket connected');
            // Subscribe to updates
            state.ws.send(JSON.stringify({
                type: 'subscribe',
                customer_id: state.user.id
            }));
        };
        
        state.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
        };
        
        state.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
        
        state.ws.onclose = () => {
            console.log('WebSocket disconnected');
            // Attempt reconnect after 5 seconds
            setTimeout(initializeWebSocket, 5000);
        };
    } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
    }
}

// Handle WebSocket Messages
function handleWebSocketMessage(data) {
    switch (data.type) {
        case 'balance_update':
            updateBalance(data.balance);
            break;
        case 'new_transaction':
            addTransaction(data.transaction);
            break;
        case 'notification':
            addNotification(data.notification);
            break;
        default:
            console.log('Unknown message type:', data.type);
    }
}

// Deposit Modal
function showDepositModal() {
    showModal('deposit-modal');
    tg.MainButton.setText('Confirm Deposit');
    tg.MainButton.show();
    tg.MainButton.onClick(handleDeposit);
}

// Withdraw Modal
function showWithdrawModal() {
    showModal('withdraw-modal');
    tg.MainButton.setText('Request Withdrawal');
    tg.MainButton.show();
    tg.MainButton.onClick(handleWithdraw);
}

// Handle Deposit
async function handleDeposit() {
    const amount = parseFloat(document.getElementById('deposit-amount').value);
    const method = document.querySelector('input[name="payment-method"]:checked').value;
    
    if (!amount || amount < 10) {
        showToast('Minimum deposit is $10', 'error');
        return;
    }
    
    try {
        showLoading();
        
        const response = await apiCall('/customer/deposit', {
            method: 'POST',
            headers: {
                'X-Telegram-Init-Data': tg.initData,
                'X-Customer-ID': state.user.id.toString()
            },
            body: JSON.stringify({ amount, method })
        });
        
        if (response.success) {
            showToast('Deposit initiated successfully', 'success');
            closeModal('deposit-modal');
            tg.MainButton.hide();
            
            // Open payment URL if provided
            if (response.payment_url) {
                tg.openLink(response.payment_url);
            }
        } else {
            showToast(response.error || 'Deposit failed', 'error');
        }
    } catch (error) {
        showToast('Failed to process deposit', 'error');
    } finally {
        hideLoading();
    }
}

// Handle Withdrawal
async function handleWithdraw() {
    const amount = parseFloat(document.getElementById('withdraw-amount').value);
    const method = document.getElementById('withdraw-method').value;
    
    if (!amount || amount < 10) {
        showToast('Minimum withdrawal is $10', 'error');
        return;
    }
    
    if (amount > state.balance) {
        showToast('Insufficient balance', 'error');
        return;
    }
    
    try {
        showLoading();
        
        const response = await apiCall('/customer/withdraw', {
            method: 'POST',
            headers: {
                'X-Telegram-Init-Data': tg.initData,
                'X-Customer-ID': state.user.id.toString()
            },
            body: JSON.stringify({ amount, method })
        });
        
        if (response.success) {
            showToast('Withdrawal request submitted', 'success');
            closeModal('withdraw-modal');
            tg.MainButton.hide();
            await refreshBalance();
        } else {
            showToast(response.error || 'Withdrawal failed', 'error');
        }
    } catch (error) {
        showToast('Failed to process withdrawal', 'error');
    } finally {
        hideLoading();
    }
}

// Execute Trade
async function executeTrade() {
    const amount = parseFloat(document.getElementById('trade-amount').value);
    const type = document.querySelector('.trade-type-btn.active').dataset.type;
    
    if (!amount || amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }
    
    tg.showConfirm(
        `Confirm ${type.toUpperCase()} order for $${amount}?`,
        async (confirmed) => {
            if (confirmed) {
                try {
                    showLoading();
                    
                    const response = await apiCall('/trading/execute', {
                        method: 'POST',
                        headers: {
                            'X-Telegram-Init-Data': tg.initData,
                            'X-Customer-ID': state.user.id.toString()
                        },
                        body: JSON.stringify({ type, amount })
                    });
                    
                    if (response.success) {
                        showToast(`${type.toUpperCase()} order executed`, 'success');
                        await refreshBalance();
                        document.getElementById('trade-amount').value = '';
                    } else {
                        showToast(response.error || 'Trade failed', 'error');
                    }
                } catch (error) {
                    showToast('Failed to execute trade', 'error');
                } finally {
                    hideLoading();
                }
            }
        }
    );
}

// Utility Functions
function formatCurrency(amount) {
    return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatPnL(amount) {
    const sign = amount >= 0 ? '+' : '';
    return `${sign}$${formatCurrency(Math.abs(amount))}`;
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    
    return date.toLocaleDateString();
}

function getTransactionIcon(type) {
    const icons = {
        deposit: '💰',
        withdrawal: '💸',
        trade: '📈',
        bonus: '🎁',
        win: '✅',
        loss: '❌'
    };
    return icons[type] || '💵';
}

function showModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('hidden');
    });
}

function hasOpenModals() {
    return document.querySelector('.modal:not(.hidden)') !== null;
}

function showLoading() {
    tg.MainButton.showProgress();
}

function hideLoading() {
    tg.MainButton.hideProgress();
}

function hideLoader() {
    document.getElementById('loader').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    const container = document.getElementById('toast-container');
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
    
    // Also show as Telegram notification
    if (type === 'error') {
        tg.showAlert(message);
    }
}

function applyTheme(theme) {
    document.body.className = `theme-${theme}`;
    
    // Apply Telegram theme colors
    document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#ffffff');
    document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#000000');
    document.documentElement.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color || '#999999');
    document.documentElement.style.setProperty('--tg-theme-link-color', tg.themeParams.link_color || '#3390ec');
    document.documentElement.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#3390ec');
    document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color || '#ffffff');
}

function toggleTheme() {
    const isDark = document.getElementById('theme-toggle').checked;
    applyTheme(isDark ? 'dark' : 'light');
}

function toggleNotifications(show) {
    const panel = document.getElementById('notification-panel');
    if (typeof show === 'boolean') {
        panel.classList.toggle('hidden', !show);
    } else {
        panel.classList.toggle('hidden');
    }
}

function toggleSettings(show) {
    const panel = document.getElementById('settings-panel');
    if (typeof show === 'boolean') {
        panel.classList.toggle('hidden', !show);
    } else {
        panel.classList.toggle('hidden');
    }
}

async function refreshBalance() {
    document.getElementById('refresh-balance').classList.add('spinning');
    await loadUserData();
    setTimeout(() => {
        document.getElementById('refresh-balance').classList.remove('spinning');
    }, 1000);
}

function setTradeType(type) {
    document.querySelectorAll('.trade-type-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });
}

function setTradeAmount(amount) {
    const input = document.getElementById('trade-amount');
    if (amount === 'max') {
        input.value = state.balance.toFixed(2);
    } else {
        input.value = amount;
    }
}

async function loadNotifications() {
    try {
        const response = await apiCall('/notifications', {
            headers: {
                'X-Telegram-Init-Data': tg.initData,
                'X-User-ID': state.user.id.toString()
            }
        });
        
        if (response.success) {
            state.notifications = response.notifications;
            updateNotificationBadge(response.pagination.unread_count);
            renderNotifications();
        }
    } catch (error) {
        console.error('Failed to load notifications:', error);
    }
}

function updateNotificationBadge(count) {
    const badge = document.getElementById('notification-badge');
    if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count.toString();
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

function renderNotifications() {
    const listEl = document.getElementById('notifications-list');
    
    if (!state.notifications.length) {
        listEl.innerHTML = '<div class="empty-state">No notifications</div>';
        return;
    }
    
    listEl.innerHTML = state.notifications.map(notif => `
        <div class="notification-item ${notif.read_at ? 'read' : 'unread'}" data-id="${notif.id}">
            <div class="notif-icon">${getNotificationIcon(notif.type)}</div>
            <div class="notif-content">
                <div class="notif-title">${notif.title}</div>
                <div class="notif-message">${notif.message}</div>
                <div class="notif-time">${formatDate(notif.created_at)}</div>
            </div>
        </div>
    `).join('');
}

function getNotificationIcon(type) {
    const icons = {
        transaction: '💳',
        balance_alert: '⚠️',
        security_alert: '🔒',
        system_update: '📢',
        promotion: '🎉'
    };
    return icons[type] || '📬';
}

async function loadAnalytics() {
    try {
        const response = await apiCall('/customer/analytics', {
            headers: {
                'X-Telegram-Init-Data': tg.initData,
                'X-Customer-ID': state.user.id.toString()
            }
        });
        
        if (response.success) {
            const analytics = response.analytics;
            document.getElementById('total-trades').textContent = analytics.activity_stats.total_transactions;
            document.getElementById('win-rate').textContent = `${(analytics.performance_metrics.roi_percentage || 0).toFixed(1)}%`;
            document.getElementById('avg-trade').textContent = `$${formatCurrency(analytics.activity_stats.average_transaction_size)}`;
            
            // Render chart if needed
            renderPerformanceChart(analytics.balance_trend);
        }
    } catch (error) {
        console.error('Failed to load analytics:', error);
    }
}

function renderPerformanceChart(data) {
    // Placeholder for chart rendering
    // You can integrate Chart.js or another library here
    const chartEl = document.getElementById('performance-chart');
    chartEl.innerHTML = '<div class="chart-placeholder">Chart will be rendered here</div>';
}

async function loadReferralData() {
    const referralLink = `https://t.me/${CONFIG.BOT_USERNAME}?start=ref_${state.user.id}`;
    document.getElementById('referral-link').value = referralLink;
    
    // Load referral stats
    try {
        const response = await apiCall('/customer/referrals', {
            headers: {
                'X-Telegram-Init-Data': tg.initData,
                'X-Customer-ID': state.user.id.toString()
            }
        });
        
        if (response.success) {
            document.getElementById('total-referrals').textContent = response.referral_count || 0;
            document.getElementById('referral-earnings').textContent = `$${formatCurrency(response.earnings || 0)}`;
        }
    } catch (error) {
        console.error('Failed to load referral data:', error);
    }
}

function copyReferralLink() {
    const input = document.getElementById('referral-link');
    navigator.clipboard.writeText(input.value).then(() => {
        showToast('Referral link copied!', 'success');
    });
}

function shareReferralLink() {
    const link = document.getElementById('referral-link').value;
    const text = `Join me on Fantdev Trading and get exclusive bonuses! ${link}`;
    
    tg.switchInlineQuery(text, ['users', 'groups', 'channels']);
}

function handleP2P() {
    tg.showPopup({
        title: 'P2P Trading',
        message: 'P2P trading allows you to trade directly with other users. This feature is coming soon!',
        buttons: [
            { id: 'ok', type: 'ok', text: 'Got it' }
        ]
    });
}

function addTransaction(transaction) {
    state.transactions.unshift(transaction);
    if (state.activeTab === 'transactions') {
        renderTransactionsList(state.transactions.slice(0, 10));
    }
    showToast(`New transaction: ${transaction.type}`, 'info');
}

function addNotification(notification) {
    state.notifications.unshift(notification);
    updateNotificationBadge(state.notifications.filter(n => !n.read_at).length);
    renderNotifications();
    showToast(notification.title, 'info');
}

function setupPeriodicUpdates() {
    setInterval(async () => {
        if (!document.hidden) {
            await loadUserData();
        }
    }, CONFIG.UPDATE_INTERVAL);
}

// Error Handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    showToast('An error occurred', 'error');
});

// Visibility Change Handler
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        loadUserData();
    }
});
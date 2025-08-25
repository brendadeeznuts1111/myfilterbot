/**
 * Real-time Support Chat System
 * Provides live customer support with WebSocket integration
 */

class SupportChat {
    constructor(options = {}) {
        this.userId = options.userId;
        this.userType = options.userType || 'customer';
        this.apiBase = options.apiBase || '/api/support';
        this.socket = options.socket;
        this.container = options.container || document.body;
        
        this.messages = [];
        this.currentChat = null;
        this.isVisible = false;
        this.isConnected = false;
        this.typing = false;
        this.typingTimer = null;
        
        this.init();
    }
    
    async init() {
        this.createChatUI();
        this.setupEventListeners();
        this.setupWebSocketHandlers();
        await this.loadChatHistory();
    }
    
    createChatUI() {
        // Create chat widget button
        this.chatWidget = this.createElement(`
            <div class="support-chat-widget" id="support-chat-widget">
                <div class="chat-widget-button" id="chat-widget-button">
                    <i class="fas fa-comments"></i>
                    <span class="chat-badge" id="chat-badge">0</span>
                </div>
            </div>
        `);
        
        // Create chat window
        this.chatWindow = this.createElement(`
            <div class="support-chat-window" id="support-chat-window">
                <div class="chat-header">
                    <div class="chat-header-info">
                        <div class="support-avatar">
                            <i class="fas fa-headset"></i>
                        </div>
                        <div class="support-info">
                            <h4>Customer Support</h4>
                            <span class="support-status" id="support-status">Online</span>
                        </div>
                    </div>
                    <div class="chat-header-actions">
                        <button class="chat-action-btn" id="chat-minimize" title="Minimize">
                            <i class="fas fa-minus"></i>
                        </button>
                        <button class="chat-action-btn" id="chat-close" title="Close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                
                <div class="chat-messages" id="chat-messages">
                    <div class="welcome-message">
                        <div class="message system">
                            <div class="message-content">
                                <div class="message-text">
                                    👋 Welcome to Fantdev Support! How can we help you today?
                                </div>
                                <div class="quick-actions">
                                    <button class="quick-action-btn" onclick="supportChat.sendQuickMessage('Account Balance Issue')">
                                        💰 Account Balance
                                    </button>
                                    <button class="quick-action-btn" onclick="supportChat.sendQuickMessage('Transaction Problem')">
                                        🔄 Transaction Issue
                                    </button>
                                    <button class="quick-action-btn" onclick="supportChat.sendQuickMessage('Technical Support')">
                                        🔧 Technical Help
                                    </button>
                                    <button class="quick-action-btn" onclick="supportChat.sendQuickMessage('General Inquiry')">
                                        ❓ General Question
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="chat-typing" id="chat-typing" style="display: none;">
                    <div class="typing-indicator">
                        <span>Support is typing</span>
                        <div class="typing-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                </div>
                
                <div class="chat-input-container">
                    <div class="chat-attachments" id="chat-attachments" style="display: none;">
                        <div class="attachment-preview">
                            <span>Screenshot.png</span>
                            <button onclick="supportChat.removeAttachment()">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="chat-input">
                        <button class="chat-attachment-btn" id="chat-attachment-btn" title="Attach file">
                            <i class="fas fa-paperclip"></i>
                        </button>
                        
                        <textarea 
                            id="chat-message-input" 
                            placeholder="Type your message..." 
                            rows="1"
                            maxlength="1000"></textarea>
                        
                        <button class="chat-send-btn" id="chat-send-btn" disabled>
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                    
                    <div class="chat-footer">
                        <small>Press Enter to send • Shift+Enter for new line</small>
                    </div>
                </div>
            </div>
        `);
        
        // Add to container
        this.container.appendChild(this.chatWidget);
        this.container.appendChild(this.chatWindow);
        
        // Add styles
        this.addChatStyles();
    }
    
    createElement(html) {
        const div = document.createElement('div');
        div.innerHTML = html.trim();
        return div.firstChild;
    }
    
    addChatStyles() {
        const styles = `
            .support-chat-widget {
                position: fixed;
                bottom: 24px;
                right: 24px;
                z-index: 10000;
            }
            
            .chat-widget-button {
                width: 60px;
                height: 60px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                cursor: pointer;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                transition: all 0.3s ease;
                position: relative;
            }
            
            .chat-widget-button:hover {
                transform: scale(1.1);
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
            }
            
            .chat-widget-button i {
                font-size: 24px;
            }
            
            .chat-badge {
                position: absolute;
                top: -5px;
                right: -5px;
                background: #ef4444;
                color: white;
                border-radius: 50%;
                min-width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: 600;
                border: 2px solid white;
                display: none;
            }
            
            .chat-badge.visible {
                display: flex;
            }
            
            .support-chat-window {
                position: fixed;
                bottom: 100px;
                right: 24px;
                width: 380px;
                height: 550px;
                background: white;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
                border: 1px solid rgba(0, 0, 0, 0.1);
                display: none;
                flex-direction: column;
                z-index: 10001;
                overflow: hidden;
            }
            
            .support-chat-window.visible {
                display: flex;
                animation: chatSlideUp 0.3s ease;
            }
            
            .support-chat-window.minimized {
                height: 60px;
            }
            
            @keyframes chatSlideUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .chat-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 16px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-shrink: 0;
            }
            
            .chat-header-info {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .support-avatar {
                width: 40px;
                height: 40px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
            }
            
            .support-info h4 {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
            }
            
            .support-status {
                font-size: 12px;
                opacity: 0.9;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            .support-status::before {
                content: '';
                width: 8px;
                height: 8px;
                background: #10b981;
                border-radius: 50%;
                display: inline-block;
            }
            
            .chat-header-actions {
                display: flex;
                gap: 8px;
            }
            
            .chat-action-btn {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
            }
            
            .chat-action-btn:hover {
                background: rgba(255, 255, 255, 0.3);
            }
            
            .chat-messages {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
                display: flex;
                flex-direction: column;
                gap: 16px;
            }
            
            .message {
                display: flex;
                gap: 12px;
                animation: messageAppear 0.3s ease;
            }
            
            @keyframes messageAppear {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .message.outgoing {
                flex-direction: row-reverse;
            }
            
            .message.system {
                justify-content: center;
            }
            
            .message-avatar {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: #f3f4f6;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                font-size: 14px;
                color: #6b7280;
            }
            
            .message.outgoing .message-avatar {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }
            
            .message-content {
                max-width: 70%;
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            
            .message.system .message-content {
                max-width: 100%;
                text-align: center;
            }
            
            .message-text {
                background: #f3f4f6;
                padding: 12px 16px;
                border-radius: 18px;
                font-size: 14px;
                line-height: 1.4;
                word-wrap: break-word;
            }
            
            .message.outgoing .message-text {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }
            
            .message.system .message-text {
                background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
                border: 1px solid #d1d5db;
                padding: 16px;
                border-radius: 12px;
            }
            
            .message-time {
                font-size: 12px;
                color: #9ca3af;
                margin-left: 16px;
            }
            
            .message.outgoing .message-time {
                text-align: right;
                margin-left: 0;
                margin-right: 16px;
            }
            
            .quick-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 12px;
            }
            
            .quick-action-btn {
                background: white;
                border: 2px solid #e5e7eb;
                border-radius: 20px;
                padding: 8px 12px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
                white-space: nowrap;
            }
            
            .quick-action-btn:hover {
                border-color: #667eea;
                background: #f8f9ff;
            }
            
            .chat-typing {
                padding: 0 20px 12px;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .typing-indicator {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 13px;
                color: #6b7280;
            }
            
            .typing-dots {
                display: flex;
                gap: 4px;
            }
            
            .typing-dots span {
                width: 6px;
                height: 6px;
                background: #9ca3af;
                border-radius: 50%;
                animation: typingBounce 1.4s infinite ease-in-out;
            }
            
            .typing-dots span:nth-child(1) { animation-delay: -0.32s; }
            .typing-dots span:nth-child(2) { animation-delay: -0.16s; }
            
            @keyframes typingBounce {
                0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; }
                40% { transform: scale(1); opacity: 1; }
            }
            
            .chat-input-container {
                border-top: 1px solid #e5e7eb;
                background: white;
                flex-shrink: 0;
            }
            
            .chat-attachments {
                padding: 12px 20px;
                border-bottom: 1px solid #f3f4f6;
            }
            
            .attachment-preview {
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: #f3f4f6;
                border-radius: 8px;
                padding: 8px 12px;
                font-size: 13px;
            }
            
            .attachment-preview button {
                background: none;
                border: none;
                color: #9ca3af;
                cursor: pointer;
                padding: 4px;
            }
            
            .chat-input {
                display: flex;
                align-items: flex-end;
                gap: 12px;
                padding: 16px 20px;
            }
            
            .chat-attachment-btn {
                background: none;
                border: none;
                color: #9ca3af;
                cursor: pointer;
                padding: 8px;
                border-radius: 50%;
                transition: all 0.2s ease;
                flex-shrink: 0;
            }
            
            .chat-attachment-btn:hover {
                background: #f3f4f6;
                color: #667eea;
            }
            
            #chat-message-input {
                flex: 1;
                border: 2px solid #e5e7eb;
                border-radius: 20px;
                padding: 12px 16px;
                font-size: 14px;
                font-family: inherit;
                resize: none;
                min-height: 20px;
                max-height: 100px;
                outline: none;
                transition: all 0.2s ease;
            }
            
            #chat-message-input:focus {
                border-color: #667eea;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            }
            
            #chat-message-input::placeholder {
                color: #9ca3af;
            }
            
            .chat-send-btn {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border: none;
                color: white;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                flex-shrink: 0;
            }
            
            .chat-send-btn:disabled {
                background: #d1d5db;
                cursor: not-allowed;
            }
            
            .chat-send-btn:not(:disabled):hover {
                transform: scale(1.05);
            }
            
            .chat-footer {
                padding: 8px 20px 16px;
                text-align: center;
            }
            
            .chat-footer small {
                color: #9ca3af;
                font-size: 12px;
            }
            
            /* Mobile Responsive */
            @media (max-width: 480px) {
                .support-chat-window {
                    width: calc(100vw - 32px);
                    height: calc(100vh - 120px);
                    bottom: 16px;
                    right: 16px;
                }
                
                .support-chat-widget {
                    bottom: 16px;
                    right: 16px;
                }
            }
            
            /* Dark Mode Support */
            @media (prefers-color-scheme: dark) {
                .support-chat-window {
                    background: #1f2937;
                    border-color: #374151;
                }
                
                .message-text {
                    background: #374151;
                    color: #f9fafb;
                }
                
                .message.system .message-text {
                    background: #374151;
                    border-color: #4b5563;
                    color: #f9fafb;
                }
                
                .chat-input-container {
                    background: #1f2937;
                    border-color: #374151;
                }
                
                #chat-message-input {
                    background: #374151;
                    border-color: #4b5563;
                    color: #f9fafb;
                }
                
                .quick-action-btn {
                    background: #374151;
                    border-color: #4b5563;
                    color: #f9fafb;
                }
            }
        `;
        
        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }
    
    setupEventListeners() {
        // Widget button click
        document.getElementById('chat-widget-button').addEventListener('click', () => {
            this.toggleChat();
        });
        
        // Header action buttons
        document.getElementById('chat-minimize').addEventListener('click', () => {
            this.minimizeChat();
        });
        
        document.getElementById('chat-close').addEventListener('click', () => {
            this.closeChat();
        });
        
        // Message input
        const messageInput = document.getElementById('chat-message-input');
        const sendButton = document.getElementById('chat-send-btn');
        
        messageInput.addEventListener('input', () => {
            this.handleInputChange();
            this.sendTypingIndicator();
        });
        
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        sendButton.addEventListener('click', () => {
            this.sendMessage();
        });
        
        // Attachment button
        document.getElementById('chat-attachment-btn').addEventListener('click', () => {
            this.openFileDialog();
        });
        
        // Auto-resize textarea
        messageInput.addEventListener('input', () => {
            this.autoResizeTextarea(messageInput);
        });
    }
    
    setupWebSocketHandlers() {
        if (!this.socket) return;
        
        this.socket.on('support_message', (data) => {
            this.handleIncomingMessage(data);
        });
        
        this.socket.on('support_typing', (data) => {
            this.handleTypingIndicator(data);
        });
        
        this.socket.on('support_agent_online', (data) => {
            this.updateAgentStatus(true);
        });
        
        this.socket.on('support_agent_offline', (data) => {
            this.updateAgentStatus(false);
        });
        
        this.socket.on('support_chat_closed', (data) => {
            this.handleChatClosed();
        });
    }
    
    async loadChatHistory() {
        try {
            const response = await fetch(`${this.apiBase}/history/${this.userId}`, {
                headers: {
                    'X-User-ID': this.userId,
                    'X-User-Type': this.userType,
                    'ngrok-skip-browser-warning': 'true'
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                this.messages = result.messages || [];
                this.renderMessages();
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
        }
    }
    
    toggleChat() {
        const chatWindow = document.getElementById('support-chat-window');
        
        if (this.isVisible) {
            this.closeChat();
        } else {
            chatWindow.classList.add('visible');
            this.isVisible = true;
            
            // Focus message input
            setTimeout(() => {
                document.getElementById('chat-message-input').focus();
            }, 300);
            
            // Mark messages as read
            this.markMessagesAsRead();
        }
    }
    
    minimizeChat() {
        const chatWindow = document.getElementById('support-chat-window');
        chatWindow.classList.toggle('minimized');
    }
    
    closeChat() {
        const chatWindow = document.getElementById('support-chat-window');
        chatWindow.classList.remove('visible');
        this.isVisible = false;
    }
    
    async sendMessage() {
        const messageInput = document.getElementById('chat-message-input');
        const message = messageInput.value.trim();
        
        if (!message) return;
        
        const messageData = {
            id: `msg_${Date.now()}`,
            text: message,
            timestamp: new Date().toISOString(),
            sender: 'customer',
            sender_id: this.userId
        };
        
        // Add to local messages immediately
        this.messages.push(messageData);
        this.renderMessages();
        
        // Clear input
        messageInput.value = '';
        this.handleInputChange();
        
        // Send via WebSocket
        if (this.socket) {
            this.socket.emit('support_send_message', {
                user_id: this.userId,
                user_type: this.userType,
                message: message,
                timestamp: messageData.timestamp
            });
        }
        
        // Send via API as backup
        try {
            await fetch(`${this.apiBase}/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': this.userId,
                    'X-User-Type': this.userType,
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({
                    message: message,
                    timestamp: messageData.timestamp
                })
            });
        } catch (error) {
            console.error('Error sending message:', error);
        }
        
        // Auto-response for demo
        setTimeout(() => {
            this.simulateAgentResponse(message);
        }, 1000 + Math.random() * 2000);
    }
    
    sendQuickMessage(message) {
        const messageInput = document.getElementById('chat-message-input');
        messageInput.value = message;
        this.sendMessage();
    }
    
    handleInputChange() {
        const messageInput = document.getElementById('chat-message-input');
        const sendButton = document.getElementById('chat-send-btn');
        
        const hasText = messageInput.value.trim().length > 0;
        sendButton.disabled = !hasText;
    }
    
    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
    }
    
    sendTypingIndicator() {
        if (!this.socket || this.typing) return;
        
        this.typing = true;
        this.socket.emit('support_typing_start', {
            user_id: this.userId,
            user_type: this.userType
        });
        
        // Clear previous timer
        if (this.typingTimer) {
            clearTimeout(this.typingTimer);
        }
        
        // Stop typing after 3 seconds of inactivity
        this.typingTimer = setTimeout(() => {
            this.typing = false;
            if (this.socket) {
                this.socket.emit('support_typing_stop', {
                    user_id: this.userId,
                    user_type: this.userType
                });
            }
        }, 3000);
    }
    
    handleIncomingMessage(data) {
        if (data.user_id !== this.userId) return;
        
        const messageData = {
            id: data.message_id || `msg_${Date.now()}`,
            text: data.message,
            timestamp: data.timestamp,
            sender: 'agent',
            sender_name: data.agent_name || 'Support'
        };
        
        this.messages.push(messageData);
        this.renderMessages();
        
        // Show notification if chat is closed
        if (!this.isVisible) {
            this.showNewMessageNotification();
        }
        
        // Play notification sound
        this.playNotificationSound();
    }
    
    handleTypingIndicator(data) {
        const typingDiv = document.getElementById('chat-typing');
        
        if (data.typing) {
            typingDiv.style.display = 'block';
            this.scrollToBottom();
        } else {
            typingDiv.style.display = 'none';
        }
    }
    
    updateAgentStatus(online) {
        const statusElement = document.getElementById('support-status');
        statusElement.textContent = online ? 'Online' : 'Offline';
        statusElement.className = `support-status ${online ? 'online' : 'offline'}`;
    }
    
    renderMessages() {
        const messagesContainer = document.getElementById('chat-messages');
        const welcomeMessage = messagesContainer.querySelector('.welcome-message');
        
        // Clear existing messages (except welcome)
        const existingMessages = messagesContainer.querySelectorAll('.message:not(.welcome-message .message)');
        existingMessages.forEach(msg => msg.remove());
        
        // Render all messages
        this.messages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            messagesContainer.appendChild(messageElement);
        });
        
        this.scrollToBottom();
    }
    
    createMessageElement(message) {
        const isOutgoing = message.sender === 'customer';
        const avatar = isOutgoing ? this.userId.charAt(0).toUpperCase() : '🎧';
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isOutgoing ? 'outgoing' : 'incoming'}`;
        messageDiv.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <div class="message-text">${this.escapeHtml(message.text)}</div>
                <div class="message-time">${this.formatMessageTime(message.timestamp)}</div>
            </div>
        `;
        
        return messageDiv;
    }
    
    scrollToBottom() {
        const messagesContainer = document.getElementById('chat-messages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    showNewMessageNotification() {
        const badge = document.getElementById('chat-badge');
        const currentCount = parseInt(badge.textContent) || 0;
        badge.textContent = currentCount + 1;
        badge.classList.add('visible');
    }
    
    markMessagesAsRead() {
        const badge = document.getElementById('chat-badge');
        badge.textContent = '0';
        badge.classList.remove('visible');
    }
    
    playNotificationSound() {
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEaATqN0fPLdymJl3pH7D7...'); // Base64 notification sound
            audio.volume = 0.3;
            audio.play().catch(() => {
                // Ignore audio play errors (user interaction required)
            });
        } catch (error) {
            // Ignore audio errors
        }
    }
    
    simulateAgentResponse(userMessage) {
        // AI-powered response simulation
        const responses = this.generateContextualResponse(userMessage);
        const response = responses[Math.floor(Math.random() * responses.length)];
        
        // Show typing indicator
        document.getElementById('chat-typing').style.display = 'block';
        this.scrollToBottom();
        
        setTimeout(() => {
            document.getElementById('chat-typing').style.display = 'none';
            
            this.handleIncomingMessage({
                user_id: this.userId,
                message: response,
                timestamp: new Date().toISOString(),
                agent_name: 'Sarah'
            });
        }, 1500 + Math.random() * 1000);
    }
    
    generateContextualResponse(message) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('balance') || lowerMessage.includes('money')) {
            return [
                'I can help you with balance-related questions. Let me check your account details.',
                'I see you\'re asking about your balance. Your current balance is updated in real-time on your dashboard.',
                'For balance inquiries, I can provide you with the most recent information from our systems.'
            ];
        } else if (lowerMessage.includes('transaction') || lowerMessage.includes('deposit') || lowerMessage.includes('withdrawal')) {
            return [
                'I\'ll help you with your transaction inquiry. Can you provide more details about the specific transaction?',
                'Transaction issues can usually be resolved quickly. Let me look into this for you.',
                'I can see your recent transaction history. Is there a specific transaction you need help with?'
            ];
        } else if (lowerMessage.includes('technical') || lowerMessage.includes('problem') || lowerMessage.includes('issue')) {
            return [
                'I\'m here to help with technical issues. Can you describe what specific problem you\'re experiencing?',
                'Technical support is our specialty! Let me guide you through troubleshooting steps.',
                'I can help resolve technical issues. What browser and device are you using?'
            ];
        } else if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
            return [
                'Hi there! I\'m Sarah from Fantdev support. How can I help you today?',
                'Hello! Welcome to Fantdev support. What can I assist you with?',
                'Hi! I\'m here to help with any questions or issues you might have.'
            ];
        } else {
            return [
                'Thank you for contacting us. I\'m here to help! Can you provide more details about what you need assistance with?',
                'I understand your concern. Let me connect you with the right resources to resolve this.',
                'That\'s a great question! I\'ll do my best to help you find the answer.',
                'I\'m processing your request. Could you provide a bit more context so I can assist you better?'
            ];
        }
    }
    
    openFileDialog() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,application/pdf,.txt,.doc,.docx';
        input.onchange = (event) => {
            const file = event.target.files[0];
            if (file) {
                this.handleFileAttachment(file);
            }
        };
        input.click();
    }
    
    handleFileAttachment(file) {
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            this.showError('File size must be less than 10MB');
            return;
        }
        
        const attachmentsDiv = document.getElementById('chat-attachments');
        const preview = attachmentsDiv.querySelector('.attachment-preview span');
        
        preview.textContent = file.name;
        attachmentsDiv.style.display = 'block';
        
        // Store file for sending
        this.pendingAttachment = file;
    }
    
    removeAttachment() {
        document.getElementById('chat-attachments').style.display = 'none';
        this.pendingAttachment = null;
    }
    
    // Utility methods
    formatMessageTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    showError(message) {
        // Could integrate with notification system
        console.error('Chat error:', message);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SupportChat;
}

// Global instance for easy access
window.SupportChat = SupportChat;
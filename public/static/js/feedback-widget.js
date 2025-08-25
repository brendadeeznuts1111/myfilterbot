class EnhancedFeedbackWidget {
    constructor() {
        this.widget = document.getElementById('enhanced-feedback-widget');
        this.toggle = document.getElementById('feedback-toggle');
        this.close = document.getElementById('feedback-close');
        this.body = document.getElementById('feedback-body');
        this.success = document.getElementById('feedback-success');
        this.loading = document.getElementById('feedback-loading');
        this.submitBtn = document.getElementById('feedback-submit');
        this.cancelBtn = document.getElementById('feedback-cancel');
        this.textarea = document.getElementById('feedback-text');
        this.charCount = document.getElementById('char-count');
        this.categorySelect = document.getElementById('feedback-category');
        
        this.ratings = {};
        this.isMinimized = false;
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupCharacterCount();
        this.loadStoredData();
    }
    
    setupEventListeners() {
        // Toggle widget
        this.toggle.addEventListener('click', () => this.toggleWidget());
        
        // Close widget
        this.close.addEventListener('click', () => this.minimizeWidget());
        
        // Rating buttons
        document.querySelectorAll('.enhanced-rating-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleRating(e));
        });
        
        // Submit feedback
        this.submitBtn.addEventListener('click', () => this.submitFeedback());
        
        // Cancel feedback
        this.cancelBtn.addEventListener('click', () => this.resetForm());
        
        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.isMinimized) {
                this.minimizeWidget();
            }
        });
        
        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!this.widget.contains(e.target) && !this.isMinimized) {
                this.minimizeWidget();
            }
        });
    }
    
    setupCharacterCount() {
        this.textarea.addEventListener('input', () => {
            const count = this.textarea.value.length;
            this.charCount.textContent = count;
            
            if (count > 400) {
                this.charCount.style.color = 'var(--warning)';
            } else if (count > 300) {
                this.charCount.style.color = 'var(--text-tertiary)';
            } else {
                this.charCount.style.color = 'var(--text-tertiary)';
            }
        });
    }
    
    handleRating(e) {
        const btn = e.target;
        const rating = btn.dataset.rating;
        const label = btn.dataset.label;
        const questionId = btn.closest('.enhanced-feedback-question').querySelector('label').textContent;
        
        // Remove previous selection from this question
        btn.closest('.enhanced-rating-buttons').querySelectorAll('.enhanced-rating-btn').forEach(b => {
            b.classList.remove('selected');
        });
        
        // Select current rating
        btn.classList.add('selected');
        
        // Store rating
        this.ratings[questionId] = { rating, label };
    }
    
    async submitFeedback() {
        // Validate form
        if (!this.validateForm()) {
            return;
        }
        
        // Show loading state
        this.showLoading();
        
        try {
            // Prepare feedback data
            const feedbackData = {
                timestamp: new Date().toISOString(),
                ratings: this.ratings,
                text: this.textarea.value,
                category: this.categorySelect.value,
                userAgent: navigator.userAgent,
                url: window.location.href,
                sessionId: this.getSessionId()
            };
            
            // Submit to server (replace with actual endpoint)
            await this.submitToServer(feedbackData);
            
            // Show success state
            this.showSuccess();
            
            // Store submission locally
            this.storeSubmission(feedbackData);
            
            // Reset form after delay
            setTimeout(() => {
                this.resetForm();
                this.minimizeWidget();
            }, 3000);
            
        } catch (error) {
            console.error('Feedback submission failed:', error);
            this.showError('Failed to submit feedback. Please try again.');
        }
    }
    
    validateForm() {
        const hasRating = Object.keys(this.ratings).length > 0;
        const hasText = this.textarea.value.trim().length > 0;
        const hasCategory = this.categorySelect.value;
        
        if (!hasRating) {
            this.showError('Please provide a rating.');
            return false;
        }
        
        if (!hasText) {
            this.showError('Please provide feedback text.');
            return false;
        }
        
        if (!hasCategory) {
            this.showError('Please select a category.');
            return false;
        }
        
        return true;
    }
    
    async submitToServer(data) {
        // Simulate API call - replace with actual endpoint
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log('Feedback submitted:', data);
                resolve({ success: true });
            }, 1000);
        });
    }
    
    showLoading() {
        this.body.classList.add('hidden');
        this.success.classList.add('hidden');
        this.loading.classList.remove('hidden');
    }
    
    showSuccess() {
        this.loading.classList.add('hidden');
        this.success.classList.remove('hidden');
    }
    
    showError(message) {
        // Use the enhanced toast system if available
        if (window.FantDevComponents) {
            window.FantDevComponents.showToast(message, 'error', 5000);
        } else {
            alert(message);
        }
    }
    
    toggleWidget() {
        if (this.isMinimized) {
            this.expandWidget();
        } else {
            this.minimizeWidget();
        }
    }
    
    expandWidget() {
        this.widget.classList.remove('minimized');
        this.isMinimized = false;
        this.widget.classList.add('animate-slide-in');
    }
    
    minimizeWidget() {
        this.widget.classList.add('minimized');
        this.isMinimized = true;
    }
    
    resetForm() {
        // Clear ratings
        document.querySelectorAll('.enhanced-rating-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // Clear text
        this.textarea.value = '';
        this.charCount.textContent = '0';
        
        // Reset category
        this.categorySelect.value = '';
        
        // Clear stored ratings
        this.ratings = {};
        
        // Show form
        this.loading.classList.add('hidden');
        this.success.classList.add('hidden');
        this.body.classList.remove('hidden');
    }
    
    storeSubmission(data) {
        const submissions = JSON.parse(localStorage.getItem('fantdev-feedback') || '[]');
        submissions.push(data);
        localStorage.setItem('fantdev-feedback', JSON.stringify(submissions));
    }
    
    loadStoredData() {
        // Load any previously stored feedback data
        const stored = localStorage.getItem('fantdev-feedback');
        if (stored) {
            console.log('Stored feedback submissions:', JSON.parse(stored));
        }
    }
    
    getSessionId() {
        let sessionId = sessionStorage.getItem('fantdev-session-id');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('fantdev-session-id', sessionId);
        }
        return sessionId;
    }
}

// Initialize enhanced feedback widget
document.addEventListener('DOMContentLoaded', () => {
    new EnhancedFeedbackWidget();
});

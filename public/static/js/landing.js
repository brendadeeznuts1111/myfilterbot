/**
 * Landing Page JavaScript - FantDev Trading Platform
 * High-performance, conversion-focused landing page functionality
 */

// Alpine.js Component for Landing Page
function landingPage() {
    return {
        // State
        isDarkMode: false,
        mobileMenuOpen: false,
        currentTestimonial: 0,
        billingCycle: 'monthly',
        submitting: false,
        contactForm: {
            firstName: '',
            lastName: '',
            email: '',
            message: ''
        },
        
        // Performance tracking
        performanceMetrics: {
            pageLoadTime: 0,
            firstContentfulPaint: 0,
            largestContentfulPaint: 0,
            cumulativeLayoutShift: 0
        },
        
        // Initialize
        init() {
            this.setupDarkMode();
            this.setupIntersectionObserver();
            this.setupPerformanceMonitoring();
            this.setupAccessibility();
            this.setupTouchGestures();
            this.autoAdvanceTestimonials();
            
            // Preload critical resources
            this.preloadCriticalResources();
        },
        
        // Dark Mode Management
        setupDarkMode() {
            // Check for saved preference or system preference
            const savedPreference = localStorage.getItem('fantdev-dark-mode');
            const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches;
            
            this.isDarkMode = savedPreference !== null ? savedPreference === 'true' : systemPreference;
            this.applyDarkMode();
            
            // Listen for system preference changes
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (localStorage.getItem('fantdev-dark-mode') === null) {
                    this.isDarkMode = e.matches;
                    this.applyDarkMode();
                }
            });
        },
        
        toggleDarkMode() {
            this.isDarkMode = !this.isDarkMode;
            localStorage.setItem('fantdev-dark-mode', this.isDarkMode.toString());
            this.applyDarkMode();
            
            // Track dark mode toggle
            this.trackEvent('dark_mode_toggle', { mode: this.isDarkMode ? 'dark' : 'light' });
        },
        
        applyDarkMode() {
            if (this.isDarkMode) {
                document.documentElement.classList.add('dark');
                document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                document.documentElement.classList.remove('dark');
                document.documentElement.setAttribute('data-theme', 'light');
            }
            
            // Update meta theme-color
            const metaThemeColor = document.querySelector('meta[name="theme-color"]');
            if (metaThemeColor) {
                metaThemeColor.setAttribute('content', this.isDarkMode ? '#111827' : '#0A4DFF');
            }
        },
        
        // Mobile Menu
        toggleMobileMenu() {
            this.mobileMenuOpen = !this.mobileMenuOpen;
            
            // Prevent body scroll when menu is open
            if (this.mobileMenuOpen) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
            
            // Track mobile menu usage
            this.trackEvent('mobile_menu_toggle', { open: this.mobileMenuOpen });
        },
        
        // Testimonials Carousel
        nextTestimonial() {
            this.currentTestimonial = (this.currentTestimonial + 1) % 3;
            this.trackEvent('testimonial_navigation', { direction: 'next', position: this.currentTestimonial });
        },
        
        previousTestimonial() {
            this.currentTestimonial = this.currentTestimonial === 0 ? 2 : this.currentTestimonial - 1;
            this.trackEvent('testimonial_navigation', { direction: 'previous', position: this.currentTestimonial });
        },
        
        goToTestimonial(index) {
            this.currentTestimonial = index;
            this.trackEvent('testimonial_navigation', { direction: 'direct', position: this.currentTestimonial });
        },
        
        autoAdvanceTestimonials() {
            // Auto-advance testimonials every 8 seconds
            setInterval(() => {
                if (!this.isElementInViewport(document.getElementById('testimonials'))) {
                    return; // Don't auto-advance if not visible
                }
                this.nextTestimonial();
            }, 8000);
        },
        
        // Contact Form Handling
        async submitContactForm() {
            if (this.submitting) return;
            
            this.submitting = true;
            
            try {
                // Validate form
                if (!this.validateContactForm()) {
                    return;
                }
                
                // Simulate API call (replace with actual endpoint)
                await this.simulateFormSubmission();
                
                // Show success message
                this.showNotification('Thank you! We\'ll be in touch soon.', 'success');
                
                // Reset form
                this.resetContactForm();
                
                // Track form submission
                this.trackEvent('contact_form_submitted', {
                    hasMessage: this.contactForm.message.length > 0
                });
                
            } catch (error) {
                console.error('Form submission error:', error);
                this.showNotification('Something went wrong. Please try again.', 'error');
            } finally {
                this.submitting = false;
            }
        },
        
        validateContactForm() {
            const { firstName, lastName, email } = this.contactForm;
            
            if (!firstName.trim()) {
                this.showNotification('Please enter your first name.', 'error');
                return false;
            }
            
            if (!lastName.trim()) {
                this.showNotification('Please enter your last name.', 'error');
                return false;
            }
            
            if (!email.trim() || !this.isValidEmail(email)) {
                this.showNotification('Please enter a valid email address.', 'error');
                return false;
            }
            
            return true;
        },
        
        isValidEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        },
        
        async simulateFormSubmission() {
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Simulate 95% success rate
            if (Math.random() < 0.95) {
                return { success: true };
            } else {
                throw new Error('Simulated network error');
            }
        },
        
        resetContactForm() {
            this.contactForm = {
                firstName: '',
                lastName: '',
                email: '',
                message: ''
            };
        },
        
        // Intersection Observer for Animations
        setupIntersectionObserver() {
            if (!('IntersectionObserver' in window)) {
                // Fallback for older browsers
                this.animateElementsOnScroll();
                return;
            }
            
            const observerOptions = {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            };
            
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animate-in');
                        
                        // Track element visibility
                        this.trackElementVisibility(entry.target);
                    }
                });
            }, observerOptions);
            
            // Observe all animatable elements
            const animatableElements = document.querySelectorAll('.feature-card, .pricing-card, .testimonial-card');
            animatableElements.forEach(el => observer.observe(el));
        },
        
        // Performance Monitoring
        setupPerformanceMonitoring() {
            // Measure page load performance
            if ('performance' in window) {
                window.addEventListener('load', () => {
                    setTimeout(() => {
                        this.measurePerformance();
                    }, 0);
                });
            }
            
            // Monitor Core Web Vitals
            this.monitorCoreWebVitals();
        },
        
        measurePerformance() {
            const navigation = performance.getEntriesByType('navigation')[0];
            if (navigation) {
                this.performanceMetrics.pageLoadTime = navigation.loadEventEnd - navigation.loadEventStart;
                
                // Track performance metrics
                this.trackEvent('performance_metrics', this.performanceMetrics);
            }
        },
        
        monitorCoreWebVitals() {
            // Largest Contentful Paint
            if ('PerformanceObserver' in window) {
                try {
                    const lcpObserver = new PerformanceObserver((list) => {
                        const entries = list.getEntries();
                        const lastEntry = entries[entries.length - 1];
                        this.performanceMetrics.largestContentfulPaint = lastEntry.startTime;
                        
                        // Track LCP
                        if (lastEntry.startTime < 2500) {
                            this.trackEvent('core_web_vital', { metric: 'LCP', value: lastEntry.startTime, rating: 'good' });
                        } else if (lastEntry.startTime < 4000) {
                            this.trackEvent('core_web_vital', { metric: 'LCP', value: lastEntry.startTime, rating: 'needs_improvement' });
                        } else {
                            this.trackEvent('core_web_vital', { metric: 'LCP', value: lastEntry.startTime, rating: 'poor' });
                        }
                    });
                    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
                } catch (e) {
                    console.warn('LCP monitoring not supported:', e);
                }
                
                // First Input Delay
                try {
                    const fidObserver = new PerformanceObserver((list) => {
                        const entries = list.getEntries();
                        entries.forEach(entry => {
                            if (entry.processingStart - entry.startTime < 100) {
                                this.trackEvent('core_web_vital', { metric: 'FID', value: entry.processingStart - entry.startTime, rating: 'good' });
                            } else if (entry.processingStart - entry.startTime < 300) {
                                this.trackEvent('core_web_vital', { metric: 'FID', value: entry.processingStart - entry.startTime, rating: 'needs_improvement' });
                            } else {
                                this.trackEvent('core_web_vital', { metric: 'FID', value: entry.processingStart - entry.startTime, rating: 'poor' });
                            }
                        });
                    });
                    fidObserver.observe({ entryTypes: ['first-input'] });
                } catch (e) {
                    console.warn('FID monitoring not supported:', e);
                }
            }
        },
        
        // Accessibility Features
        setupAccessibility() {
            // Keyboard navigation for testimonials
            document.addEventListener('keydown', (e) => {
                if (e.target.closest('#testimonials')) {
                    switch (e.key) {
                        case 'ArrowLeft':
                            e.preventDefault();
                            this.previousTestimonial();
                            break;
                        case 'ArrowRight':
                            e.preventDefault();
                            this.nextTestimonial();
                            break;
                        case 'Home':
                            e.preventDefault();
                            this.goToTestimonial(0);
                            break;
                        case 'End':
                            e.preventDefault();
                            this.goToTestimonial(2);
                            break;
                    }
                }
            });
            
            // Focus management for mobile menu
            if (this.mobileMenuOpen) {
                const firstMenuItem = document.querySelector('#mobile-menu a');
                if (firstMenuItem) {
                    firstMenuItem.focus();
                }
            }
        },
        
        // Touch Gestures for Mobile
        setupTouchGestures() {
            let touchStartX = 0;
            let touchEndX = 0;
            
            const testimonialsContainer = document.getElementById('testimonials');
            if (!testimonialsContainer) return;
            
            testimonialsContainer.addEventListener('touchstart', (e) => {
                touchStartX = e.changedTouches[0].screenX;
            }, { passive: true });
            
            testimonialsContainer.addEventListener('touchend', (e) => {
                touchEndX = e.changedTouches[0].screenX;
                this.handleSwipe();
            }, { passive: true });
            
            testimonialsContainer.addEventListener('touchmove', (e) => {
                e.preventDefault(); // Prevent scrolling during swipe
            }, { passive: false });
        },
        
        handleSwipe() {
            const swipeThreshold = 50;
            const diff = touchStartX - touchEndX;
            
            if (Math.abs(diff) > swipeThreshold) {
                if (diff > 0) {
                    // Swipe left - next testimonial
                    this.nextTestimonial();
                } else {
                    // Swipe right - previous testimonial
                    this.previousTestimonial();
                }
                
                // Track swipe gesture
                this.trackEvent('testimonial_swipe', { direction: diff > 0 ? 'left' : 'right' });
            }
        },
        
        // Resource Preloading
        preloadCriticalResources() {
            // Preload hero image
            const heroImage = new Image();
            heroImage.src = '/images/landing-hero.webp';
            
            // Preload critical fonts
            if ('fonts' in document) {
                document.fonts.ready.then(() => {
                    this.trackEvent('fonts_loaded', { 
                        time: performance.now() 
                    });
                });
            }
        },
        
        // Utility Functions
        isElementInViewport(el) {
            if (!el) return false;
            
            const rect = el.getBoundingClientRect();
            return (
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                rect.right <= (window.innerWidth || document.documentElement.clientWidth)
            );
        },
        
        animateElementsOnScroll() {
            // Fallback animation for older browsers
            const animateElement = (element) => {
                element.style.opacity = '0';
                element.style.transform = 'translateY(20px)';
                
                setTimeout(() => {
                    element.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
                    element.style.opacity = '1';
                    element.style.transform = 'translateY(0)';
                }, 100);
            };
            
            const elements = document.querySelectorAll('.feature-card, .pricing-card, .testimonial-card');
            elements.forEach((el, index) => {
                setTimeout(() => animateElement(el), index * 200);
            });
        },
        
        // Notification System
        showNotification(message, type = 'info') {
            // Create notification element
            const notification = document.createElement('div');
            notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 translate-x-full`;
            
            // Set notification styles based on type
            switch (type) {
                case 'success':
                    notification.className += ' bg-green-500 text-white';
                    break;
                case 'error':
                    notification.className += ' bg-red-500 text-white';
                    break;
                case 'warning':
                    notification.className += ' bg-yellow-500 text-white';
                    break;
                default:
                    notification.className += ' bg-blue-500 text-white';
            }
            
            notification.innerHTML = `
                <div class="flex items-center">
                    <i class="fas fa-${this.getNotificationIcon(type)} mr-3"></i>
                    <span>${message}</span>
                </div>
            `;
            
            // Add to DOM
            document.body.appendChild(notification);
            
            // Animate in
            setTimeout(() => {
                notification.classList.remove('translate-x-full');
            }, 100);
            
            // Remove after delay
            setTimeout(() => {
                notification.classList.add('translate-x-full');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }, 5000);
        },
        
        getNotificationIcon(type) {
            const icons = {
                success: 'check-circle',
                error: 'exclamation-circle',
                warning: 'exclamation-triangle',
                info: 'info-circle'
            };
            return icons[type] || icons.info;
        },
        
        // Analytics and Tracking
        trackEvent(eventName, parameters = {}) {
            // Google Analytics 4
            if (window.gtag) {
                gtag('event', eventName, {
                    custom_parameters: parameters,
                    timestamp: Date.now()
                });
            }
            
            // Custom tracking
            console.log(`[Analytics] ${eventName}:`, parameters);
        },
        
        trackElementVisibility(element) {
            const elementId = element.id || element.className || 'unknown';
            this.trackEvent('element_visible', {
                element: elementId,
                timestamp: Date.now()
            });
        },
        
        // Performance Optimization
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
        
        throttle(func, limit) {
            let inThrottle;
            return function() {
                const args = arguments;
                const context = this;
                if (!inThrottle) {
                    func.apply(context, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        }
    };
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if Alpine.js is available
    if (typeof Alpine === 'undefined') {
        console.warn('Alpine.js not found, falling back to vanilla JS');
        initializeVanillaJS();
    }
});

// Fallback for when Alpine.js is not available
function initializeVanillaJS() {
    const app = landingPage();
    
    // Initialize the app
    app.init();
    
    // Make functions globally available
    window.toggleDarkMode = app.toggleDarkMode.bind(app);
    window.toggleMobileMenu = app.toggleMobileMenu.bind(app);
    window.nextTestimonial = app.nextTestimonial.bind(app);
    window.previousTestimonial = app.previousTestimonial.bind(app);
    window.submitContactForm = app.submitContactForm.bind(app);
    
    // Set up event listeners
    document.addEventListener('DOMContentLoaded', () => {
        // Dark mode toggle
        const darkModeToggle = document.querySelector('[onclick="toggleDarkMode()"]');
        if (darkModeToggle) {
            darkModeToggle.addEventListener('click', app.toggleDarkMode.bind(app));
        }
        
        // Mobile menu toggle
        const mobileMenuToggle = document.querySelector('[onclick="toggleMobileMenu()"]');
        if (mobileMenuToggle) {
            mobileMenuToggle.addEventListener('click', app.toggleMobileMenu.bind(app));
        }
        
        // Testimonial navigation
        const nextBtn = document.querySelector('[onclick="nextTestimonial()"]');
        const prevBtn = document.querySelector('[onclick="previousTestimonial()"]');
        
        if (nextBtn) {
            nextBtn.addEventListener('click', app.nextTestimonial.bind(app));
        }
        if (prevBtn) {
            prevBtn.addEventListener('click', app.previousTestimonial.bind(app));
        }
        
        // Contact form
        const contactForm = document.querySelector('form');
        if (contactForm) {
            contactForm.addEventListener('submit', app.submitContactForm.bind(app));
        }
    });
}

// Service Worker Registration for PWA features
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Performance monitoring
if ('PerformanceObserver' in window) {
    // Monitor layout shifts
    try {
        const layoutShiftObserver = new PerformanceObserver((list) => {
            let clsValue = 0;
            for (const entry of list.getEntries()) {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                }
            }
            
            // Track CLS
            if (clsValue < 0.1) {
                console.log('[Performance] CLS: Good', clsValue);
            } else if (clsValue < 0.25) {
                console.log('[Performance] CLS: Needs Improvement', clsValue);
            } else {
                console.log('[Performance] CLS: Poor', clsValue);
            }
        });
        layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
        console.warn('CLS monitoring not supported:', e);
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { landingPage };
}

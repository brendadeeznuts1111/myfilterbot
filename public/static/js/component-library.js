/**
 * FantDev Trading Platform - Component Library
 * Reusable UI components with consistent styling and behavior
 * Version: 2.0.0
 */

/**
 * Base Component class for all UI components
 */
class BaseComponent {
    constructor(element, options = {}) {
        this.element = typeof element === 'string' ? document.querySelector(element) : element;
        this.options = { ...this.defaultOptions, ...options };
        this.eventListeners = new Map();
        this.isInitialized = false;
        
        if (this.element) {
            this.init();
        }
    }
    
    get defaultOptions() {
        return {};
    }
    
    init() {
        if (this.isInitialized) return;
        
        this.bindEvents();
        this.render();
        this.isInitialized = true;
        
        this.emit('initialized');
    }
    
    bindEvents() {
        // Override in subclasses
    }
    
    render() {
        // Override in subclasses
    }
    
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }
    
    off(event, callback) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    emit(event, data = null) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Event listener error for ${event}:`, error);
                }
            });
        }
    }
    
    destroy() {
        this.eventListeners.clear();
        this.isInitialized = false;
        this.emit('destroyed');
    }
}

/**
 * Modal Component
 * Provides modal dialog functionality with backdrop and keyboard handling
 */
class Modal extends BaseComponent {
    get defaultOptions() {
        return {
            closeOnBackdrop: true,
            closeOnEscape: true,
            backdrop: true,
            keyboard: true,
            focus: true,
            animation: true
        };
    }
    
    bindEvents() {
        // Close button
        const closeButtons = this.element.querySelectorAll('[data-modal-close]');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => this.hide());
        });
        
        // Backdrop click
        if (this.options.closeOnBackdrop) {
            this.element.addEventListener('click', (e) => {
                if (e.target === this.element) {
                    this.hide();
                }
            });
        }
        
        // Keyboard events
        if (this.options.closeOnEscape) {
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isVisible()) {
                    this.hide();
                }
            });
        }
    }
    
    show() {
        if (this.isVisible()) return;
        
        this.emit('show:before');
        
        // Add backdrop
        if (this.options.backdrop) {
            this.addBackdrop();
        }
        
        // Show modal
        this.element.classList.add('active');
        document.body.classList.add('modal-open');
        
        // Focus management
        if (this.options.focus) {
            this.setFocus();
        }
        
        this.emit('show:after');
    }
    
    hide() {
        if (!this.isVisible()) return;
        
        this.emit('hide:before');
        
        // Hide modal
        this.element.classList.remove('active');
        document.body.classList.remove('modal-open');
        
        // Remove backdrop
        this.removeBackdrop();
        
        this.emit('hide:after');
    }
    
    toggle() {
        if (this.isVisible()) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    isVisible() {
        return this.element.classList.contains('active');
    }
    
    addBackdrop() {
        if (document.querySelector('.modal-backdrop')) return;
        
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop';
        backdrop.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            z-index: var(--z-index-modal-backdrop, 1040);
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        document.body.appendChild(backdrop);
        
        // Trigger opacity transition
        requestAnimationFrame(() => {
            backdrop.style.opacity = '1';
        });
    }
    
    removeBackdrop() {
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.style.opacity = '0';
            setTimeout(() => {
                if (backdrop.parentElement) {
                    backdrop.remove();
                }
            }, 300);
        }
    }
    
    setFocus() {
        const focusable = this.element.querySelector('[autofocus], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])');
        if (focusable) {
            setTimeout(() => focusable.focus(), 100);
        }
    }
}

/**
 * Toast Notification Component
 * Provides toast notifications with auto-dismiss and stacking
 */
class Toast extends BaseComponent {
    get defaultOptions() {
        return {
            type: 'info',
            duration: 5000,
            dismissible: true,
            position: 'top-right',
            animation: true
        };
    }
    
    static container = null;
    
    static createContainer() {
        if (Toast.container) return Toast.container;
        
        Toast.container = document.createElement('div');
        Toast.container.className = 'toast-container';
        Toast.container.style.cssText = `
            position: fixed;
            top: 1rem;
            right: 1rem;
            z-index: var(--z-index-toast, 1080);
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            max-width: 400px;
            pointer-events: none;
        `;
        
        document.body.appendChild(Toast.container);
        return Toast.container;
    }
    
    static show(message, options = {}) {
        const container = Toast.createContainer();
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${options.type || 'info'}`;
        toast.style.cssText = `
            background: var(--surface-primary);
            border: 1px solid var(--border-primary);
            border-left: 4px solid var(--color-${options.type || 'info'}-500);
            border-radius: var(--radius-lg);
            padding: 1rem;
            box-shadow: var(--shadow-lg);
            min-width: 300px;
            pointer-events: auto;
            transform: translateX(100%);
            transition: transform 0.3s ease, opacity 0.3s ease;
        `;
        
        const typeIcons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        const icon = typeIcons[options.type] || typeIcons.info;
        
        toast.innerHTML = `
            <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
                <div style="flex-shrink: 0; margin-top: 0.125rem;">
                    <i class="${icon}" style="color: var(--color-${options.type || 'info'}-500);"></i>
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; margin-bottom: 0.25rem; color: var(--text-primary);">
                        ${options.title || Toast.getTypeTitle(options.type)}
                    </div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary);">
                        ${message}
                    </div>
                </div>
                ${options.dismissible !== false ? `
                    <button class="toast-close" style="
                        background: none;
                        border: none;
                        color: var(--text-tertiary);
                        cursor: pointer;
                        padding: 0.25rem;
                        border-radius: var(--radius-base);
                        transition: var(--transition-fast);
                        width: 1.5rem;
                        height: 1.5rem;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">
                        <i class="fas fa-times" style="font-size: 0.75rem;"></i>
                    </button>
                ` : ''}
            </div>
        `;
        
        container.appendChild(toast);
        
        // Animate in
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
        });
        
        // Auto dismiss
        const duration = options.duration !== undefined ? options.duration : 5000;
        if (duration > 0) {
            setTimeout(() => {
                Toast.dismiss(toast);
            }, duration);
        }
        
        // Close button
        const closeButton = toast.querySelector('.toast-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                Toast.dismiss(toast);
            });
            
            closeButton.addEventListener('mouseenter', () => {
                closeButton.style.backgroundColor = 'var(--surface-secondary)';
            });
            
            closeButton.addEventListener('mouseleave', () => {
                closeButton.style.backgroundColor = 'transparent';
            });
        }
        
        return toast;
    }
    
    static dismiss(toast) {
        toast.style.transform = 'translateX(100%)';
        toast.style.opacity = '0';
        
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 300);
    }
    
    static getTypeTitle(type) {
        const titles = {
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Information'
        };
        return titles[type] || 'Notification';
    }
    
    static dismissAll() {
        const toasts = document.querySelectorAll('.toast');
        toasts.forEach(toast => Toast.dismiss(toast));
    }
}

/**
 * Dropdown Component
 * Provides dropdown menu functionality with positioning and keyboard navigation
 */
class Dropdown extends BaseComponent {
    get defaultOptions() {
        return {
            trigger: 'click',
            placement: 'bottom-start',
            offset: [0, 4],
            closeOnSelect: true,
            closeOnClickOutside: true
        };
    }
    
    bindEvents() {
        this.trigger = this.element.querySelector('[data-dropdown-trigger]');
        this.menu = this.element.querySelector('[data-dropdown-menu]');
        
        if (!this.trigger || !this.menu) return;
        
        // Trigger events
        if (this.options.trigger === 'click') {
            this.trigger.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggle();
            });
        } else if (this.options.trigger === 'hover') {
            this.element.addEventListener('mouseenter', () => this.show());
            this.element.addEventListener('mouseleave', () => this.hide());
        }
        
        // Click outside to close
        if (this.options.closeOnClickOutside) {
            document.addEventListener('click', (e) => {
                if (!this.element.contains(e.target) && this.isVisible()) {
                    this.hide();
                }
            });
        }
        
        // Keyboard navigation
        this.element.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // Menu item selection
        if (this.options.closeOnSelect) {
            this.menu.addEventListener('click', (e) => {
                if (e.target.matches('[data-dropdown-item]')) {
                    this.hide();
                }
            });
        }
    }
    
    show() {
        if (this.isVisible()) return;
        
        this.emit('show:before');
        
        // Position menu
        this.positionMenu();
        
        // Show menu
        this.menu.classList.add('active');
        this.trigger.setAttribute('aria-expanded', 'true');
        
        this.emit('show:after');
    }
    
    hide() {
        if (!this.isVisible()) return;
        
        this.emit('hide:before');
        
        this.menu.classList.remove('active');
        this.trigger.setAttribute('aria-expanded', 'false');
        
        this.emit('hide:after');
    }
    
    toggle() {
        if (this.isVisible()) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    isVisible() {
        return this.menu.classList.contains('active');
    }
    
    positionMenu() {
        const triggerRect = this.trigger.getBoundingClientRect();
        const menuRect = this.menu.getBoundingClientRect();
        const viewport = {
            width: window.innerWidth,
            height: window.innerHeight
        };
        
        let top = triggerRect.bottom + this.options.offset[1];
        let left = triggerRect.left + this.options.offset[0];
        
        // Adjust for viewport boundaries
        if (left + menuRect.width > viewport.width) {
            left = triggerRect.right - menuRect.width;
        }
        
        if (top + menuRect.height > viewport.height) {
            top = triggerRect.top - menuRect.height - this.options.offset[1];
        }
        
        this.menu.style.position = 'fixed';
        this.menu.style.top = `${top}px`;
        this.menu.style.left = `${left}px`;
        this.menu.style.zIndex = 'var(--z-index-dropdown, 1000)';
    }
    
    handleKeyboard(e) {
        if (!this.isVisible()) return;
        
        const items = this.menu.querySelectorAll('[data-dropdown-item]');
        const currentIndex = Array.from(items).findIndex(item => item === document.activeElement);
        
        switch (e.key) {
            case 'Escape':
                e.preventDefault();
                this.hide();
                this.trigger.focus();
                break;
                
            case 'ArrowDown':
                e.preventDefault();
                const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
                items[nextIndex]?.focus();
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
                items[prevIndex]?.focus();
                break;
                
            case 'Enter':
            case ' ':
                if (document.activeElement.matches('[data-dropdown-item]')) {
                    e.preventDefault();
                    document.activeElement.click();
                }
                break;
        }
    }
}

/**
 * Tab Component
 * Provides tab navigation functionality with keyboard support and ARIA attributes
 */
class Tabs extends BaseComponent {
    get defaultOptions() {
        return {
            activeClass: 'active',
            keyboard: true,
            orientation: 'horizontal'
        };
    }
    
    bindEvents() {
        this.tabList = this.element.querySelector('[role="tablist"]');
        this.tabs = this.element.querySelectorAll('[role="tab"]');
        this.panels = this.element.querySelectorAll('[role="tabpanel"]');
        
        if (!this.tabList || this.tabs.length === 0) return;
        
        // Tab click events
        this.tabs.forEach((tab, index) => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                this.activateTab(index);
            });
            
            // Set initial ARIA attributes
            tab.setAttribute('tabindex', index === 0 ? '0' : '-1');
        });
        
        // Keyboard navigation
        if (this.options.keyboard) {
            this.tabList.addEventListener('keydown', (e) => this.handleKeyboard(e));
        }
        
        // Initialize first tab
        this.activateTab(0);
    }
    
    activateTab(index) {
        const tab = this.tabs[index];
        const panel = this.panels[index];
        
        if (!tab || !panel) return;
        
        this.emit('tab:before', { index, tab, panel });
        
        // Update tabs
        this.tabs.forEach((t, i) => {
            const isActive = i === index;
            
            t.classList.toggle(this.options.activeClass, isActive);
            t.setAttribute('aria-selected', isActive.toString());
            t.setAttribute('tabindex', isActive ? '0' : '-1');
        });
        
        // Update panels
        this.panels.forEach((p, i) => {
            const isActive = i === index;
            
            p.classList.toggle(this.options.activeClass, isActive);
            p.hidden = !isActive;
        });
        
        this.emit('tab:after', { index, tab, panel });
    }
    
    handleKeyboard(e) {
        const currentIndex = Array.from(this.tabs).findIndex(tab => tab === document.activeElement);
        
        let nextIndex;
        
        if (this.options.orientation === 'horizontal') {
            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    nextIndex = currentIndex > 0 ? currentIndex - 1 : this.tabs.length - 1;
                    break;
                    
                case 'ArrowRight':
                    e.preventDefault();
                    nextIndex = currentIndex < this.tabs.length - 1 ? currentIndex + 1 : 0;
                    break;
            }
        } else {
            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    nextIndex = currentIndex > 0 ? currentIndex - 1 : this.tabs.length - 1;
                    break;
                    
                case 'ArrowDown':
                    e.preventDefault();
                    nextIndex = currentIndex < this.tabs.length - 1 ? currentIndex + 1 : 0;
                    break;
            }
        }
        
        if (nextIndex !== undefined) {
            this.tabs[nextIndex].focus();
            this.activateTab(nextIndex);
        }
        
        // Home and End keys
        switch (e.key) {
            case 'Home':
                e.preventDefault();
                this.tabs[0].focus();
                this.activateTab(0);
                break;
                
            case 'End':
                e.preventDefault();
                const lastIndex = this.tabs.length - 1;
                this.tabs[lastIndex].focus();
                this.activateTab(lastIndex);
                break;
        }
    }
    
    getActiveTab() {
        return Array.from(this.tabs).findIndex(tab => tab.classList.contains(this.options.activeClass));
    }
    
    goToTab(index) {
        if (index >= 0 && index < this.tabs.length) {
            this.activateTab(index);
            this.tabs[index].focus();
        }
    }
}

/**
 * Accordion Component
 * Provides collapsible content sections with smooth animations
 */
class Accordion extends BaseComponent {
    get defaultOptions() {
        return {
            multiple: false,
            duration: 300,
            easing: 'ease-in-out'
        };
    }
    
    bindEvents() {
        this.items = this.element.querySelectorAll('[data-accordion-item]');
        
        this.items.forEach((item, index) => {
            const trigger = item.querySelector('[data-accordion-trigger]');
            const content = item.querySelector('[data-accordion-content]');
            
            if (!trigger || !content) return;
            
            // Set initial ARIA attributes
            const id = `accordion-content-${Date.now()}-${index}`;
            content.id = id;
            trigger.setAttribute('aria-controls', id);
            trigger.setAttribute('aria-expanded', 'false');
            
            // Hide content initially
            content.style.height = '0';
            content.style.overflow = 'hidden';
            content.style.transition = `height ${this.options.duration}ms ${this.options.easing}`;
            
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleItem(item);
            });
        });
    }
    
    toggleItem(item) {
        const isExpanded = item.classList.contains('expanded');
        
        if (!this.options.multiple) {
            this.collapseAll();
        }
        
        if (isExpanded) {
            this.collapseItem(item);
        } else {
            this.expandItem(item);
        }
    }
    
    expandItem(item) {
        const trigger = item.querySelector('[data-accordion-trigger]');
        const content = item.querySelector('[data-accordion-content]');
        
        this.emit('expand:before', { item, trigger, content });
        
        // Get natural height
        content.style.height = 'auto';
        const height = content.scrollHeight;
        content.style.height = '0';
        
        // Trigger reflow and animate
        content.offsetHeight;
        content.style.height = `${height}px`;
        
        // Update states
        item.classList.add('expanded');
        trigger.setAttribute('aria-expanded', 'true');
        
        // Clean up after animation
        setTimeout(() => {
            content.style.height = 'auto';
            this.emit('expand:after', { item, trigger, content });
        }, this.options.duration);
    }
    
    collapseItem(item) {
        const trigger = item.querySelector('[data-accordion-trigger]');
        const content = item.querySelector('[data-accordion-content]');
        
        this.emit('collapse:before', { item, trigger, content });
        
        // Set explicit height first
        content.style.height = `${content.scrollHeight}px`;
        
        // Trigger reflow and animate
        content.offsetHeight;
        content.style.height = '0';
        
        // Update states
        item.classList.remove('expanded');
        trigger.setAttribute('aria-expanded', 'false');
        
        setTimeout(() => {
            this.emit('collapse:after', { item, trigger, content });
        }, this.options.duration);
    }
    
    collapseAll() {
        this.items.forEach(item => {
            if (item.classList.contains('expanded')) {
                this.collapseItem(item);
            }
        });
    }
    
    expandAll() {
        if (this.options.multiple) {
            this.items.forEach(item => {
                if (!item.classList.contains('expanded')) {
                    this.expandItem(item);
                }
            });
        }
    }
}

/**
 * Form Validation Component
 * Provides client-side form validation with custom rules and error display
 */
class FormValidator extends BaseComponent {
    get defaultOptions() {
        return {
            errorClass: 'has-error',
            errorMessageClass: 'error-message',
            validateOnBlur: true,
            validateOnInput: false,
            showErrorMessages: true
        };
    }
    
    constructor(form, options = {}) {
        super(form, options);
        this.rules = new Map();
        this.errors = new Map();
    }
    
    bindEvents() {
        this.element.addEventListener('submit', (e) => this.handleSubmit(e));
        
        if (this.options.validateOnBlur || this.options.validateOnInput) {
            const inputs = this.element.querySelectorAll('input, select, textarea');
            
            inputs.forEach(input => {
                if (this.options.validateOnBlur) {
                    input.addEventListener('blur', () => this.validateField(input));
                }
                
                if (this.options.validateOnInput) {
                    input.addEventListener('input', () => this.validateField(input));
                }
            });
        }
    }
    
    addRule(fieldName, validator, message) {
        if (!this.rules.has(fieldName)) {
            this.rules.set(fieldName, []);
        }
        
        this.rules.get(fieldName).push({
            validator: typeof validator === 'function' ? validator : this.getBuiltInValidator(validator),
            message
        });
        
        return this;
    }
    
    validateField(input) {
        const fieldName = input.name || input.id;
        if (!fieldName || !this.rules.has(fieldName)) return true;
        
        const value = input.value;
        const rules = this.rules.get(fieldName);
        
        // Clear previous errors
        this.clearFieldError(input);
        
        // Validate each rule
        for (const rule of rules) {
            if (!rule.validator(value, input)) {
                this.showFieldError(input, rule.message);
                return false;
            }
        }
        
        return true;
    }
    
    validateForm() {
        let isValid = true;
        const inputs = this.element.querySelectorAll('input, select, textarea');
        
        this.clearAllErrors();
        
        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });
        
        return isValid;
    }
    
    showFieldError(input, message) {
        const fieldName = input.name || input.id;
        
        // Add error class to field
        input.classList.add(this.options.errorClass);
        
        // Store error
        this.errors.set(fieldName, message);
        
        // Show error message
        if (this.options.showErrorMessages) {
            this.displayErrorMessage(input, message);
        }
        
        this.emit('field:error', { field: input, message });
    }
    
    clearFieldError(input) {
        const fieldName = input.name || input.id;
        
        // Remove error class
        input.classList.remove(this.options.errorClass);
        
        // Clear stored error
        this.errors.delete(fieldName);
        
        // Remove error message
        this.removeErrorMessage(input);
        
        this.emit('field:valid', { field: input });
    }
    
    clearAllErrors() {
        const inputs = this.element.querySelectorAll('input, select, textarea');
        inputs.forEach(input => this.clearFieldError(input));
    }
    
    displayErrorMessage(input, message) {
        this.removeErrorMessage(input);
        
        const errorElement = document.createElement('div');
        errorElement.className = this.options.errorMessageClass;
        errorElement.textContent = message;
        errorElement.style.cssText = `
            color: var(--color-error-600);
            font-size: 0.875rem;
            margin-top: 0.25rem;
        `;
        
        // Insert after input
        if (input.parentNode) {
            input.parentNode.insertBefore(errorElement, input.nextSibling);
        }
    }
    
    removeErrorMessage(input) {
        const errorElement = input.parentNode?.querySelector(`.${this.options.errorMessageClass}`);
        if (errorElement && errorElement.previousElementSibling === input) {
            errorElement.remove();
        }
    }
    
    getBuiltInValidator(type) {
        const validators = {
            required: (value) => value.trim().length > 0,
            email: (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
            min: (length) => (value) => value.length >= length,
            max: (length) => (value) => value.length <= length,
            pattern: (regex) => (value) => !value || regex.test(value),
            number: (value) => !value || !isNaN(Number(value)),
            url: (value) => !value || /^https?:\/\/.+/.test(value)
        };
        
        if (typeof type === 'string') {
            return validators[type] || (() => true);
        }
        
        return validators[type.type]?.(type.value) || (() => true);
    }
    
    handleSubmit(e) {
        if (!this.validateForm()) {
            e.preventDefault();
            this.emit('submit:invalid', { errors: this.errors });
            return false;
        }
        
        this.emit('submit:valid');
        return true;
    }
    
    getErrors() {
        return Object.fromEntries(this.errors);
    }
    
    hasErrors() {
        return this.errors.size > 0;
    }
}

/**
 * Component Factory
 * Provides a centralized way to initialize and manage components
 */
class ComponentFactory {
    constructor() {
        this.instances = new Map();
        this.autoInitSelectors = {
            '[data-modal]': Modal,
            '[data-dropdown]': Dropdown,
            '[data-tabs]': Tabs,
            '[data-accordion]': Accordion
        };
    }
    
    // Auto-initialize components on page load
    autoInit() {
        Object.entries(this.autoInitSelectors).forEach(([selector, ComponentClass]) => {
            document.querySelectorAll(selector).forEach(element => {
                if (!this.hasInstance(element)) {
                    this.create(ComponentClass, element);
                }
            });
        });
    }
    
    // Create component instance
    create(ComponentClass, element, options = {}) {
        const instance = new ComponentClass(element, options);
        this.instances.set(element, instance);
        return instance;
    }
    
    // Get component instance
    get(element) {
        return this.instances.get(element);
    }
    
    // Check if element has component instance
    hasInstance(element) {
        return this.instances.has(element);
    }
    
    // Destroy component instance
    destroy(element) {
        const instance = this.instances.get(element);
        if (instance) {
            instance.destroy();
            this.instances.delete(element);
        }
    }
    
    // Destroy all instances
    destroyAll() {
        this.instances.forEach((instance, element) => {
            this.destroy(element);
        });
    }
    
    // Get all instances of a component type
    getByType(ComponentClass) {
        return Array.from(this.instances.values()).filter(instance => instance instanceof ComponentClass);
    }
}

// Global component factory instance
const Components = new ComponentFactory();

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Components.autoInit());
} else {
    Components.autoInit();
}

// Export components
window.FantDevComponents = {
    BaseComponent,
    Modal,
    Toast,
    Dropdown,
    Tabs,
    Accordion,
    FormValidator,
    ComponentFactory,
    Components
};

// For module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.FantDevComponents;
}
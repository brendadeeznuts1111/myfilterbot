/**
 * FANTDEV TRADING SYSTEMS - BRANDING INJECTION SYSTEM
 * Version: 2.1.0-enhanced
 * Build: 2024.08.24.002
 * 
 * This script dynamically injects branding, versioning, and metadata
 * into web pages to ensure consistency across all interfaces.
 */

class FantdevBrandingSystem {
    constructor() {
        this.metadata = null;
        this.initialized = false;
        this.currentUrl = window.location.href;
        
        // Bind methods
        this.init = this.init.bind(this);
        this.loadMetadata = this.loadMetadata.bind(this);
        this.injectBranding = this.injectBranding.bind(this);
        this.updatePageMetadata = this.updatePageMetadata.bind(this);
        this.injectHeader = this.injectHeader.bind(this);
        this.injectFooter = this.injectFooter.bind(this);
        this.setupThemeToggle = this.setupThemeToggle.bind(this);
        
        // Auto-initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', this.init);
        } else {
            this.init();
        }
    }
    
    /**
     * Initialize the branding system
     */
    async init() {
        if (this.initialized) return;
        
        console.log('[Fantdev Branding] Initializing branding system...');
        
        try {
            await this.loadMetadata();
            this.updatePageMetadata();
            this.injectBranding();
            this.setupThemeToggle();
            
            this.initialized = true;
            console.log('[Fantdev Branding] Branding system initialized successfully');
            
            // Dispatch custom event
            window.dispatchEvent(new CustomEvent('fantdev:branding:ready', {
                detail: { metadata: this.metadata }
            }));
            
        } catch (error) {
            console.error('[Fantdev Branding] Failed to initialize branding system:', error);
        }
    }
    
    /**
     * Load metadata from the centralized source
     */
    async loadMetadata() {
        try {
            // Try to load from multiple possible paths
            const paths = [
                '/src/branding/core/metadata.json',
                '/branding/core/metadata.json',
                '/metadata.json'
            ];
            
            for (const path of paths) {
                try {
                    const response = await fetch(path);
                    if (response.ok) {
                        this.metadata = await response.json();
                        console.log(`[Fantdev Branding] Loaded metadata from ${path}`);
                        return;
                    }
                } catch (error) {
                    // Continue to next path
                    continue;
                }
            }
            
            // Fallback metadata if file loading fails
            console.warn('[Fantdev Branding] Could not load metadata file, using fallback');
            this.metadata = this.getFallbackMetadata();
            
        } catch (error) {
            console.error('[Fantdev Branding] Error loading metadata:', error);
            this.metadata = this.getFallbackMetadata();
        }
    }
    
    /**
     * Get fallback metadata when external file is not available
     */
    getFallbackMetadata() {
        return {
            system: {
                name: "Fantdev Trading Bot",
                version: "2.1.0-enhanced",
                build: "2024.08.24.002",
                environment: "development",
                api_version: "3.2.1"
            },
            company: {
                name: "Fantdev Trading Systems",
                display_name: "Fantdev Trading",
                tagline: "Advanced Payment & Trading Intelligence Platform"
            },
            branding: {
                logo_text: "Fantdev Trading",
                logo_icon: "fas fa-shield-alt",
                theme_color: "#667eea"
            },
            deployment: {
                server_urls: {
                            enhanced_portal: process.env.PORTAL_SERVER_URL || "http://localhost:5000",
        payment_api: process.env.PAYMENT_API_URL || "http://localhost:5001"
                }
            }
        };
    }
    
    /**
     * Update page metadata (title, meta tags, etc.)
     */
    updatePageMetadata() {
        const { system, company, branding } = this.metadata;
        
        // Update page title if it contains generic terms
        const title = document.title;
        if (title.includes('Admin Cashier Dashboard') || title.includes('Customer Portal')) {
            const module = title.includes('Cashier') ? 'Enhanced Cashier Dashboard' : 'Customer Portal';
            document.title = `${company.display_name} - ${module} v${system.version}`;
        }
        
        // Add or update meta tags
        this.updateMetaTag('name', 'version', system.version);
        this.updateMetaTag('name', 'build', system.build);
        this.updateMetaTag('name', 'environment', system.environment);
        this.updateMetaTag('name', 'author', company.name);
        this.updateMetaTag('name', 'system-version', `enhanced-v${system.version}`);
        this.updateMetaTag('name', 'theme-color', branding.theme_color);
        this.updateMetaTag('name', 'application-name', `${company.display_name} - Trading Platform`);
        
        // Update Open Graph tags
        this.updateMetaTag('property', 'og:title', `${company.display_name} - Trading Platform`);
        this.updateMetaTag('property', 'og:site_name', company.display_name);
        this.updateMetaTag('property', 'og:type', 'application');
        
        console.log('[Fantdev Branding] Page metadata updated');
    }
    
    /**
     * Helper method to update or create meta tags
     */
    updateMetaTag(attribute, name, content) {
        let meta = document.querySelector(`meta[${attribute}="${name}"]`);
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute(attribute, name);
            document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
    }
    
    /**
     * Inject branding elements into the page
     */
    injectBranding() {
        this.injectHeader();
        this.injectFooter();
        this.updateConnectionStatus();
        this.updateCurrentUrl();
        
        console.log('[Fantdev Branding] Branding elements injected');
    }
    
    /**
     * Inject or update header branding
     */
    injectHeader() {
        const { system, company, branding } = this.metadata;
        
        // Update header title if it exists
        const headerTitle = document.querySelector('.fantdev-header-title, .header-title');
        if (headerTitle) {
            const titleText = headerTitle.querySelector('span');
            if (titleText) {
                titleText.textContent = `${company.display_name} - Enhanced Dashboard`;
            }
        }
        
        // Update version badge
        const versionBadge = document.querySelector('.fantdev-version-badge, .version-badge');
        if (versionBadge) {
            versionBadge.textContent = `Enhanced v${system.version}`;
        }
        
        // Update build info
        const buildInfo = document.querySelector('.fantdev-build-badge, .build-info');
        if (buildInfo) {
            buildInfo.textContent = `Build ${system.build}`;
        }
        
        // Update environment badge
        const envBadge = document.querySelector('.fantdev-env-badge, .environment-badge');
        if (envBadge) {
            envBadge.textContent = system.environment.toUpperCase();
            envBadge.className = `fantdev-env-badge ${system.environment}`;
        }
        
        // Update system info
        const systemInfo = document.querySelector('.fantdev-system-info, .system-info span');
        if (systemInfo) {
            systemInfo.textContent = `Payment Gateway v${system.api_version}`;
        }
    }
    
    /**
     * Inject or update footer branding
     */
    injectFooter() {
        const { system, company, build_info, deployment } = this.metadata;
        
        let footer = document.querySelector('.fantdev-footer, .dashboard-footer');
        
        if (!footer) {
            // Create footer if it doesn't exist
            footer = this.createFooter();
            document.body.appendChild(footer);
        }
        
        // Update footer content
        const footerCompany = footer.querySelector('.footer-company');
        if (footerCompany) {
            footerCompany.textContent = company.name;
        }
        
        const buildNumber = footer.querySelector('.build-number');
        if (buildNumber) {
            buildNumber.textContent = system.build;
        }
        
        const buildTime = footer.querySelector('.build-time');
        if (buildTime) {
            buildTime.textContent = build_info?.build_time || '02:30:00Z';
        }
        
        const versionInfo = footer.querySelector('.version-info');
        if (versionInfo) {
            versionInfo.textContent = `Enhanced Cashier Dashboard v${system.version}`;
        }
        
        const environmentInfo = footer.querySelector('.environment-info');
        if (environmentInfo) {
            environmentInfo.textContent = `${system.environment.charAt(0).toUpperCase() + system.environment.slice(1)} Environment`;
        }
    }
    
    /**
     * Create footer element
     */
    createFooter() {
        const { system, company } = this.metadata;
        
        const footer = document.createElement('footer');
        footer.className = 'fantdev-footer';
        footer.setAttribute('role', 'contentinfo');
        
        footer.innerHTML = `
            <div class="fantdev-footer-content">
                <div class="fantdev-footer-section">
                    <div class="fantdev-footer-branding">
                        <i class="fas fa-shield-alt" aria-hidden="true"></i>
                        <span class="footer-company">${company.name}</span>
                    </div>
                    <div class="fantdev-footer-build">
                        <span class="build-label">Build:</span>
                        <span class="build-number">${system.build}</span>
                        <span class="build-time">02:30:00Z</span>
                    </div>
                </div>
                <div class="fantdev-footer-section">
                    <div class="fantdev-footer-access">
                        <span class="access-label">Access URL:</span>
                        <span class="access-url" id="currentUrl">${this.currentUrl}</span>
                    </div>
                    <div class="fantdev-footer-version">
                        <span class="version-info">Enhanced Dashboard v${system.version}</span>
                        <span class="environment-info">${system.environment.charAt(0).toUpperCase() + system.environment.slice(1)} Environment</span>
                    </div>
                </div>
            </div>
        `;
        
        return footer;
    }
    
    /**
     * Update connection status indicator
     */
    updateConnectionStatus() {
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            // Default to connecting state
            statusElement.className = 'connection-status status-connecting';
            statusElement.innerHTML = '<i class="fas fa-circle" aria-hidden="true"></i><span>Connecting...</span>';
            
            // Check actual connection status
            this.checkConnectionStatus().then(isConnected => {
                if (isConnected) {
                    statusElement.className = 'connection-status status-connected';
                    statusElement.innerHTML = '<i class="fas fa-circle" aria-hidden="true"></i><span>Connected</span>';
                } else {
                    statusElement.className = 'connection-status status-disconnected';
                    statusElement.innerHTML = '<i class="fas fa-circle" aria-hidden="true"></i><span>Disconnected</span>';
                }
            });
        }
    }
    
    /**
     * Check connection status to payment API
     */
    async checkConnectionStatus() {
        try {
            const { deployment } = this.metadata;
            const apiUrl = deployment?.server_urls?.payment_api || process.env.PAYMENT_API_URL || 'http://localhost:5001';
            const response = await fetch(`${apiUrl}/api/payment/health`, {
                method: 'GET',
                timeout: 5000
            });
            return response.ok;
        } catch (error) {
            console.warn('[Fantdev Branding] Connection check failed:', error);
            return false;
        }
    }
    
    /**
     * Update current URL in footer
     */
    updateCurrentUrl() {
        const urlElement = document.getElementById('currentUrl');
        if (urlElement) {
            urlElement.textContent = this.currentUrl;
        }
    }
    
    /**
     * Setup theme toggle functionality
     */
    setupThemeToggle() {
        // Check for saved theme preference
        const savedTheme = localStorage.getItem('fantdev-theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        // Look for theme toggle button
        const themeToggle = document.querySelector('[data-theme-toggle]');
        if (themeToggle) {
            themeToggle.addEventListener('click', this.toggleTheme.bind(this));
        }
        
        console.log(`[Fantdev Branding] Theme set to: ${savedTheme}`);
    }
    
    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('fantdev-theme', newTheme);
        
        console.log(`[Fantdev Branding] Theme switched to: ${newTheme}`);
        
        // Dispatch theme change event
        window.dispatchEvent(new CustomEvent('fantdev:theme:changed', {
            detail: { theme: newTheme }
        }));
    }
    
    /**
     * Get current system metadata
     */
    getMetadata() {
        return this.metadata;
    }
    
    /**
     * Update metadata dynamically
     */
    updateMetadata(newMetadata) {
        this.metadata = { ...this.metadata, ...newMetadata };
        this.updatePageMetadata();
        this.injectBranding();
    }
    
    /**
     * Refresh branding elements
     */
    refresh() {
        this.injectBranding();
    }
}

// Global instance
window.FantdevBranding = new FantdevBrandingSystem();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FantdevBrandingSystem;
}

console.log('[Fantdev Branding] Branding system loaded and ready');
/**
 * FANTDEV TRADING SYSTEMS - VERSION MANAGEMENT SYSTEM
 * Version: 2.1.0-enhanced
 * Build: 2024.08.24.002
 * 
 * Utilities for managing version information, build numbers, and deployment tracking
 */

class FantdevVersioning {
    constructor() {
        this.version = {
            major: 2,
            minor: 1,
            patch: 0,
            suffix: 'enhanced',
            build: '2024.08.24.002',
            commit: 'a1b2c3d4e5f6',
            branch: 'main',
            environment: 'development'
        };
        
        this.buildDate = new Date('2024-08-24T02:30:00Z');
        this.apiVersions = {
            payment_gateway: '3.2.1',
            customer_portal: '2.0.1',
            admin_portal: '2.0.0',
            cashier_dashboard: '2.1.0'
        };
    }
    
    /**
     * Get full version string
     */
    getFullVersion() {
        const { major, minor, patch, suffix } = this.version;
        return `${major}.${minor}.${patch}${suffix ? '-' + suffix : ''}`;
    }
    
    /**
     * Get semantic version (without suffix)
     */
    getSemanticVersion() {
        const { major, minor, patch } = this.version;
        return `${major}.${minor}.${patch}`;
    }
    
    /**
     * Get build information
     */
    getBuildInfo() {
        return {
            version: this.getFullVersion(),
            build: this.version.build,
            commit: this.version.commit,
            branch: this.version.branch,
            environment: this.version.environment,
            buildDate: this.buildDate.toISOString(),
            buildDateFormatted: this.formatBuildDate(),
            apiVersions: { ...this.apiVersions }
        };
    }
    
    /**
     * Format build date for display
     */
    formatBuildDate() {
        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'UTC'
        };
        return this.buildDate.toLocaleDateString('en-US', options) + ' UTC';
    }
    
    /**
     * Get environment-specific styling
     */
    getEnvironmentConfig() {
        const configs = {
            development: {
                color: '#ff9800',
                label: 'DEV',
                description: 'Development Environment',
                showDebugInfo: true
            },
            staging: {
                color: '#9c27b0',
                label: 'STAGING',
                description: 'Staging Environment',
                showDebugInfo: true
            },
            production: {
                color: '#4caf50',
                label: 'PROD',
                description: 'Production Environment',
                showDebugInfo: false
            }
        };
        
        return configs[this.version.environment] || configs.development;
    }
    
    /**
     * Check if current version is newer than given version
     */
    isNewerThan(otherVersion) {
        const [otherMajor, otherMinor, otherPatch] = otherVersion.split('.').map(Number);
        const { major, minor, patch } = this.version;
        
        if (major > otherMajor) return true;
        if (major < otherMajor) return false;
        
        if (minor > otherMinor) return true;
        if (minor < otherMinor) return false;
        
        return patch > otherPatch;
    }
    
    /**
     * Get feature flags based on version and environment
     */
    getFeatureFlags() {
        const baseFeatures = {
            enhanced_error_handling: true,
            real_time_updates: true,
            websocket_support: true,
            accessibility_features: true,
            mobile_responsive: true,
            dark_mode: true,
            export_functionality: true,
            advanced_charts: true
        };
        
        // Environment-specific features
        const envFeatures = {
            development: {
                debug_panel: true,
                mock_data: true,
                dev_tools: true,
                performance_monitoring: true
            },
            staging: {
                debug_panel: false,
                mock_data: false,
                dev_tools: false,
                performance_monitoring: true
            },
            production: {
                debug_panel: false,
                mock_data: false,
                dev_tools: false,
                performance_monitoring: false
            }
        };
        
        return {
            ...baseFeatures,
            ...envFeatures[this.version.environment]
        };
    }
    
    /**
     * Get compatibility information
     */
    getCompatibilityInfo() {
        return {
            minBrowserVersions: {
                chrome: '90',
                firefox: '88',
                safari: '14',
                edge: '90'
            },
            requiredFeatures: [
                'ES2018',
                'CSS Grid',
                'CSS Custom Properties',
                'Fetch API',
                'WebSocket',
                'Local Storage'
            ],
            supportedPlatforms: ['web', 'mobile-web'],
            apiCompatibility: {
                payment_gateway: '>=3.0.0',
                telegram_bot: '>=20.0',
                websocket: '>=4.5.0'
            }
        };
    }
    
    /**
     * Generate version banner for console
     */
    generateConsoleBanner() {
        const buildInfo = this.getBuildInfo();
        const envConfig = this.getEnvironmentConfig();
        
        const banner = `
╔══════════════════════════════════════════════════════════════╗
║                    FANTDEV TRADING SYSTEMS                  ║
║                  Enhanced Trading Platform                  ║
╠══════════════════════════════════════════════════════════════╣
║ Version: ${buildInfo.version.padEnd(48)} ║
║ Build: ${buildInfo.build.padEnd(50)} ║
║ Environment: ${envConfig.description.padEnd(42)} ║
║ Build Date: ${buildInfo.buildDateFormatted.padEnd(43)} ║
║ Commit: ${buildInfo.commit.padEnd(49)} ║
║ Branch: ${buildInfo.branch.padEnd(49)} ║
╠══════════════════════════════════════════════════════════════╣
║ API Versions:                                                ║
║ • Payment Gateway: v${buildInfo.apiVersions.payment_gateway.padEnd(37)} ║
║ • Customer Portal: v${buildInfo.apiVersions.customer_portal.padEnd(37)} ║
║ • Admin Portal: v${buildInfo.apiVersions.admin_portal.padEnd(40)} ║
║ • Cashier Dashboard: v${buildInfo.apiVersions.cashier_dashboard.padEnd(35)} ║
╚══════════════════════════════════════════════════════════════╝
        `;
        
        return banner;
    }
    
    /**
     * Log version information to console
     */
    logVersionInfo() {
        const banner = this.generateConsoleBanner();
        const envConfig = this.getEnvironmentConfig();
        
        console.log(banner);
        console.log(`%c[${envConfig.label}] System Initialized`, 
                   `color: ${envConfig.color}; font-weight: bold;`);
        
        if (envConfig.showDebugInfo) {
            console.log('Debug Information:', this.getBuildInfo());
            console.log('Feature Flags:', this.getFeatureFlags());
        }
    }
    
    /**
     * Check for version updates (if update checking is enabled)
     */
    async checkForUpdates() {
        try {
            // This would typically check against a remote endpoint
            // For now, just return current version info
            return {
                hasUpdate: false,
                currentVersion: this.getFullVersion(),
                latestVersion: this.getFullVersion(),
                updateAvailable: false,
                releaseNotes: []
            };
        } catch (error) {
            console.warn('[Fantdev Versioning] Update check failed:', error);
            return null;
        }
    }
    
    /**
     * Get system health information
     */
    getSystemHealth() {
        const uptime = Date.now() - this.buildDate.getTime();
        const buildInfo = this.getBuildInfo();
        
        return {
            status: 'healthy',
            version: buildInfo.version,
            build: buildInfo.build,
            environment: buildInfo.environment,
            uptime: uptime,
            uptimeFormatted: this.formatUptime(uptime),
            features: this.getFeatureFlags(),
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * Format uptime for display
     */
    formatUptime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return `${days}d ${hours % 24}h ${minutes % 60}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }
    
    /**
     * Export version data for external use
     */
    exportVersionData() {
        return {
            system: {
                name: "Fantdev Trading Bot",
                version: this.getFullVersion(),
                build: this.version.build,
                environment: this.version.environment,
                api_version: this.apiVersions.payment_gateway
            },
            build_info: this.getBuildInfo(),
            feature_flags: this.getFeatureFlags(),
            compatibility: this.getCompatibilityInfo(),
            health: this.getSystemHealth()
        };
    }
}

// Global instance
window.FantdevVersioning = new FantdevVersioning();

// Auto-log version information in development
if (window.FantdevVersioning.version.environment === 'development') {
    window.FantdevVersioning.logVersionInfo();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FantdevVersioning;
}

console.log('[Fantdev Versioning] Version management system loaded');
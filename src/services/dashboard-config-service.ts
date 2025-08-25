/**
 * Dashboard Configuration Service
 * Leverages Bun's native YAML support for configuration management
 */

import { watch } from 'fs';
import { EventEmitter } from 'events';

// Import YAML configs using Bun's native support
import appConfig from '../../config/app.yaml';
import featuresConfig from '../../config/features.yaml';
import servicesConfig from '../../config/services.yaml';
import telegramConfig from '../../config/telegram.yaml';
import databaseConfig from '../../config/database.yaml';

interface ConfigFile {
  name: string;
  path: string;
  content: any;
}

interface HotReloadStatus {
  active: boolean;
  filesWatching: number;
  configChanges: number;
  lastReload: Date | null;
}

class DashboardConfigService extends EventEmitter {
  private configs: Map<string, ConfigFile> = new Map();
  private watchers: Map<string, any> = new Map();
  private hotReloadStatus: HotReloadStatus = {
    active: false,
    filesWatching: 0,
    configChanges: 0,
    lastReload: null
  };
  
  constructor() {
    super();
    this.initializeConfigs();
  }

  private initializeConfigs() {
    // Initialize configuration files
    const configFiles: ConfigFile[] = [
      { name: 'app', path: './config/app.yaml', content: appConfig },
      { name: 'features', path: './config/features.yaml', content: featuresConfig },
      { name: 'services', path: './config/services.yaml', content: servicesConfig },
      { name: 'telegram', path: './config/telegram.yaml', content: telegramConfig },
      { name: 'database', path: './config/database.yaml', content: databaseConfig }
    ];

    configFiles.forEach(config => {
      this.configs.set(config.name, config);
    });
  }

  /**
   * Get all configuration files
   */
  getAllConfigs(): Record<string, any> {
    const result: Record<string, any> = {};
    this.configs.forEach((config, name) => {
      result[name] = config.content;
    });
    return result;
  }

  /**
   * Get specific configuration file
   */
  getConfig(name: string): any {
    const config = this.configs.get(name);
    return config ? config.content : null;
  }

  /**
   * Get configuration as YAML string
   */
  async getConfigYaml(name: string): Promise<string> {
    const configPath = `./config/${name}.yaml`;
    try {
      const file = Bun.file(configPath);
      return await file.text();
    } catch (error) {
      console.error(`Failed to read ${name}.yaml:`, error);
      throw error;
    }
  }

  /**
   * Update configuration from YAML string
   */
  async updateConfigFromYaml(name: string, yamlContent: string): Promise<boolean> {
    try {
      // Parse YAML using Bun's native parser
      const parsed = Bun.YAML.parse(yamlContent);
      
      // Validate the parsed content
      if (!this.validateConfig(name, parsed)) {
        throw new Error('Invalid configuration structure');
      }

      // Write to file
      const configPath = `./config/${name}.yaml`;
      await Bun.write(configPath, yamlContent);

      // Update in-memory config
      const config = this.configs.get(name);
      if (config) {
        config.content = parsed;
        this.configs.set(name, config);
      }

      // Emit change event
      this.emit('config:changed', { file: name, content: parsed });
      
      // Update hot-reload status
      this.hotReloadStatus.configChanges++;
      this.hotReloadStatus.lastReload = new Date();

      return true;
    } catch (error) {
      console.error(`Failed to update ${name}.yaml:`, error);
      throw error;
    }
  }

  /**
   * Validate configuration structure
   */
  private validateConfig(name: string, config: any): boolean {
    switch (name) {
      case 'app':
        return config.app && config.server && config.database;
      case 'features':
        return config.features !== undefined;
      case 'services':
        return config.services !== undefined;
      case 'telegram':
        return config.telegram !== undefined;
      case 'database':
        return config.database || config.primary;
      default:
        return true;
    }
  }

  /**
   * Watch configuration files for changes (hot-reload)
   */
  startWatching() {
    if (this.hotReloadStatus.active) {
      console.log('Already watching configuration files');
      return;
    }

    this.configs.forEach((config, name) => {
      const configPath = `./config/${name}.yaml`;
      
      try {
        const watcher = watch(configPath, async (event, filename) => {
          if (event === 'change') {
            console.log(`Configuration file changed: ${filename}`);
            
            try {
              // Re-import the configuration using dynamic import
              const newConfig = await import(`../../config/${name}.yaml`);
              
              // Update in-memory config
              config.content = newConfig.default || newConfig;
              this.configs.set(name, config);
              
              // Emit change event
              this.emit('config:changed', { file: name, content: config.content });
              this.emit('hotreload:triggered', { file: name });
              
              // Update status
              this.hotReloadStatus.configChanges++;
              this.hotReloadStatus.lastReload = new Date();
              
              console.log(`Hot-reloaded: ${name}.yaml`);
            } catch (error) {
              console.error(`Failed to hot-reload ${name}.yaml:`, error);
            }
          }
        });

        this.watchers.set(name, watcher);
      } catch (error) {
        console.error(`Failed to watch ${configPath}:`, error);
      }
    });

    this.hotReloadStatus.active = true;
    this.hotReloadStatus.filesWatching = this.watchers.size;
    console.log(`Watching ${this.watchers.size} configuration files for changes`);
  }

  /**
   * Stop watching configuration files
   */
  stopWatching() {
    this.watchers.forEach((watcher, name) => {
      watcher.close();
      console.log(`Stopped watching ${name}.yaml`);
    });
    
    this.watchers.clear();
    this.hotReloadStatus.active = false;
    this.hotReloadStatus.filesWatching = 0;
  }

  /**
   * Get hot-reload status
   */
  getHotReloadStatus(): HotReloadStatus {
    return this.hotReloadStatus;
  }

  /**
   * Get all feature flags
   */
  getFeatureFlags(): Record<string, any> {
    const features = this.getConfig('features');
    return features?.features || {};
  }

  /**
   * Toggle a feature flag
   */
  async toggleFeatureFlag(featureName: string): Promise<boolean> {
    try {
      const features = this.getConfig('features');
      if (!features?.features?.[featureName]) {
        throw new Error(`Feature ${featureName} not found`);
      }

      // Toggle the enabled state
      features.features[featureName].enabled = !features.features[featureName].enabled;

      // Convert to YAML and save
      const yamlContent = Bun.YAML.stringify(features);
      await this.updateConfigFromYaml('features', yamlContent);

      // Emit feature toggle event
      this.emit('feature:toggled', { 
        feature: featureName, 
        enabled: features.features[featureName].enabled 
      });

      return features.features[featureName].enabled;
    } catch (error) {
      console.error(`Failed to toggle feature ${featureName}:`, error);
      throw error;
    }
  }

  /**
   * Validate YAML syntax
   */
  validateYaml(yamlContent: string): { valid: boolean; error?: string } {
    try {
      Bun.YAML.parse(yamlContent);
      return { valid: true };
    } catch (error: any) {
      return { 
        valid: false, 
        error: error.message || 'Invalid YAML syntax' 
      };
    }
  }

  /**
   * Export configuration as JSON
   */
  exportConfigAsJson(name: string): string {
    const config = this.getConfig(name);
    if (!config) {
      throw new Error(`Configuration ${name} not found`);
    }
    return JSON.stringify(config, null, 2);
  }

  /**
   * Get environment-specific configuration
   */
  getEnvironmentConfig(environment: string = 'development'): any {
    const appConfig = this.getConfig('app');
    const envConfig = appConfig?.environments?.[environment];
    
    if (!envConfig) {
      console.warn(`No configuration found for environment: ${environment}`);
      return appConfig;
    }

    // Merge base config with environment-specific overrides
    return this.deepMerge(appConfig, envConfig);
  }

  /**
   * Deep merge configuration objects
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  /**
   * Get system version information
   */
  getVersionInfo(): { app: string; bun: string; node?: string } {
    const appConfig = this.getConfig('app');
    return {
      app: appConfig?.app?.version || '3.0.0',
      bun: Bun.version,
      node: process.version
    };
  }

  /**
   * Handle multi-document YAML files
   */
  async parseMultiDocumentYaml(yamlContent: string): Promise<any[]> {
    try {
      // Bun.YAML.parse automatically handles multi-document YAML
      const documents = Bun.YAML.parse(yamlContent);
      
      // If it's an array, it was a multi-document YAML
      if (Array.isArray(documents)) {
        return documents;
      }
      
      // Single document
      return [documents];
    } catch (error) {
      console.error('Failed to parse multi-document YAML:', error);
      throw error;
    }
  }
}

// Create singleton instance
export const dashboardConfigService = new DashboardConfigService();

// Start watching if in development mode with hot-reload
if (process.env.NODE_ENV === 'development' && Bun.env.HOT_RELOAD !== 'false') {
  dashboardConfigService.startWatching();
}
import { serve } from 'bun';
import { watch } from 'fs/promises';
import { EventEmitter } from 'events';
import path from 'path';
import YAML from 'yaml';

interface ConfigSchema {
  id: string;
  name: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  data: Record<string, any>;
  metadata: {
    created: Date;
    updated: Date;
    author?: string;
    description?: string;
  };
  validation?: {
    schema?: Record<string, any>;
    rules?: Array<(config: any) => boolean | string>;
  };
}

interface ConfigWatcher {
  path: string;
  callback: (event: string, filename: string) => void;
  controller?: AbortController;
}

class ConfigurationManager extends EventEmitter {
  private configs: Map<string, ConfigSchema> = new Map();
  private watchers: Map<string, ConfigWatcher> = new Map();
  private sseClients: Set<Response> = new Set();
  private configDir: string;
  private cacheDir: string;
  private isDevelopment: boolean;

  constructor(configDir: string = './config', cacheDir: string = './cache') {
    super();
    this.configDir = path.resolve(configDir);
    this.cacheDir = path.resolve(cacheDir);
    this.isDevelopment = process.env.NODE_ENV !== 'production';
    this.initialize();
  }

  private async initialize() {
    try {
      // Ensure directories exist
      await Bun.write(path.join(this.configDir, '.gitkeep'), '');
      await Bun.write(path.join(this.cacheDir, '.gitkeep'), '');
      
      // Load existing configs
      await this.loadConfigs();
      
      // Start file watching in development
      if (this.isDevelopment) {
        await this.startWatching();
      }
      
      console.log(`[ConfigManager] Initialized with ${this.configs.size} configurations`);
    } catch (error) {
      console.error('[ConfigManager] Initialization failed:', error);
    }
  }

  private async loadConfigs() {
    try {
      const files = await Array.fromAsync(
        new Bun.Glob('**/*.{yaml,yml}').scan(this.configDir)
      );

      for (const file of files) {
        await this.loadConfig(path.join(this.configDir, file));
      }
    } catch (error) {
      console.error('[ConfigManager] Failed to load configs:', error);
    }
  }

  private async loadConfig(filePath: string): Promise<ConfigSchema | null> {
    try {
      const content = await Bun.file(filePath).text();
      const data = YAML.parse(content);
      
      const configId = path.basename(filePath, path.extname(filePath));
      const config: ConfigSchema = {
        id: configId,
        name: data.name || configId,
        version: data.version || '1.0.0',
        environment: data.environment || 'development',
        data: data,
        metadata: {
          created: data.metadata?.created || new Date(),
          updated: new Date(),
          author: data.metadata?.author,
          description: data.metadata?.description
        },
        validation: data.validation
      };

      // Validate config if rules exist
      if (config.validation?.rules) {
        const errors = this.validateConfig(config);
        if (errors.length > 0) {
          console.error(`[ConfigManager] Validation failed for ${configId}:`, errors);
          return null;
        }
      }

      this.configs.set(configId, config);
      this.emit('config:loaded', config);
      this.broadcastUpdate('config:loaded', config);
      
      console.log(`[ConfigManager] Loaded config: ${configId}`);
      return config;
    } catch (error) {
      console.error(`[ConfigManager] Failed to load ${filePath}:`, error);
      return null;
    }
  }

  private validateConfig(config: ConfigSchema): string[] {
    const errors: string[] = [];
    
    if (!config.validation?.rules) return errors;

    for (const rule of config.validation.rules) {
      const result = rule(config.data);
      if (typeof result === 'string') {
        errors.push(result);
      } else if (!result) {
        errors.push('Validation failed');
      }
    }

    return errors;
  }

  private async startWatching() {
    try {
      const controller = new AbortController();
      const watcher = watch(this.configDir, { 
        recursive: true, 
        signal: controller.signal 
      });

      (async () => {
        for await (const event of watcher) {
          await this.handleFileChange(event);
        }
      })();

      this.watchers.set(this.configDir, {
        path: this.configDir,
        callback: this.handleFileChange.bind(this),
        controller
      });

      console.log(`[ConfigManager] Watching for changes in ${this.configDir}`);
    } catch (error) {
      console.error('[ConfigManager] Failed to start watching:', error);
    }
  }

  private async handleFileChange(event: any) {
    const { eventType, filename } = event;
    
    if (!filename?.endsWith('.yaml') && !filename?.endsWith('.yml')) return;

    const filePath = path.join(this.configDir, filename);
    const configId = path.basename(filename, path.extname(filename));

    console.log(`[ConfigManager] File ${eventType}: ${filename}`);

    switch (eventType) {
      case 'change':
      case 'rename':
        await this.loadConfig(filePath);
        break;
      case 'delete':
        this.configs.delete(configId);
        this.emit('config:deleted', configId);
        this.broadcastUpdate('config:deleted', { id: configId });
        break;
    }
  }

  private broadcastUpdate(event: string, data: any) {
    const message = `data: ${JSON.stringify({ event, data, timestamp: Date.now() })}\n\n`;
    
    for (const client of this.sseClients) {
      try {
        (client as any).write(message);
      } catch (error) {
        // Client disconnected, remove from set
        this.sseClients.delete(client);
      }
    }
  }

  // Public API methods
  public getConfig(id: string): ConfigSchema | undefined {
    return this.configs.get(id);
  }

  public getAllConfigs(): ConfigSchema[] {
    return Array.from(this.configs.values());
  }

  public async createConfig(id: string, data: any): Promise<ConfigSchema> {
    const config: ConfigSchema = {
      id,
      name: data.name || id,
      version: data.version || '1.0.0',
      environment: data.environment || 'development',
      data,
      metadata: {
        created: new Date(),
        updated: new Date(),
        author: data.author,
        description: data.description
      }
    };

    // Save to file
    const filePath = path.join(this.configDir, `${id}.yaml`);
    await Bun.write(filePath, YAML.stringify(data, null, 2));

    this.configs.set(id, config);
    this.emit('config:created', config);
    this.broadcastUpdate('config:created', config);

    return config;
  }

  public async updateConfig(id: string, data: any): Promise<ConfigSchema | null> {
    const existing = this.configs.get(id);
    if (!existing) return null;

    const updated: ConfigSchema = {
      ...existing,
      data: { ...existing.data, ...data },
      metadata: {
        ...existing.metadata,
        updated: new Date()
      }
    };

    // Save to file
    const filePath = path.join(this.configDir, `${id}.yaml`);
    await Bun.write(filePath, YAML.stringify(updated.data, null, 2));

    this.configs.set(id, updated);
    this.emit('config:updated', updated);
    this.broadcastUpdate('config:updated', updated);

    return updated;
  }

  public async deleteConfig(id: string): Promise<boolean> {
    const config = this.configs.get(id);
    if (!config) return false;

    // Delete file
    const filePath = path.join(this.configDir, `${id}.yaml`);
    await Bun.write(filePath, ''); // Clear file first
    await Bun.spawn(['rm', filePath]).exited; // Then remove

    this.configs.delete(id);
    this.emit('config:deleted', id);
    this.broadcastUpdate('config:deleted', { id });

    return true;
  }

  public addSSEClient(response: Response) {
    this.sseClients.add(response);
    
    // Send initial data
    const message = `data: ${JSON.stringify({
      event: 'connected',
      configs: Array.from(this.configs.values()),
      timestamp: Date.now()
    })}\n\n`;
    
    (response as any).write(message);
  }

  public removeSSEClient(response: Response) {
    this.sseClients.delete(response);
  }

  public async exportConfig(id: string, format: 'yaml' | 'json' = 'yaml'): Promise<string | null> {
    const config = this.configs.get(id);
    if (!config) return null;

    if (format === 'json') {
      return JSON.stringify(config.data, null, 2);
    }
    
    return YAML.stringify(config.data, null, 2);
  }

  public async importConfig(id: string, content: string, format: 'yaml' | 'json' = 'yaml'): Promise<ConfigSchema | null> {
    try {
      const data = format === 'json' ? JSON.parse(content) : YAML.parse(content);
      return await this.createConfig(id, data);
    } catch (error) {
      console.error(`[ConfigManager] Failed to import config:`, error);
      return null;
    }
  }

  public async backup(): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(this.cacheDir, 'backups', timestamp);
    
    await Bun.write(path.join(backupDir, '.gitkeep'), '');
    
    for (const [id, config] of this.configs) {
      const content = YAML.stringify(config.data, null, 2);
      await Bun.write(path.join(backupDir, `${id}.yaml`), content);
    }
    
    console.log(`[ConfigManager] Backup created: ${backupDir}`);
  }

  public getMetrics() {
    return {
      totalConfigs: this.configs.size,
      connectedClients: this.sseClients.size,
      watchers: this.watchers.size,
      environment: this.isDevelopment ? 'development' : 'production',
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
  }
}

// Create server with REST API and SSE endpoints
const configManager = new ConfigurationManager();

const server = serve({
  port: process.env.CONFIG_PORT || 3456,
  
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    // Handle preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Server-Sent Events endpoint
    if (pathname === '/api/config/stream') {
      return new Response(
        new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();
            const response = {
              write: (data: string) => controller.enqueue(encoder.encode(data))
            };
            
            configManager.addSSEClient(response as any);
            
            // Heartbeat to keep connection alive
            const heartbeat = setInterval(() => {
              try {
                controller.enqueue(encoder.encode(':heartbeat\n\n'));
              } catch {
                clearInterval(heartbeat);
                configManager.removeSSEClient(response as any);
              }
            }, 30000);
          }
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          }
        }
      );
    }

    // REST API endpoints
    try {
      // Get all configs
      if (pathname === '/api/config' && req.method === 'GET') {
        const configs = configManager.getAllConfigs();
        return Response.json({ success: true, data: configs }, { headers: corsHeaders });
      }

      // Get specific config
      const configMatch = pathname.match(/^\/api\/config\/([^\/]+)$/);
      if (configMatch && req.method === 'GET') {
        const config = configManager.getConfig(configMatch[1]);
        if (config) {
          return Response.json({ success: true, data: config }, { headers: corsHeaders });
        }
        return Response.json({ success: false, error: 'Config not found' }, { status: 404, headers: corsHeaders });
      }

      // Create config
      if (pathname === '/api/config' && req.method === 'POST') {
        const body = await req.json();
        const config = await configManager.createConfig(body.id, body.data);
        return Response.json({ success: true, data: config }, { status: 201, headers: corsHeaders });
      }

      // Update config
      if (configMatch && req.method === 'PUT') {
        const body = await req.json();
        const config = await configManager.updateConfig(configMatch[1], body);
        if (config) {
          return Response.json({ success: true, data: config }, { headers: corsHeaders });
        }
        return Response.json({ success: false, error: 'Config not found' }, { status: 404, headers: corsHeaders });
      }

      // Delete config
      if (configMatch && req.method === 'DELETE') {
        const success = await configManager.deleteConfig(configMatch[1]);
        if (success) {
          return Response.json({ success: true }, { headers: corsHeaders });
        }
        return Response.json({ success: false, error: 'Config not found' }, { status: 404, headers: corsHeaders });
      }

      // Export config
      if (pathname.match(/^\/api\/config\/([^\/]+)\/export$/) && req.method === 'GET') {
        const id = pathname.split('/')[3];
        const format = url.searchParams.get('format') as 'yaml' | 'json' || 'yaml';
        const content = await configManager.exportConfig(id, format);
        
        if (content) {
          return new Response(content, {
            headers: {
              ...corsHeaders,
              'Content-Type': format === 'json' ? 'application/json' : 'text/yaml',
              'Content-Disposition': `attachment; filename="${id}.${format === 'json' ? 'json' : 'yaml'}"`
            }
          });
        }
        return Response.json({ success: false, error: 'Config not found' }, { status: 404, headers: corsHeaders });
      }

      // Import config
      if (pathname === '/api/config/import' && req.method === 'POST') {
        const body = await req.json();
        const config = await configManager.importConfig(body.id, body.content, body.format);
        if (config) {
          return Response.json({ success: true, data: config }, { status: 201, headers: corsHeaders });
        }
        return Response.json({ success: false, error: 'Import failed' }, { status: 400, headers: corsHeaders });
      }

      // Backup configs
      if (pathname === '/api/config/backup' && req.method === 'POST') {
        await configManager.backup();
        return Response.json({ success: true, message: 'Backup created' }, { headers: corsHeaders });
      }

      // Get metrics
      if (pathname === '/api/metrics' && req.method === 'GET') {
        const metrics = configManager.getMetrics();
        return Response.json({ success: true, data: metrics }, { headers: corsHeaders });
      }

      // Serve dashboard
      if (pathname === '/' || pathname === '/dashboard') {
        return new Response(await Bun.file(path.join(import.meta.dir, '../../public/config-dashboard.html')).text(), {
          headers: {
            'Content-Type': 'text/html'
          }
        });
      }

      return Response.json({ success: false, error: 'Not found' }, { status: 404, headers: corsHeaders });

    } catch (error: any) {
      console.error('[ConfigManager] Request error:', error);
      return Response.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders });
    }
  }
});

console.log(`[ConfigManager] Server running on http://localhost:${server.port}`);
console.log(`[ConfigManager] Dashboard: http://localhost:${server.port}/dashboard`);
console.log(`[ConfigManager] SSE Stream: http://localhost:${server.port}/api/config/stream`);

export default configManager;
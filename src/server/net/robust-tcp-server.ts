/**
 * Robust TCP Server with improved error handling
 * Bun v1.2.18 improvements:
 * - net.Server handles promise rejections in connection listeners
 * - net.connect validates options.host properly
 * - ERR_INVALID_IP_ADDRESS for invalid lookup results
 */

import net from 'node:net';
import { EventEmitter } from 'node:events';

interface ClientInfo {
  id: string;
  address: string;
  port: number;
  connectedAt: Date;
  lastActivity: Date;
  bytesReceived: number;
  bytesSent: number;
}

export class RobustTCPServer extends EventEmitter {
  private server: net.Server;
  private clients = new Map<string, net.Socket>();
  private clientInfo = new Map<string, ClientInfo>();
  private metrics = {
    totalConnections: 0,
    activeConnections: 0,
    totalBytesReceived: 0,
    totalBytesSent: 0,
    errors: 0,
    rejectedConnections: 0
  };

  constructor(private port: number = 3005) {
    super();
    this.server = this.createServer();
  }

  private createServer(): net.Server {
    const server = net.createServer({
      // Enable keep-alive with proper options (Bun v1.2.18 fix)
      keepAlive: true,
      keepAliveInitialDelay: 10000, // 10 seconds
      noDelay: true, // Disable Nagle's algorithm for low latency
      allowHalfOpen: false
    });

    // Bun v1.2.18: Server now properly handles promise rejections
    server.on('connection', async (socket) => {
      try {
        await this.handleConnection(socket);
      } catch (error) {
        // Promise rejection is now properly caught
        console.error('Connection handler error:', error);
        this.metrics.errors++;
        socket.destroy();
      }
    });

    server.on('error', (error) => {
      console.error('Server error:', error);
      this.metrics.errors++;
      this.emit('serverError', error);
    });

    server.on('listening', () => {
      const address = server.address();
      console.log(`🚀 TCP Server listening on port ${
        typeof address === 'object' ? address?.port : this.port
      }`);
      this.emit('listening', address);
    });

    return server;
  }

  /**
   * Handle new connections with proper async error handling
   * Bun v1.2.18: Promise rejections are now properly caught
   */
  private async handleConnection(socket: net.Socket): Promise<void> {
    const clientId = crypto.randomUUID();
    const clientAddr = `${socket.remoteAddress}:${socket.remotePort}`;
    
    // Validate connection
    if (!socket.remoteAddress) {
      throw new Error('Invalid client address');
    }

    // Store client info
    const info: ClientInfo = {
      id: clientId,
      address: socket.remoteAddress,
      port: socket.remotePort || 0,
      connectedAt: new Date(),
      lastActivity: new Date(),
      bytesReceived: 0,
      bytesSent: 0
    };

    this.clients.set(clientId, socket);
    this.clientInfo.set(clientId, info);
    this.metrics.totalConnections++;
    this.metrics.activeConnections++;

    console.log(`✅ Client connected: ${clientAddr} (${clientId})`);
    this.emit('clientConnected', { clientId, info });

    // Set up socket options
    socket.setKeepAlive(true, 10000);
    socket.setNoDelay(true);
    socket.setTimeout(60000); // 60 second timeout

    // Handle socket events
    socket.on('data', (data) => {
      this.handleData(clientId, data);
    });

    socket.on('error', (error) => {
      this.handleSocketError(clientId, error);
    });

    socket.on('timeout', () => {
      console.log(`⏱️ Client timeout: ${clientId}`);
      socket.end();
    });

    socket.on('close', () => {
      this.handleDisconnection(clientId);
    });

    // Send welcome message
    await this.sendToClient(clientId, {
      type: 'welcome',
      clientId,
      timestamp: Date.now()
    });
  }

  private handleData(clientId: string, data: Buffer) {
    const info = this.clientInfo.get(clientId);
    if (!info) return;

    info.lastActivity = new Date();
    info.bytesReceived += data.length;
    this.metrics.totalBytesReceived += data.length;

    try {
      // Parse incoming data (assuming JSON protocol)
      const message = JSON.parse(data.toString());
      this.emit('message', { clientId, message });

      // Echo back with acknowledgment
      this.sendToClient(clientId, {
        type: 'ack',
        originalMessage: message,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error(`Failed to parse data from ${clientId}:`, error);
      this.sendToClient(clientId, {
        type: 'error',
        error: 'Invalid message format'
      });
    }
  }

  private handleSocketError(clientId: string, error: Error) {
    console.error(`Socket error for ${clientId}:`, error);
    this.metrics.errors++;
    this.emit('clientError', { clientId, error });
    
    // Clean up on error
    this.removeClient(clientId);
  }

  private handleDisconnection(clientId: string) {
    const info = this.clientInfo.get(clientId);
    if (info) {
      const duration = Date.now() - info.connectedAt.getTime();
      console.log(`❌ Client disconnected: ${clientId} (duration: ${duration}ms)`);
      this.emit('clientDisconnected', { clientId, info, duration });
    }
    
    this.removeClient(clientId);
  }

  private removeClient(clientId: string) {
    const socket = this.clients.get(clientId);
    if (socket) {
      socket.destroy();
      this.clients.delete(clientId);
      this.clientInfo.delete(clientId);
      this.metrics.activeConnections--;
    }
  }

  /**
   * Send data to a specific client
   */
  async sendToClient(clientId: string, data: any): Promise<boolean> {
    const socket = this.clients.get(clientId);
    const info = this.clientInfo.get(clientId);
    
    if (!socket || !info) {
      return false;
    }

    return new Promise((resolve) => {
      const message = JSON.stringify(data) + '\n';
      const bytes = Buffer.byteLength(message);
      
      socket.write(message, (error) => {
        if (error) {
          console.error(`Failed to send to ${clientId}:`, error);
          resolve(false);
        } else {
          info.bytesSent += bytes;
          this.metrics.totalBytesSent += bytes;
          resolve(true);
        }
      });
    });
  }

  /**
   * Broadcast to all connected clients
   */
  async broadcast(data: any, excludeId?: string): Promise<number> {
    let sent = 0;
    const promises = [];

    for (const [clientId, _] of this.clients) {
      if (clientId === excludeId) continue;
      
      promises.push(
        this.sendToClient(clientId, data).then(success => {
          if (success) sent++;
        })
      );
    }

    await Promise.all(promises);
    return sent;
  }

  /**
   * Start the server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, () => {
        resolve();
      });

      this.server.once('error', reject);
    });
  }

  /**
   * Stop the server gracefully
   */
  async stop(): Promise<void> {
    // Notify all clients
    await this.broadcast({
      type: 'server_shutdown',
      timestamp: Date.now()
    });

    // Close all client connections
    for (const [clientId, socket] of this.clients) {
      socket.end();
      this.removeClient(clientId);
    }

    // Close the server
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('TCP Server stopped');
        resolve();
      });
    });
  }

  /**
   * Get server metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      uptime: process.uptime(),
      clients: Array.from(this.clientInfo.values()).map(info => ({
        id: info.id,
        address: info.address,
        port: info.port,
        connectedAt: info.connectedAt,
        lastActivity: info.lastActivity,
        bytesReceived: info.bytesReceived,
        bytesSent: info.bytesSent,
        connectionDuration: Date.now() - info.connectedAt.getTime()
      }))
    };
  }
}

/**
 * Create a TCP client with proper error handling
 * Demonstrates Bun v1.2.18 improvements
 */
export class RobustTCPClient {
  private socket?: net.Socket;
  private connected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(
    private host: string,
    private port: number,
    private options: {
      customLookup?: (hostname: string, options: any, callback: Function) => void;
      autoReconnect?: boolean;
    } = {}
  ) {}

  /**
   * Connect to server with proper validation
   * Bun v1.2.18: Validates host and handles ERR_INVALID_IP_ADDRESS
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const connectOptions: net.NetConnectOpts = {
        host: this.host,
        port: this.port,
        keepAlive: true,
        keepAliveInitialDelay: 10000,
      };

      // Add custom lookup if provided
      if (this.options.customLookup) {
        connectOptions.lookup = this.options.customLookup;
      }

      this.socket = net.connect(connectOptions);

      this.socket.once('connect', () => {
        this.connected = true;
        this.reconnectAttempts = 0;
        console.log(`Connected to ${this.host}:${this.port}`);
        resolve();
      });

      this.socket.once('error', (error: any) => {
        // Bun v1.2.18: Properly handles ERR_INVALID_IP_ADDRESS
        if (error.code === 'ERR_INVALID_IP_ADDRESS') {
          console.error('Invalid IP address returned by lookup function');
        }
        
        this.connected = false;
        
        if (this.options.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.handleReconnect();
        } else {
          reject(error);
        }
      });

      this.socket.on('close', () => {
        this.connected = false;
        
        if (this.options.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.handleReconnect();
        }
      });

      this.socket.on('data', (data) => {
        this.handleData(data);
      });
    });
  }

  private handleReconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect().catch(console.error);
    }, delay);
  }

  private handleData(data: Buffer) {
    try {
      const messages = data.toString().trim().split('\n');
      for (const message of messages) {
        if (message) {
          const parsed = JSON.parse(message);
          console.log('Received:', parsed);
        }
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }

  send(data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.connected) {
        reject(new Error('Not connected'));
        return;
      }

      const message = JSON.stringify(data) + '\n';
      this.socket.write(message, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.end();
      this.socket = undefined;
      this.connected = false;
    }
  }
}

// Export for use
export default RobustTCPServer;
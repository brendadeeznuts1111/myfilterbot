/**
 * WebSocket Server with permessage-deflate compression
 * New in Bun v1.2.18: WebSocket client compression support
 */

import { serve, ServerWebSocket } from 'bun';

interface WSData {
  id: string;
  username?: string;
  room?: string;
  lastActivity: number;
}

interface WSMessage {
  type: 'message' | 'join' | 'leave' | 'ping' | 'broadcast';
  payload: any;
  timestamp: number;
}

export class CompressedWebSocketServer {
  private clients = new Map<string, ServerWebSocket<WSData>>();
  private rooms = new Map<string, Set<string>>();
  private metrics = {
    messagesReceived: 0,
    messagesSent: 0,
    bytesReceived: 0,
    bytesSent: 0,
    compressionRatio: 0
  };

  constructor(private port: number = 3004) {}

  start() {
    const server = serve<WSData>({
      port: this.port,
      
      fetch(req, server) {
        const url = new URL(req.url);
        
        if (url.pathname === '/ws') {
          // Upgrade to WebSocket with compression
          const upgraded = server.upgrade(req, {
            data: {
              id: crypto.randomUUID(),
              lastActivity: Date.now()
            },
            // Enable permessage-deflate compression (Bun v1.2.18)
            headers: {
              'Sec-WebSocket-Extensions': 'permessage-deflate; client_max_window_bits'
            }
          });
          
          if (!upgraded) {
            return new Response('WebSocket upgrade failed', { status: 400 });
          }
          
          return undefined;
        }
        
        if (url.pathname === '/metrics') {
          return Response.json(this.getMetrics());
        }
        
        return new Response('Not Found', { status: 404 });
      },
      
      websocket: {
        // Enable compression for all messages
        perMessageDeflate: true,
        
        // Maximum payload size (10MB)
        maxPayloadLength: 10 * 1024 * 1024,
        
        // Idle timeout (30 seconds)
        idleTimeout: 30,
        
        // Connection handlers
        open: (ws) => {
          console.log(`✅ WebSocket connected: ${ws.data.id}`);
          this.handleConnection(ws);
        },
        
        message: (ws, message) => {
          this.handleMessage(ws, message);
        },
        
        close: (ws, code, reason) => {
          console.log(`❌ WebSocket disconnected: ${ws.data.id} (${code})`);
          this.handleDisconnection(ws);
        },
        
        error: (ws, error) => {
          console.error(`WebSocket error for ${ws.data.id}:`, error);
        }
      }
    });
    
    console.log(`🚀 Compressed WebSocket Server running on ws://localhost:${this.port}`);
    console.log(`📊 Metrics available at http://localhost:${this.port}/metrics`);
    
    // Start heartbeat interval
    this.startHeartbeat();
    
    return server;
  }

  private handleConnection(ws: ServerWebSocket<WSData>) {
    this.clients.set(ws.data.id, ws);
    
    // Send welcome message
    this.sendMessage(ws, {
      type: 'message',
      payload: {
        text: 'Welcome! WebSocket compression is enabled.',
        compressionEnabled: true,
        clientId: ws.data.id
      },
      timestamp: Date.now()
    });
  }

  private handleMessage(ws: ServerWebSocket<WSData>, message: string | Buffer) {
    try {
      // Track metrics
      const messageSize = typeof message === 'string' 
        ? message.length 
        : message.byteLength;
      
      this.metrics.messagesReceived++;
      this.metrics.bytesReceived += messageSize;
      
      // Parse message
      const data: WSMessage = typeof message === 'string'
        ? JSON.parse(message)
        : JSON.parse(Buffer.from(message).toString());
      
      // Update activity
      ws.data.lastActivity = Date.now();
      
      // Handle different message types
      switch (data.type) {
        case 'join':
          this.handleJoinRoom(ws, data.payload.room, data.payload.username);
          break;
          
        case 'leave':
          this.handleLeaveRoom(ws, data.payload.room);
          break;
          
        case 'message':
          this.handleRoomMessage(ws, data.payload);
          break;
          
        case 'broadcast':
          this.broadcastMessage(data.payload, ws.data.id);
          break;
          
        case 'ping':
          this.sendMessage(ws, {
            type: 'message',
            payload: { type: 'pong', timestamp: Date.now() },
            timestamp: Date.now()
          });
          break;
          
        default:
          console.warn(`Unknown message type: ${data.type}`);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      this.sendError(ws, 'Invalid message format');
    }
  }

  private handleDisconnection(ws: ServerWebSocket<WSData>) {
    // Remove from all rooms
    if (ws.data.room) {
      this.handleLeaveRoom(ws, ws.data.room);
    }
    
    // Remove from clients
    this.clients.delete(ws.data.id);
  }

  private handleJoinRoom(ws: ServerWebSocket<WSData>, room: string, username?: string) {
    // Leave current room if any
    if (ws.data.room && ws.data.room !== room) {
      this.handleLeaveRoom(ws, ws.data.room);
    }
    
    // Update user data
    ws.data.room = room;
    if (username) {
      ws.data.username = username;
    }
    
    // Add to room
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room)!.add(ws.data.id);
    
    // Notify room members
    this.broadcastToRoom(room, {
      type: 'message',
      payload: {
        type: 'user_joined',
        userId: ws.data.id,
        username: ws.data.username,
        room
      },
      timestamp: Date.now()
    }, ws.data.id);
    
    // Send confirmation
    this.sendMessage(ws, {
      type: 'message',
      payload: {
        type: 'joined_room',
        room,
        members: Array.from(this.rooms.get(room)!)
      },
      timestamp: Date.now()
    });
  }

  private handleLeaveRoom(ws: ServerWebSocket<WSData>, room: string) {
    const roomSet = this.rooms.get(room);
    if (!roomSet) return;
    
    roomSet.delete(ws.data.id);
    
    // Clean up empty rooms
    if (roomSet.size === 0) {
      this.rooms.delete(room);
    }
    
    // Notify remaining members
    this.broadcastToRoom(room, {
      type: 'message',
      payload: {
        type: 'user_left',
        userId: ws.data.id,
        username: ws.data.username,
        room
      },
      timestamp: Date.now()
    });
    
    // Clear room from user data
    ws.data.room = undefined;
  }

  private handleRoomMessage(ws: ServerWebSocket<WSData>, payload: any) {
    if (!ws.data.room) {
      this.sendError(ws, 'Not in a room');
      return;
    }
    
    this.broadcastToRoom(ws.data.room, {
      type: 'message',
      payload: {
        ...payload,
        from: ws.data.username || ws.data.id,
        room: ws.data.room
      },
      timestamp: Date.now()
    }, ws.data.id);
  }

  private broadcastToRoom(room: string, message: WSMessage, excludeId?: string) {
    const roomMembers = this.rooms.get(room);
    if (!roomMembers) return;
    
    for (const clientId of roomMembers) {
      if (clientId === excludeId) continue;
      
      const client = this.clients.get(clientId);
      if (client) {
        this.sendMessage(client, message);
      }
    }
  }

  private broadcastMessage(payload: any, excludeId?: string) {
    for (const [clientId, client] of this.clients) {
      if (clientId === excludeId) continue;
      
      this.sendMessage(client, {
        type: 'broadcast',
        payload,
        timestamp: Date.now()
      });
    }
  }

  private sendMessage(ws: ServerWebSocket<WSData>, message: WSMessage) {
    try {
      const messageStr = JSON.stringify(message);
      ws.send(messageStr);
      
      // Track metrics
      this.metrics.messagesSent++;
      this.metrics.bytesSent += messageStr.length;
      
      // Estimate compression ratio (rough estimate)
      // Actual compression happens at protocol level
      const estimatedCompressed = messageStr.length * 0.3; // ~70% compression
      this.metrics.compressionRatio = 1 - (estimatedCompressed / messageStr.length);
    } catch (error) {
      console.error(`Failed to send message to ${ws.data.id}:`, error);
    }
  }

  private sendError(ws: ServerWebSocket<WSData>, error: string) {
    this.sendMessage(ws, {
      type: 'message',
      payload: {
        type: 'error',
        error
      },
      timestamp: Date.now()
    });
  }

  private startHeartbeat() {
    setInterval(() => {
      const now = Date.now();
      const timeout = 60000; // 60 seconds
      
      for (const [clientId, client] of this.clients) {
        if (now - client.data.lastActivity > timeout) {
          console.log(`Closing inactive connection: ${clientId}`);
          client.close(1000, 'Idle timeout');
          this.clients.delete(clientId);
        } else {
          // Send ping to keep connection alive
          client.ping();
        }
      }
    }, 30000); // Check every 30 seconds
  }

  private getMetrics() {
    return {
      ...this.metrics,
      activeConnections: this.clients.size,
      activeRooms: this.rooms.size,
      avgMessageSize: this.metrics.messagesReceived > 0 
        ? this.metrics.bytesReceived / this.metrics.messagesReceived 
        : 0,
      estimatedCompressionSavings: this.metrics.bytesSent * this.metrics.compressionRatio,
      rooms: Array.from(this.rooms.entries()).map(([room, members]) => ({
        room,
        memberCount: members.size
      }))
    };
  }
}

// Export for use in main application
export default CompressedWebSocketServer;
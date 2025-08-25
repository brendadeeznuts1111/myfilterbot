#!/bin/bash

# Restart Enhanced Admin Server
# Safely stops existing server and starts new one

echo "🔄 Restarting Enhanced Admin Server..."

# Kill existing server processes
echo "🛑 Stopping existing servers..."
pkill -f "enhanced_admin_server.ts" && echo "   Stopped enhanced_admin_server.ts" || echo "   No enhanced_admin_server.ts running"
pkill -f "bun.*3003" && echo "   Stopped bun processes on port 3003" || echo "   No bun processes on port 3003"

# Wait a moment for cleanup
sleep 2

# Check if port is free
if lsof -Pi :3003 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port 3003 still in use. Force killing..."
    PID=$(lsof -Pi :3003 -sTCP:LISTEN -t)
    kill -9 $PID && echo "   Force killed process $PID"
    sleep 1
fi

# Verify port is free
if lsof -Pi :3003 -sTCP:LISTEN -t >/dev/null ; then
    echo "❌ Cannot free port 3003. Please manually check:"
    lsof -i :3003
    exit 1
fi

echo "✅ Port 3003 is now available"

# Start the server
echo "🚀 Starting Enhanced Admin Server..."
echo ""
echo "Server will be available at:"
echo "   • Admin Portal: http://localhost:3003/admin"
echo "   • API Docs: http://localhost:3003/api/docs"
echo "   • Health Check: http://localhost:3003/health"
echo ""
echo "Test commands:"
echo "   curl http://localhost:3003/health"
echo "   curl http://localhost:3003/api/docs"
echo "   curl -H \"X-Customer-ID: BB1042\" http://localhost:3003/api/customer/balance"
echo ""
echo "Press Ctrl+C to stop"
echo "====================="

bun run enhanced_admin_server.ts
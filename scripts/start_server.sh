#!/bin/bash

# Fantdev Trading Bot - Server Startup Script
# Ensures all dependencies are in place and starts the enhanced admin server

echo "🚀 Fantdev Trading Bot - Enhanced Admin Server"
echo "=============================================="

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Please install Bun first:"
    echo "   curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

echo "✅ Bun version: $(bun --version)"

# Check if required files exist
echo ""
echo "📁 Checking required files..."

required_files=(
    "enhanced_admin_server.ts"
    "src/api/router.ts"
    "src/api/customer.ts"
    "src/api/notifications.ts"
    "src/api/security.ts"
    "customer_database.json"
    "customer_config.json"
)

missing_files=()

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ $file (missing)"
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -gt 0 ]; then
    echo ""
    echo "❌ Missing required files. Please ensure all files are in place."
    exit 1
fi

# Check if port 3003 is available
echo ""
echo "🔌 Checking port 3003..."

if lsof -Pi :3003 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port 3003 is already in use. Stopping existing process..."
    pkill -f "enhanced_admin_server.ts" || true
    sleep 2
    
    if lsof -Pi :3003 -sTCP:LISTEN -t >/dev/null ; then
        echo "❌ Could not free port 3003. Please manually stop the process:"
        echo "   lsof -i :3003"
        echo "   kill -9 <PID>"
        exit 1
    fi
fi

echo "✅ Port 3003 is available"

# Install dependencies if needed
echo ""
echo "📦 Installing dependencies..."
bun install

# Start the server
echo ""
echo "🎯 Starting Enhanced Admin Server..."
echo "   URL: http://localhost:3003"
echo "   Admin Portal: http://localhost:3003/admin"
echo "   API Docs: http://localhost:3003/api/docs"
echo "   Health Check: http://localhost:3003/health"
echo ""
echo "💡 Test the APIs with:"
echo "   node test_api_integration.js"
echo ""
echo "🔧 Debug server issues with:"
echo "   node debug_server.js"
echo ""
echo "Press Ctrl+C to stop the server"
echo "=================================="

# Start the server with proper error handling
bun run enhanced_admin_server.ts

echo ""
echo "👋 Server stopped"
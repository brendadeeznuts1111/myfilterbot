#!/bin/bash

# Start Services with Custom User-Agents
# This script demonstrates how to start multiple FantDev services
# with identifiable User-Agent strings for better monitoring

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VERSION="2.1.0"
ENVIRONMENT=${ENVIRONMENT:-"development"}
BASE_PORT=3000

# User-Agent templates
DASHBOARD_UA="Fantdev-Dashboard/${VERSION}-${ENVIRONMENT}"
BOT_UA="Fantdev-TelegramBot/${VERSION}-${ENVIRONMENT}"
API_UA="Fantdev-API/${VERSION}-${ENVIRONMENT}"
ADMIN_UA="Fantdev-AdminPortal/${VERSION}-${ENVIRONMENT}"
WEBSOCKET_UA="Fantdev-WebSocket/${VERSION}-${ENVIRONMENT}"

echo -e "${BLUE}🚀 Starting FantDev Services with Custom User-Agents${NC}"
echo -e "${BLUE}================================================${NC}"
echo -e "Version: ${VERSION}"
echo -e "Environment: ${ENVIRONMENT}"
echo -e "Base Port: ${BASE_PORT}"
echo ""

# Function to start a service
start_service() {
    local service_name=$1
    local user_agent=$2
    local script_path=$3
    local port=$4
    local description=$5
    
    echo -e "${YELLOW}Starting ${service_name}...${NC}"
    echo -e "  User-Agent: ${user_agent}"
    echo -e "  Port: ${port}"
    echo -e "  Description: ${description}"
    
    # Start service in background with custom User-Agent
    bun --user-agent "${user_agent}" "${script_path}" &
    local pid=$!
    
    # Store PID for later cleanup
    echo $pid > "/tmp/fantdev-${service_name}.pid"
    
    echo -e "${GREEN}✅ ${service_name} started with PID: ${pid}${NC}"
    echo ""
}

# Function to check if port is available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${RED}❌ Port ${port} is already in use${NC}"
        return 1
    fi
    return 0
}

# Function to wait for service to be ready
wait_for_service() {
    local service_name=$1
    local port=$2
    local max_attempts=30
    local attempt=1
    
    echo -e "${YELLOW}Waiting for ${service_name} to be ready on port ${port}...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "http://localhost:${port}/health" >/dev/null 2>&1 || \
           curl -s "http://localhost:${port}/" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ ${service_name} is ready on port ${port}${NC}"
            return 0
        fi
        
        echo -n "."
        sleep 1
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ ${service_name} failed to start on port ${port}${NC}"
    return 1
}

# Check if required ports are available
echo -e "${BLUE}🔍 Checking port availability...${NC}"
check_port $((BASE_PORT + 0)) || exit 1  # Dashboard
check_port $((BASE_PORT + 1)) || exit 1  # Bot
check_port $((BASE_PORT + 2)) || exit 1  # Admin Portal
check_port $((BASE_PORT + 3)) || exit 1  # WebSocket
check_port $((BASE_PORT + 4)) || exit 1  # API
echo -e "${GREEN}✅ All ports are available${NC}"
echo ""

# Start services
echo -e "${BLUE}🚀 Starting services...${NC}"

# 1. Dashboard Server
start_service "Dashboard" "${DASHBOARD_UA}" "src/server/dashboard-server.ts" $((BASE_PORT + 0)) "Main dashboard interface"

# 2. Telegram Bot Service
start_service "TelegramBot" "${BOT_UA}" "src/telegram_bot_service.ts" $((BASE_PORT + 1)) "Telegram bot service"

# 3. Admin Portal Server
start_service "AdminPortal" "${ADMIN_UA}" "src/admin_portal_server.ts" $((BASE_PORT + 2)) "Admin portal interface"

# 4. WebSocket Service
start_service "WebSocket" "${WEBSOCKET_UA}" "src/services/websocket_service.ts" $((BASE_PORT + 3)) "Real-time communication"

# 5. API Router
start_service "API" "${API_UA}" "src/server/api/router.ts" $((BASE_PORT + 4)) "Main API endpoints"

echo -e "${GREEN}🎉 All services started successfully!${NC}"
echo ""

# Wait for services to be ready
echo -e "${BLUE}⏳ Waiting for services to be ready...${NC}"
wait_for_service "Dashboard" $((BASE_PORT + 0)) &
wait_for_service "TelegramBot" $((BASE_PORT + 1)) &
wait_for_service "AdminPortal" $((BASE_PORT + 2)) &
wait_for_service "WebSocket" $((BASE_PORT + 3)) &
wait_for_service "API" $((BASE_PORT + 4)) &

# Wait for all background processes
wait

echo ""
echo -e "${GREEN}🎯 All services are ready!${NC}"
echo ""
echo -e "${BLUE}📊 Service Status:${NC}"
echo -e "  Dashboard:    http://localhost:$((BASE_PORT + 0))"
echo -e "  Telegram Bot: http://localhost:$((BASE_PORT + 1))"
echo -e "  Admin Portal: http://localhost:$((BASE_PORT + 2))"
echo -e "  WebSocket:    http://localhost:$((BASE_PORT + 3))"
echo -e "  API:          http://localhost:$((BASE_PORT + 4))"
echo ""
echo -e "${BLUE}🔧 Management Commands:${NC}"
echo -e "  Stop all services:  ./scripts/stop-services.sh"
echo -e "  View logs:          tail -f logs/*.log"
echo -e "  Check status:       ./scripts/check-services.sh"
echo ""
echo -e "${YELLOW}💡 Each service is running with a unique User-Agent for easy identification${NC}"
echo -e "${YELLOW}   in logs, monitoring tools, and external services.${NC}"

# Save service information for other scripts
cat > "/tmp/fantdev-services.json" << EOF
{
  "version": "${VERSION}",
  "environment": "${ENVIRONMENT}",
  "services": {
    "dashboard": {
      "name": "Dashboard",
      "user_agent": "${DASHBOARD_UA}",
      "port": $((BASE_PORT + 0)),
      "script": "src/server/dashboard-server.ts"
    },
    "telegram_bot": {
      "name": "TelegramBot",
      "user_agent": "${BOT_UA}",
      "port": $((BASE_PORT + 1)),
      "script": "src/telegram_bot_service.ts"
    },
    "admin_portal": {
      "name": "AdminPortal",
      "user_agent": "${ADMIN_UA}",
      "port": $((BASE_PORT + 2)),
      "script": "src/admin_portal_server.ts"
    },
    "websocket": {
      "name": "WebSocket",
      "user_agent": "${WEBSOCKET_UA}",
      "port": $((BASE_PORT + 3)),
      "script": "src/services/websocket_service.ts"
    },
    "api": {
      "name": "API",
      "user_agent": "${API_UA}",
      "port": $((BASE_PORT + 4)),
      "script": "src/server/api/router.ts"
    }
  }
}
EOF

echo -e "${GREEN}📝 Service configuration saved to /tmp/fantdev-services.json${NC}"

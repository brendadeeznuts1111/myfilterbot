#!/bin/bash

# Stop FantDev Services
# This script stops all services started by start-services-with-user-agents.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 Stopping FantDev Services${NC}"
echo -e "${BLUE}============================${NC}"
echo ""

# Function to stop a service
stop_service() {
    local service_name=$1
    local pid_file="/tmp/fantdev-${service_name}.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        
        if ps -p "$pid" > /dev/null 2>&1; then
            echo -e "${YELLOW}Stopping ${service_name} (PID: ${pid})...${NC}"
            kill "$pid"
            
            # Wait for process to stop
            local count=0
            while ps -p "$pid" > /dev/null 2>&1 && [ $count -lt 10 ]; do
                sleep 1
                count=$((count + 1))
            done
            
            if ps -p "$pid" > /dev/null 2>&1; then
                echo -e "${RED}Force killing ${service_name} (PID: ${pid})...${NC}"
                kill -9 "$pid"
            fi
            
            echo -e "${GREEN}✅ ${service_name} stopped${NC}"
        else
            echo -e "${YELLOW}⚠️  ${service_name} process not running (PID: ${pid})${NC}"
        fi
        
        # Remove PID file
        rm -f "$pid_file"
    else
        echo -e "${YELLOW}⚠️  No PID file found for ${service_name}${NC}"
    fi
}

# Function to stop services on specific ports
stop_service_on_port() {
    local port=$1
    local pids=$(lsof -ti:$port 2>/dev/null || true)
    
    if [ -n "$pids" ]; then
        echo -e "${YELLOW}Stopping services on port ${port}...${NC}"
        for pid in $pids; do
            if ps -p "$pid" > /dev/null 2>&1; then
                echo -e "  Stopping process ${pid}"
                kill "$pid"
            fi
        done
        echo -e "${GREEN}✅ Services on port ${port} stopped${NC}"
    else
        echo -e "${YELLOW}No services running on port ${port}${NC}"
    fi
}

# Stop services by name (using PID files)
echo -e "${BLUE}🔍 Stopping services by PID files...${NC}"
stop_service "Dashboard"
stop_service "TelegramBot"
stop_service "AdminPortal"
stop_service "WebSocket"
stop_service "API"

# Stop services by port (fallback method)
echo ""
echo -e "${BLUE}🔍 Stopping services by port...${NC}"
stop_service_on_port 3000  # Dashboard
stop_service_on_port 3001  # Bot
stop_service_on_port 3002  # Admin Portal
stop_service_on_port 3003  # WebSocket
stop_service_on_port 3004  # API

# Clean up temporary files
echo ""
echo -e "${BLUE}🧹 Cleaning up temporary files...${NC}"
rm -f /tmp/fantdev-services.json
rm -f /tmp/fantdev-*.pid

echo ""
echo -e "${GREEN}🎉 All services stopped and cleaned up!${NC}"
echo ""
echo -e "${BLUE}📊 Verification:${NC}"
echo -e "  Check if ports are free:"
echo -e "    lsof -i :3000-3004"
echo -e "  Check if processes are running:"
echo -e "    ps aux | grep 'bun.*src'"
echo ""
echo -e "${YELLOW}💡 All services have been stopped with their custom User-Agents${NC}"

#!/bin/bash
# enhanced_verify.sh - Project-specific service startup + verification
# Usage: ./enhanced_verify.sh [start|verify|status]

ACTION=${1:-verify}
BASE_DIR=$(pwd)
LOG_DIR="$BASE_DIR/logs"
LOG_FILE="$LOG_DIR/verification_$(date +%Y%m%d_%H%M%S).log"
DEV_LOG="$LOG_DIR/dev_startup.log"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Create logs directory
mkdir -p "$LOG_DIR"

# Logging function
log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

# Check if service is running on port
check_port() {
    local port=$1
    local service=$2
    if lsof -ti:$port > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $service (Port $port) - RUNNING${NC}"
        return 0
    else
        echo -e "${RED}❌ $service (Port $port) - NOT RUNNING${NC}"
        return 1
    fi
}

# Check all service statuses
check_status() {
    log "\n${BLUE}🔍 Service Status Check${NC}"
    log "======================================="
    
    local running=0
    local total=5
    
    check_port 5000 "Portal Server" && ((running++))
    check_port 3003 "Admin Server" && ((running++))
    check_port 5001 "Payment Server" && ((running++))
    check_port 3006 "Web Dev Server" && ((running++))
    check_port 3005 "Unified System" && ((running++))
    
    log "\n${YELLOW}Summary: $running/$total services running${NC}"
    return $running
}

# Start services using project's bun run dev
start_services() {
    log "\n${YELLOW}🚀 Starting services with 'bun run dev'${NC}"
    log "======================================="
    
    # Check if services are already running
    if check_status > /dev/null; then
        log "${GREEN}Services already running, skipping startup${NC}"
        return 0
    fi
    
    # Check if bun is available
    if ! command -v bun > /dev/null 2>&1; then
        log "${RED}❌ bun not found. Please install bun first${NC}"
        exit 1
    fi
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        log "${RED}❌ package.json not found${NC}"
        exit 1
    fi
    
    # Start services using bun run dev
    log "${BLUE}Starting: bun run dev${NC}"
    log "Logging to: $DEV_LOG"
    
    # Start in background and log output
    nohup bun run dev > "$DEV_LOG" 2>&1 &
    local pid=$!
    
    log "Started with PID: $pid"
    log "Waiting 15 seconds for services to initialize..."
    
    # Wait for services to start
    local attempts=0
    local max_attempts=15
    
    while [ $attempts -lt $max_attempts ]; do
        if check_status > /dev/null; then
            log "${GREEN}✅ Services started successfully${NC}"
            return 0
        fi
        sleep 1
        ((attempts++))
    done
    
    log "${RED}❌ Services failed to start within timeout${NC}"
    log "Check $DEV_LOG for details"
    return 1
}

# Run the original verification script
run_verification() {
    log "\n${BLUE}🔍 Running Phase 3 Endpoint Verification${NC}"
    log "======================================="
    
    if [ -f "scripts/verify_endpoints.sh" ]; then
        bash scripts/verify_endpoints.sh local
    else
        log "${RED}❌ scripts/verify_endpoints.sh not found${NC}"
        exit 1
    fi
}

# Main execution
case $ACTION in
    start)
        start_services
        run_verification
        ;;
    verify)
        check_status
        run_verification
        ;;
    status)
        check_status
        ;;
    *)
        echo "Usage: $0 [start|verify|status]"
        echo "  start  - Start services with 'bun run dev' and verify"
        echo "  verify - Check status and verify endpoints"
        echo "  status - Just check service status"
        ;;
esac

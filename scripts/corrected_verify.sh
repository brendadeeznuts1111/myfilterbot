#!/bin/bash
# corrected_verify.sh - Uses actual discovered ports
# Usage: ./corrected_verify.sh [status|verify]

ACTION=${1:-verify}
LOG_DIR="logs"
LOG_FILE="$LOG_DIR/corrected_verification_$(date +%Y%m%d_%H%M%S).log"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

mkdir -p "$LOG_DIR"

# Updated port mapping based on actual discovery
check_corrected_status() {
    echo -e "\n${BLUE}🔍 Corrected Service Status${NC}"
    echo "======================================="
    
    local running=0
    local total=5
    
    # Check actual ports
    if lsof -ti:5000 > /dev/null; then
        echo -e "${GREEN}✅ Portal Server (Port 5000) - RUNNING${NC}"
        ((running++))
    else
        echo -e "${RED}❌ Portal Server (Port 5000) - NOT RUNNING${NC}"
    fi
    
    if lsof -ti:3006 > /dev/null; then
        echo -e "${GREEN}✅ Admin Server (Port 3006) - RUNNING${NC}"
        ((running++))
    else
        echo -e "${RED}❌ Admin Server (Port 3006) - NOT RUNNING${NC}"
    fi
    
    if lsof -ti:5001 > /dev/null; then
        echo -e "${GREEN}✅ Payment Server (Port 5001) - RUNNING${NC}"
        ((running++))
    else
        echo -e "${RED}❌ Payment Server (Port 5001) - NOT RUNNING${NC}"
    fi
    
    if lsof -ti:3004 > /dev/null; then
        echo -e "${GREEN}✅ WebSocket/Telegram Bot (Port 3004) - RUNNING${NC}"
        ((running++))
    else
        echo -e "${RED}❌ WebSocket/Telegram Bot (Port 3004) - NOT RUNNING${NC}"
    fi
    
    if lsof -ti:3005 > /dev/null; then
        echo -e "${GREEN}✅ Unified System (Port 3005) - RUNNING${NC}"
        ((running++))
    else
        echo -e "${RED}❌ Unified System (Port 3005) - NOT RUNNING${NC}"
    fi
    
    echo -e "\n${YELLOW}Summary: $running/$total services running${NC}"
    return $running
}

# Run verification with corrected ports
run_corrected_verification() {
    echo -e "\n${YELLOW}🔍 Running Phase 3 Verification (Corrected Ports)${NC}"
    echo "======================================="
    
    # Test actual endpoints
    echo -e "\n${BLUE}Testing Portal Server (5000)...${NC}"
    local portal_health=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health)
    if [ "$portal_health" = "200" ]; then
        echo -e "${GREEN}✅ Portal Server Health: $portal_health${NC}"
    else
        echo -e "${RED}❌ Portal Server Health: $portal_health${NC}"
    fi
    
    echo -e "\n${BLUE}Testing Admin Server (3006)...${NC}"
    local admin_health=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3006/health)
    if [ "$admin_health" = "200" ]; then
        echo -e "${GREEN}✅ Admin Server Health: $admin_health${NC}"
    else
        echo -e "${RED}❌ Admin Server Health: $admin_health${NC}"
    fi
    
    echo -e "\n${BLUE}Testing Payment Server (5001)...${NC}"
    local payment_health=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/api/payment/health)
    if [ "$payment_health" = "200" ]; then
        echo -e "${GREEN}✅ Payment Server Health: $payment_health${NC}"
    else
        echo -e "${RED}❌ Payment Server Health: $payment_health${NC}"
    fi
    
    echo -e "\n${BLUE}Testing WebSocket/Telegram (3004)...${NC}"
    local ws_health=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3004/health 2>/dev/null || echo "000")
    if [ "$ws_health" = "200" ]; then
        echo -e "${GREEN}✅ WebSocket/Telegram Health: $ws_health${NC}"
    else
        echo -e "${RED}❌ WebSocket/Telegram Health: $ws_health${NC}"
    fi
    
    echo -e "\n${BLUE}Testing Unified System (3005)...${NC}"
    local unified_health=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3005/health 2>/dev/null || echo "000")
    if [ "$unified_health" = "200" ]; then
        echo -e "${GREEN}✅ Unified System Health: $unified_health${NC}"
    else
        echo -e "${RED}❌ Unified System Health: $unified_health${NC}"
    fi
}

# Main execution
case $ACTION in
    status)
        check_corrected_status
        ;;
    verify)
        check_corrected_status
        run_corrected_verification
        ;;
    *)
        echo "Usage: $0 [status|verify]"
        echo "  status  - Check corrected service status"
        echo "  verify  - Check status and test endpoints"
        ;;
esac

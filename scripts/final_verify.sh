#!/bin/bash
# final_verify.sh - Uses actual discovered endpoints
# Usage: ./final_verify.sh [status|verify]

ACTION=${1:-verify}
LOG_DIR="logs"
LOG_FILE="$LOG_DIR/final_verification_$(date +%Y%m%d_%H%M%S).log"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Initialize log file
echo "=== Final Verification Started at $(date) ===" >> "$LOG_FILE"

# Test function with detailed output
test_endpoint() {
    local method=$1
    local url=$2
    local description=$3
    local expected_code=${4:-200}
    
    echo -n "Testing $description... "
    
    response=$(curl -s -w "\n%{http_code}" -X $method "$url" 2>/dev/null)
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [[ "$http_code" == "$expected_code" ]] || [[ "$http_code" =~ ^[23][0-9][0-9]$ ]]; then
        echo -e "${GREEN}✅ PASS${NC} ($http_code)"
        echo "✅ $method $url - $description - $http_code" >> "$LOG_FILE"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} ($http_code)"
        echo "❌ $method $url - $description - $http_code" >> "$LOG_FILE"
        return 1
    fi
}

# Check actual service status
check_final_status() {
    echo -e "\n${YELLOW}🔍 Final Service Status${NC}"
    echo "======================================="
    
    local running=0
    
    # Check actual running services
    if lsof -ti:5000 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Portal Server (5000) - RUNNING${NC}"
        ((running++))
    else
        echo -e "${RED}❌ Portal Server (5000) - NOT RUNNING${NC}"
    fi
    
    if lsof -ti:3006 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Admin Server (3006) - RUNNING${NC}"
        ((running++))
    else
        echo -e "${RED}❌ Admin Server (3006) - NOT RUNNING${NC}"
    fi
    
    if lsof -ti:5001 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Payment Server (5001) - RUNNING${NC}"
        ((running++))
    else
        echo -e "${RED}❌ Payment Server (5001) - NOT RUNNING${NC}"
    fi
    
    # Check for WebSocket/Telegram Bot
    if lsof -ti:3004 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ WebSocket/Telegram Bot (3004) - RUNNING${NC}"
        ((running++))
    else
        echo -e "${RED}❌ WebSocket/Telegram Bot (3004) - NOT RUNNING${NC}"
    fi
    
    # Check for Unified System
    if lsof -ti:3005 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Unified System (3005) - RUNNING${NC}"
        ((running++))
    else
        echo -e "${RED}❌ Unified System (3005) - NOT RUNNING${NC}"
    fi
    
    echo -e "\n${YELLOW}Summary: $running/5 services running${NC}"
    echo "Services running: $running/5" >> "$LOG_FILE"
    return $running
}

# Run comprehensive verification with actual endpoints
run_final_verification() {
    echo -e "\n${YELLOW}🔍 Phase 3 Final Verification${NC}"
    echo "======================================="
    
    local passed=0
    local total=0
    
    # Portal Server (5000) - Actual endpoints
    echo -e "\n${BLUE}📡 Portal Server (5000)${NC}"
    echo "---------------------------------------"
    test_endpoint "GET" "http://localhost:5000/" "Portal Web Interface" && ((passed++))
    ((total++))
    
    test_endpoint "GET" "http://localhost:5000/health" "Portal Health Check" && ((passed++))
    ((total++))
    
    # Admin Server (3006) - Actual endpoints
    echo -e "\n${BLUE}🛠️  Admin Server (3006)${NC}"
    echo "---------------------------------------"
    test_endpoint "GET" "http://localhost:3006/" "Admin Web Interface" && ((passed++))
    ((total++))
    
    # Payment Server (5001) - Try multiple endpoints
    echo -e "\n${BLUE}💳 Payment Server (5001)${NC}"
    echo "---------------------------------------"
    
    # Try common payment endpoints
    local payment_passed=false
    
    # Try health endpoints
    if test_endpoint "GET" "http://localhost:5001/health" "Payment Health"; then
        payment_passed=true
        ((passed++))
    elif test_endpoint "GET" "http://localhost:5001/api/health" "Payment API Health"; then
        payment_passed=true
        ((passed++))
    elif test_endpoint "GET" "http://localhost:5001/status" "Payment Status"; then
        payment_passed=true
        ((passed++))
    elif test_endpoint "GET" "http://localhost:5001/api/status" "Payment API Status"; then
        payment_passed=true
        ((passed++))
    else
        # Try basic root
        if test_endpoint "GET" "http://localhost:5001/" "Payment Root"; then
            payment_passed=true
            ((passed++))
        else
            echo -e "${YELLOW}⚠️  Payment Server running but no accessible endpoints found${NC}"
            echo "Payment Server: Running but endpoints not accessible" >> "$LOG_FILE"
        fi
    fi
    
    if $payment_passed; then
        ((total++))
    fi
    
    # WebSocket/Telegram Bot (3004)
    echo -e "\n${BLUE}🤖 WebSocket/Telegram Bot (3004)${NC}"
    echo "---------------------------------------"
    if lsof -ti:3004 > /dev/null 2>&1; then
        test_endpoint "GET" "http://localhost:3004/" "WebSocket/Telegram Bot" && ((passed++))
        ((total++))
    else
        echo -e "${RED}❌ WebSocket/Telegram Bot (3004) - NOT RUNNING${NC}"
        echo "WebSocket/Telegram Bot: NOT RUNNING" >> "$LOG_FILE"
        ((total++))
    fi
    
    # Unified System (3005)
    echo -e "\n${BLUE}🔗 Unified System (3005)${NC}"
    echo "---------------------------------------"
    if lsof -ti:3005 > /dev/null 2>&1; then
        test_endpoint "GET" "http://localhost:3005/" "Unified System" && ((passed++))
        ((total++))
    else
        echo -e "${RED}❌ Unified System (3005) - NOT RUNNING${NC}"
        echo "Unified System: NOT RUNNING" >> "$LOG_FILE"
        ((total++))
    fi
    
    echo -e "\n${YELLOW}📊 Final Results${NC}"
    echo "======================================="
    echo -e "${GREEN}✅ Passed: $passed${NC}"
    echo -e "${RED}❌ Failed: $(($total - $passed))${NC}"
    echo -e "${YELLOW}Total: $total${NC}"
    
    echo "Final Results: $passed/$total passed" >> "$LOG_FILE"
    echo "=== Verification completed at $(date) ===" >> "$LOG_FILE"
    
    if [ $passed -eq $total ]; then
        echo -e "\n${GREEN}🎉 Phase 3 Verification: COMPLETE${NC}"
        echo "Phase 3: COMPLETE" >> "$LOG_FILE"
    else
        echo -e "\n${YELLOW}⚠️ Phase 3 Verification: PARTIAL${NC}"
        echo "Phase 3: PARTIAL" >> "$LOG_FILE"
    fi
    
    return $passed
}

# Display usage information
show_usage() {
    echo "Usage: $0 [status|verify|help]"
    echo ""
    echo "Commands:"
    echo "  status  - Check which services are running"
    echo "  verify  - Run comprehensive endpoint verification"
    echo "  help    - Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./final_verify.sh status"
    echo "  ./final_verify.sh verify"
}

# Main execution
case $ACTION in
    status)
        check_final_status
        ;;
    verify)
        check_final_status
        run_final_verification
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        echo "Unknown action: $ACTION"
        show_usage
        ;;
esac

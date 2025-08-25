#!/bin/bash
# Phase 3 Verification Script
# Usage: ./verify_endpoints.sh [environment]

ENV=${1:-local}
BASE_DIR=$(pwd)
LOG_FILE="verification_$(date +%Y%m%d_%H%M%S).log"

echo "🔍 Starting Phase 3 Verification - $(date)" | tee $LOG_FILE
echo "Environment: $ENV" | tee -a $LOG_FILE
echo "=======================================" | tee -a $LOG_FILE

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local method=$1
    local url=$2
    local expected_status=${3:-200}
    local description=$4
    
    echo -n "Testing $description... "
    
    response=$(curl -s -w "\n%{http_code}" -X $method "$url" 2>/dev/null)
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [[ "$http_code" == "$expected_status" ]]; then
        echo -e "${GREEN}✅ PASS${NC} ($http_code)"
        echo "✅ $method $url - $description - $http_code" >> $LOG_FILE
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (Expected $expected_status, got $http_code)"
        echo "❌ $method $url - $description - $http_code" >> $LOG_FILE
        echo "Response: $body" >> $LOG_FILE
        return 1
    fi
}

# Health check function
check_health() {
    local service=$1
    local port=$2
    local base_url=$3
    
    echo -e "\n${YELLOW}🔍 Checking $service health on port $port${NC}"
    
    # Basic health check
    test_endpoint "GET" "$base_url/health" 200 "$service Health Check"
    
    # Detailed health if available
    test_endpoint "GET" "$base_url/health/detailed" 200 "$service Detailed Health" || true
    
    # Ping endpoint
    test_endpoint "GET" "$base_url/ping" 200 "$service Ping" || true
}

# Start verification
echo -e "\n${YELLOW}📋 Phase 3 Verification Starting...${NC}"

# 1. Portal Server (Port 5000)
check_health "Portal Server" 5000 "http://localhost:5000"

# Test core API endpoints
test_endpoint "GET" "http://localhost:5000/api/stats" 200 "Portal Stats API"
test_endpoint "GET" "http://localhost:5000/api/config" 200 "Portal Config API"
test_endpoint "GET" "http://localhost:5000/api/members" 200 "Portal Members API"

# 2. Admin Server (Port 3003)
check_health "Admin Server" 3003 "http://localhost:3003"

# Test admin APIs
test_endpoint "GET" "http://localhost:3003/api/members" 200 "Admin Members API"
test_endpoint "GET" "http://localhost:3003/api/stats" 200 "Admin Stats API"

# 3. Payment Server (Port 5001)
check_health "Payment Server" 5001 "http://localhost:5001"

# Test payment APIs
test_endpoint "GET" "http://localhost:5001/api/payment/deposit/methods" 200 "Payment Methods API"
test_endpoint "GET" "http://localhost:5001/api/payment/admin/pending-withdrawals" 200 "Pending Withdrawals API"

# 4. WebSocket Server (Port 3004)
check_health "WebSocket Server" 3004 "http://localhost:3004"

# 5. Telegram Bot Service (Port 3004)
test_endpoint "GET" "http://localhost:3004/health" 200 "Telegram Bot Health"

# 6. Unified System (Port 3005)
check_health "Unified System" 3005 "http://localhost:3005"

# Test unified APIs
test_endpoint "GET" "http://localhost:3005/api/unified-stats" 200 "Unified Stats API"
test_endpoint "GET" "http://localhost:3005/api/stats" 200 "Unified System Stats"

# 7. Enhanced Admin (Port 3003)
test_endpoint "GET" "http://localhost:3003/api/admin/statistics" 200 "Enhanced Admin Stats"
test_endpoint "GET" "http://localhost:3003/api/admin/members" 200 "Enhanced Admin Members"

# Generate summary
echo -e "\n${YELLOW}📊 Verification Summary${NC}"
echo "======================================="
echo "Log file: $LOG_FILE"
echo "Phase 3 Status: In Progress"

# Count results
pass_count=$(grep -c "✅" $LOG_FILE || echo 0)
fail_count=$(grep -c "❌" $LOG_FILE || echo 0)

echo -e "\n${GREEN}✅ Passed: $pass_count${NC}"
echo -e "${RED}❌ Failed: $fail_count${NC}"

if [ $fail_count -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All endpoints verified successfully!${NC}"
    echo "Phase 3 Status: ✅ COMPLETE"
else
    echo -e "\n${YELLOW}⚠️  Some endpoints need attention${NC}"
    echo "Phase 3 Status: ⚠️ NEEDS REVIEW"
fi

# Display failed endpoints if any
if [ $fail_count -gt 0 ]; then
    echo -e "\n${RED}Failed Endpoints:${NC}"
    grep "❌" $LOG_FILE
fi

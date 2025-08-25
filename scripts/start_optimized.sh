#!/bin/bash
"""
Optimized startup script for Fantdev Trading Bot
Implements P-4: Increase Bun --max-old-space-size & add --cpus flag
"""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BUN_MAX_OLD_SPACE_SIZE="${BUN_MAX_OLD_SPACE_SIZE:-4096}"  # 4GB default
BUN_CPUS="${BUN_CPUS:-0}"  # Use all available CPUs
BUN_FLAGS="${BUN_FLAGS:---hot}"

# Get system info
get_system_info() {
    echo -e "${BLUE}System Information:${NC}"
    echo "  OS: $(uname -s)"
    echo "  Architecture: $(uname -m)"
    echo "  CPU Cores: $(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo "unknown")"
    echo "  Memory: $(free -h 2>/dev/null | awk '/^Mem:/ {print $2}' || echo "unknown")"
    echo ""
}

# Check if Bun is installed
check_bun() {
    if ! command -v bun &> /dev/null; then
        echo -e "${RED}Error: Bun is not installed${NC}"
        echo "Please install Bun: https://bun.sh"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Bun version: $(bun --version)${NC}"
}

# Set environment variables
setup_environment() {
    echo -e "${YELLOW}Setting up environment...${NC}"
    
    # Export Bun environment variables
    export BUN_MAX_OLD_SPACE_SIZE=$BUN_MAX_OLD_SPACE_SIZE
    export BUN_CPUS=$BUN_CPUS
    
    # Additional Node.js compatibility flags
    export NODE_OPTIONS="--max-old-space-size=$BUN_MAX_OLD_SPACE_SIZE"
    
    echo "  BUN_MAX_OLD_SPACE_SIZE: ${BUN_MAX_OLD_SPACE_SIZE}MB"
    echo "  BUN_CPUS: ${BUN_CPUS} (0 = auto-detect)"
    echo ""
}

# Start services with optimized settings
start_services() {
    echo -e "${GREEN}Starting services with optimized settings...${NC}"
    
    # Start Python services
    echo -e "${BLUE}Starting Python services...${NC}"
    
    # Activate virtual environment if it exists
    if [ -d ".venv" ]; then
        echo "  Activating Python virtual environment..."
        source .venv/bin/activate
    fi
    
    # Start Flask portal server
    echo "  Starting Flask portal server..."
    export FLASK_ENV=production
    export FLASK_DEBUG=false
    
    # Start portal server in background
    python3 src/portal_server.py &
    PORTAL_PID=$!
    echo "  Portal server PID: $PORTAL_PID"
    
    # Start Bun services
    echo -e "${BLUE}Starting Bun services...${NC}"
    
    # Build with optimized settings
    echo "  Building with optimized settings..."
    bun build --define process.env.NODE_ENV=\"'production'\" \
              --define process.env.BUN_MAX_OLD_SPACE_SIZE=$BUN_MAX_OLD_SPACE_SIZE \
              --define process.env.BUN_CPUS=$BUN_CPUS \
              src/index.tsx
    
    # Start development server with optimizations
    echo "  Starting development server..."
    bun --max-old-space-size=$BUN_MAX_OLD_SPACE_SIZE \
        --cpus=$BUN_CPUS \
        --define process.env.NODE_ENV=\"'development'\" \
        --define process.env.BUN_MAX_OLD_SPACE_SIZE=$BUN_MAX_OLD_SPACE_SIZE \
        --define process.env.BUN_CPUS=$BUN_CPUS \
        $BUN_FLAGS \
        src/dev-server.ts &
    DEV_PID=$!
    echo "  Development server PID: $DEV_PID"
    
    # Start admin server
    echo "  Starting admin server..."
    bun --max-old-space-size=$BUN_MAX_OLD_SPACE_SIZE \
        --cpus=$BUN_CPUS \
        --define process.env.NODE_ENV=\"'development'\" \
        --define process.env.BUN_MAX_OLD_SPACE_SIZE=$BUN_MAX_OLD_SPACE_SIZE \
        --define process.env.BUN_CPUS=$BUN_CPUS \
        $BUN_FLAGS \
        src/server/admin/index.ts &
    ADMIN_PID=$!
    echo "  Admin server PID: $ADMIN_PID"
    
    echo ""
    echo -e "${GREEN}Services started successfully!${NC}"
    echo "  Portal: http://localhost:5000"
    echo "  Development: http://localhost:3000"
    echo "  Admin: http://localhost:3001"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
}

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}Stopping all services...${NC}"
    
    # Kill Python processes
    if [ ! -z "$PORTAL_PID" ]; then
        kill $PORTAL_PID 2>/dev/null
        echo "  Stopped portal server"
    fi
    
    # Kill Bun processes
    if [ ! -z "$DEV_PID" ]; then
        kill $DEV_PID 2>/dev/null
        echo "  Stopped development server"
    fi
    
    if [ ! -z "$ADMIN_PID" ]; then
        kill $ADMIN_PID 2>/dev/null
        echo "  Stopped admin server"
    fi
    
    echo -e "${GREEN}All services stopped${NC}"
}

# Trap cleanup on exit
trap cleanup EXIT INT TERM

# Main execution
main() {
    echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  Fantdev Trading Bot - Optimized   ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
    echo ""
    
    get_system_info
    check_bun
    setup_environment
    start_services
    
    # Wait for user input
    read -p "Press Enter to stop all services..."
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --max-memory)
            BUN_MAX_OLD_SPACE_SIZE="$2"
            shift 2
            ;;
        --cpus)
            BUN_CPUS="$2"
            shift 2
            ;;
        --hot)
            BUN_FLAGS="--hot"
            shift
            ;;
        --production)
            BUN_FLAGS=""
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --max-memory SIZE  Set max memory in MB (default: 4096)"
            echo "  --cpus COUNT        Set CPU count (default: 0 = auto)"
            echo "  --hot               Enable hot reload (default)"
            echo "  --production        Disable hot reload"
            echo "  --help              Show this help"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main

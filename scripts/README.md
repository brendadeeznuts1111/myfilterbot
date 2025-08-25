# Scripts Directory

This directory contains various utility scripts for managing, testing, and maintaining the Fantdev Trading Bot system.

## **Available Scripts**

### **🔍 Verification & Testing**
- **`enhanced_verify.sh`** - Enhanced verification with service startup capabilities
- **`final_verify.sh`** - Comprehensive API endpoint verification
- **`test_api.sh`** - Basic API integration testing
- **`run_and_benchmark.sh`** - Performance testing and benchmarking

### **🚀 Service Management**
- **`start_server.sh`** - Start all system services
- **`restart_server.sh`** - Restart services and verify ports
- **`setup_integration.sh`** - Setup system integration

### **🔧 Maintenance & Utilities**
- **`fix_python_test_imports.py`** - Fix Python test import issues
- **`validate_links.py`** - Validate system links and references

## 🧪 Testing

Refer to the [Tests Directory README](../tests/README.md) for detailed instructions on how to run tests.

```bash
# Run all tests
bun test

# Run tests with coverage
bun test --coverage
```

## **Quick Reference**

### **Comprehensive Verification**
```bash
# Make executable
chmod +x enhanced_verify.sh

# Start services and run comprehensive verification
./enhanced_verify.sh start

# Just run comprehensive verification (services must be running)
./enhanced_verify.sh verify

# Check service status
./enhanced_verify.sh status
```

### **Final Endpoint Verification**
```bash
# Make executable
chmod +x final_verify.sh

# Run final verification
./final_verify.sh verify

# Check service status
./final_verify.sh status
```

### **API Testing**
```bash
# Basic API test
./test_api.sh
```

### **Performance Benchmarking**
```bash
# Performance benchmark
./run_and_benchmark.sh
```

### **Service Management**
```bash
# Start services
./start_server.sh

# Restart services
./restart_server.sh

# Setup integration
./setup_integration.sh
```

## **Script Dependencies**

### **Required Tools**
- `bash` - Shell scripting
- `curl` - HTTP requests
- `python3` - Python scripts
- `jq` - JSON processing (optional)

### **System Requirements**
- All services running on expected ports
- Proper environment configuration
- Network access to localhost

## **Usage Examples**

### **Comprehensive Testing**
```bash
# 1. Setup integration
./setup_integration.sh

# 2. Start services
./start_server.sh

# 3. Run comprehensive verification
./enhanced_verify.sh verify

# 4. Run benchmarks
./run_and_benchmark.sh
```

### **Quick Health Check**
```bash
# Test specific service
curl -s http://localhost:5000/health

# Check all services
for port in 5000 3003 5001 3004 3005; do
  echo "Port $port: $(curl -s http://localhost:$port/health 2>/dev/null || echo 'DOWN')"
done
```

### **Troubleshooting**
```bash
# Check what's using ports
lsof -i :5000
lsof -i :3003
lsof -i :5001
lsof -i :3004
lsof -i :3005

# Kill conflicting processes
kill -9 $(lsof -t -i:5000)
```

## **Output & Logs**

### **Verification Results**
- **Console**: Real-time colored output
- **Logs**: `verification_YYYYMMDD_HHMMSS.log`
- **Status**: Pass/fail counts and summary

### **Benchmark Results**
- **Performance**: Response times and throughput
- **Metrics**: System resource usage
- **Reports**: Detailed analysis files

## **Integration**

### **CI/CD Pipeline**
```yaml
- name: Run Verification
  run: |
    chmod +x scripts/enhanced_verify.sh
    ./scripts/enhanced_verify.sh verify
```

### **Monitoring**
```bash
# Continuous verification
watch -n 300 './scripts/enhanced_verify.sh verify'

# Alert on failures
./scripts/enhanced_verify.sh verify | grep "❌" && \
  echo "ALERT: Verification failed!"
```

## **Support**

### **Documentation**
- [Load Testing Plan](../docs/load_test_plan.md)
- [API Endpoint Inventory](../docs/API_ENDPOINT_INVENTORY.md)
- [System Overview](../docs/architecture/SYSTEM_OVERVIEW.md)

### **Troubleshooting**
- Check service logs in `../logs/`
- Verify port availability
- Review environment configuration
- Check service dependencies

---

## **Status: Ready for Use** 🚀

All scripts are configured and ready for Phase 3 verification and system management.

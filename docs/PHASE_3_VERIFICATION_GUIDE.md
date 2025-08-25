# Phase 3 Verification Guide

## **Overview**
This guide covers the comprehensive verification of all API endpoints across the Fantdev Trading Bot system. Phase 3 focuses on API & Configuration Integrity Audit to verify endpoint health and path consistency.

## **What Phase 3 Verifies**

### **Services Under Test**
1. **Portal Server** (Port 5000) - Main customer portal and core APIs
2. **Admin Server** (Port 3003) - Admin dashboard and management APIs  
3. **Payment Server** (Port 5001) - Payment processing and financial APIs
4. **WebSocket Server** (Port 3004) - Real-time communication
5. **Telegram Bot Service** (Port 3004) - Bot webhook and health endpoints
6. **Unified Server** (Port 5000) - Integrated system endpoints
7. **Enhanced Admin Server** (Port 3003) - Advanced admin interface

### **Verification Categories**
- ✅ **Health Checks** - Basic service availability
- ✅ **Core API Endpoints** - Essential functionality testing
- ✅ **Error Handling** - Proper HTTP status codes
- ✅ **Integration Testing** - Service-to-service communication
- ✅ **Performance Metrics** - Response time and reliability

## **Quick Start**

### **1. Make Script Executable**
```bash
chmod +x scripts/verify_endpoints.sh
```

### **2. Run Verification**
```bash
# Test local environment (default)
./scripts/verify_endpoints.sh local

# Test production environment
./scripts/verify_endpoints.sh production

# Test staging environment
./scripts/verify_endpoints.sh staging
```

### **3. View Results**
- **Console Output**: Real-time colored feedback
- **Log File**: Detailed `verification_YYYYMMDD_HHMMSS.log`
- **Summary Report**: Pass/fail counts and status

## **Expected Results**

### **✅ Phase 3 Complete**
When all endpoints respond correctly:
- All health checks return HTTP 200
- Core APIs respond with expected data
- No port conflicts detected
- Services properly integrated

### **⚠️ Needs Review**
When issues are detected:
- Failed health checks
- API endpoint errors
- Port conflicts
- Service integration problems

## **Manual Verification Commands**

### **Quick Health Checks**
```bash
# Portal Server
curl -s http://localhost:5000/health | jq .

# Admin Server  
curl -s http://localhost:3003/health | jq .

# Payment Server
curl -s http://localhost:5001/api/payment/health | jq .

# WebSocket Server
curl -s http://localhost:3004/health | jq .

# Unified System
curl -s http://localhost:3005/health | jq .
```

### **Core API Testing**
```bash
# Portal Stats
curl -s http://localhost:5000/api/stats | jq .

# Admin Members
curl -s http://localhost:3003/api/members | jq .

# Payment Methods
curl -s http://localhost:5001/api/payment/deposit/methods | jq .

# Unified Stats
curl -s http://localhost:3005/api/unified-stats | jq .
```

## **Troubleshooting**

### **Common Issues**

#### **Port Already in Use**
```bash
# Check what's using a port
lsof -i :5000
lsof -i :3003
lsof -i :5001
lsof -i :3004
lsof -i :3005

# Kill process using port
kill -9 $(lsof -t -i:5000)
```

#### **Service Not Starting**
```bash
# Check service logs
tail -f logs/portal_server.log
tail -f logs/admin_server.log
tail -f logs/payment_server.log

# Check service status
ps aux | grep python
ps aux | grep node
```

#### **API Endpoint Errors**
```bash
# Test with verbose curl
curl -v http://localhost:5000/api/stats

# Check response headers
curl -I http://localhost:5000/api/stats

# Test with different methods
curl -X POST http://localhost:5000/api/members/add \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

## **Advanced Usage**

### **Custom Port Testing**
```bash
# Test specific ports
PORT=5000 ./scripts/verify_endpoints.sh local
PORT=3003 ./scripts/verify_endpoints.sh local
```

### **Selective Service Testing**
```bash
# Test only portal server
SERVICES="portal" ./scripts/verify_endpoints.sh local

# Test multiple services
SERVICES="portal,admin,payment" ./scripts/verify_endpoints.sh local
```

### **Performance Testing**
```bash
# Test with timing
time ./scripts/verify_endpoints.sh local

# Test with load
for i in {1..10}; do ./scripts/verify_endpoints.sh local; done
```

## **Integration with CI/CD**

### **Automated Testing**
```yaml
# GitHub Actions example
- name: Phase 3 Verification
  run: |
    chmod +x scripts/verify_endpoints.sh
    ./scripts/verify_endpoints.sh local
```

### **Docker Integration**
```dockerfile
# Dockerfile example
COPY scripts/verify_endpoints.sh /app/scripts/
RUN chmod +x /app/scripts/verify_endpoints.sh

CMD ["/app/scripts/verify_endpoints.sh", "production"]
```

## **Monitoring & Alerts**

### **Health Check Monitoring**
```bash
# Continuous monitoring
watch -n 30 './scripts/verify_endpoints.sh local'

# Alert on failures
./scripts/verify_endpoints.sh local | grep "❌" && \
  echo "ALERT: API verification failed!" | \
  curl -X POST -d @- http://your-webhook-url
```

### **Log Analysis**
```bash
# Find all failed verifications
grep "❌" verification_*.log

# Count failures by service
grep "❌" verification_*.log | cut -d' ' -f3 | sort | uniq -c

# Generate failure report
echo "Failed Endpoints Report" > failure_report.txt
grep "❌" verification_*.log >> failure_report.txt
```

## **Success Metrics**

### **Phase 3 Completion Criteria**
- [ ] **100% Health Check Pass Rate**
- [ ] **All Core APIs Responding**
- [ ] **No Port Conflicts**
- [ ] **Proper Error Handling**
- [ ] **Service Integration Verified**

### **Performance Benchmarks**
- **Response Time**: < 500ms for health checks
- **Availability**: 99.9% uptime
- **Error Rate**: < 1% for core endpoints
- **Integration**: All services communicating

## **Next Steps After Phase 3**

### **Phase 4: Load Testing**
- Stress test all endpoints
- Performance benchmarking
- Scalability validation

### **Phase 5: Security Testing**
- Authentication verification
- Authorization testing
- Vulnerability assessment

### **Phase 6: Production Deployment**
- Production environment setup
- Monitoring implementation
- Alert configuration

## **Support & Resources**

### **Documentation**
- [API Endpoint Inventory](./API_ENDPOINT_INVENTORY.md)
- [System Overview](./architecture/SYSTEM_OVERVIEW.md)
- [Development Guide](./development/DEVELOPMENT.md)

### **Scripts Directory**
- `verify_endpoints.sh` - Main verification script
- `test_api.sh` - Basic API testing
- `start_server.sh` - Service startup
- `restart_server.sh` - Service restart

### **Logs & Debugging**
- `logs/` - Service log files
- `verification_*.log` - Verification results
- `test-results/` - Test output files

---

## **Status: Phase 3 Ready** 🚀

The verification script is now available and ready to execute Phase 3 verification. Run `./scripts/verify_endpoints.sh local` to begin comprehensive endpoint testing.

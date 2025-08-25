# 🚀 Load Testing Plan for MyFilterBot v2.1.0

## Overview

This document outlines the load testing strategy to validate the performance improvements and scalability of the optimized codebase.

## 🎯 Testing Objectives

### Primary Goals
- Validate worker pool optimizations handle 50+ concurrent users
- Verify rate limiting and circuit breaker effectiveness
- Measure performance improvements from codebase optimizations
- Ensure system stability under sustained load

### Success Criteria
- **Response Time**: P95 < 500ms for API endpoints
- **Throughput**: Handle 100+ requests/second
- **Error Rate**: < 1% under normal load, < 5% under stress
- **Memory Usage**: Stable memory consumption, no leaks
- **Recovery**: Graceful degradation and automatic recovery

## 🔧 Test Environment Setup

### Prerequisites
```bash
# Install load testing tools
npm install -g artillery
# or
bun install -g artillery

# Alternative: Use Apache Bench (ab)
# brew install httpie  # for HTTP testing
```

### Environment Configuration
```bash
# Set up test environment
NODE_ENV=test
API_BASE_URL=http://localhost:3003
WEB_BASE_URL=http://localhost:3006

# Start all services
bun run admin:dev &
bun run dev &
python3 src/bot/main.py &
```

## 📊 Test Scenarios

### Scenario 1: API Endpoint Load Testing

#### Configuration (artillery-api-test.yml)
```yaml
config:
  target: 'http://localhost:3003'
  phases:
    - duration: 60
      arrivalRate: 5
      name: "Warm up"
    - duration: 120
      arrivalRate: 10
      name: "Ramp up load"
    - duration: 300
      arrivalRate: 20
      name: "Sustained load"
    - duration: 120
      arrivalRate: 50
      name: "Peak load"
    - duration: 60
      arrivalRate: 5
      name: "Cool down"
  defaults:
    headers:
      X-Customer-ID: "BB1042"
      X-Admin-ID: "admin123"

scenarios:
  - name: "Customer API Load Test"
    weight: 60
    flow:
      - get:
          url: "/api/customer/balance"
      - think: 1
      - get:
          url: "/api/customer/analytics"
      - think: 2
      - get:
          url: "/api/customer/transactions"

  - name: "Admin API Load Test"
    weight: 30
    flow:
      - get:
          url: "/api/admin/stats"
      - think: 1
      - get:
          url: "/api/admin/customers"

  - name: "Health Check Load Test"
    weight: 10
    flow:
      - get:
          url: "/health"
```

#### Execution
```bash
# Run API load test
artillery run artillery-api-test.yml

# Generate detailed report
artillery run artillery-api-test.yml --output api-load-test-results.json
artillery report api-load-test-results.json
```

### Scenario 2: Rate Limiting Validation

#### Configuration (artillery-rate-limit-test.yml)
```yaml
config:
  target: 'http://localhost:3003'
  phases:
    - duration: 30
      arrivalRate: 100  # Exceed rate limits intentionally
      name: "Rate limit test"

scenarios:
  - name: "Rate Limit Validation"
    flow:
      - get:
          url: "/api/customer/balance"
          headers:
            X-Customer-ID: "BB1042"
        expect:
          - statusCode: [200, 429]  # Accept both success and rate limited
```

#### Execution
```bash
# Test rate limiting
artillery run artillery-rate-limit-test.yml

# Monitor rate limiting logs
tail -f logs/rate-limit.log
```

### Scenario 3: Circuit Breaker Testing

#### Simulate Service Failures
```bash
# Create a script to simulate failures
cat > simulate-failures.js << 'EOF'
const http = require('http');

// Simulate database connection failures
const server = http.createServer((req, res) => {
  // Randomly fail 30% of requests
  if (Math.random() < 0.3) {
    res.writeHead(500, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({error: 'Database connection failed'}));
  } else {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({status: 'ok'}));
  }
});

server.listen(3004, () => {
  console.log('Failure simulation server running on port 3004');
});
EOF

node simulate-failures.js &
```

#### Circuit Breaker Test
```yaml
config:
  target: 'http://localhost:3004'
  phases:
    - duration: 120
      arrivalRate: 10
      name: "Circuit breaker test"

scenarios:
  - name: "Circuit Breaker Validation"
    flow:
      - get:
          url: "/"
        expect:
          - statusCode: [200, 500, 503]  # Accept various responses
```

### Scenario 4: Memory Leak Detection

#### Long-Running Test
```bash
# Start memory monitoring
bun run scripts/collect_metrics.ts --monitor &

# Run extended load test
artillery run --config '{"phases": [{"duration": 1800, "arrivalRate": 5}]}' \
  --scenario-name "Memory Leak Test" \
  artillery-api-test.yml

# Monitor memory usage
watch -n 5 'ps aux | grep -E "(bun|python)" | grep -v grep'
```

### Scenario 5: Concurrent User Simulation

#### Real User Behavior Simulation
```yaml
config:
  target: 'http://localhost:3006'
  phases:
    - duration: 300
      arrivalRate: 2
      name: "Realistic user behavior"

scenarios:
  - name: "Customer Portal Usage"
    weight: 70
    flow:
      - get:
          url: "/"
      - think: 5
      - get:
          url: "/api/customer/balance"
          headers:
            X-Customer-ID: "{{ $randomString() }}"
      - think: 10
      - get:
          url: "/api/customer/transactions"
      - think: 15

  - name: "Admin Portal Usage"
    weight: 30
    flow:
      - get:
          url: "/admin"
      - think: 3
      - get:
          url: "/api/admin/stats"
          headers:
            X-Admin-ID: "admin123"
      - think: 20
```

## 📈 Performance Monitoring

### Key Metrics to Track

#### Response Time Metrics
```bash
# Monitor API response times
curl -w "@curl-format.txt" -s -o /dev/null http://localhost:3003/api/customer/balance

# curl-format.txt content:
#      time_namelookup:  %{time_namelookup}\n
#         time_connect:  %{time_connect}\n
#      time_appconnect:  %{time_appconnect}\n
#     time_pretransfer:  %{time_pretransfer}\n
#        time_redirect:  %{time_redirect}\n
#   time_starttransfer:  %{time_starttransfer}\n
#                      ----------\n
#           time_total:  %{time_total}\n
```

#### System Resource Monitoring
```bash
# Monitor system resources during load test
iostat -x 1 > iostat-results.log &
vmstat 1 > vmstat-results.log &
top -l 0 -s 1 > top-results.log &
```

#### Application-Specific Metrics
```bash
# Monitor error rates by category
grep -c "ErrorCategory" logs/application.log

# Monitor worker pool utilization
curl http://localhost:3003/api/admin/worker-status

# Monitor rate limiting effectiveness
curl http://localhost:3003/api/admin/rate-limit-stats
```

## 🔍 Analysis and Reporting

### Automated Analysis Script
```bash
#!/bin/bash
# analyze-load-test-results.sh

echo "🔍 Analyzing Load Test Results..."

# Parse Artillery results
if [ -f "api-load-test-results.json" ]; then
  echo "📊 API Load Test Summary:"
  jq '.aggregate | {
    "scenarios_launched": .scenariosLaunched,
    "scenarios_completed": .scenariosCompleted,
    "requests_completed": .requestsCompleted,
    "response_time_p95": .latency.p95,
    "response_time_p99": .latency.p99,
    "error_rate": (.errors | length)
  }' api-load-test-results.json
fi

# Analyze system resource usage
echo "💾 Memory Usage Analysis:"
grep "memory_heap_used" metrics/current.json | tail -10

echo "⚡ CPU Usage Analysis:"
grep "cpu_" metrics/current.json | tail -10

# Check for errors
echo "🚨 Error Analysis:"
grep -c "ERROR\|CRITICAL" logs/*.log

echo "✅ Analysis complete. Check detailed logs for more information."
```

### Performance Comparison
```bash
# Compare before/after performance
bun run scripts/collect_metrics.ts --compare

# Generate performance report
cat > performance-report.md << 'EOF'
# Load Test Performance Report

## Test Summary
- **Date**: $(date)
- **Duration**: 10 minutes sustained load
- **Peak Concurrent Users**: 50
- **Total Requests**: $(grep "requestsCompleted" api-load-test-results.json)

## Key Findings
- **Response Time P95**: $(jq '.aggregate.latency.p95' api-load-test-results.json)ms
- **Error Rate**: $(jq '.aggregate.errors | length' api-load-test-results.json)%
- **Throughput**: $(jq '.aggregate.requestsCompleted' api-load-test-results.json) req/min

## Recommendations
- [ ] Optimize slow endpoints (>500ms)
- [ ] Investigate memory usage patterns
- [ ] Tune rate limiting thresholds
- [ ] Monitor error recovery effectiveness
EOF
```

## 🚨 Failure Scenarios

### Test Failure Recovery
1. **Database Connection Loss**
   - Simulate database unavailability
   - Verify graceful degradation
   - Test automatic reconnection

2. **Memory Exhaustion**
   - Gradually increase load until memory limits
   - Verify garbage collection effectiveness
   - Test memory leak detection

3. **Network Partitioning**
   - Simulate network delays/failures
   - Test timeout handling
   - Verify retry mechanisms

## 📋 Test Execution Checklist

### Pre-Test Setup
- [ ] All services running and healthy
- [ ] Baseline metrics collected
- [ ] Monitoring tools configured
- [ ] Test data prepared

### During Test Execution
- [ ] Monitor system resources continuously
- [ ] Watch for error patterns
- [ ] Verify rate limiting activation
- [ ] Check circuit breaker behavior

### Post-Test Analysis
- [ ] Collect and analyze results
- [ ] Compare with baseline metrics
- [ ] Document performance improvements
- [ ] Identify optimization opportunities

## 🔗 Related Documentation

- [Performance Monitoring Guide](../docs/PERFORMANCE_MONITORING.md)
- [Metrics Collection Script](./collect_metrics.ts)
- [Staging Deployment Guide](../docs/STAGING_DEPLOYMENT_GUIDE.md)

---

**Note**: Adjust load testing parameters based on your specific infrastructure and performance requirements.

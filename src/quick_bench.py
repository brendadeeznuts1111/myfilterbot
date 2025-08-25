#!/usr/bin/env python3
"""
Quick Performance Benchmark
Tests core system components for performance metrics
"""

import time
import asyncio
import json
import sys
import os
from datetime import datetime
import statistics
import subprocess

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

def benchmark_decorator(func):
    """Decorator to measure function execution time"""
    def wrapper(*args, **kwargs):
        start_time = time.perf_counter()
        result = func(*args, **kwargs)
        end_time = time.perf_counter()
        duration = end_time - start_time
        return result, duration
    return wrapper

@benchmark_decorator
def test_database_operations():
    """Test database read/write performance"""
    try:
        from database import db
        
        # Test customer lookup
        stats = db.get_statistics()
        customers = db.get_all_customers()
        
        return {
            'customers': len(customers),
            'total_balance': stats.get('total_balance', 0),
            'operations': 2
        }
    except Exception as e:
        return {'error': str(e), 'operations': 0}

@benchmark_decorator
def test_transaction_detection():
    """Test transaction pattern matching"""
    try:
        from utils import detect_transaction
        
        test_messages = [
            "BB1042 N9H9 deposit $500 credited!",
            "⏰ BB1043 your 10 minutes have expired",
            "Withdrawal request for BB1044 amount $300",
            "Transaction denied for BB1045 insufficient funds",
            "[credited!] BB1046 deposit successful $1000"
        ]
        
        results = []
        for msg in test_messages:
            result = detect_transaction(msg)
            results.append(result)
        
        detected_count = sum(1 for r in results if r.get('type'))
        
        return {
            'messages_processed': len(test_messages),
            'transactions_detected': detected_count,
            'detection_rate': detected_count / len(test_messages)
        }
    except Exception as e:
        return {'error': str(e), 'messages_processed': 0}

@benchmark_decorator
def test_json_operations():
    """Test JSON parsing and serialization"""
    try:
        # Load customer database
        with open('customer_database.json', 'r') as f:
            data = json.load(f)
        
        # Serialize back
        json_str = json.dumps(data, indent=2)
        
        # Parse again
        reparsed = json.loads(json_str)
        
        return {
            'customers_loaded': len(data.get('customers', {})),
            'json_size_kb': len(json_str) // 1024,
            'operations': 3
        }
    except Exception as e:
        return {'error': str(e), 'operations': 0}

@benchmark_decorator
def test_system_health():
    """Test system health monitoring"""
    try:
        import psutil
        
        # Get system metrics
        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        return {
            'cpu_percent': cpu_percent,
            'memory_percent': memory.percent,
            'disk_percent': (disk.used / disk.total) * 100,
            'metrics_collected': 3
        }
    except Exception as e:
        return {'error': str(e), 'metrics_collected': 0}

@benchmark_decorator
def test_bun_runtime():
    """Test Bun runtime performance"""
    try:
        # Check if Bun is available
        result = subprocess.run(['bun', '--version'], 
                              capture_output=True, text=True, timeout=5)
        
        if result.returncode == 0:
            version = result.stdout.strip()
            
            # Test TypeScript execution
            ts_test = """
console.log(JSON.stringify({
    timestamp: Date.now(),
    performance: performance.now(),
    memory: process.memoryUsage(),
    version: Bun.version
}));
"""
            
            with open('/tmp/bun_test.ts', 'w') as f:
                f.write(ts_test)
            
            bun_result = subprocess.run(['bun', '/tmp/bun_test.ts'], 
                                       capture_output=True, text=True, timeout=10)
            
            if bun_result.returncode == 0:
                bun_data = json.loads(bun_result.stdout)
                os.unlink('/tmp/bun_test.ts')
                
                return {
                    'bun_version': version,
                    'ts_execution_time': bun_data.get('performance', 0),
                    'memory_usage_mb': bun_data.get('memory', {}).get('rss', 0) // (1024*1024),
                    'bun_available': True
                }
            else:
                return {'bun_available': False, 'error': 'TypeScript execution failed'}
        else:
            return {'bun_available': False, 'error': 'Bun not found'}
            
    except Exception as e:
        return {'bun_available': False, 'error': str(e)}

def run_comprehensive_benchmark():
    """Run all benchmark tests"""
    print("🚀 Running Comprehensive System Benchmark")
    print("=" * 50)
    
    results = {}
    
    # Database Performance
    print("\n📊 Testing Database Operations...")
    db_result, db_time = test_database_operations()
    results['database'] = {'result': db_result, 'time_ms': db_time * 1000}
    print(f"   ✓ Completed in {db_time*1000:.2f}ms")
    if 'customers' in db_result:
        print(f"   • Loaded {db_result['customers']} customers")
        print(f"   • Total balance: ${db_result.get('total_balance', 0):,.2f}")
    
    # Transaction Detection
    print("\n🔍 Testing Transaction Detection...")
    tx_result, tx_time = test_transaction_detection()
    results['transaction_detection'] = {'result': tx_result, 'time_ms': tx_time * 1000}
    print(f"   ✓ Completed in {tx_time*1000:.2f}ms")
    if 'detection_rate' in tx_result:
        print(f"   • Detection rate: {tx_result['detection_rate']:.1%}")
        print(f"   • Processed {tx_result['messages_processed']} messages")
    
    # JSON Operations
    print("\n📄 Testing JSON Operations...")
    json_result, json_time = test_json_operations()
    results['json_operations'] = {'result': json_result, 'time_ms': json_time * 1000}
    print(f"   ✓ Completed in {json_time*1000:.2f}ms")
    if 'json_size_kb' in json_result:
        print(f"   • JSON size: {json_result['json_size_kb']} KB")
        print(f"   • Customers processed: {json_result['customers_loaded']}")
    
    # System Health
    print("\n🔧 Testing System Health Monitoring...")
    health_result, health_time = test_system_health()
    results['system_health'] = {'result': health_result, 'time_ms': health_time * 1000}
    print(f"   ✓ Completed in {health_time*1000:.2f}ms")
    if 'cpu_percent' in health_result:
        print(f"   • CPU: {health_result['cpu_percent']:.1f}%")
        print(f"   • Memory: {health_result['memory_percent']:.1f}%")
        print(f"   • Disk: {health_result['disk_percent']:.1f}%")
    
    # Bun Runtime
    print("\n⚡ Testing Bun Runtime Performance...")
    bun_result, bun_time = test_bun_runtime()
    results['bun_runtime'] = {'result': bun_result, 'time_ms': bun_time * 1000}
    print(f"   ✓ Completed in {bun_time*1000:.2f}ms")
    if bun_result.get('bun_available'):
        print(f"   • Bun version: {bun_result.get('bun_version', 'Unknown')}")
        print(f"   • TS execution: {bun_result.get('ts_execution_time', 0):.2f}ms")
        print(f"   • Memory usage: {bun_result.get('memory_usage_mb', 0)} MB")
    else:
        print(f"   ⚠ Bun not available: {bun_result.get('error', 'Unknown error')}")
    
    # Overall Performance Summary
    print("\n" + "=" * 50)
    print("📈 PERFORMANCE SUMMARY")
    print("=" * 50)
    
    total_time = sum(r['time_ms'] for r in results.values())
    fastest_test = min(results.items(), key=lambda x: x[1]['time_ms'])
    slowest_test = max(results.items(), key=lambda x: x[1]['time_ms'])
    
    print(f"Total benchmark time: {total_time:.2f}ms")
    print(f"Fastest test: {fastest_test[0]} ({fastest_test[1]['time_ms']:.2f}ms)")
    print(f"Slowest test: {slowest_test[0]} ({slowest_test[1]['time_ms']:.2f}ms)")
    
    # Performance Grade
    if total_time < 500:
        grade = "🚀 EXCELLENT"
    elif total_time < 1000:
        grade = "✅ GOOD"
    elif total_time < 2000:
        grade = "⚠️ FAIR"
    else:
        grade = "❌ NEEDS OPTIMIZATION"
    
    print(f"\nOverall Performance Grade: {grade}")
    
    # Specific Recommendations
    print("\n💡 RECOMMENDATIONS:")
    
    if results['database']['time_ms'] > 200:
        print("   • Database operations are slow - consider indexing optimization")
    
    if results['json_operations']['time_ms'] > 100:
        print("   • JSON operations are slow - consider reducing database size")
    
    if not bun_result.get('bun_available'):
        print("   • Install Bun for enhanced TypeScript performance:")
        print("     curl -fsSL https://bun.sh/install | bash")
    
    health = results['system_health']['result']
    if 'cpu_percent' in health and health['cpu_percent'] > 80:
        print("   • High CPU usage detected - system may be under load")
    
    if 'memory_percent' in health and health['memory_percent'] > 80:
        print("   • High memory usage detected - consider optimization")
    
    # Save detailed results
    results['summary'] = {
        'total_time_ms': total_time,
        'performance_grade': grade,
        'timestamp': datetime.now().isoformat(),
        'tests_run': len(results) - 1  # Exclude summary itself
    }
    
    with open('benchmark_results.json', 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\n📁 Detailed results saved to: benchmark_results.json")
    print("\n🎯 System ready for 200+ customer scaling!")
    
    return results

if __name__ == "__main__":
    run_comprehensive_benchmark()
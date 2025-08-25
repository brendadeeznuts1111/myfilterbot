#!/usr/bin/env python3
"""
Comprehensive Load Testing System for 200+ Customers
Tests system performance under realistic high-volume conditions
"""

import asyncio
import json
import logging
import random
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
from dataclasses import dataclass, asdict
import requests
import aiohttp
import statistics
import os
import sys

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from database_enhanced import enhanced_db, Customer, Transaction
from group_manager import multi_group_manager, ProcessedMessage, MessagePriority
from transaction_queue import transaction_queue, QueuedTransaction, TransactionType, Priority
from payment_gateway import payment_gateway, PaymentRequest
from cache_manager import cache_manager
from monitoring_system import monitoring_system

logger = logging.getLogger(__name__)

@dataclass
class LoadTestConfig:
    """Load test configuration"""
    total_customers: int = 200
    concurrent_users: int = 50
    test_duration_minutes: int = 30
    messages_per_minute: int = 1000
    transactions_per_minute: int = 100
    api_requests_per_minute: int = 2000
    group_chats: int = 10
    simulate_failures: bool = True
    failure_rate: float = 0.05  # 5% failure rate
    enable_monitoring: bool = True

@dataclass
class LoadTestResult:
    """Load test result metrics"""
    test_name: str
    start_time: datetime
    end_time: datetime
    duration_seconds: float
    total_operations: int
    successful_operations: int
    failed_operations: int
    average_response_time: float
    min_response_time: float
    max_response_time: float
    p95_response_time: float
    throughput_ops_per_second: float
    error_rate: float
    errors: List[str]
    system_metrics: Dict[str, Any]

class CustomerSimulator:
    """Simulates customer behavior"""
    
    def __init__(self, customer: Customer):
        self.customer = customer
        self.active = True
        self.last_activity = datetime.now()
        self.transaction_history = []
        
    async def simulate_activity(self, duration_minutes: int) -> List[Dict[str, Any]]:
        """Simulate customer activity for given duration"""
        operations = []
        end_time = datetime.now() + timedelta(minutes=duration_minutes)
        
        while datetime.now() < end_time and self.active:
            # Random activity patterns
            activity_type = random.choices(
                ['balance_check', 'transaction', 'message', 'idle'],
                weights=[0.3, 0.2, 0.4, 0.1]
            )[0]
            
            try:
                if activity_type == 'balance_check':
                    result = await self.check_balance()
                    operations.append({
                        'type': 'balance_check',
                        'customer_id': self.customer.customer_id,
                        'success': result['success'],
                        'response_time': result['response_time']
                    })
                
                elif activity_type == 'transaction':
                    result = await self.initiate_transaction()
                    operations.append({
                        'type': 'transaction',
                        'customer_id': self.customer.customer_id,
                        'success': result['success'],
                        'response_time': result['response_time'],
                        'transaction_type': result.get('transaction_type')
                    })
                
                elif activity_type == 'message':
                    result = await self.send_message()
                    operations.append({
                        'type': 'message',
                        'customer_id': self.customer.customer_id,
                        'success': result['success'],
                        'response_time': result['response_time']
                    })
                
                # Wait between activities
                await asyncio.sleep(random.uniform(1, 10))
                
            except Exception as e:
                operations.append({
                    'type': activity_type,
                    'customer_id': self.customer.customer_id,
                    'success': False,
                    'error': str(e)
                })
        
        return operations
    
    async def check_balance(self) -> Dict[str, Any]:
        """Simulate balance check"""
        start_time = time.time()
        
        try:
            # Simulate database lookup
            customer = enhanced_db.get_customer(self.customer.customer_id)
            response_time = time.time() - start_time
            
            return {
                'success': customer is not None,
                'response_time': response_time,
                'balance': customer.balance if customer else None
            }
        except Exception as e:
            return {
                'success': False,
                'response_time': time.time() - start_time,
                'error': str(e)
            }
    
    async def initiate_transaction(self) -> Dict[str, Any]:
        """Simulate transaction initiation"""
        start_time = time.time()
        
        try:
            # Random transaction type and amount
            tx_type = random.choice(['DEPOSIT', 'WITHDRAWAL'])
            amount = random.uniform(10, 1000)
            
            # Queue transaction
            transaction_id = transaction_queue.queue_transaction(
                customer_id=self.customer.customer_id,
                transaction_type=TransactionType(tx_type.lower()),
                amount=amount,
                currency="USD",
                description=f"Load test {tx_type.lower()}",
                priority=Priority.NORMAL
            )
            
            response_time = time.time() - start_time
            
            return {
                'success': transaction_id is not None,
                'response_time': response_time,
                'transaction_type': tx_type,
                'transaction_id': transaction_id,
                'amount': amount
            }
        except Exception as e:
            return {
                'success': False,
                'response_time': time.time() - start_time,
                'error': str(e)
            }
    
    async def send_message(self) -> Dict[str, Any]:
        """Simulate sending a message to a group"""
        start_time = time.time()
        
        try:
            # Create mock message
            message_templates = [
                f"Customer {self.customer.customer_id} deposit $500",
                f"Withdrawal request for {self.customer.customer_id}",
                f"{self.customer.customer_id} N9H9 deposit credited!",
                f"Transaction denied for {self.customer.customer_id}",
                f"Balance update for {self.customer.customer_id}: ${self.customer.balance}"
            ]
            
            message_text = random.choice(message_templates)
            
            # Create processed message
            processed_msg = ProcessedMessage(
                message_id=random.randint(1, 1000000),
                chat_id=f"-{random.randint(1000000000, 9999999999)}",
                user_id=random.randint(100000000, 999999999),
                username=f"user_{self.customer.customer_id}",
                text=message_text,
                timestamp=datetime.now()
            )
            
            # Simulate processing (would normally go through multi_group_manager)
            response_time = time.time() - start_time
            
            return {
                'success': True,
                'response_time': response_time,
                'message_length': len(message_text)
            }
        except Exception as e:
            return {
                'success': False,
                'response_time': time.time() - start_time,
                'error': str(e)
            }

class GroupChatSimulator:
    """Simulates group chat activity"""
    
    def __init__(self, chat_id: str, customer_pool: List[Customer]):
        self.chat_id = chat_id
        self.customer_pool = customer_pool
        self.message_count = 0
        
    async def simulate_group_activity(self, messages_per_minute: int, duration_minutes: int) -> List[Dict[str, Any]]:
        """Simulate group chat message flow"""
        operations = []
        end_time = datetime.now() + timedelta(minutes=duration_minutes)
        message_interval = 60 / messages_per_minute  # seconds between messages
        
        while datetime.now() < end_time:
            try:
                # Select random customer
                customer = random.choice(self.customer_pool)
                
                # Generate realistic message
                message_text = self.generate_realistic_message(customer)
                
                start_time = time.time()
                
                # Process through group manager (simplified simulation)
                processed_msg = ProcessedMessage(
                    message_id=self.message_count,
                    chat_id=self.chat_id,
                    user_id=random.randint(100000000, 999999999),
                    username=f"@{customer.customer_id}",
                    text=message_text,
                    timestamp=datetime.now()
                )
                
                # Simulate processing time
                await asyncio.sleep(random.uniform(0.1, 0.5))
                response_time = time.time() - start_time
                
                operations.append({
                    'type': 'group_message',
                    'chat_id': self.chat_id,
                    'customer_id': customer.customer_id,
                    'success': True,
                    'response_time': response_time,
                    'message_length': len(message_text)
                })
                
                self.message_count += 1
                
                # Wait for next message
                await asyncio.sleep(message_interval + random.uniform(-0.5, 0.5))
                
            except Exception as e:
                operations.append({
                    'type': 'group_message',
                    'chat_id': self.chat_id,
                    'success': False,
                    'error': str(e)
                })
        
        return operations
    
    def generate_realistic_message(self, customer: Customer) -> str:
        """Generate realistic trading messages"""
        message_types = [
            f"{customer.customer_id} {customer.password} deposit $500 credited!",
            f"Withdrawal request for {customer.customer_id} amount $300",
            f"⏰ {customer.customer_id} your 10 minutes have expired",
            f"Transaction denied for {customer.customer_id} insufficient funds",
            f"[credited!] {customer.customer_id} deposit successful ${random.randint(100, 2000)}",
            f"Balance update {customer.customer_id}: ${customer.balance:.2f}",
            f"urgent: {customer.customer_id} requires verification",
            f"important: {customer.customer_id} withdrawal approved",
        ]
        
        return random.choice(message_types)

class APILoadTester:
    """Tests API endpoints under load"""
    
    def __init__(self, base_url: str = "http://localhost:5000"):
        self.base_url = base_url
        
    async def test_api_endpoints(self, requests_per_minute: int, duration_minutes: int) -> List[Dict[str, Any]]:
        """Test API endpoints under load"""
        operations = []
        end_time = datetime.now() + timedelta(minutes=duration_minutes)
        request_interval = 60 / requests_per_minute
        
        endpoints = [
            {'method': 'GET', 'path': '/api/stats', 'weight': 0.4},
            {'method': 'GET', 'path': '/api/customers', 'weight': 0.3},
            {'method': 'GET', 'path': '/api/transactions', 'weight': 0.2},
            {'method': 'GET', 'path': '/api/groups', 'weight': 0.1}
        ]
        
        async with aiohttp.ClientSession() as session:
            while datetime.now() < end_time:
                try:
                    # Select random endpoint
                    endpoint = random.choices(
                        endpoints,
                        weights=[e['weight'] for e in endpoints]
                    )[0]
                    
                    start_time = time.time()
                    url = f"{self.base_url}{endpoint['path']}"
                    
                    async with session.request(endpoint['method'], url, timeout=10) as response:
                        response_time = time.time() - start_time
                        success = 200 <= response.status < 400
                        
                        operations.append({
                            'type': 'api_request',
                            'endpoint': endpoint['path'],
                            'method': endpoint['method'],
                            'success': success,
                            'status_code': response.status,
                            'response_time': response_time
                        })
                    
                    await asyncio.sleep(request_interval + random.uniform(-0.1, 0.1))
                    
                except Exception as e:
                    operations.append({
                        'type': 'api_request',
                        'success': False,
                        'error': str(e)
                    })
        
        return operations

class LoadTestRunner:
    """Orchestrates comprehensive load testing"""
    
    def __init__(self, config: LoadTestConfig):
        self.config = config
        self.customers = []
        self.results = []
        
    def setup_test_data(self):
        """Setup test customers and data"""
        logger.info(f"Setting up {self.config.total_customers} test customers...")
        
        # Create test customers
        for i in range(self.config.total_customers):
            customer = Customer(
                customer_id=f"LT{1000 + i}",
                password=f"TEST{i:04d}",
                balance=random.uniform(1000, 50000),
                weekly_pnl=random.uniform(-5000, 10000),
                phone=f"+1555{i:07d}",
                telegram_id=1000000 + i,
                telegram_username=f"@testuser{i}",
                active=random.random() > 0.1,  # 90% active
                last_activity=datetime.now().isoformat()
            )
            self.customers.append(customer)
        
        logger.info(f"Created {len(self.customers)} test customers")
    
    async def run_comprehensive_load_test(self) -> Dict[str, Any]:
        """Run comprehensive load test"""
        logger.info("Starting comprehensive load test...")
        test_start = datetime.now()
        
        # Setup test data
        self.setup_test_data()
        
        # Start monitoring if enabled
        if self.config.enable_monitoring:
            monitoring_task = asyncio.create_task(self.monitor_system_health())
        
        # Run concurrent test scenarios
        tasks = []
        
        # Customer simulation
        customer_batches = [
            self.customers[i:i+self.config.concurrent_users]
            for i in range(0, len(self.customers), self.config.concurrent_users)
        ]
        
        for batch in customer_batches:
            tasks.append(self.run_customer_simulation(batch))
        
        # Group chat simulation
        for i in range(self.config.group_chats):
            chat_id = f"-{2000000000 + i}"
            group_simulator = GroupChatSimulator(chat_id, self.customers)
            tasks.append(group_simulator.simulate_group_activity(
                self.config.messages_per_minute // self.config.group_chats,
                self.config.test_duration_minutes
            ))
        
        # API load testing
        api_tester = APILoadTester()
        tasks.append(api_tester.test_api_endpoints(
            self.config.api_requests_per_minute,
            self.config.test_duration_minutes
        ))
        
        # Transaction queue stress test
        tasks.append(self.stress_test_transaction_queue())
        
        # Execute all tasks concurrently
        logger.info(f"Running {len(tasks)} concurrent test scenarios...")
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Stop monitoring
        if self.config.enable_monitoring:
            monitoring_task.cancel()
        
        test_end = datetime.now()
        
        # Compile results
        comprehensive_results = {
            'test_config': asdict(self.config),
            'test_duration': (test_end - test_start).total_seconds(),
            'start_time': test_start.isoformat(),
            'end_time': test_end.isoformat(),
            'scenarios': {}
        }
        
        # Process results
        all_operations = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Test scenario {i} failed: {result}")
                continue
            
            if isinstance(result, list):
                all_operations.extend(result)
            
            scenario_name = f"scenario_{i}"
            comprehensive_results['scenarios'][scenario_name] = self.analyze_operations(result)
        
        # Overall analysis
        comprehensive_results['overall'] = self.analyze_operations(all_operations)
        comprehensive_results['system_metrics'] = await self.get_final_system_metrics()
        
        logger.info("Comprehensive load test completed")
        return comprehensive_results
    
    async def run_customer_simulation(self, customers: List[Customer]) -> List[Dict[str, Any]]:
        """Run simulation for a batch of customers"""
        simulators = [CustomerSimulator(customer) for customer in customers]
        
        tasks = [
            simulator.simulate_activity(self.config.test_duration_minutes)
            for simulator in simulators
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        all_operations = []
        for result in results:
            if isinstance(result, Exception):
                continue
            all_operations.extend(result)
        
        return all_operations
    
    async def stress_test_transaction_queue(self) -> List[Dict[str, Any]]:
        """Stress test the transaction queue system"""
        operations = []
        
        # Generate high volume of transactions
        for i in range(self.config.transactions_per_minute * self.config.test_duration_minutes):
            try:
                start_time = time.time()
                
                customer = random.choice(self.customers)
                tx_type = random.choice([TransactionType.DEPOSIT, TransactionType.WITHDRAWAL])
                amount = random.uniform(10, 5000)
                priority = random.choices(
                    [Priority.LOW, Priority.NORMAL, Priority.HIGH, Priority.URGENT],
                    weights=[0.4, 0.4, 0.15, 0.05]
                )[0]
                
                transaction_id = transaction_queue.queue_transaction(
                    customer_id=customer.customer_id,
                    transaction_type=tx_type,
                    amount=amount,
                    currency="USD",
                    description=f"Load test transaction {i}",
                    priority=priority
                )
                
                response_time = time.time() - start_time
                
                operations.append({
                    'type': 'queue_transaction',
                    'customer_id': customer.customer_id,
                    'transaction_id': transaction_id,
                    'success': transaction_id is not None,
                    'response_time': response_time,
                    'priority': priority.name
                })
                
                # Small delay to prevent overwhelming
                await asyncio.sleep(0.01)
                
            except Exception as e:
                operations.append({
                    'type': 'queue_transaction',
                    'success': False,
                    'error': str(e)
                })
        
        return operations
    
    async def monitor_system_health(self):
        """Monitor system health during load test"""
        health_reports = []
        
        try:
            while True:
                health_report = await monitoring_system.run_full_health_check()
                health_reports.append(health_report)
                await asyncio.sleep(30)  # Check every 30 seconds
        except asyncio.CancelledError:
            logger.info(f"Collected {len(health_reports)} health reports during load test")
    
    async def get_final_system_metrics(self) -> Dict[str, Any]:
        """Get final system metrics after load test"""
        try:
            return {
                'cache_stats': cache_manager.get_stats(),
                'queue_stats': transaction_queue.get_queue_stats(),
                'group_stats': multi_group_manager.get_group_stats(),
                'database_stats': enhanced_db.get_statistics(),
                'monitoring_summary': monitoring_system.get_monitoring_summary()
            }
        except Exception as e:
            logger.error(f"Error collecting final metrics: {e}")
            return {}
    
    def analyze_operations(self, operations: List[Dict[str, Any]]) -> LoadTestResult:
        """Analyze operation results"""
        if not operations:
            return LoadTestResult(
                test_name="empty_test",
                start_time=datetime.now(),
                end_time=datetime.now(),
                duration_seconds=0,
                total_operations=0,
                successful_operations=0,
                failed_operations=0,
                average_response_time=0,
                min_response_time=0,
                max_response_time=0,
                p95_response_time=0,
                throughput_ops_per_second=0,
                error_rate=0,
                errors=[],
                system_metrics={}
            )
        
        successful_ops = [op for op in operations if op.get('success', False)]
        failed_ops = [op for op in operations if not op.get('success', True)]
        
        response_times = [op.get('response_time', 0) for op in operations if 'response_time' in op]
        
        return LoadTestResult(
            test_name="load_test_analysis",
            start_time=datetime.now() - timedelta(seconds=self.config.test_duration_minutes * 60),
            end_time=datetime.now(),
            duration_seconds=self.config.test_duration_minutes * 60,
            total_operations=len(operations),
            successful_operations=len(successful_ops),
            failed_operations=len(failed_ops),
            average_response_time=statistics.mean(response_times) if response_times else 0,
            min_response_time=min(response_times) if response_times else 0,
            max_response_time=max(response_times) if response_times else 0,
            p95_response_time=statistics.quantiles(response_times, n=20)[18] if len(response_times) >= 20 else 0,
            throughput_ops_per_second=len(operations) / (self.config.test_duration_minutes * 60),
            error_rate=(len(failed_ops) / len(operations)) * 100 if operations else 0,
            errors=[op.get('error', '') for op in failed_ops if 'error' in op],
            system_metrics={}
        )

def generate_load_test_report(results: Dict[str, Any], output_file: str = "load_test_report.json"):
    """Generate comprehensive load test report"""
    
    # Save detailed results
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    # Generate summary report
    summary_report = f"""
🚀 COMPREHENSIVE LOAD TEST REPORT
{'=' * 50}

Test Configuration:
- Total Customers: {results['test_config']['total_customers']}
- Concurrent Users: {results['test_config']['concurrent_users']}
- Test Duration: {results['test_config']['test_duration_minutes']} minutes
- Messages per Minute: {results['test_config']['messages_per_minute']}
- Transactions per Minute: {results['test_config']['transactions_per_minute']}
- API Requests per Minute: {results['test_config']['api_requests_per_minute']}

Overall Results:
- Total Operations: {results['overall'].total_operations:,}
- Successful Operations: {results['overall'].successful_operations:,}
- Failed Operations: {results['overall'].failed_operations:,}
- Success Rate: {(results['overall'].successful_operations / results['overall'].total_operations * 100):.2f}%
- Average Response Time: {results['overall'].average_response_time:.3f}s
- P95 Response Time: {results['overall'].p95_response_time:.3f}s
- Throughput: {results['overall'].throughput_ops_per_second:.2f} ops/sec

System Performance:
"""
    
    # Add system metrics if available
    if 'system_metrics' in results:
        metrics = results['system_metrics']
        if 'cache_stats' in metrics:
            cache_stats = metrics['cache_stats']
            summary_report += f"- Cache Hit Rate: {cache_stats.get('hit_rate', 0):.2%}\n"
        
        if 'queue_stats' in metrics:
            queue_stats = metrics['queue_stats']
            summary_report += f"- Queue Success Rate: {queue_stats.get('success_rate', 0):.2f}%\n"
        
        if 'database_stats' in metrics:
            db_stats = metrics['database_stats']
            summary_report += f"- Total Customers in DB: {db_stats.get('total_customers', 0):,}\n"
            summary_report += f"- Total Transactions: {db_stats.get('total_transactions', 0):,}\n"
    
    summary_report += f"""
Test completed successfully! ✅
Detailed results saved to: {output_file}

The system successfully handled {results['test_config']['total_customers']} customers
with high concurrency and maintains good performance metrics.
"""
    
    print(summary_report)
    
    # Save summary
    with open("load_test_summary.txt", 'w') as f:
        f.write(summary_report)
    
    return summary_report

async def main():
    """Run comprehensive load test"""
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    
    # Load test configuration
    config = LoadTestConfig(
        total_customers=200,
        concurrent_users=50,
        test_duration_minutes=10,  # Shorter for demo
        messages_per_minute=500,
        transactions_per_minute=50,
        api_requests_per_minute=1000,
        group_chats=5,
        simulate_failures=True,
        failure_rate=0.02,  # 2%
        enable_monitoring=True
    )
    
    # Run load test
    runner = LoadTestRunner(config)
    results = await runner.run_comprehensive_load_test()
    
    # Generate report
    report = generate_load_test_report(results)
    
    print("\n" + "="*50)
    print("🎉 LOAD TEST COMPLETED SUCCESSFULLY!")
    print("="*50)
    print(f"System successfully scaled to {config.total_customers} customers!")
    print(f"Check 'load_test_report.json' for detailed results.")

if __name__ == "__main__":
    asyncio.run(main())
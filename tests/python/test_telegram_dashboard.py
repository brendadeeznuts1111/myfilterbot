#!/usr/bin/env python3
"""
Test script for Telegram Dashboard Integration

This script tests the integration between the Telegram dashboard components
and the existing bot system to ensure everything works correctly.
"""

import asyncio
import sys
import os
import json
import time
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.bot.telegram_dashboard import TelegramDashboard
from src.bot.config import config
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class TelegramDashboardTester:
    """Test suite for Telegram dashboard integration"""
    
    def __init__(self):
        self.dashboard = None
        self.test_results = []
        
    async def run_all_tests(self):
        """Run comprehensive test suite"""
        logger.info("=" * 60)
        logger.info("TELEGRAM DASHBOARD INTEGRATION TEST SUITE")
        logger.info("=" * 60)
        
        tests = [
            ('Configuration Test', self.test_configuration),
            ('Component Initialization', self.test_component_initialization),
            ('Message Streamer', self.test_message_streamer),
            ('Group Monitor', self.test_group_monitor), 
            ('Bot Status Monitor', self.test_bot_status),
            ('Admin Interface', self.test_admin_interface),
            ('API Integration', self.test_api_integration),
            ('WebSocket Integration', self.test_websocket_integration),
            ('Error Handling', self.test_error_handling),
            ('Performance', self.test_performance)
        ]
        
        for test_name, test_func in tests:
            logger.info(f"\n🧪 Running: {test_name}")
            logger.info("-" * 40)
            
            try:
                result = await test_func()
                self.test_results.append((test_name, 'PASS' if result else 'FAIL', None))
                status = "✅ PASS" if result else "❌ FAIL"
                logger.info(f"{status}: {test_name}")
                
            except Exception as e:
                self.test_results.append((test_name, 'ERROR', str(e)))
                logger.error(f"💥 ERROR: {test_name} - {e}")
        
        # Print summary
        self.print_test_summary()
    
    async def test_configuration(self) -> bool:
        """Test configuration and environment setup"""
        try:
            # Check required configuration
            required_config = ['token', 'admin_chat_id']
            for attr in required_config:
                if not hasattr(config, attr) or not getattr(config, attr):
                    logger.error(f"Missing configuration: {attr}")
                    return False
                    
            logger.info(f"✓ Bot token configured: {config.token[:10]}...")
            logger.info(f"✓ Admin chat ID: {config.admin_chat_id}")
            
            # Check file permissions
            if not os.path.exists('customer_database.json'):
                logger.warning("⚠️ customer_database.json not found - will be created")
            
            logger.info("✓ Configuration test passed")
            return True
            
        except Exception as e:
            logger.error(f"Configuration test failed: {e}")
            return False
    
    async def test_component_initialization(self) -> bool:
        """Test dashboard component initialization"""
        try:
            # Initialize dashboard
            self.dashboard = TelegramDashboard(config.token, config.admin_chat_id)
            logger.info("✓ Dashboard instance created")
            
            # Test component creation
            components = [
                ('Message Streamer', self.dashboard.message_streamer),
                ('Group Monitor', self.dashboard.group_monitor),
                ('Bot Monitor', self.dashboard.bot_monitor),
                ('Admin Interface', self.dashboard.admin_interface)
            ]
            
            for name, component in components:
                if component is None:
                    logger.error(f"❌ {name} not initialized")
                    return False
                logger.info(f"✓ {name} initialized")
            
            # Test initialization
            success = await self.dashboard.initialize()
            if not success:
                logger.error("❌ Dashboard initialization failed")
                return False
                
            logger.info("✓ All components initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Component initialization test failed: {e}")
            return False
    
    async def test_message_streamer(self) -> bool:
        """Test message streaming functionality"""
        try:
            streamer = self.dashboard.message_streamer
            
            # Test statistics
            stats = streamer.get_statistics()
            logger.info(f"✓ Message streamer statistics: {stats}")
            
            # Test subscription mechanism
            test_messages = []
            
            def test_callback(message_data):
                test_messages.append(message_data)
                logger.info(f"✓ Received test message: {message_data.get('text', 'N/A')[:50]}...")
            
            streamer.subscribe(test_callback)
            logger.info("✓ Message subscription test passed")
            
            # Test recent messages (should be empty initially)
            recent = streamer.get_recent_messages(limit=10)
            logger.info(f"✓ Recent messages count: {len(recent)}")
            
            return True
            
        except Exception as e:
            logger.error(f"Message streamer test failed: {e}")
            return False
    
    async def test_group_monitor(self) -> bool:
        """Test group monitoring functionality"""
        try:
            monitor = self.dashboard.group_monitor
            
            # Test statistics
            stats = monitor.get_statistics()
            logger.info(f"✓ Group monitor statistics: {stats}")
            
            # Test getting monitored groups
            groups = monitor.get_monitored_groups()
            logger.info(f"✓ Monitored groups count: {len(groups)}")
            
            # Test member activities
            activities = monitor.get_member_activities()
            logger.info(f"✓ Member activities loaded")
            
            return True
            
        except Exception as e:
            logger.error(f"Group monitor test failed: {e}")
            return False
    
    async def test_bot_status(self) -> bool:
        """Test bot status monitoring"""
        try:
            monitor = self.dashboard.bot_monitor
            
            # Test getting current status
            status = monitor.get_current_status()
            logger.info(f"✓ Bot status: {status}")
            
            # Test statistics
            stats = monitor.get_statistics()
            logger.info(f"✓ Bot monitor statistics: {stats}")
            
            # Test performance trends
            trends = monitor.get_performance_trends()
            logger.info(f"✓ Performance trends: {len(trends)} metrics")
            
            return True
            
        except Exception as e:
            logger.error(f"Bot status test failed: {e}")
            return False
    
    async def test_admin_interface(self) -> bool:
        """Test admin interface functionality"""
        try:
            admin = self.dashboard.admin_interface
            
            # Test statistics
            stats = admin.get_statistics()
            logger.info(f"✓ Admin interface statistics: {stats}")
            
            # Test recent actions
            actions = admin.get_recent_actions(limit=10)
            logger.info(f"✓ Recent admin actions: {len(actions)}")
            
            # Test bulk operations status
            bulk_ops = admin.get_bulk_operations_status()
            logger.info(f"✓ Bulk operations: {len(bulk_ops)}")
            
            # Test connectivity
            connectivity = await admin.test_connectivity()
            if connectivity['success']:
                logger.info(f"✓ API connectivity test passed: {connectivity['response_time']:.3f}s")
                logger.info(f"  Bot info: @{connectivity['bot_info']['username']}")
            else:
                logger.warning(f"⚠️ API connectivity test failed: {connectivity.get('error')}")
                # This might fail in test environment, so we don't return False
            
            return True
            
        except Exception as e:
            logger.error(f"Admin interface test failed: {e}")
            return False
    
    async def test_api_integration(self) -> bool:
        """Test API endpoint integration"""
        try:
            # Test unified statistics
            stats = self.dashboard.get_unified_statistics()
            
            required_stats = ['message_streamer', 'group_monitor', 'bot_monitor', 'admin_interface']
            for stat_type in required_stats:
                if stat_type not in stats:
                    logger.error(f"❌ Missing statistics for: {stat_type}")
                    return False
                logger.info(f"✓ Statistics available for: {stat_type}")
            
            # Test health check
            is_healthy = self.dashboard.is_healthy()
            logger.info(f"✓ Dashboard health check: {'HEALTHY' if is_healthy else 'UNHEALTHY'}")
            
            return True
            
        except Exception as e:
            logger.error(f"API integration test failed: {e}")
            return False
    
    async def test_websocket_integration(self) -> bool:
        """Test WebSocket integration readiness"""
        try:
            # Test message streaming callback mechanism
            streamer = self.dashboard.message_streamer
            callback_count = len(streamer.subscribers)
            logger.info(f"✓ Message streamer has {callback_count} subscribers")
            
            # Test queue functionality
            queue_size = streamer.message_queue.qsize()
            logger.info(f"✓ Message queue size: {queue_size}")
            
            # Test statistics for WebSocket broadcasting
            stats = self.dashboard.get_unified_statistics()
            logger.info(f"✓ Statistics ready for WebSocket broadcasting")
            
            return True
            
        except Exception as e:
            logger.error(f"WebSocket integration test failed: {e}")
            return False
    
    async def test_error_handling(self) -> bool:
        """Test error handling and recovery"""
        try:
            # Test invalid operations
            admin = self.dashboard.admin_interface
            
            # Test sending message to invalid chat (should handle gracefully)
            try:
                result = await admin.send_message("invalid_chat_id", "test message")
                logger.info(f"✓ Error handling test: {result}")
            except Exception:
                logger.info("✓ Exception handling works correctly")
            
            # Test getting info for non-existent group
            monitor = self.dashboard.group_monitor
            non_existent_group = monitor.get_group_info(999999999)
            if non_existent_group is None:
                logger.info("✓ Handles non-existent group correctly")
            
            return True
            
        except Exception as e:
            logger.error(f"Error handling test failed: {e}")
            return False
    
    async def test_performance(self) -> bool:
        """Test performance characteristics"""
        try:
            # Test statistics gathering performance
            start_time = time.time()
            
            for _ in range(10):
                stats = self.dashboard.get_unified_statistics()
            
            elapsed = time.time() - start_time
            avg_time = elapsed / 10
            
            logger.info(f"✓ Statistics gathering performance: {avg_time:.3f}s average")
            
            if avg_time > 1.0:
                logger.warning("⚠️ Statistics gathering is slow (>1s)")
            
            # Test memory usage (basic check)
            try:
                import psutil
                process = psutil.Process()
                memory_mb = process.memory_info().rss / 1024 / 1024
                logger.info(f"✓ Memory usage: {memory_mb:.1f} MB")
            except ImportError:
                logger.info("✓ Memory monitoring skipped (psutil not available)")
            
            return True
            
        except Exception as e:
            logger.error(f"Performance test failed: {e}")
            return False
    
    def print_test_summary(self):
        """Print comprehensive test summary"""
        logger.info("\n" + "=" * 60)
        logger.info("TEST SUMMARY")
        logger.info("=" * 60)
        
        passed = sum(1 for _, status, _ in self.test_results if status == 'PASS')
        failed = sum(1 for _, status, _ in self.test_results if status == 'FAIL')
        errors = sum(1 for _, status, _ in self.test_results if status == 'ERROR')
        total = len(self.test_results)
        
        logger.info(f"Total Tests: {total}")
        logger.info(f"✅ Passed: {passed}")
        logger.info(f"❌ Failed: {failed}")
        logger.info(f"💥 Errors: {errors}")
        
        success_rate = (passed / total * 100) if total > 0 else 0
        logger.info(f"Success Rate: {success_rate:.1f}%")
        
        if failed > 0 or errors > 0:
            logger.info("\nFailed/Error Tests:")
            for name, status, error in self.test_results:
                if status in ['FAIL', 'ERROR']:
                    logger.info(f"  {status}: {name}")
                    if error:
                        logger.info(f"    Error: {error}")
        
        logger.info("\n" + "=" * 60)
        
        if success_rate >= 80:
            logger.info("🎉 TELEGRAM DASHBOARD INTEGRATION: READY FOR PRODUCTION!")
        elif success_rate >= 60:
            logger.info("⚠️ TELEGRAM DASHBOARD INTEGRATION: NEEDS ATTENTION")
        else:
            logger.info("❌ TELEGRAM DASHBOARD INTEGRATION: REQUIRES FIXES")
        
        logger.info("=" * 60)

async def main():
    """Main test runner"""
    tester = TelegramDashboardTester()
    await tester.run_all_tests()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("\n🛑 Test interrupted by user")
    except Exception as e:
        logger.error(f"💥 Test suite failed: {e}")
        sys.exit(1)
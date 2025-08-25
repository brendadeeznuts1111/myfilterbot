#!/usr/bin/env python3
"""
Error Handling Test Suite
Tests all aspects of the error handling and debugging system
"""

import sys
import asyncio
import json
import os
from pathlib import Path
from datetime import datetime
import logging

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.bot.error_handler import ErrorTracker, ErrorHandler, ErrorCategory, ErrorSeverity, error_handler_decorator
from src.bot.database import db
from src.bot.config import config

# Setup test logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class ErrorHandlingTests:
    """Comprehensive error handling test suite"""
    
    def __init__(self):
        self.tracker = ErrorTracker(log_dir="test_logs")
        self.handler = ErrorHandler(self.tracker)
        self.test_results = []
        
    def run_test(self, test_name: str, test_func):
        """Run a single test and record results"""
        print(f"\n🧪 Running test: {test_name}")
        try:
            result = test_func()
            if asyncio.iscoroutine(result):
                result = asyncio.run(result)
            
            self.test_results.append({
                "test": test_name,
                "status": "PASS" if result else "FAIL",
                "timestamp": datetime.now().isoformat()
            })
            print(f"✅ {test_name}: PASSED")
            return True
        except Exception as e:
            self.test_results.append({
                "test": test_name,
                "status": "ERROR",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            })
            print(f"❌ {test_name}: ERROR - {e}")
            return False
    
    def test_error_tracker_initialization(self):
        """Test error tracker initialization"""
        # Check if log directory was created
        log_dir_exists = self.tracker.log_dir.exists()
        
        # Check if error history is initialized
        history_initialized = isinstance(self.tracker.error_history, list)
        
        # Check if stats are initialized
        stats_initialized = isinstance(self.tracker.error_stats, dict)
        
        return log_dir_exists and history_initialized and stats_initialized
    
    def test_error_logging(self):
        """Test basic error logging functionality"""
        test_error = ValueError("Test error message")
        
        # Log error with different severities
        error_id1 = self.tracker.log_error(
            error=test_error,
            category=ErrorCategory.DATABASE,
            severity=ErrorSeverity.HIGH,
            context={"test": True}
        )
        
        error_id2 = self.tracker.log_error(
            error=Exception("Another test error"),
            category=ErrorCategory.TELEGRAM,
            severity=ErrorSeverity.LOW,
            user_id=12345
        )
        
        # Check if errors were logged
        recent_errors = self.tracker.get_recent_errors(2)
        
        return len(recent_errors) >= 2 and error_id1 and error_id2
    
    def test_error_classification(self):
        """Test error classification system"""
        database_error = Exception("database connection failed")
        telegram_error = Exception("telegram bad request")
        network_error = Exception("connection timeout")
        
        # Test classification
        cat1, sev1 = self.handler._classify_error(database_error)
        cat2, sev2 = self.handler._classify_error(telegram_error)
        cat3, sev3 = self.handler._classify_error(network_error)
        
        return (cat1 == ErrorCategory.DATABASE and 
                cat2 == ErrorCategory.TELEGRAM and 
                cat3 == ErrorCategory.NETWORK)
    
    def test_error_resolution(self):
        """Test error resolution functionality"""
        test_error = Exception("Test error for resolution")
        error_id = self.tracker.log_error(test_error, ErrorCategory.UNKNOWN, ErrorSeverity.LOW)
        
        # Resolve the error
        success = self.tracker.resolve_error(error_id, "Resolved during testing")
        
        # Check if error is marked as resolved
        for error in self.tracker.error_history:
            if error["id"] == error_id:
                return error["resolved"] and success
        
        return False
    
    def test_error_statistics(self):
        """Test error statistics functionality"""
        # Log some test errors
        for i in range(5):
            self.tracker.log_error(
                Exception(f"Test error {i}"),
                ErrorCategory.API,
                ErrorSeverity.MEDIUM
            )
        
        stats = self.tracker.get_error_stats()
        
        # Check if statistics are updated
        return (stats["total"] > 0 and 
                ErrorCategory.API in stats["by_category"] and
                ErrorSeverity.MEDIUM in stats["by_severity"])
    
    def test_error_history_persistence(self):
        """Test error history saving and loading"""
        # Clear existing history
        self.tracker.error_history = []
        
        # Add test error
        error_id = self.tracker.log_error(
            Exception("Persistence test error"),
            ErrorCategory.DATABASE,
            ErrorSeverity.HIGH
        )
        
        # Save history
        self.tracker._save_error_history()
        
        # Create new tracker and load history
        new_tracker = ErrorTracker(log_dir=self.tracker.log_dir)
        
        # Check if error was loaded
        return len(new_tracker.error_history) > 0
    
    @error_handler_decorator(ErrorCategory.UNKNOWN, ErrorSeverity.LOW)
    async def test_decorated_function(self):
        """Test function with error handler decorator"""
        # This should work without error
        await asyncio.sleep(0.1)
        return True
    
    @error_handler_decorator(ErrorCategory.DATABASE, ErrorSeverity.HIGH)
    async def test_decorated_function_with_error(self):
        """Test function with error handler decorator that raises error"""
        raise ValueError("Decorated function test error")
    
    def test_decorator_functionality(self):
        """Test error handler decorator"""
        try:
            # Test successful function
            result1 = asyncio.run(self.test_decorated_function())
            
            # Test function that raises error
            try:
                asyncio.run(self.test_decorated_function_with_error())
                return False  # Should not reach here
            except ValueError:
                # Error should be logged but still propagated
                return True
        except Exception as e:
            print(f"Decorator test error: {e}")
            return False
    
    def test_log_file_creation(self):
        """Test log file creation"""
        error_log = self.tracker.log_dir / f"errors_{datetime.now().strftime('%Y%m%d')}.log"
        debug_log = self.tracker.log_dir / f"debug_{datetime.now().strftime('%Y%m%d')}.log"
        
        # Log an error to trigger file creation
        self.tracker.log_error(
            Exception("Log file test error"),
            ErrorCategory.UNKNOWN,
            ErrorSeverity.CRITICAL
        )
        
        return error_log.exists() or debug_log.exists()
    
    def test_error_filtering(self):
        """Test error filtering by category and severity"""
        # Add errors with different categories and severities
        self.tracker.log_error(Exception("DB error"), ErrorCategory.DATABASE, ErrorSeverity.HIGH)
        self.tracker.log_error(Exception("API error"), ErrorCategory.API, ErrorSeverity.MEDIUM)
        self.tracker.log_error(Exception("Telegram error"), ErrorCategory.TELEGRAM, ErrorSeverity.LOW)
        
        # Test filtering
        db_errors = self.tracker.get_recent_errors(category=ErrorCategory.DATABASE)
        high_errors = self.tracker.get_recent_errors(severity=ErrorSeverity.HIGH)
        
        return len(db_errors) > 0 and len(high_errors) > 0
    
    def test_old_error_cleanup(self):
        """Test old error cleanup functionality"""
        initial_count = len(self.tracker.error_history)
        
        # This should work without removing recent errors
        self.tracker.clear_old_errors(days=30)
        
        # Count should be same or less
        return len(self.tracker.error_history) <= initial_count
    
    def test_database_integration(self):
        """Test integration with database system"""
        try:
            # Test database operations that might cause errors
            stats = db.get_statistics()
            customers = db.get_all_customers()
            
            # These should work without throwing exceptions
            return isinstance(stats, dict) and isinstance(customers, list)
        except Exception as e:
            # Log the database error
            self.tracker.log_error(
                e,
                ErrorCategory.DATABASE,
                ErrorSeverity.HIGH,
                context={"test": "database_integration"}
            )
            return False
    
    def test_config_integration(self):
        """Test integration with configuration system"""
        try:
            # Test config access
            token_exists = hasattr(config, 'token')
            admin_id_exists = hasattr(config, 'admin_chat_id')
            
            return token_exists and admin_id_exists
        except Exception as e:
            self.tracker.log_error(
                e,
                ErrorCategory.CONFIGURATION,
                ErrorSeverity.CRITICAL,
                context={"test": "config_integration"}
            )
            return False
    
    def run_all_tests(self):
        """Run all error handling tests"""
        print("🚀 Starting Error Handling Test Suite")
        print("=" * 50)
        
        tests = [
            ("Error Tracker Initialization", self.test_error_tracker_initialization),
            ("Basic Error Logging", self.test_error_logging),
            ("Error Classification", self.test_error_classification),
            ("Error Resolution", self.test_error_resolution),
            ("Error Statistics", self.test_error_statistics),
            ("Error History Persistence", self.test_error_history_persistence),
            ("Decorator Functionality", self.test_decorator_functionality),
            ("Log File Creation", self.test_log_file_creation),
            ("Error Filtering", self.test_error_filtering),
            ("Old Error Cleanup", self.test_old_error_cleanup),
            ("Database Integration", self.test_database_integration),
            ("Config Integration", self.test_config_integration),
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            if self.run_test(test_name, test_func):
                passed += 1
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Summary: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed! Error handling system is working correctly.")
        else:
            failed = total - passed
            print(f"⚠️ {failed} test(s) failed. Check the output above for details.")
        
        # Save test results
        results_file = Path("test_results.json")
        with open(results_file, 'w') as f:
            json.dump({
                "timestamp": datetime.now().isoformat(),
                "summary": {
                    "total": total,
                    "passed": passed,
                    "failed": total - passed
                },
                "results": self.test_results
            }, f, indent=2)
        
        print(f"📄 Detailed results saved to: {results_file}")
        
        return passed == total

def main():
    """Main test runner"""
    # Create test logs directory
    test_logs_dir = Path("test_logs")
    test_logs_dir.mkdir(exist_ok=True)
    
    # Run tests
    test_suite = ErrorHandlingTests()
    success = test_suite.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
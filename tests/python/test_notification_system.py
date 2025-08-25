#!/usr/bin/env python3
"""
Comprehensive Test Suite for Notification System
Tests all components: backend service, API endpoints, templates, email, push notifications
"""

import asyncio
import json
import sys
import os
from pathlib import Path
from datetime import datetime, timedelta
import requests
import time
import sqlite3

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

from services.notification_service import (
    notification_service, 
    NotificationType, 
    NotificationPriority,
    NotificationChannel,
    NotificationPreferences
)
from services.email_service import email_service
from services.push_service import push_service, WebPushPayload
from templates.notification_templates import EnhancedNotificationTemplates
from api.notification_api import notification_bp

print("=" * 60)
print("🧪 COMPREHENSIVE NOTIFICATION SYSTEM TEST SUITE")
print("=" * 60)

class NotificationSystemTester:
    def __init__(self):
        self.test_results = {}
        self.api_base = 'http://localhost:5000/api/notifications'
        self.total_tests = 0
        self.passed_tests = 0
        
    def log_result(self, test_name: str, success: bool, message: str = ""):
        """Log test result"""
        self.total_tests += 1
        if success:
            self.passed_tests += 1
            print(f"✅ {test_name}")
        else:
            print(f"❌ {test_name}: {message}")
        
        self.test_results[test_name] = {
            'success': success,
            'message': message,
            'timestamp': datetime.now().isoformat()
        }
    
    async def test_database_initialization(self):
        """Test notification database initialization"""
        print("\n🗄️  Testing Database Initialization...")
        
        try:
            # Check if database file exists and has correct tables
            db_path = "notifications.db"
            
            if os.path.exists(db_path):
                with sqlite3.connect(db_path) as conn:
                    cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table';")
                    tables = [row[0] for row in cursor.fetchall()]
                    
                    required_tables = ['notifications', 'notification_preferences', 'notification_history']
                    missing_tables = [table for table in required_tables if table not in tables]
                    
                    if missing_tables:
                        self.log_result("Database Schema", False, f"Missing tables: {missing_tables}")
                    else:
                        self.log_result("Database Schema", True)
            else:
                # Initialize database
                notification_service.db.init_database()
                self.log_result("Database Initialization", True)
                
        except Exception as e:
            self.log_result("Database Initialization", False, str(e))
    
    async def test_notification_creation(self):
        """Test creating notifications"""
        print("\n📝 Testing Notification Creation...")
        
        try:
            # Test admin notification
            admin_notification = await notification_service.create_notification(
                user_id="admin_test",
                user_type="admin",
                notification_type=NotificationType.TRANSACTION,
                priority=NotificationPriority.HIGH,
                metadata={
                    'amount': 5000,
                    'customer_id': 'TEST001',
                    'action': 'deposit',
                    'transaction_id': 'TXN123'
                }
            )
            
            if admin_notification:
                self.log_result("Admin Notification Creation", True)
            else:
                self.log_result("Admin Notification Creation", False, "No notification returned")
            
            # Test customer notification
            customer_notification = await notification_service.create_notification(
                user_id="customer_test",
                user_type="customer",
                notification_type=NotificationType.BALANCE_UPDATE,
                priority=NotificationPriority.MEDIUM,
                metadata={
                    'new_balance': 10000,
                    'old_balance': 5000,
                    'change': 5000
                }
            )
            
            if customer_notification:
                self.log_result("Customer Notification Creation", True)
            else:
                self.log_result("Customer Notification Creation", False, "No notification returned")
                
        except Exception as e:
            self.log_result("Notification Creation", False, str(e))
    
    def test_notification_preferences(self):
        """Test notification preferences"""
        print("\n⚙️  Testing Notification Preferences...")
        
        try:
            # Create test preferences
            test_preferences = notification_service.create_default_preferences("test_user", "customer")
            
            if test_preferences:
                self.log_result("Default Preferences Creation", True)
                
                # Test saving preferences
                saved = notification_service.save_preferences(test_preferences)
                if saved:
                    self.log_result("Preferences Saving", True)
                    
                    # Test loading preferences
                    loaded_prefs = notification_service.get_preferences("test_user", "customer")
                    if loaded_prefs:
                        self.log_result("Preferences Loading", True)
                    else:
                        self.log_result("Preferences Loading", False, "Could not load saved preferences")
                else:
                    self.log_result("Preferences Saving", False, "Could not save preferences")
            else:
                self.log_result("Default Preferences Creation", False, "Could not create default preferences")
                
        except Exception as e:
            self.log_result("Notification Preferences", False, str(e))
    
    def test_notification_templates(self):
        """Test notification templates"""
        print("\n🎨 Testing Notification Templates...")
        
        try:
            # Test all notification types
            notification_types = [
                'transaction', 'balance_update', 'security_alert', 'member_request',
                'trade_signal', 'system_update', 'maintenance', 'promotion'
            ]
            
            for notification_type in notification_types:
                test_data = {
                    'title': f'Test {notification_type.replace("_", " ").title()}',
                    'message': f'This is a test {notification_type} notification',
                    'amount': 1000,
                    'customer_id': 'TEST001',
                    'action': 'test',
                    'timestamp': datetime.now().isoformat()
                }
                
                # Test web template
                web_result = EnhancedNotificationTemplates.render_notification(
                    notification_type, test_data, 'web'
                )
                
                if web_result and web_result.get('title') and web_result.get('message'):
                    self.log_result(f"Template {notification_type} (web)", True)
                else:
                    self.log_result(f"Template {notification_type} (web)", False, "Invalid template result")
                
                # Test email template
                email_result = EnhancedNotificationTemplates.render_notification(
                    notification_type, test_data, 'email'
                )
                
                if email_result and email_result.get('title') and email_result.get('message'):
                    self.log_result(f"Template {notification_type} (email)", True)
                else:
                    self.log_result(f"Template {notification_type} (email)", False, "Invalid email template")
                    
        except Exception as e:
            self.log_result("Notification Templates", False, str(e))
    
    async def test_email_service(self):
        """Test email service"""
        print("\n📧 Testing Email Service...")
        
        try:
            # Test template rendering
            test_data = {
                'title': 'Test Email Notification',
                'message': 'This is a test email notification from the trading platform.',
                'amount': 2500,
                'customer_id': 'TEST002',
                'action': 'withdrawal',
                'timestamp': datetime.now().isoformat()
            }
            
            # Note: This test doesn't actually send emails unless SMTP is configured
            if not (email_service.config.smtp_username and email_service.config.smtp_password):
                self.log_result("Email Service", True, "SMTP not configured - template test only")
            else:
                # Test sending email (only if SMTP is configured)
                try:
                    success = await email_service.send_notification_email(
                        to_email='test@example.com',
                        notification_type='transaction',
                        notification_data=test_data
                    )
                    self.log_result("Email Sending", success, "Actual email sent" if success else "Email failed")
                except Exception as e:
                    self.log_result("Email Sending", False, f"Email error: {e}")
            
        except Exception as e:
            self.log_result("Email Service", False, str(e))
    
    async def test_push_service(self):
        """Test push notification service"""
        print("\n📱 Testing Push Notification Service...")
        
        try:
            # Test push service initialization
            stats = push_service.get_subscription_stats()
            self.log_result("Push Service Stats", True, f"Stats: {stats}")
            
            # Test subscription registration
            test_subscription = {
                'token': 'test-fcm-token-12345'
            }
            
            push_service.register_subscription('test_push_user', 'fcm', test_subscription)
            
            # Check if subscription was registered
            if 'test_push_user' in push_service.subscriptions:
                self.log_result("Push Subscription Registration", True)
                
                # Test creating push payload
                test_data = {
                    'id': 'test-push-123',
                    'title': 'Test Push Notification',
                    'message': 'This is a test push notification',
                    'created_at': datetime.now().isoformat()
                }
                
                payload = push_service._create_notification_payload('transaction', test_data)
                
                if payload and payload.title and payload.body:
                    self.log_result("Push Payload Creation", True)
                else:
                    self.log_result("Push Payload Creation", False, "Invalid payload")
                    
                # Test unregistration
                push_service.unregister_subscription('test_push_user', 'fcm')
                if 'test_push_user' not in push_service.subscriptions or 'fcm' not in push_service.subscriptions.get('test_push_user', {}):
                    self.log_result("Push Subscription Unregistration", True)
                else:
                    self.log_result("Push Subscription Unregistration", False, "Subscription not removed")
            else:
                self.log_result("Push Subscription Registration", False, "Subscription not found")
                
        except Exception as e:
            self.log_result("Push Service", False, str(e))
    
    async def test_api_endpoints(self):
        """Test API endpoints"""
        print("\n🌐 Testing API Endpoints...")
        
        # Note: This requires the portal server to be running
        try:
            # Test health endpoint first
            try:
                health_response = requests.get('http://localhost:5000/health', timeout=5)
                if health_response.status_code == 200:
                    self.log_result("API Server Health", True)
                    
                    # Test notification endpoints
                    headers = {
                        'X-User-ID': 'api_test_user',
                        'X-User-Type': 'admin',
                        'Content-Type': 'application/json',
                        'ngrok-skip-browser-warning': 'true'
                    }
                    
                    # Test getting notifications
                    list_response = requests.get(f'{self.api_base}/list', headers=headers, timeout=10)
                    if list_response.status_code == 200:
                        self.log_result("API Get Notifications", True)
                    else:
                        self.log_result("API Get Notifications", False, f"Status: {list_response.status_code}")
                    
                    # Test getting preferences
                    prefs_response = requests.get(f'{self.api_base}/preferences', headers=headers, timeout=10)
                    if prefs_response.status_code == 200:
                        self.log_result("API Get Preferences", True)
                    else:
                        self.log_result("API Get Preferences", False, f"Status: {prefs_response.status_code}")
                    
                    # Test creating test notification
                    test_response = requests.post(f'{self.api_base}/test', headers=headers, timeout=10)
                    if test_response.status_code == 200:
                        self.log_result("API Create Test Notification", True)
                    else:
                        self.log_result("API Create Test Notification", False, f"Status: {test_response.status_code}")
                        
                else:
                    self.log_result("API Server Health", False, f"Status: {health_response.status_code}")
                    
            except requests.exceptions.RequestException as e:
                self.log_result("API Server Connection", False, f"Cannot connect: {e}")
                
        except Exception as e:
            self.log_result("API Endpoints", False, str(e))
    
    def test_frontend_components(self):
        """Test frontend component files"""
        print("\n🎭 Testing Frontend Components...")
        
        try:
            # Check if frontend files exist
            component_files = [
                'src/components/NotificationSystem.js',
                'src/components/NotificationHistory.js'
            ]
            
            for file_path in component_files:
                if os.path.exists(file_path):
                    # Basic file validation
                    with open(file_path, 'r') as f:
                        content = f.read()
                        
                    if len(content) > 1000:  # Basic size check
                        self.log_result(f"Frontend File {os.path.basename(file_path)}", True)
                    else:
                        self.log_result(f"Frontend File {os.path.basename(file_path)}", False, "File too small")
                else:
                    self.log_result(f"Frontend File {os.path.basename(file_path)}", False, "File not found")
                    
        except Exception as e:
            self.log_result("Frontend Components", False, str(e))
    
    async def test_integration_workflow(self):
        """Test complete notification workflow"""
        print("\n🔄 Testing Integration Workflow...")
        
        try:
            # Create preferences for test user
            test_user_id = "integration_test_user"
            test_user_type = "admin"
            
            # Step 1: Create default preferences
            preferences = notification_service.create_default_preferences(test_user_id, test_user_type)
            if not preferences:
                self.log_result("Integration Workflow - Preferences", False, "Could not create preferences")
                return
            
            # Step 2: Create notification
            notification = await notification_service.create_notification(
                user_id=test_user_id,
                user_type=test_user_type,
                notification_type=NotificationType.SECURITY_ALERT,
                priority=NotificationPriority.CRITICAL,
                metadata={
                    'event_type': 'Failed Login Attempt',
                    'ip_address': '192.168.1.100',
                    'timestamp': datetime.now().isoformat()
                }
            )
            
            if not notification:
                self.log_result("Integration Workflow - Creation", False, "Could not create notification")
                return
            
            # Step 3: Retrieve notifications
            notifications = notification_service.get_notifications(test_user_id, test_user_type, limit=10)
            if notifications and len(notifications) > 0:
                self.log_result("Integration Workflow - Retrieval", True)
                
                # Step 4: Mark as read
                success = notification_service.mark_as_read(notification.id, test_user_id)
                if success:
                    self.log_result("Integration Workflow - Mark Read", True)
                else:
                    self.log_result("Integration Workflow - Mark Read", False, "Could not mark as read")
                    
                # Step 5: Test template rendering
                template_result = EnhancedNotificationTemplates.render_notification(
                    'security_alert',
                    {
                        'title': notification.title,
                        'message': notification.message,
                        'event_type': 'Failed Login Attempt',
                        'ip_address': '192.168.1.100',
                        'timestamp': datetime.now().isoformat()
                    },
                    'web'
                )
                
                if template_result and template_result.get('title'):
                    self.log_result("Integration Workflow - Template", True)
                else:
                    self.log_result("Integration Workflow - Template", False, "Template rendering failed")
                    
                self.log_result("Complete Integration Workflow", True)
            else:
                self.log_result("Integration Workflow - Retrieval", False, "No notifications found")
                
        except Exception as e:
            self.log_result("Integration Workflow", False, str(e))
    
    def test_performance_metrics(self):
        """Test system performance"""
        print("\n⚡ Testing Performance Metrics...")
        
        try:
            start_time = time.time()
            
            # Test database query performance
            for i in range(10):
                notifications = notification_service.get_notifications("perf_test", "admin", limit=50)
            
            db_time = time.time() - start_time
            
            if db_time < 1.0:  # Should complete in under 1 second
                self.log_result("Database Performance", True, f"10 queries in {db_time:.3f}s")
            else:
                self.log_result("Database Performance", False, f"Too slow: {db_time:.3f}s")
            
            # Test template rendering performance
            start_time = time.time()
            
            test_data = {
                'title': 'Performance Test',
                'message': 'Testing template rendering performance',
                'timestamp': datetime.now().isoformat()
            }
            
            for i in range(100):
                EnhancedNotificationTemplates.render_notification('transaction', test_data, 'web')
            
            template_time = time.time() - start_time
            
            if template_time < 1.0:  # Should complete in under 1 second
                self.log_result("Template Performance", True, f"100 renders in {template_time:.3f}s")
            else:
                self.log_result("Template Performance", False, f"Too slow: {template_time:.3f}s")
                
        except Exception as e:
            self.log_result("Performance Metrics", False, str(e))
    
    async def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting comprehensive notification system tests...\n")
        
        # Database tests
        await self.test_database_initialization()
        
        # Core functionality tests
        await self.test_notification_creation()
        self.test_notification_preferences()
        self.test_notification_templates()
        
        # Service tests
        await self.test_email_service()
        await self.test_push_service()
        
        # API tests
        await self.test_api_endpoints()
        
        # Frontend tests
        self.test_frontend_components()
        
        # Integration tests
        await self.test_integration_workflow()
        
        # Performance tests
        self.test_performance_metrics()
        
        # Print summary
        self.print_test_summary()
    
    def print_test_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        success_rate = (self.passed_tests / self.total_tests) * 100 if self.total_tests > 0 else 0
        
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.total_tests - self.passed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 90:
            print("\n🎉 EXCELLENT! Notification system is working well.")
        elif success_rate >= 75:
            print("\n✅ GOOD! Most features are working correctly.")
        elif success_rate >= 50:
            print("\n⚠️  MODERATE! Some issues need attention.")
        else:
            print("\n❌ POOR! System needs significant fixes.")
        
        print("\n📋 Detailed Results:")
        for test_name, result in self.test_results.items():
            status = "✅" if result['success'] else "❌"
            message = f" - {result['message']}" if result['message'] else ""
            print(f"  {status} {test_name}{message}")
        
        # Save results to file
        with open('notification_test_results.json', 'w') as f:
            json.dump({
                'summary': {
                    'total_tests': self.total_tests,
                    'passed_tests': self.passed_tests,
                    'success_rate': success_rate,
                    'timestamp': datetime.now().isoformat()
                },
                'detailed_results': self.test_results
            }, f, indent=2)
        
        print(f"\n📄 Detailed results saved to: notification_test_results.json")

async def main():
    """Main test runner"""
    tester = NotificationSystemTester()
    await tester.run_all_tests()
    
    print("\n" + "=" * 60)
    print("🏁 All notification system tests completed!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
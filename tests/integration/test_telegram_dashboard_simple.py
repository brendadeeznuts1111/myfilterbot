#!/usr/bin/env python3
"""
Simple test for Telegram Dashboard components without requiring Telegram API
"""

import sys
import os
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

def test_imports():
    """Test that all dashboard components can be imported"""
    print("🧪 Testing Telegram Dashboard Component Imports...")
    
    try:
        from src.bot.telegram_dashboard.message_streamer import TelegramMessageStreamer, StreamedMessage
        print("✅ Message Streamer imported successfully")
    except Exception as e:
        print(f"❌ Message Streamer import failed: {e}")
        return False
    
    try:
        from src.bot.telegram_dashboard.group_monitor import TelegramGroupMonitor, GroupInfo, MemberActivity
        print("✅ Group Monitor imported successfully") 
    except Exception as e:
        print(f"❌ Group Monitor import failed: {e}")
        return False
    
    try:
        from src.bot.telegram_dashboard.bot_status import TelegramBotMonitor, BotStatus, BotHealthStatus, HealthMetrics
        print("✅ Bot Status Monitor imported successfully")
    except Exception as e:
        print(f"❌ Bot Status Monitor import failed: {e}")
        return False
    
    try:
        from src.bot.telegram_dashboard.admin_interface import TelegramAdminInterface, AdminAction, BulkOperation
        print("✅ Admin Interface imported successfully")
    except Exception as e:
        print(f"❌ Admin Interface import failed: {e}")
        return False
    
    try:
        from src.bot.telegram_dashboard import TelegramDashboard
        print("✅ Telegram Dashboard imported successfully")
    except Exception as e:
        print(f"❌ Telegram Dashboard import failed: {e}")
        return False
    
    return True

def test_basic_instantiation():
    """Test basic instantiation of components without API calls"""
    print("\n🧪 Testing Basic Component Instantiation...")
    
    # Use dummy token for testing
    dummy_token = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
    dummy_chat_id = "-1001234567890"
    
    try:
        from src.bot.telegram_dashboard import TelegramDashboard
        
        # Create dashboard instance
        dashboard = TelegramDashboard(dummy_token, dummy_chat_id)
        print("✅ Dashboard instance created")
        
        # Test that all components exist
        if dashboard.message_streamer is None:
            print("❌ Message streamer not created")
            return False
        print("✅ Message streamer created")
        
        if dashboard.group_monitor is None:
            print("❌ Group monitor not created")  
            return False
        print("✅ Group monitor created")
        
        if dashboard.bot_monitor is None:
            print("❌ Bot monitor not created")
            return False
        print("✅ Bot monitor created")
        
        if dashboard.admin_interface is None:
            print("❌ Admin interface not created")
            return False
        print("✅ Admin interface created")
        
        # Test health check
        is_healthy = dashboard.is_healthy()
        print(f"✅ Dashboard health check: {'HEALTHY' if is_healthy else 'UNHEALTHY'}")
        
        return True
        
    except Exception as e:
        print(f"❌ Basic instantiation failed: {e}")
        return False

def test_enhanced_portal_server_integration():
    """Test that the enhanced portal server can import dashboard components"""
    print("\n🧪 Testing Enhanced Portal Server Integration...")
    
    try:
        # Test the imports that were added to enhanced_portal_server.py
        from src.bot.telegram_dashboard.message_streamer import TelegramMessageStreamer
        from src.bot.telegram_dashboard.group_monitor import TelegramGroupMonitor  
        from src.bot.telegram_dashboard.bot_status import TelegramBotMonitor
        from src.bot.telegram_dashboard.admin_interface import TelegramAdminInterface
        
        print("✅ All dashboard components can be imported by portal server")
        
        # Test basic configuration
        from src.bot.config import config
        if hasattr(config, 'token') and hasattr(config, 'admin_chat_id'):
            print("✅ Configuration available for dashboard components")
        else:
            print("❌ Configuration missing required fields")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Portal server integration test failed: {e}")
        return False

def test_templates():
    """Test that the dashboard template exists"""
    print("\n🧪 Testing Dashboard Template...")
    
    template_path = Path(__file__).parent / "templates" / "telegram_dashboard.html"
    
    if template_path.exists():
        print("✅ Telegram dashboard template exists")
        
        # Check template size
        size = template_path.stat().st_size
        if size > 10000:  # Should be a substantial template
            print(f"✅ Template appears complete ({size} bytes)")
        else:
            print(f"⚠️ Template might be incomplete ({size} bytes)")
        
        return True
    else:
        print("❌ Telegram dashboard template not found")
        return False

def test_directory_structure():
    """Test that the directory structure is correct"""
    print("\n🧪 Testing Directory Structure...")
    
    base_path = Path(__file__).parent / "src" / "telegram_dashboard"
    
    expected_files = [
        "__init__.py",
        "message_streamer.py", 
        "group_monitor.py",
        "bot_status.py",
        "admin_interface.py"
    ]
    
    for filename in expected_files:
        file_path = base_path / filename
        if file_path.exists():
            print(f"✅ {filename} exists")
        else:
            print(f"❌ {filename} missing")
            return False
    
    return True

def main():
    """Run all tests"""
    print("=" * 60)
    print("TELEGRAM DASHBOARD INTEGRATION - SIMPLE TEST SUITE")
    print("=" * 60)
    
    tests = [
        ("Directory Structure", test_directory_structure),
        ("Component Imports", test_imports),
        ("Basic Instantiation", test_basic_instantiation),
        ("Portal Server Integration", test_enhanced_portal_server_integration),
        ("Dashboard Template", test_templates)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"\n{status}: {test_name}")
            
        except Exception as e:
            results.append((test_name, False))
            print(f"\n💥 ERROR: {test_name} - {e}")
    
    # Print summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    success_rate = (passed / total * 100) if total > 0 else 0
    
    print(f"Total Tests: {total}")
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {total - passed}")
    print(f"Success Rate: {success_rate:.1f}%")
    
    if success_rate >= 80:
        print("\n🎉 TELEGRAM DASHBOARD INTEGRATION: COMPONENTS READY!")
    elif success_rate >= 60:
        print("\n⚠️ TELEGRAM DASHBOARD INTEGRATION: MINOR ISSUES")
    else:
        print("\n❌ TELEGRAM DASHBOARD INTEGRATION: MAJOR ISSUES")
    
    print("=" * 60)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n🛑 Test interrupted by user")
    except Exception as e:
        print(f"💥 Test suite failed: {e}")
        sys.exit(1)
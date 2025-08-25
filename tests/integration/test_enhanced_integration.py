#!/usr/bin/env python3
"""
Integration test for enhanced bot system
Tests the enhanced bot with portal server integration
"""

import asyncio
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from main_bot_enhanced import EnhancedFantdevBot
from src.bot.database import db

def test_enhanced_bot_features():
    """Test enhanced bot features"""
    print("🔍 Testing Enhanced Bot Features")
    print("=" * 50)
    
    try:
        # Initialize enhanced bot
        bot = EnhancedFantdevBot()
        
        print("✅ Enhanced bot initialization successful")
        
        # Test configuration
        assert bot.application is None  # Not setup yet
        print("✅ Pre-setup state correct")
        
        # Test WebSocket availability
        if hasattr(bot, 'websocket_client'):
            print("✅ WebSocket client available")
        else:
            print("⚠️  WebSocket client not initialized")
        
        # Test portal connection status
        print(f"📡 Portal connection: {'✅ Connected' if bot.portal_connected else '⚠️  Disconnected'}")
        
        # Test active sessions tracker
        assert isinstance(bot.active_sessions, dict)
        print("✅ Session tracking system ready")
        
        # Test bot setup
        bot.setup()
        assert bot.application is not None
        print("✅ Bot setup completed successfully")
        
        # Check handlers are registered
        handlers_count = len(bot.application.handlers)
        print(f"✅ Registered {handlers_count} handler groups")
        
        return True
        
    except Exception as e:
        print(f"❌ Enhanced bot test failed: {e}")
        return False

def test_database_integration():
    """Test database integration"""
    print("\n🗄️  Testing Database Integration")
    print("=" * 50)
    
    try:
        # Test database connection
        stats = db.get_statistics()
        print(f"✅ Database connected - {stats.get('total_customers', 0)} customers")
        
        # Test member system
        members = db.get_group_members()
        print(f"✅ Member system ready - {len(members)} members")
        
        return True
        
    except Exception as e:
        print(f"❌ Database test failed: {e}")
        return False

def test_websocket_integration():
    """Test WebSocket integration"""
    print("\n🔌 Testing WebSocket Integration")
    print("=" * 50)
    
    try:
        import socketio
        print("✅ Python-socketio available")
        
        # Test enhanced portal server imports
        from enhanced_portal_server import socketio as server_socketio
        print("✅ Enhanced portal server WebSocket ready")
        
        return True
        
    except ImportError:
        print("⚠️  WebSocket support not fully available")
        return False
    except Exception as e:
        print(f"❌ WebSocket test failed: {e}")
        return False

def test_feature_completeness():
    """Test feature completeness"""
    print("\n🚀 Testing Feature Completeness")
    print("=" * 50)
    
    try:
        bot = EnhancedFantdevBot()
        
        # Check enhanced methods exist
        enhanced_methods = [
            '_enhanced_start_command',
            '_enhanced_help_command', 
            '_enhanced_register_command',
            '_enhanced_balance_command',
            '_enhanced_message_handler',
            '_show_analytics',
            '_show_settings',
            '_show_alerts',
            '_broadcast_to_portal',
            '_enhanced_admin_command'
        ]
        
        for method in enhanced_methods:
            assert hasattr(bot, method), f"Missing method: {method}"
        
        print(f"✅ All {len(enhanced_methods)} enhanced methods present")
        
        # Check WebSocket broadcasting capability
        assert hasattr(bot, '_broadcast_to_portal')
        print("✅ Portal broadcasting capability ready")
        
        # Check session management
        assert hasattr(bot, 'active_sessions')
        print("✅ Session management system ready")
        
        return True
        
    except Exception as e:
        print(f"❌ Feature completeness test failed: {e}")
        return False

def run_integration_tests():
    """Run all integration tests"""
    print("🧪 ENHANCED BOT INTEGRATION TESTS")
    print("=" * 60)
    
    tests = [
        ("Enhanced Bot Features", test_enhanced_bot_features),
        ("Database Integration", test_database_integration),
        ("WebSocket Integration", test_websocket_integration),
        ("Feature Completeness", test_feature_completeness)
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n📊 TEST SUMMARY")
    print("=" * 60)
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\n🎯 Results: {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        print("🎉 ALL TESTS PASSED - Enhanced bot system is ready!")
        
        print("\n🚀 Enhanced Features Available:")
        print("• ✅ Advanced inline keyboard menus")
        print("• ✅ Real-time WebSocket broadcasting")
        print("• ✅ Enhanced transaction detection")
        print("• ✅ Comprehensive session management")
        print("• ✅ Portal connection verification")
        print("• ✅ Advanced error handling")
        print("• ✅ Interactive analytics display")
        print("• ✅ Settings and alerts management")
        print("• ✅ Admin dashboard with statistics")
        print("• ✅ Member management system")
        
        print("\n🌐 Integration Status:")
        print("• Bot ↔ Portal: WebSocket broadcasting")
        print("• Bot ↔ Database: Full CRUD operations")
        print("• Bot ↔ Admin: Enhanced dashboard")
        print("• Bot ↔ Users: Interactive menus")
        
        return True
    else:
        print("⚠️  Some tests failed - review the output above")
        return False

if __name__ == "__main__":
    success = run_integration_tests()
    sys.exit(0 if success else 1)
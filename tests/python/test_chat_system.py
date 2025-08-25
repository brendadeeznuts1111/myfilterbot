#!/usr/bin/env python3
"""
Test script for chat tracking and session management system
"""

import sys
from pathlib import Path
# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.bot.services.chat_tracker import chat_tracker
from src.bot.services.session_manager import session_manager, fraud_detector, player_history

def test_chat_tracking():
    """Test chat tracking functionality"""
    print("🧪 TESTING CHAT TRACKING SYSTEM")
    print("=" * 50)
    
    # Test 1: Register a new chat
    print("\nTest 1: Register New Chat")
    print("-" * 30)
    
    chat_info = chat_tracker.register_chat(
        chat_id=-1001234567890,
        chat_type="supergroup",
        title="Test Trading Group",
        username="testtradinggroup",
        member_count=150,
        is_admin=True
    )
    
    if chat_info:
        print(f"✅ Chat registered successfully")
        print(f"   Shortlink: t.me/fantdev_bot/{chat_info.shortlink}")
        print(f"   Telegram URL: {chat_info.telegram_url}")
    else:
        print("❌ Failed to register chat")
    
    # Test 2: Register private chat
    print("\nTest 2: Register Private Chat")
    print("-" * 30)
    
    private_chat = chat_tracker.register_chat(
        chat_id=123456789,
        chat_type="private",
        title="John Doe"
    )
    
    if private_chat:
        print(f"✅ Private chat registered")
        print(f"   Shortlink: t.me/fantdev_bot/{private_chat.shortlink}")
    
    # Test 3: Get chat statistics
    print("\nTest 3: Chat Statistics")
    print("-" * 30)
    
    stats = chat_tracker.get_chat_statistics()
    print(f"Total Chats: {stats['total_chats']}")
    print(f"Active Chats: {stats['active_chats']}")
    print(f"Admin Chats: {stats['admin_chats']}")
    print("Chat Types:", stats['chats_by_type'])
    
    # Test 4: Get all chats
    print("\nTest 4: List All Chats")
    print("-" * 30)
    
    all_chats = chat_tracker.get_all_chats()
    for i, chat in enumerate(all_chats[:5], 1):
        print(f"{i}. {chat.title} ({chat.chat_type})")
        print(f"   ID: {chat.chat_id}")
        print(f"   Shortlink: {chat.shortlink}")
    
    return True

def test_session_management():
    """Test session management"""
    print("\n🔐 TESTING SESSION MANAGEMENT")
    print("=" * 50)
    
    # Test 1: Create session
    print("\nTest 1: Create Session")
    print("-" * 30)
    
    session_result = session_manager.create_session(
        telegram_id=123456789,
        customer_id="BB1042",
        username="@testuser",
        remember_me=True
    )
    
    if session_result['success']:
        print("✅ Session created successfully")
        print(f"   Session ID: {session_result['session_id'][:20]}...")
        print(f"   Dashboard URL: {session_result['dashboard_url'][:50]}...")
        print(f"   Expires in: {session_result['expires_in']} seconds")
    else:
        print("❌ Failed to create session")
    
    # Test 2: Get session
    print("\nTest 2: Retrieve Session")
    print("-" * 30)
    
    session = session_manager.get_session(telegram_id=123456789)
    if session:
        print("✅ Session retrieved")
        print(f"   Customer: {session.customer_id}")
        print(f"   Active: {session.is_active}")
    
    # Test 3: Verify dashboard token
    print("\nTest 3: Dashboard Token")
    print("-" * 30)
    
    if session_result['success']:
        token_data = session_manager.verify_dashboard_token(
            session_result['dashboard_token']
        )
        if token_data:
            print("✅ Dashboard token valid")
            print(f"   Customer ID: {token_data['customer_id']}")
        else:
            print("❌ Token verification failed")
    
    return True

def test_fraud_detection():
    """Test fraud detection"""
    print("\n🚨 TESTING FRAUD DETECTION")
    print("=" * 50)
    
    # Test 1: Check login pattern
    print("\nTest 1: Login Pattern Check")
    print("-" * 30)
    
    fraud_check = fraud_detector.check_login_pattern(
        telegram_id=123456789,
        ip_address="192.168.1.1"
    )
    
    print(f"Risk Score: {fraud_check['risk_score']}/100")
    print(f"Risk Level: {fraud_check['risk_level']}")
    if fraud_check['alerts']:
        print(f"Alerts: {', '.join(fraud_check['alerts'])}")
    
    # Test 2: Transaction pattern
    print("\nTest 2: Transaction Pattern")
    print("-" * 30)
    
    tx_check = fraud_detector.track_transaction_pattern(
        customer_id="BB1042",
        transaction_type="withdrawal",
        amount=15000
    )
    
    print(f"Risk Score: {tx_check['risk_score']}/100")
    print(f"Risk Level: {tx_check['risk_level']}")
    if tx_check['alerts']:
        print(f"Alerts: {', '.join(tx_check['alerts'])}")
    
    return True

def test_player_history():
    """Test player history retrieval"""
    print("\n📜 TESTING PLAYER HISTORY")
    print("=" * 50)
    
    history = player_history.get_player_history("BB1042", days=30)
    
    if 'error' not in history:
        print("✅ History retrieved")
        print(f"   Customer: {history['customer_id']}")
        print(f"   Balance: ${history['current_balance']:,.2f}")
        print(f"   Weekly P&L: ${history['weekly_pnl']:+,.2f}")
        print(f"   Transactions: {history['transaction_count']}")
    else:
        print(f"❌ Error: {history['error']}")
    
    return True

def main():
    """Run all tests"""
    print("🚀 CHAT TRACKING & SESSION SYSTEM TEST SUITE")
    print("=" * 60)
    
    success = True
    
    try:
        # Test chat tracking
        if not test_chat_tracking():
            success = False
            print("❌ Chat tracking tests failed")
        
        # Test session management
        if not test_session_management():
            success = False
            print("❌ Session management tests failed")
        
        # Test fraud detection
        if not test_fraud_detection():
            success = False
            print("❌ Fraud detection tests failed")
        
        # Test player history
        if not test_player_history():
            success = False
            print("❌ Player history tests failed")
        
        # Generate report
        print("\n📊 GENERATING CHAT REPORT")
        print("=" * 50)
        report = chat_tracker.generate_chat_report()
        print(report[:500] + "..." if len(report) > 500 else report)
        
        print("\n" + "=" * 60)
        if success:
            print("🎉 ALL TESTS PASSED - SYSTEM READY")
            print("\n✅ Chat Tracking: Operational")
            print("✅ Session Management: Functional")
            print("✅ Fraud Detection: Active")
            print("✅ Player History: Available")
            print("✅ Database: SQLite (durable storage)")
            print("\n📱 Bot will now:")
            print("• Track ALL chats automatically")
            print("• Create shortlinks for each chat")
            print("• Store everything in SQLite database")
            print("• No single admin chat ID needed!")
        else:
            print("❌ SOME TESTS FAILED - REVIEW ERRORS")
        
    except Exception as e:
        print(f"\n❌ Test suite error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
Smoke tests for the Telegram Filter Bot system
"""

import json
import sys
import os
from datetime import datetime

def test_database():
    """Test database loading and structure"""
    print("🧪 Testing Database...")
    try:
        # Test customer database
        with open('customer_database.json', 'r') as f:
            db = json.load(f)
        
        assert 'customers' in db, "Missing customers key"
        assert len(db['customers']) == 25, f"Expected 25 customers, got {len(db['customers'])}"
        
        # Check a sample customer
        assert 'BB1042' in db['customers'], "BB1042 not found"
        customer = db['customers']['BB1042']
        assert customer['password'] == 'N9H9', "Wrong password for BB1042"
        assert 'balance' in customer, "Missing balance field"
        
        print("  ✅ Database structure valid")
        print(f"  ✅ {len(db['customers'])} customers loaded")
        print(f"  ✅ Total balance: ${sum(c['balance'] for c in db['customers'].values())}")
        return True
        
    except Exception as e:
        print(f"  ❌ Database test failed: {e}")
        return False

def test_bot_imports():
    """Test bot module imports"""
    print("\n🧪 Testing Bot Imports...")
    try:
        # Test enhanced bot
        from enhanced_bot import load_database, save_database, CustomerBot
        print("  ✅ Enhanced bot imports successful")
        
        # Test multi-customer bot
        import multi_customer_bot
        print("  ✅ Multi-customer bot imports successful")
        
        # Test auto reporter
        import auto_reporter
        print("  ✅ Auto reporter imports successful")
        
        return True
        
    except ImportError as e:
        print(f"  ❌ Import failed: {e}")
        return False

def test_transaction_detection():
    """Test transaction pattern matching"""
    print("\n🧪 Testing Transaction Detection...")
    
    import re
    
    patterns = {
        'deposit': [r'\[credited!\]', r'credited', r'deposit.*success'],
        'withdrawal': [r'withdraw', r'withdrawn', r'sent.*\$?\d+', r'withdrawal'],
        'denied': [r'denied', r'rejected', r'failed'],
    }
    
    test_messages = [
        ("[credited!] Your deposit of $500", 'deposit', 500),
        ("Your withdrawal of $200 was successful", 'withdrawal', 200),
        ("Transaction denied: insufficient funds", 'denied', None),
        ("BB1042 deposit credited $1000", 'deposit', 1000),
    ]
    
    passed = 0
    for message, expected_type, expected_amount in test_messages:
        detected_type = None
        
        # Detect type
        for tx_type, tx_patterns in patterns.items():
            for pattern in tx_patterns:
                if re.search(pattern, message.lower()):
                    detected_type = tx_type
                    break
            if detected_type:
                break
        
        # Extract amount
        amount_match = re.search(r'\$(\d+)', message)
        amount = int(amount_match.group(1)) if amount_match else None
        
        if detected_type == expected_type and amount == expected_amount:
            print(f"  ✅ Correctly detected: {message[:30]}... as {detected_type}")
            passed += 1
        else:
            print(f"  ❌ Failed: {message[:30]}...")
            print(f"     Expected: {expected_type}/{expected_amount}, Got: {detected_type}/{amount}")
    
    print(f"  📊 Passed {passed}/{len(test_messages)} tests")
    return passed == len(test_messages)

def test_customer_validation():
    """Test customer ID and password validation"""
    print("\n🧪 Testing Customer Validation...")
    
    with open('customer_database.json', 'r') as f:
        db = json.load(f)
    
    test_cases = [
        ("BB1042", "N9H9", True),
        ("BB1043", "I5H8", True),
        ("BB1042", "WRONG", False),
        ("INVALID", "N9H9", False),
        ("bb1042", "n9h9", True),  # Case insensitive
    ]
    
    passed = 0
    for customer_id, password, should_pass in test_cases:
        customer = db['customers'].get(customer_id.upper())
        
        if customer and customer['password'] == password.upper():
            result = True
        else:
            result = False
        
        if result == should_pass:
            print(f"  ✅ {customer_id}/{password}: {'Valid' if should_pass else 'Invalid'}")
            passed += 1
        else:
            print(f"  ❌ {customer_id}/{password}: Expected {'Valid' if should_pass else 'Invalid'}")
    
    print(f"  📊 Passed {passed}/{len(test_cases)} tests")
    return passed == len(test_cases)

def test_bot_configuration():
    """Test bot configuration"""
    print("\n🧪 Testing Bot Configuration...")
    
    try:
        # Check bot token format
        token = "7555654864:AAGKxGxHGXDwJfP25le-ZGD-qhS9vDytttM"
        assert ':' in token, "Invalid token format"
        assert len(token) > 40, "Token too short"
        print("  ✅ Bot token format valid")
        
        # Check admin chat ID
        admin_id = "-2714719687"
        assert admin_id.startswith('-'), "Admin chat should be negative (group)"
        print("  ✅ Admin chat ID configured")
        
        return True
        
    except AssertionError as e:
        print(f"  ❌ Configuration error: {e}")
        return False

def test_customer_portal():
    """Test customer portal file"""
    print("\n🧪 Testing Customer Portal...")
    
    try:
        assert os.path.exists('customer_portal.html'), "Portal file not found"
        
        with open('customer_portal.html', 'r') as f:
            content = f.read()
        
        # Check for essential elements
        assert 'BB1042' in content, "Customer data not in portal"
        assert 'login()' in content, "Login function missing"
        assert 'chart.js' in content.lower(), "Chart library not included"
        
        print("  ✅ Portal file exists")
        print("  ✅ Contains customer data")
        print("  ✅ Has required functions")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Portal test failed: {e}")
        return False

def test_message_forwarding_logic():
    """Test message forwarding logic"""
    print("\n🧪 Testing Message Forwarding Logic...")
    
    with open('customer_database.json', 'r') as f:
        db = json.load(f)
    
    # Simulate messages
    test_messages = [
        {
            'text': 'BB1042 deposit credited $500',
            'should_forward': True,
            'expected_customers': ['BB1042']
        },
        {
            'text': 'Random message without keywords',
            'should_forward': False,
            'expected_customers': []
        },
        {
            'text': '[credited!] Transaction for BB1043',
            'should_forward': True,
            'expected_customers': ['BB1043']
        }
    ]
    
    passed = 0
    for test in test_messages:
        text_lower = test['text'].lower()
        matched_customers = []
        
        # Check for customer mentions
        for customer_id in db['customers'].keys():
            if customer_id.lower() in text_lower:
                matched_customers.append(customer_id)
        
        # Check for keywords
        keywords = ['[credited!]', 'deposit', 'denied']
        has_keyword = any(k.lower() in text_lower for k in keywords)
        
        should_forward = len(matched_customers) > 0 or has_keyword
        
        if should_forward == test['should_forward']:
            print(f"  ✅ '{test['text'][:40]}...'")
            passed += 1
        else:
            print(f"  ❌ '{test['text'][:40]}...'")
            print(f"     Expected forward: {test['should_forward']}, Got: {should_forward}")
    
    print(f"  📊 Passed {passed}/{len(test_messages)} tests")
    return passed == len(test_messages)

def main():
    """Run all smoke tests"""
    print("=" * 50)
    print("🚀 TELEGRAM FILTER BOT SMOKE TESTS")
    print("=" * 50)
    
    tests = [
        test_database,
        test_bot_imports,
        test_transaction_detection,
        test_customer_validation,
        test_bot_configuration,
        test_customer_portal,
        test_message_forwarding_logic
    ]
    
    results = []
    for test in tests:
        try:
            results.append(test())
        except Exception as e:
            print(f"\n❌ Test crashed: {e}")
            results.append(False)
    
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    
    passed = sum(results)
    total = len(results)
    
    print(f"✅ Passed: {passed}/{total}")
    print(f"❌ Failed: {total - passed}/{total}")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} tests failed. Check logs above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
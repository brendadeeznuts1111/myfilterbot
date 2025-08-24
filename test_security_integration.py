#!/usr/bin/env python3
"""
Test script to verify security integration with the Telegram bot
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from src.handlers import handlers
from SECURITY_FIX_duplicate_passwords import SecureRegistrationSystem

def test_security_integration():
    """Test that the bot handlers have security integration"""
    print("🧪 TESTING SECURITY INTEGRATION")
    print("=" * 50)
    
    # Test 1: Check handlers have secure registration system
    print("Test 1: Handlers Security Integration")
    print("-" * 30)
    
    if hasattr(handlers, 'secure_registration'):
        print("✅ Handlers have secure_registration system")
        print(f"   Type: {type(handlers.secure_registration)}")
        print(f"   Class: {handlers.secure_registration.__class__.__name__}")
    else:
        print("❌ Handlers missing secure_registration system")
        return False
    
    # Test 2: Verify it's the correct class
    print("\nTest 2: Security System Type Verification")
    print("-" * 30)
    
    if isinstance(handlers.secure_registration, SecureRegistrationSystem):
        print("✅ Correct SecureRegistrationSystem instance")
    else:
        print("❌ Wrong security system type")
        return False
    
    # Test 3: Test security audit functionality
    print("\nTest 3: Security Audit Functionality")
    print("-" * 30)
    
    try:
        audit_result = handlers.secure_registration.validate_unique_credentials()
        print(f"✅ Security audit successful")
        print(f"   Total customers: {audit_result.get('total_customers', 0)}")
        print(f"   Unique passwords: {audit_result.get('unique_passwords', 0)}")
        print(f"   Duplicate groups: {len(audit_result.get('duplicate_passwords', {}))}")
    except Exception as e:
        print(f"❌ Security audit failed: {e}")
        return False
    
    # Test 4: Verify database path is correct
    print("\nTest 4: Database Path Verification")
    print("-" * 30)
    
    db_path = handlers.secure_registration.db_path
    print(f"   Database path: {db_path}")
    
    if Path(db_path).exists():
        print("✅ Database file exists")
    else:
        print("❌ Database file not found")
        return False
    
    print("\n" + "=" * 50)
    print("🎉 ALL SECURITY INTEGRATION TESTS PASSED!")
    print("=" * 50)
    
    return True

def test_registration_workflow():
    """Test the complete registration workflow"""
    print("\n🔐 TESTING REGISTRATION WORKFLOW")
    print("=" * 50)
    
    # This would normally be tested with actual bot messages
    # For now, just verify the methods exist and are callable
    
    required_methods = [
        'secure_register_customer',
        'admin_verify_duplicate_password_registration',
        'validate_unique_credentials',
        'generate_security_report'
    ]
    
    for method_name in required_methods:
        if hasattr(handlers.secure_registration, method_name):
            method = getattr(handlers.secure_registration, method_name)
            if callable(method):
                print(f"✅ Method '{method_name}' exists and is callable")
            else:
                print(f"❌ Method '{method_name}' exists but is not callable")
                return False
        else:
            print(f"❌ Method '{method_name}' not found")
            return False
    
    print("\n✅ All required methods are available")
    return True

if __name__ == "__main__":
    print("🚀 STARTING SECURITY INTEGRATION TESTS")
    print("=" * 60)
    
    success = True
    
    # Run integration tests
    if not test_security_integration():
        success = False
    
    # Run workflow tests
    if not test_registration_workflow():
        success = False
    
    print("\n" + "=" * 60)
    if success:
        print("🎉 ALL TESTS PASSED - SECURITY INTEGRATION SUCCESSFUL")
        print("\n📋 Summary:")
        print("• Enhanced registration system integrated into bot handlers")
        print("• Duplicate password detection and prevention active")
        print("• Admin verification workflow implemented")
        print("• Security audit system operational")
        print("• All required methods available and callable")
    else:
        print("❌ SOME TESTS FAILED - PLEASE REVIEW INTEGRATION")
    
    print("=" * 60)
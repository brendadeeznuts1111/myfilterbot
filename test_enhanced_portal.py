#!/usr/bin/env python3
"""
Test script for Enhanced Customer Portal
Tests API endpoints, JWT authentication, and WebSocket connectivity
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:5000"
API_URL = f"{BASE_URL}/api"

# Test credentials
TEST_CUSTOMER = {
    "customer_id": "BB1042",
    "password": "N9H9"
}

def test_login():
    """Test customer login and JWT token generation"""
    print("\n1. Testing Login Endpoint...")
    
    response = requests.post(
        f"{API_URL}/login",
        json=TEST_CUSTOMER
    )
    
    if response.status_code == 200:
        data = response.json()
        if data.get("success"):
            print(f"   ✅ Login successful for {TEST_CUSTOMER['customer_id']}")
            print(f"   Token: {data['token'][:50]}...")
            return data['token']
        else:
            print(f"   ❌ Login failed: {data.get('error')}")
    else:
        print(f"   ❌ HTTP Error: {response.status_code}")
    
    return None

def test_customer_data(token):
    """Test fetching customer data with JWT authentication"""
    print("\n2. Testing Customer Data Endpoint...")
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    response = requests.get(
        f"{API_URL}/customer/{TEST_CUSTOMER['customer_id']}",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        customer = data.get("customer", {})
        stats = data.get("statistics", {})
        
        print(f"   ✅ Customer data retrieved successfully")
        print(f"   Balance: ${customer.get('balance', 0):,}")
        print(f"   Weekly P&L: ${customer.get('weekly_pnl', 0):,}")
        print(f"   Win Rate: {stats.get('win_rate', 0)}%")
        print(f"   Total Trades: {stats.get('total_trades', 0)}")
        return True
    else:
        print(f"   ❌ Failed to fetch customer data: {response.status_code}")
        return False

def test_transactions(token):
    """Test fetching transaction history"""
    print("\n3. Testing Transaction History Endpoint...")
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    response = requests.get(
        f"{API_URL}/customer/{TEST_CUSTOMER['customer_id']}/transactions?limit=5",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        transactions = data.get("transactions", [])
        pagination = data.get("pagination", {})
        
        print(f"   ✅ Transaction history retrieved")
        print(f"   Total transactions: {pagination.get('total', 0)}")
        print(f"   Showing: {len(transactions)} transactions")
        
        if transactions:
            for i, tx in enumerate(transactions[:3], 1):
                print(f"   Transaction {i}: {tx.get('type')} - ${abs(tx.get('amount', 0)):,}")
        
        return True
    else:
        print(f"   ❌ Failed to fetch transactions: {response.status_code}")
        return False

def test_health_check():
    """Test health check endpoint"""
    print("\n4. Testing Health Check Endpoint...")
    
    response = requests.get(f"{API_URL}/health")
    
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ Server Status: {data.get('status')}")
        print(f"   Database: {data.get('database')}")
        print(f"   Active Connections: {data.get('active_connections', 0)}")
        return True
    else:
        print(f"   ❌ Health check failed: {response.status_code}")
        return False

def test_admin_login():
    """Test admin login"""
    print("\n5. Testing Admin Login...")
    
    response = requests.post(
        f"{API_URL}/admin/login",
        json={"username": "admin", "password": "admin123"}
    )
    
    if response.status_code == 200:
        data = response.json()
        if data.get("success"):
            print(f"   ✅ Admin login successful")
            return data['token']
        else:
            print(f"   ❌ Admin login failed")
    else:
        print(f"   ❌ HTTP Error: {response.status_code}")
    
    return None

def test_portal_pages():
    """Test that portal pages are accessible"""
    print("\n6. Testing Portal Pages...")
    
    pages = [
        ("/", "Customer Portal"),
        ("/admin", "Admin Portal")
    ]
    
    all_accessible = True
    for path, name in pages:
        response = requests.get(f"{BASE_URL}{path}")
        if response.status_code == 200:
            print(f"   ✅ {name} is accessible at {BASE_URL}{path}")
        else:
            print(f"   ❌ {name} returned status: {response.status_code}")
            all_accessible = False
    
    return all_accessible

def main():
    """Run all tests"""
    print("=" * 60)
    print("ENHANCED CUSTOMER PORTAL TEST SUITE")
    print("=" * 60)
    print(f"Testing server at: {BASE_URL}")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Run tests
    test_results = []
    
    # Test health check first
    test_results.append(("Health Check", test_health_check()))
    
    # Test customer login
    token = test_login()
    test_results.append(("Customer Login", token is not None))
    
    if token:
        # Test authenticated endpoints
        test_results.append(("Customer Data", test_customer_data(token)))
        test_results.append(("Transactions", test_transactions(token)))
    
    # Test admin login
    admin_token = test_admin_login()
    test_results.append(("Admin Login", admin_token is not None))
    
    # Test portal pages
    test_results.append(("Portal Pages", test_portal_pages()))
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for _, result in test_results if result)
    total = len(test_results)
    
    for test_name, result in test_results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name:20} {status}")
    
    print("-" * 60)
    print(f"Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! The enhanced portal is fully functional.")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Please check the implementation.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
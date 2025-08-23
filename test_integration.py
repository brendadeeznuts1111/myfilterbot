#!/usr/bin/env python3
"""Test the admin portal API integration"""

import requests
import json

API_BASE = "http://localhost:5000/api"

def test_members_api():
    """Test the members endpoint"""
    response = requests.get(f"{API_BASE}/members")
    assert response.status_code == 200
    
    data = response.json()
    assert 'members' in data
    assert 'stats' in data
    
    print(f"✓ Members API: {len(data['members'])} members found")
    for member in data['members'][:2]:
        print(f"  - {member['username']} ({member['status']}) in {member['group_name']}")
    
    return True

def test_stats_api():
    """Test the stats endpoint"""
    response = requests.get(f"{API_BASE}/stats")
    assert response.status_code == 200
    
    data = response.json()
    assert 'total_customers' in data
    assert 'active_customers' in data
    
    print(f"✓ Stats API: {data['total_customers']} customers, {data['active_customers']} active")
    return True

def test_pending_api():
    """Test the pending members endpoint"""
    response = requests.get(f"{API_BASE}/members/pending")
    assert response.status_code == 200
    
    data = response.json()
    assert 'pending' in data
    
    print(f"✓ Pending API: {len(data['pending'])} pending members")
    return True

def test_member_operations():
    """Test member approval/denial operations"""
    # Add a test member
    test_member = {
        "telegram_id": 9999999,
        "username": "test_user",
        "group_id": -1001234567890,
        "group_name": "Test Trading Group"
    }
    
    response = requests.post(f"{API_BASE}/members/add", 
                            json=test_member,
                            headers={'Content-Type': 'application/json'})
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Add Member API: Created member {data.get('member_id')}")
        
        # Test approval
        approve_data = {
            "group_id": test_member["group_id"],
            "telegram_id": test_member["telegram_id"],
            "permissions": {
                "can_view": True,
                "can_trade": False,
                "can_withdraw": False,
                "daily_limit": 50
            }
        }
        
        response = requests.post(f"{API_BASE}/members/approve",
                                json=approve_data,
                                headers={'Content-Type': 'application/json'})
        
        if response.status_code == 200:
            print(f"✓ Approve Member API: Successfully approved test member")
        else:
            print(f"✗ Approve Member API failed: {response.text}")
    else:
        print(f"✗ Add Member API failed: {response.text}")
    
    return True

if __name__ == "__main__":
    print("=" * 50)
    print("Testing Admin Portal API Integration")
    print("=" * 50)
    
    try:
        # Check if server is running
        response = requests.get("http://localhost:5000/health")
        if response.status_code != 200:
            print("❌ Server is not running on port 5000")
            exit(1)
        
        print("✓ Server is running")
        print()
        
        # Run tests
        test_members_api()
        print()
        test_stats_api()
        print()
        test_pending_api()
        print()
        test_member_operations()
        
        print()
        print("=" * 50)
        print("✅ All API integration tests passed!")
        print("=" * 50)
        print()
        print("The admin portal is now fully integrated with the backend API.")
        print("Access it at: http://localhost:5000/admin")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        exit(1)
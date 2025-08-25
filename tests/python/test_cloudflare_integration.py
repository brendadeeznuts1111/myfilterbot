#!/usr/bin/env python3
"""
Test Cloudflare Worker Integration with Admin Security Center
"""

import asyncio
import aiohttp
import json
from datetime import datetime

async def test_admin_server():
    """Test that admin server is running and can receive webhooks"""
    admin_url = "http://localhost:5001"
    
    print("🧪 Testing Admin Server Integration")
    print("=" * 40)
    
    # Test health endpoint
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{admin_url}/health") as response:
                if response.status == 200:
                    data = await response.json()
                    print("✅ Admin server health check passed")
                    print(f"   Status: {data.get('status')}")
                    print(f"   WebSocket: {data.get('websocket')}")
                    print(f"   Cloudflare Integration: {data.get('cloudflare_integration')}")
                else:
                    print(f"❌ Admin server health check failed: {response.status}")
                    return False
    except Exception as e:
        print(f"❌ Could not connect to admin server: {e}")
        print("   Make sure to start it with: python3 websocket_admin_server.py")
        return False
    
    # Test webhook endpoint with mock Cloudflare Worker data
    test_alert = {
        "type": "security_alert",
        "message": "🚨 TEST: Duplicate password registration detected!",
        "timestamp": datetime.now().isoformat(),
        "source": "test-cloudflare-worker",
        "data": {
            "alertType": "duplicate_password",
            "priority": "high",
            "token": f"test_{int(datetime.now().timestamp())}",
            "userId": "123456789",
            "username": "@test_user",
            "customerId": "TEST001"
        }
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            headers = {
                'Content-Type': 'application/json',
                'X-Worker-Secret': 'default-secret'
            }
            async with session.post(f"{admin_url}/api/webhook/security-alert", 
                                  json=test_alert, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    print("✅ Security alert webhook test passed")
                    print(f"   Token: {data.get('token')}")
                    print("   Alert should appear in admin interface")
                else:
                    print(f"❌ Security alert webhook test failed: {response.status}")
                    text = await response.text()
                    print(f"   Error: {text}")
                    return False
    except Exception as e:
        print(f"❌ Webhook test failed: {e}")
        return False
    
    return True

async def test_cloudflare_worker():
    """Test Cloudflare Worker endpoints (if running locally)"""
    worker_url = "http://localhost:8787"
    
    print("\n🧪 Testing Cloudflare Worker")
    print("=" * 40)
    
    # Test health endpoint
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{worker_url}/health") as response:
                if response.status == 200:
                    data = await response.json()
                    print("✅ Cloudflare Worker health check passed")
                    print(f"   Status: {data.get('status')}")
                    print(f"   Environment: {data.get('env')}")
                else:
                    print(f"❌ Cloudflare Worker health check failed: {response.status}")
                    return False
    except Exception as e:
        print(f"⚠️  Could not connect to Cloudflare Worker: {e}")
        print("   This is normal if worker is not running locally")
        print("   Start with: bun run worker:dev")
        return False
    
    # Test rate limit endpoint
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{worker_url}/api/rate-limit") as response:
                if response.status == 200:
                    data = await response.json()
                    print("✅ Rate limit API test passed")
                    print(f"   Global tokens: {data.get('rateLimit', {}).get('global', {}).get('tokens', 'N/A')}")
                else:
                    print(f"❌ Rate limit API test failed: {response.status}")
                    return False
    except Exception as e:
        print(f"❌ Rate limit API test failed: {e}")
        return False
    
    return True

def test_react_component():
    """Test React component configuration"""
    print("\n🧪 Testing React Components")
    print("=" * 40)
    
    # Check if RateLimitMonitor exists
    try:
        with open("src/components/RateLimitMonitor.tsx", "r") as f:
            content = f.read()
            if "REACT_APP_WORKER_URL" in content:
                print("✅ RateLimitMonitor component found")
                print("   Configured to use REACT_APP_WORKER_URL")
            else:
                print("⚠️  RateLimitMonitor missing WORKER_URL config")
    except FileNotFoundError:
        print("❌ RateLimitMonitor.tsx not found")
        return False
    
    # Check CloudflareWorkerClient
    try:
        with open("src/services/cloudflare-client.ts", "r") as f:
            content = f.read()
            if "CloudflareWorkerClient" in content:
                print("✅ CloudflareWorkerClient found")
                print("   Ready for Worker API integration")
            else:
                print("⚠️  CloudflareWorkerClient incomplete")
    except FileNotFoundError:
        print("❌ cloudflare-client.ts not found")
        return False
    
    return True

async def main():
    """Run all integration tests"""
    print("🚀 Fantdev Cloudflare Integration Tests")
    print("=" * 50)
    
    admin_ok = await test_admin_server()
    worker_ok = await test_cloudflare_worker()
    react_ok = test_react_component()
    
    print("\n📊 Test Results")
    print("=" * 20)
    print(f"Admin Server:      {'✅ PASS' if admin_ok else '❌ FAIL'}")
    print(f"Cloudflare Worker: {'✅ PASS' if worker_ok else '⚠️  SKIP'}")
    print(f"React Components:  {'✅ PASS' if react_ok else '❌ FAIL'}")
    
    if admin_ok and react_ok:
        print("\n🎉 Integration is ready!")
        print("\nNext steps:")
        print("1. Start Cloudflare Worker: bun run worker:dev")
        print("2. Open admin interface: http://localhost:5001")
        print("3. Test with real Telegram webhooks")
    else:
        print("\n⚠️  Some tests failed. Check the output above.")
    
    print("\n📚 For setup help, run: ./setup_integration.sh")

if __name__ == "__main__":
    asyncio.run(main())
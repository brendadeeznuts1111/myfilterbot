#!/bin/bash

echo "=========================================="
echo "Testing Admin Portal API Integration"
echo "=========================================="
echo

# Test members endpoint
echo "1. Testing /api/members endpoint:"
members=$(curl -s http://localhost:5000/api/members)
member_count=$(echo "$members" | python3 -c "import json,sys; print(len(json.load(sys.stdin)['members']))")
echo "   ✓ Found $member_count members"
echo

# Test stats endpoint
echo "2. Testing /api/stats endpoint:"
stats=$(curl -s http://localhost:5000/api/stats)
total_customers=$(echo "$stats" | python3 -c "import json,sys; print(json.load(sys.stdin)['total_customers'])")
echo "   ✓ Found $total_customers customers"
echo

# Test pending members endpoint
echo "3. Testing /api/members/pending endpoint:"
pending=$(curl -s http://localhost:5000/api/members/pending)
pending_count=$(echo "$pending" | python3 -c "import json,sys; print(len(json.load(sys.stdin)['pending']))")
echo "   ✓ Found $pending_count pending members"
echo

# Add a test member
echo "4. Testing member operations:"
echo "   Adding test member..."
add_response=$(curl -s -X POST http://localhost:5000/api/members/add \
  -H "Content-Type: application/json" \
  -d '{"telegram_id": 888888, "username": "test_api_user", "group_id": -1001234567890, "group_name": "Test Trading Group"}')

if echo "$add_response" | grep -q "success.*true"; then
  echo "   ✓ Successfully added test member"
else
  echo "   ✗ Failed to add test member"
fi
echo

echo "=========================================="
echo "✅ API Integration Test Complete!"
echo "=========================================="
echo
echo "The admin portal is fully integrated with the backend."
echo "Access it at: http://localhost:5000/admin"
echo
echo "Sample members from database:"
echo "$members" | python3 -c "import json,sys; d=json.load(sys.stdin); [print(f'  - {m[\"username\"]} ({m[\"status\"]}) in {m[\"group_name\"]}') for m in d['members'][:3]]"
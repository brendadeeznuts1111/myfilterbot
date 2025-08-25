#!/usr/bin/env python3
import json

# Load merged database
with open('data/customer_database.json', 'r') as f:
    data = json.load(f)

print("📊 Database Stats After Merge:")
print(f"   • Total customers: {len(data.get('customers', {}))}")
print(f"   • Total balance: ${sum(c.get('balance', 0) for c in data.get('customers', {}).values()):,.2f}")

if 'merge_info' in data:
    merge_info = data['merge_info']
    print(f"   • Merge timestamp: {merge_info.get('merged_at', 'N/A')}")
    print(f"   • Customers added: {merge_info.get('customers_added', 0)}")
    print(f"   • Customers updated: {merge_info.get('customers_updated', 0)}")

# Check for specific customers from real temp database
real_temp_customers = ['BB1042', 'BB1267', 'BB1553']
for customer_id in real_temp_customers:
    if customer_id in data.get('customers', {}):
        customer = data['customers'][customer_id]
        print(f"✅ {customer_id}: Balance ${customer.get('balance', 0)}, Phone: {customer.get('phone', 'N/A')}")
    else:
        print(f"❌ {customer_id}: Not found in merged database")

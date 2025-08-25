#!/usr/bin/env python3
import json

# Load the database
with open('data/customer_database.json', 'r') as f:
    data = json.load(f)

customers = data.get('customers', {})

print(f"🎯 Customer Count: {len(customers):,}")
print(f"📊 Sample Customer IDs:")
for cid in list(customers.keys())[:15]:
    print(f"   • {cid}")
print("...")

# Calculate total balance
total_balance = sum(c.get('balance', 0) for c in customers.values())
print(f"📈 Total Balance: ${total_balance:,.2f}")

# Check for any customers with the IDs from the new data
new_data_ids = ['JP990', 'BBPERSONAL', 'DAKO', 'VALL']
found_ids = [cid for cid in new_data_ids if cid in customers]
print(f"🔍 New Data IDs Found: {found_ids if found_ids else 'None'}")

# Show merge info if available
if 'merge_info' in data:
    merge_info = data['merge_info']
    print(f"🔄 Last Merge: {merge_info.get('merged_at', 'N/A')}")
    print(f"   • Customers Added: {merge_info.get('customers_added', 0)}")
    print(f"   • Customers Updated: {merge_info.get('customers_updated', 0)}")

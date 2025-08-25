from typing import Dict, List, Optional, Any, Tuple, Set, Union
import json
from datetime import datetime

# Load existing database
with open('data/customer_database.json', 'r') as f:
    existing_data = json.load(f)

# Remove the problematic trading customers
trading_ids = ['JP990', 'BBPERSONAL', 'DAKO']
existing_customers = existing_data.get('customers', {})

for tid in trading_ids:
    if tid in existing_customers:
        del existing_customers[tid]
        print(f"🗑️ Removed problematic customer: {tid}")

# Add trading customers with correct structure (only bot-compatible fields)
trading_customers = [
    {
        "customer_id": "JP990",
        "password": "PASSWORD",
        "balance": 0.00,
        "weekly_pnl": 0,
        "phone": "",
        "telegram_id": None,
        "telegram_username": "",
        "active": True,
        "last_activity": datetime.now().isoformat()
    },
    {
        "customer_id": "BBPERSONAL",
        "password": "PASSWORD",
        "balance": 0.00,
        "weekly_pnl": 0,
        "phone": "",
        "telegram_id": None,
        "telegram_username": "",
        "active": True,
        "last_activity": datetime.now().isoformat()
    },
    {
        "customer_id": "DAKO",
        "password": "PASSWORD",
        "balance": 0.00,
        "weekly_pnl": 0,
        "phone": "",
        "telegram_id": None,
        "telegram_username": "",
        "active": True,
        "last_activity": datetime.now().isoformat()
    }
]

# Add the fixed trading customers
for trading_customer in trading_customers:
    existing_customers[trading_customer['customer_id']] = trading_customer
    print(f"✅ Added fixed customer: {trading_customer['customer_id']}")

# Update database
existing_data['customers'] = existing_customers
existing_data['total_customers'] = len(existing_customers)
existing_data['last_updated'] = datetime.now().isoformat()

# Save updated database
with open('data/customer_database.json', 'w') as f:
    json.dump(existing_data, f, indent=2)

print(f"\n🎯 Final Results:")
print(f"   • Total customers: {len(existing_customers)}")
print(f"   • Trading customers: {trading_ids}")
print(f"   • Structure: Bot-compatible (no extra fields)")

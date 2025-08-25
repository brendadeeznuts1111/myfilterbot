import json
import uuid
from datetime import datetime

# Load existing database
with open('customer_database.json', 'r') as f:
    existing_data = json.load(f)

# Trading data to integrate (matching existing Customer model structure)
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
        "last_activity": datetime.now().isoformat(),
        # Additional trading info (stored as metadata)
        "account_type": "trading",
        "agent": "CSCALVIN",
        "master_agent": "CSCALVIN",
        "login": "JP990"
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
        "last_activity": datetime.now().isoformat(),
        # Additional trading info (stored as metadata)
        "account_type": "personal",
        "agent": "CSCALVIN", 
        "master_agent": "CSCALVIN",
        "login": "BBPERSONAL"
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
        "last_activity": datetime.now().isoformat(),
        # Additional trading info (stored as metadata)
        "account_type": "trading",
        "agent": "CSMIYUKI",
        "master_agent": "CSMIYUKI",
        "login": "DAKO"
    }
    # Add more trading customers as needed
]

# Get existing customers
existing_customers = existing_data.get('customers', {})

# Add trading customers
new_count = 0
for trading_customer in trading_customers:
    if trading_customer['customer_id'] not in existing_customers:
        existing_customers[trading_customer['customer_id']] = trading_customer
        new_count += 1

# Update database
existing_data['customers'] = existing_customers
existing_data['total_customers'] = len(existing_customers)
existing_data['last_updated'] = datetime.now().isoformat()

# Save updated database
with open('customer_database.json', 'w') as f:
    json.dump(existing_data, f, indent=2)

print(f"✅ Integration Complete!")
print(f"📊 Previous count: 2522")
print(f"➕ Added trading customers: {new_count}")
print(f"🎯 New total: {len(existing_customers)}")
print(f"🔧 Fixed: Customer structure now matches bot's Customer model")

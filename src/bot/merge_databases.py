#!/usr/bin/env python3
"""
Database Merger Script
Merges customer data from customer_database_REAL_temp.json into the main customer_database.json
"""

import json
import os
from datetime import datetime

def merge_databases():
    """Merge customer databases"""
    print("🔄 Starting database merge...")
    
    # Load main database
    try:
        with open('customer_database.json', 'r') as f:
            main_db = json.load(f)
        print(f"✅ Main database loaded: {len(main_db.get('customers', {}))} customers")
    except Exception as e:
        print(f"❌ Error loading main database: {e}")
        return False
    
    # Load real temp database
    try:
        with open('data/customer_database_REAL_temp.json', 'r') as f:
            real_temp_db = json.load(f)
        print(f"✅ Real temp database loaded: {len(real_temp_db)} customers")
    except Exception as e:
        print(f"❌ Error loading real temp database: {e}")
        return False
    
    # Initialize customers dict if it doesn't exist
    if 'customers' not in main_db:
        main_db['customers'] = {}
    
    # Merge customers from real temp into main database
    merged_count = 0
    updated_count = 0
    
    for customer_id, customer_data in real_temp_db.items():
        if customer_id not in main_db['customers']:
            # Add new customer to main database
            main_db['customers'][customer_id] = customer_data
            merged_count += 1
            print(f"✅ Merged customer: {customer_id} (Balance: ${customer_data.get('balance', 0)})")
        else:
            # Update existing customer if real temp has newer data
            existing = main_db['customers'][customer_id]
            if customer_data.get('last_activity', '') > existing.get('last_activity', ''):
                main_db['customers'][customer_id].update(customer_data)
                updated_count += 1
                print(f"🔄 Updated customer: {customer_id}")
    
    print(f"\n📊 Merge Summary:")
    print(f"   • Total customers after merge: {len(main_db['customers'])}")
    print(f"   • New customers added: {merged_count}")
    print(f"   • Existing customers updated: {updated_count}")
    
    # Add merge metadata
    main_db['merge_info'] = {
        'merged_at': datetime.now().isoformat(),
        'source_file': 'customer_database_REAL_temp.json',
        'customers_added': merged_count,
        'customers_updated': updated_count
    }
    
    # Save merged database
    try:
        with open('customer_database.json', 'w') as f:
            json.dump(main_db, f, indent=2)
        print("\n💾 Merged database saved successfully!")
        return True
    except Exception as e:
        print(f"❌ Error saving merged database: {e}")
        return False

if __name__ == "__main__":
    success = merge_databases()
    if success:
        print("\n🎉 Database merge completed successfully!")
    else:
        print("\n💥 Database merge failed!")
        exit(1)

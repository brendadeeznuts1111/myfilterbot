#!/usr/bin/env python3
"""
Customer Data Categorization Script
Adds data_type field to mark REAL vs TEST customers
"""

import json
import os
from datetime import datetime

def categorize_customers():
    """Add data_type field to customer database"""
    
    # Load current database
    with open('customer_database.json', 'r') as f:
        data = json.load(f)
    
    # Create backup before modifying
    backup_file = f'customer_database_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
    with open(backup_file, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"✅ Backup created: {backup_file}")
    
    # Define test customer IDs (clearly identifiable)
    test_customer_ids = {
        'BB1043',  # @testuser
        'BB1044',  # @testuser_new  
        'BB1045'   # @duplicate_test
    }
    
    # Categorize customers
    real_count = 0
    test_count = 0
    
    for customer_id, customer_data in data['customers'].items():
        if customer_id in test_customer_ids:
            customer_data['data_type'] = 'TEST'
            customer_data['test_category'] = 'development'
            customer_data['test_notes'] = f'Test account created for development/testing purposes'
            test_count += 1
            print(f"🧪 MARKED TEST: {customer_id} ({customer_data.get('telegram_username', 'no username')})")
        else:
            customer_data['data_type'] = 'REAL'
            # Add real customer metadata
            if customer_data.get('telegram_id'):
                customer_data['customer_status'] = 'active_telegram'
            elif customer_data.get('phone'):
                customer_data['customer_status'] = 'phone_verified'
            else:
                customer_data['customer_status'] = 'basic'
            real_count += 1
    
    # Update database metadata
    data['metadata'] = {
        'last_categorization': datetime.now().isoformat(),
        'categorization_version': '1.0',
        'customer_counts': {
            'total': len(data['customers']),
            'real_customers': real_count,
            'test_customers': test_count
        },
        'data_types': {
            'REAL': 'Legitimate customers with real trading activity',
            'TEST': 'Development/testing accounts for system validation'
        }
    }
    
    # Save updated database
    with open('customer_database.json', 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"\n📊 CATEGORIZATION COMPLETE:")
    print(f"   • REAL customers: {real_count}")
    print(f"   • TEST customers: {test_count}")
    print(f"   • Total customers: {len(data['customers'])}")
    print(f"   • Database updated with data_type fields")
    
    # Generate summary report
    print(f"\n📋 REAL CUSTOMERS BREAKDOWN:")
    telegram_users = 0
    phone_verified = 0
    basic_customers = 0
    total_balance = 0
    
    for customer_id, customer_data in data['customers'].items():
        if customer_data.get('data_type') == 'REAL':
            total_balance += customer_data.get('balance', 0)
            if customer_data.get('telegram_id'):
                telegram_users += 1
            elif customer_data.get('phone'):
                phone_verified += 1
            else:
                basic_customers += 1
    
    print(f"   • Telegram connected: {telegram_users}")
    print(f"   • Phone verified: {phone_verified}")
    print(f"   • Basic accounts: {basic_customers}")
    print(f"   • Total real balance: ${total_balance:,.2f}")
    
    print(f"\n🧪 TEST CUSTOMERS:")
    for customer_id, customer_data in data['customers'].items():
        if customer_data.get('data_type') == 'TEST':
            print(f"   • {customer_id}: {customer_data.get('telegram_username', 'no username')} - {customer_data.get('test_notes', '')}")
    
    return {
        'real_customers': real_count,
        'test_customers': test_count,
        'total_balance': total_balance,
        'backup_file': backup_file
    }

if __name__ == '__main__':
    print("🏷️ CUSTOMER DATA CATEGORIZATION")
    print("=" * 50)
    
    if not os.path.exists('customer_database.json'):
        print("❌ Error: customer_database.json not found")
        exit(1)
    
    result = categorize_customers()
    
    print(f"\n✅ CATEGORIZATION SUCCESSFUL")
    print(f"📁 Backup saved as: {result['backup_file']}")
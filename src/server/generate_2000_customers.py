#!/usr/bin/env python3
"""
Generate 2000+ Customer Database
Creates a comprehensive customer database with betting history, metadata, and cashier info
"""

import json
import random
import uuid
from datetime import datetime, timedelta
from faker import Faker
import string

fake = Faker()

def generate_customer_id():
    """Generate realistic customer ID"""
    prefixes = ['BB', 'BCC', 'BP', 'DK', 'FD', 'GT', 'HB', 'JK', 'LM', 'NP', 'QR', 'ST', 'UV', 'WX', 'YZ']
    prefix = random.choice(prefixes)
    number = random.randint(100, 9999)
    return f"{prefix}{number}"

def generate_password():
    """Generate realistic password"""
    password_types = [
        # Common words + numbers
        lambda: fake.word().upper() + str(random.randint(1, 99)),
        # Random alphanumeric
        lambda: ''.join(random.choices(string.ascii_uppercase + string.digits, k=random.randint(4, 8))),
        # Name based
        lambda: fake.first_name().upper() + str(random.randint(1, 999)),
        # City/Place based
        lambda: fake.city().replace(' ', '').upper()[:8],
        # Random combination
        lambda: ''.join(random.choices(string.ascii_uppercase, k=random.randint(3, 5))) + str(random.randint(10, 999))
    ]
    return random.choice(password_types)()

def generate_phone():
    """Generate phone number (some empty)"""
    if random.random() < 0.3:  # 30% no phone
        return ""
    
    formats = [
        lambda: fake.phone_number(),
        lambda: f"({random.randint(200,999)}) {random.randint(200,999)}-{random.randint(1000,9999)}",
        lambda: f"{random.randint(200,999)}-{random.randint(200,999)}-{random.randint(1000,9999)}",
        lambda: f"+1{random.randint(2000000000,9999999999)}"
    ]
    return random.choice(formats)()

def generate_balance():
    """Generate realistic balance distribution"""
    rand = random.random()
    if rand < 0.15:  # 15% zero balance
        return 0
    elif rand < 0.30:  # 15% small balance (1-100)
        return round(random.uniform(1, 100), 2)
    elif rand < 0.60:  # 30% medium balance (100-2000)
        return round(random.uniform(100, 2000), 2)
    elif rand < 0.85:  # 25% high balance (2000-10000)
        return round(random.uniform(2000, 10000), 2)
    else:  # 15% very high balance (10000-100000)
        return round(random.uniform(10000, 100000), 2)

def generate_weekly_pnl():
    """Generate realistic P&L distribution"""
    rand = random.random()
    if rand < 0.20:  # 20% big losses
        return round(random.uniform(-10000, -1000), 2)
    elif rand < 0.40:  # 20% small losses  
        return round(random.uniform(-1000, -50), 2)
    elif rand < 0.60:  # 20% small gains
        return round(random.uniform(50, 1000), 2)
    elif rand < 0.80:  # 20% medium gains
        return round(random.uniform(1000, 5000), 2)
    else:  # 20% big gains
        return round(random.uniform(5000, 25000), 2)

def generate_telegram_info():
    """Generate Telegram info (many not linked)"""
    if random.random() < 0.75:  # 75% not linked to Telegram
        return None, None
    
    telegram_id = random.randint(100000000, 9999999999)
    username = f"@{fake.user_name().lower()}{random.randint(1, 999)}"
    return telegram_id, username

def generate_last_activity():
    """Generate last activity timestamp"""
    if random.random() < 0.30:  # 30% never active
        return None
    
    # Activity within last 30 days
    days_ago = random.randint(0, 30)
    timestamp = datetime.now() - timedelta(days=days_ago, 
                                          hours=random.randint(0, 23), 
                                          minutes=random.randint(0, 59))
    return timestamp.isoformat()

def generate_bet_history(customer_id):
    """Generate betting/transaction history"""
    num_bets = random.choices([0, 1, 2, 3, 4, 5, 10, 20, 50], 
                             weights=[0.15, 0.15, 0.15, 0.15, 0.15, 0.10, 0.05, 0.03, 0.02])[0]
    
    bets = []
    for _ in range(num_bets):
        bet_type = random.choice(['deposit', 'withdrawal', 'bet_win', 'bet_loss', 'bonus', 'refund'])
        amount = round(random.uniform(10, 5000), 2)
        
        # Generate timestamp within last 90 days
        days_ago = random.randint(0, 90)
        timestamp = datetime.now() - timedelta(days=days_ago,
                                              hours=random.randint(0, 23),
                                              minutes=random.randint(0, 59))
        
        bet = {
            "id": str(uuid.uuid4())[:8],
            "customer_id": customer_id,
            "type": bet_type,
            "amount": amount,
            "status": random.choice(['completed', 'pending', 'denied']),
            "timestamp": timestamp.isoformat(),
            "description": f"{bet_type.replace('_', ' ').title()} ${amount}",
            "game": random.choice(['slots', 'blackjack', 'roulette', 'sports', 'poker', 'baccarat']) if 'bet' in bet_type else None
        }
        bets.append(bet)
    
    return sorted(bets, key=lambda x: x['timestamp'], reverse=True)

def generate_metadata(customer_id):
    """Generate customer metadata"""
    return {
        "customer_id": customer_id,
        "registration_date": (datetime.now() - timedelta(days=random.randint(1, 1095))).isoformat(),  # Up to 3 years ago
        "verification_status": random.choice(['verified', 'pending', 'unverified', 'rejected']),
        "risk_level": random.choices(['low', 'medium', 'high', 'blocked'], weights=[0.70, 0.20, 0.08, 0.02])[0],
        "vip_level": random.choices(['standard', 'bronze', 'silver', 'gold', 'platinum'], weights=[0.70, 0.15, 0.10, 0.04, 0.01])[0],
        "country": fake.country_code(),
        "time_zone": fake.timezone(),
        "preferred_currency": random.choice(['USD', 'EUR', 'GBP', 'CAD', 'AUD']),
        "marketing_consent": random.choice([True, False]),
        "deposit_limit": random.choice([500, 1000, 2000, 5000, 10000, None]),
        "self_exclusion": random.choice([None, "3_months", "6_months", "1_year"]) if random.random() < 0.05 else None,
        "notes": fake.sentence() if random.random() < 0.20 else "",
        "tags": random.sample(['high_roller', 'new_player', 'inactive', 'loyal', 'problem_gambler', 'vip', 'bonus_hunter'], 
                            random.randint(0, 3))
    }

def generate_cashier_info(customer_id):
    """Generate cashier/payment information"""
    payment_methods = []
    
    # Generate 0-3 payment methods per customer
    num_methods = random.choices([0, 1, 2, 3], weights=[0.30, 0.40, 0.25, 0.05])[0]
    
    method_types = ['credit_card', 'bank_transfer', 'paypal', 'skrill', 'neteller', 'bitcoin', 'ethereum']
    
    for _ in range(num_methods):
        method_type = random.choice(method_types)
        method = {
            "id": str(uuid.uuid4())[:12],
            "type": method_type,
            "is_primary": len(payment_methods) == 0,  # First method is primary
            "verified": random.choice([True, False]),
            "added_date": (datetime.now() - timedelta(days=random.randint(1, 365))).isoformat(),
            "last_used": (datetime.now() - timedelta(days=random.randint(1, 30))).isoformat() if random.random() < 0.70 else None
        }
        
        # Add method-specific details
        if method_type == 'credit_card':
            method.update({
                "last_four": str(random.randint(1000, 9999)),
                "expiry": f"{random.randint(1, 12):02d}/{random.randint(25, 30)}",
                "card_type": random.choice(['Visa', 'MasterCard', 'Amex'])
            })
        elif method_type in ['paypal', 'skrill', 'neteller']:
            method.update({
                "email": fake.email()
            })
        elif method_type in ['bitcoin', 'ethereum']:
            method.update({
                "wallet_address": fake.sha256()[:34]
            })
        elif method_type == 'bank_transfer':
            method.update({
                "account_name": fake.name(),
                "bank_name": fake.company() + " Bank",
                "account_number": "*****" + str(random.randint(1000, 9999))
            })
        
        payment_methods.append(method)
    
    # Generate transaction limits
    deposit_limits = {
        "daily": random.choice([500, 1000, 2000, 5000, 10000]),
        "weekly": random.choice([2500, 5000, 10000, 25000, 50000]), 
        "monthly": random.choice([10000, 25000, 50000, 100000, 250000])
    }
    
    withdrawal_limits = {
        "daily": random.choice([500, 1000, 2000, 3000]),
        "weekly": random.choice([2500, 5000, 10000, 15000]),
        "monthly": random.choice([10000, 20000, 40000, 60000])
    }
    
    return {
        "customer_id": customer_id,
        "payment_methods": payment_methods,
        "deposit_limits": deposit_limits,
        "withdrawal_limits": withdrawal_limits,
        "total_deposited": round(random.uniform(0, 50000), 2),
        "total_withdrawn": round(random.uniform(0, 30000), 2),
        "pending_withdrawals": random.randint(0, 2),
        "kyc_status": random.choice(['not_required', 'required', 'submitted', 'approved', 'rejected']),
        "kyc_documents": random.sample(['id_card', 'passport', 'utility_bill', 'bank_statement'], random.randint(0, 4)),
        "security_questions": random.randint(0, 3),
        "two_factor_enabled": random.choice([True, False])
    }

def generate_2000_customers():
    """Generate 2000+ customers with all data"""
    print("🚀 Generating 2000+ customers with comprehensive data...")
    
    customers = {}
    all_transactions = []
    all_metadata = {}
    all_cashier_info = {}
    used_ids = set()
    
    # Generate 2500 customers to ensure uniqueness
    target_customers = 2500
    
    for i in range(target_customers):
        if i % 100 == 0:
            print(f"   Generated {i}/{target_customers} customers...")
        
        # Generate unique customer ID
        while True:
            customer_id = generate_customer_id()
            if customer_id not in used_ids:
                used_ids.add(customer_id)
                break
        
        # Generate basic customer info
        telegram_id, telegram_username = generate_telegram_info()
        
        customer = {
            "customer_id": customer_id,
            "password": generate_password(),
            "balance": generate_balance(),
            "weekly_pnl": generate_weekly_pnl(),
            "phone": generate_phone(),
            "telegram_id": telegram_id,
            "telegram_username": telegram_username,
            "active": random.choices([True, False], weights=[0.85, 0.15])[0],  # 85% active
            "last_activity": generate_last_activity()
        }
        
        customers[customer_id] = customer
        
        # Generate betting history
        bet_history = generate_bet_history(customer_id)
        all_transactions.extend(bet_history)
        
        # Generate metadata
        metadata = generate_metadata(customer_id)
        all_metadata[customer_id] = metadata
        
        # Generate cashier info
        cashier_info = generate_cashier_info(customer_id)
        all_cashier_info[customer_id] = cashier_info
    
    print(f"✅ Generated {len(customers)} customers with {len(all_transactions)} transactions")
    
    # Create comprehensive database
    database = {
        "customers": customers,
        "transactions": sorted(all_transactions, key=lambda x: x['timestamp'], reverse=True),
        "metadata": all_metadata,
        "cashier_info": all_cashier_info,
        "alerts": {
            "large_win": 5000,
            "large_loss": -2000,
            "low_balance": 100,
            "inactive_days": 7,
            "high_volume_betting": 10000,
            "suspicious_activity": True
        },
        "groups": {
            "main": {
                "chat_id": "-2714719687",
                "name": "Main Trading Group",
                "type": "trading"
            },
            "vip": {
                "chat_id": "-1001234567890", 
                "name": "VIP Trading Group",
                "type": "vip_trading"
            },
            "high_rollers": {
                "chat_id": "-1002345678901",
                "name": "High Roller Club", 
                "type": "premium"
            }
        },
        "settings": {
            "last_backup": datetime.now().isoformat(),
            "version": "3.0",
            "database_size": len(customers),
            "generated_at": datetime.now().isoformat(),
            "features_enabled": [
                "betting_history",
                "metadata_tracking", 
                "cashier_management",
                "risk_assessment",
                "vip_levels",
                "payment_methods"
            ]
        },
        "statistics": {
            "total_customers": len(customers),
            "active_customers": sum(1 for c in customers.values() if c['active']),
            "total_balance": sum(c['balance'] for c in customers.values()),
            "total_weekly_pnl": sum(c['weekly_pnl'] for c in customers.values()),
            "customers_with_telegram": sum(1 for c in customers.values() if c['telegram_id']),
            "total_transactions": len(all_transactions),
            "verified_customers": sum(1 for m in all_metadata.values() if m['verification_status'] == 'verified'),
            "vip_customers": sum(1 for m in all_metadata.values() if m['vip_level'] != 'standard')
        }
    }
    
    return database

def save_database(database, filename="customer_database_2500.json"):
    """Save the database to file"""
    print(f"💾 Saving database to {filename}...")
    
    with open(filename, 'w') as f:
        json.dump(database, f, indent=2, default=str)
    
    # Create backup
    backup_filename = f"{filename}.backup"
    with open(backup_filename, 'w') as f:
        json.dump(database, f, indent=2, default=str)
    
    print(f"✅ Database saved successfully!")
    print(f"   Primary: {filename}")
    print(f"   Backup: {backup_filename}")

def generate_summary_report(database):
    """Generate a summary report of the database"""
    stats = database['statistics']
    
    print("\n" + "="*80)
    print("                    DATABASE GENERATION COMPLETE!")
    print("="*80)
    print(f"📊 SUMMARY STATISTICS:")
    print(f"   • Total Customers: {stats['total_customers']:,}")
    print(f"   • Active Customers: {stats['active_customers']:,} ({stats['active_customers']/stats['total_customers']*100:.1f}%)")
    print(f"   • Customers with Telegram: {stats['customers_with_telegram']:,} ({stats['customers_with_telegram']/stats['total_customers']*100:.1f}%)")
    print(f"   • Verified Customers: {stats['verified_customers']:,} ({stats['verified_customers']/stats['total_customers']*100:.1f}%)")
    print(f"   • VIP Customers: {stats['vip_customers']:,} ({stats['vip_customers']/stats['total_customers']*100:.1f}%)")
    print(f"   • Total Balance: ${stats['total_balance']:,.2f}")
    print(f"   • Total Weekly P&L: ${stats['total_weekly_pnl']:,.2f}")
    print(f"   • Total Transactions: {stats['total_transactions']:,}")
    
    print(f"\n🏆 TOP CUSTOMERS BY BALANCE:")
    top_customers = sorted(database['customers'].items(), 
                          key=lambda x: x[1]['balance'], reverse=True)[:10]
    for i, (customer_id, customer) in enumerate(top_customers, 1):
        print(f"   {i:2d}. {customer_id}: ${customer['balance']:,.2f}")
    
    print(f"\n📈 TOP CUSTOMERS BY WEEKLY P&L:")
    top_pnl = sorted(database['customers'].items(),
                    key=lambda x: x[1]['weekly_pnl'], reverse=True)[:10]
    for i, (customer_id, customer) in enumerate(top_pnl, 1):
        pnl_str = f"+${customer['weekly_pnl']:,.2f}" if customer['weekly_pnl'] >= 0 else f"-${abs(customer['weekly_pnl']):,.2f}"
        print(f"   {i:2d}. {customer_id}: {pnl_str}")
    
    print("\n" + "="*80)
    print("🎉 SUCCESS: 2500+ customer database generated with full betting history,")
    print("   metadata, and cashier information!")
    print("="*80)

if __name__ == "__main__":
    try:
        # Install faker if not available
        try:
            from faker import Faker
        except ImportError:
            print("Installing required package: faker")
            import subprocess
            subprocess.check_call(['pip3', 'install', 'faker'])
            from faker import Faker
        
        # Generate the database
        database = generate_2000_customers()
        
        # Save to file
        save_database(database)
        
        # Generate summary report
        generate_summary_report(database)
        
    except Exception as e:
        print(f"❌ Error generating database: {e}")
        import traceback
        traceback.print_exc()
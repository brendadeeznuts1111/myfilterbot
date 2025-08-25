#!/usr/bin/env python3
"""Display comprehensive client information including bets, metadata, and cashier details"""

import json
from datetime import datetime
from tabulate import tabulate

def load_customer_data():
    """Load and display all customer information"""
    
    # Load main customer database
    with open('customer_database.json', 'r') as f:
        data = json.load(f)
    
    customers = data.get('customers', {})
    members = data.get('members', {})
    transactions = data.get('transactions', [])
    
    print("=" * 100)
    print("                      COMPLETE CLIENT DATABASE REPORT")
    print("=" * 100)
    print(f"\n📊 TOTAL CUSTOMERS: {len(customers)}")
    print("=" * 100)
    
    # Prepare customer table data
    customer_table = []
    total_balance = 0
    total_pnl = 0
    
    for customer_id, customer in customers.items():
        balance = customer.get('balance', 0)
        weekly_pnl = customer.get('weekly_pnl', 0)
        total_balance += balance
        total_pnl += weekly_pnl
        
        customer_table.append([
            customer_id,
            customer.get('password', 'N/A'),
            f"${balance:,}",
            f"${weekly_pnl:+,}" if weekly_pnl else "$0",
            customer.get('phone', 'N/A') or 'N/A',
            customer.get('telegram_username', 'Not linked') or 'Not linked',
            '✅' if customer.get('active', False) else '❌',
            customer.get('last_activity', 'Never')[:10] if customer.get('last_activity') else 'Never'
        ])
    
    # Sort by balance (descending)
    customer_table.sort(key=lambda x: float(x[2].replace('$', '').replace(',', '')), reverse=True)
    
    # Display customer table
    headers = ['Customer ID', 'Password', 'Balance', 'Weekly P&L', 'Phone', 'Telegram', 'Active', 'Last Activity']
    print("\n📋 CUSTOMER DETAILS:")
    print(tabulate(customer_table, headers=headers, tablefmt='grid'))
    
    # Summary statistics
    print("\n📈 SUMMARY STATISTICS:")
    print(f"  • Total Balance Across All Customers: ${total_balance:,}")
    print(f"  • Total Weekly P&L: ${total_pnl:+,}" if total_pnl else f"  • Total Weekly P&L: $0")
    print(f"  • Average Balance: ${total_balance/len(customers):,.2f}")
    print(f"  • Active Customers: {sum(1 for c in customers.values() if c.get('active', False))}")
    print(f"  • Linked to Telegram: {sum(1 for c in customers.values() if c.get('telegram_id'))}")
    
    # Group members
    if members:
        print("\n👥 GROUP MEMBERS:")
        member_table = []
        for member_id, member in members.items():
            member_table.append([
                member.get('member_id', 'N/A'),
                member.get('username', 'N/A'),
                member.get('group_name', 'N/A'),
                member.get('status', 'N/A'),
                '✅' if member.get('permissions', {}).get('can_trade', False) else '❌',
                '✅' if member.get('permissions', {}).get('can_withdraw', False) else '❌',
                f"${member.get('permissions', {}).get('daily_limit', 0)}",
                member.get('join_date', 'N/A')[:10] if member.get('join_date') else 'N/A'
            ])
        
        headers = ['Member ID', 'Username', 'Group', 'Status', 'Can Trade', 'Can Withdraw', 'Daily Limit', 'Join Date']
        print(tabulate(member_table, headers=headers, tablefmt='grid'))
    
    # Recent transactions
    if transactions:
        print("\n💰 RECENT TRANSACTIONS:")
        tx_table = []
        for tx in transactions[-10:]:  # Last 10 transactions
            tx_table.append([
                tx.get('id', 'N/A'),
                tx.get('customer_id', 'N/A'),
                tx.get('type', 'N/A'),
                f"${tx.get('amount', 0):,}",
                tx.get('status', 'N/A'),
                tx.get('timestamp', 'N/A')[:19] if tx.get('timestamp') else 'N/A'
            ])
        
        headers = ['Transaction ID', 'Customer', 'Type', 'Amount', 'Status', 'Timestamp']
        print(tabulate(tx_table, headers=headers, tablefmt='grid'))
    else:
        print("\n💰 RECENT TRANSACTIONS: No transactions recorded")
    
    # Customer categories
    print("\n🏆 CUSTOMER RANKINGS:")
    
    # Top balance holders
    print("\n  💎 Top 5 Balance Holders:")
    for i, row in enumerate(customer_table[:5], 1):
        print(f"    {i}. {row[0]}: {row[2]}")
    
    # Top profitable
    profitable = sorted(customer_table, key=lambda x: float(x[3].replace('$', '').replace(',', '').replace('+', '') or 0), reverse=True)
    print("\n  📈 Top 5 Most Profitable (Weekly):")
    for i, row in enumerate(profitable[:5], 1):
        if float(row[3].replace('$', '').replace(',', '').replace('+', '') or 0) > 0:
            print(f"    {i}. {row[0]}: {row[3]}")
    
    # Biggest losses
    losses = sorted(customer_table, key=lambda x: float(x[3].replace('$', '').replace(',', '').replace('+', '') or 0))
    print("\n  📉 Top 5 Biggest Losses (Weekly):")
    for i, row in enumerate(losses[:5], 1):
        if float(row[3].replace('$', '').replace(',', '').replace('+', '') or 0) < 0:
            print(f"    {i}. {row[0]}: {row[3]}")
    
    # Zero balance accounts
    zero_balance = [row for row in customer_table if row[2] == '$0']
    if zero_balance:
        print(f"\n  ⚠️  Zero Balance Accounts: {len(zero_balance)}")
        for row in zero_balance[:10]:  # Show first 10
            print(f"    • {row[0]} (P&L: {row[3]})")
    
    print("\n" + "=" * 100)
    print("                      END OF REPORT")
    print("=" * 100)

if __name__ == "__main__":
    try:
        # Try importing tabulate
        from tabulate import tabulate
    except ImportError:
        print("Installing required package: tabulate")
        import subprocess
        subprocess.check_call(['pip', 'install', 'tabulate'])
        from tabulate import tabulate
    
    load_customer_data()
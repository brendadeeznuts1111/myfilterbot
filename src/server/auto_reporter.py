import asyncio
import json
import logging
from datetime import datetime, timedelta
from telegram import Bot
from telegram.constants import ParseMode
import schedule
import time

# Configuration
BOT_TOKEN = "7555654864:AAE8ZsVnJbRK_41JZVMZAXDSCFstGRcxCY0"
ADMIN_CHAT_ID = "-2714719687"

# Initialize bot
bot = Bot(token=BOT_TOKEN)

def load_database():
    with open('customer_database.json', 'r') as f:
        return json.load(f)

def save_database(db):
    with open('customer_database.json', 'w') as f:
        json.dump(db, f, indent=2)

async def generate_daily_report():
    """Generate and send daily report"""
    db = load_database()
    
    # Calculate daily statistics
    today = datetime.now().date()
    today_transactions = [
        t for t in db['transactions'] 
        if datetime.fromisoformat(t['timestamp']).date() == today
    ]
    
    # Group by customer
    customer_activity = {}
    for tx in today_transactions:
        cid = tx['customer_id']
        if cid not in customer_activity:
            customer_activity[cid] = {
                'deposits': 0,
                'withdrawals': 0,
                'denied': 0,
                'total': 0
            }
        
        if tx['type'] == 'deposit' and tx['amount']:
            customer_activity[cid]['deposits'] += tx['amount']
        elif tx['type'] == 'withdrawal' and tx['amount']:
            customer_activity[cid]['withdrawals'] += tx['amount']
        elif tx['type'] == 'denied':
            customer_activity[cid]['denied'] += 1
        
        customer_activity[cid]['total'] += 1
    
    # Build report
    report = "📊 **DAILY REPORT**\n"
    report += f"📅 {datetime.now().strftime('%B %d, %Y')}\n"
    report += "━━━━━━━━━━━━━━━━━━\n\n"
    
    # Summary
    total_deposits = sum(c['deposits'] for c in customer_activity.values())
    total_withdrawals = sum(c['withdrawals'] for c in customer_activity.values())
    net_flow = total_deposits - total_withdrawals
    
    report += "**💰 FINANCIAL SUMMARY**\n"
    report += f"• Total Deposits: **${total_deposits:,.2f}**\n"
    report += f"• Total Withdrawals: **${total_withdrawals:,.2f}**\n"
    report += f"• Net Flow: **${net_flow:+,.2f}**\n"
    report += f"• Active Customers: **{len(customer_activity)}**\n\n"
    
    # Top performers
    if customer_activity:
        top_depositors = sorted(
            customer_activity.items(), 
            key=lambda x: x[1]['deposits'], 
            reverse=True
        )[:5]
        
        report += "**🏆 TOP DEPOSITORS**\n"
        for i, (cid, stats) in enumerate(top_depositors, 1):
            if stats['deposits'] > 0:
                customer = db['customers'][cid]
                report += f"{i}. {cid}: **${stats['deposits']:,.2f}**\n"
        report += "\n"
    
    # At risk customers
    at_risk = []
    for cid, customer in db['customers'].items():
        if customer['balance'] < 100 and customer['active']:
            at_risk.append((cid, customer['balance']))
    
    if at_risk:
        report += "**⚠️ LOW BALANCE ALERTS**\n"
        for cid, balance in sorted(at_risk, key=lambda x: x[1])[:5]:
            report += f"• {cid}: ${balance}\n"
        report += "\n"
    
    # Failed transactions
    denied_count = sum(c['denied'] for c in customer_activity.values())
    if denied_count > 0:
        report += f"**❌ DENIED TRANSACTIONS: {denied_count}**\n"
        for cid, stats in customer_activity.items():
            if stats['denied'] > 0:
                report += f"• {cid}: {stats['denied']} denied\n"
        report += "\n"
    
    # Customer status
    total_balance = sum(c['balance'] for c in db['customers'].values())
    active_count = sum(1 for c in db['customers'].values() if c['active'])
    
    report += "**👥 CUSTOMER STATUS**\n"
    report += f"• Total Customers: {len(db['customers'])}\n"
    report += f"• Active: {active_count}\n"
    report += f"• Total Balance: **${total_balance:,.2f}**\n"
    
    # Send report
    await bot.send_message(
        chat_id=ADMIN_CHAT_ID,
        text=report,
        parse_mode=ParseMode.MARKDOWN
    )
    
    logging.info(f"Daily report sent for {today}")

async def generate_weekly_report():
    """Generate comprehensive weekly report"""
    db = load_database()
    
    # Calculate weekly statistics
    week_start = datetime.now().date() - timedelta(days=7)
    week_transactions = [
        t for t in db['transactions'] 
        if datetime.fromisoformat(t['timestamp']).date() >= week_start
    ]
    
    report = "📈 **WEEKLY PERFORMANCE REPORT**\n"
    report += f"📅 Week of {week_start.strftime('%B %d, %Y')}\n"
    report += "━━━━━━━━━━━━━━━━━━\n\n"
    
    # Weekly P&L Analysis
    report += "**💹 P&L ANALYSIS**\n"
    
    # Sort by weekly P&L
    sorted_customers = sorted(
        db['customers'].items(),
        key=lambda x: x[1]['weekly_pnl'],
        reverse=True
    )
    
    # Winners
    report += "\n**🟢 TOP WINNERS**\n"
    for cid, customer in sorted_customers[:5]:
        if customer['weekly_pnl'] > 0:
            report += f"• {cid}: **+${customer['weekly_pnl']:,.2f}**\n"
    
    # Losers
    report += "\n**🔴 BIGGEST LOSSES**\n"
    for cid, customer in sorted_customers[-5:]:
        if customer['weekly_pnl'] < 0:
            report += f"• {cid}: **${customer['weekly_pnl']:,.2f}**\n"
    
    # Transaction volume
    transaction_volume = {}
    for tx in week_transactions:
        cid = tx['customer_id']
        if cid not in transaction_volume:
            transaction_volume[cid] = 0
        transaction_volume[cid] += 1
    
    report += "\n**📊 MOST ACTIVE**\n"
    for cid, count in sorted(transaction_volume.items(), key=lambda x: x[1], reverse=True)[:5]:
        report += f"• {cid}: {count} transactions\n"
    
    # Weekly totals
    total_weekly_pnl = sum(c['weekly_pnl'] for c in db['customers'].values())
    positive_pnl = sum(1 for c in db['customers'].values() if c['weekly_pnl'] > 0)
    negative_pnl = sum(1 for c in db['customers'].values() if c['weekly_pnl'] < 0)
    
    report += f"\n**📊 WEEKLY SUMMARY**\n"
    report += f"• Total P&L: **${total_weekly_pnl:+,.2f}**\n"
    report += f"• Winners: {positive_pnl} customers\n"
    report += f"• Losers: {negative_pnl} customers\n"
    report += f"• Win Rate: **{(positive_pnl/(positive_pnl+negative_pnl)*100):.1f}%**\n"
    
    await bot.send_message(
        chat_id=ADMIN_CHAT_ID,
        text=report,
        parse_mode=ParseMode.MARKDOWN
    )
    
    logging.info("Weekly report sent")

async def send_customer_alerts():
    """Send alerts to registered customers"""
    db = load_database()
    
    for cid, customer in db['customers'].items():
        if not customer.get('telegram_id') or not customer['active']:
            continue
        
        alerts = []
        
        # Low balance alert
        if customer['balance'] < 100:
            alerts.append(f"⚠️ Your balance is low: ${customer['balance']}")
        
        # Weekly P&L alert
        if customer['weekly_pnl'] < -500:
            alerts.append(f"📉 Weekly loss exceeds $500: ${customer['weekly_pnl']}")
        
        if alerts:
            message = f"🔔 **Account Alerts for {cid}**\n\n"
            message += "\n".join(alerts)
            message += "\n\nContact support if you need assistance."
            
            try:
                await bot.send_message(
                    chat_id=customer['telegram_id'],
                    text=message,
                    parse_mode=ParseMode.MARKDOWN
                )
            except Exception as e:
                logging.error(f"Failed to send alert to {cid}: {e}")

async def monitor_inactive_customers():
    """Check for inactive customers"""
    db = load_database()
    
    # Find customers with no recent activity
    three_days_ago = datetime.now() - timedelta(days=3)
    inactive_customers = []
    
    for cid, customer in db['customers'].items():
        if not customer['active']:
            continue
            
        # Check last transaction
        customer_transactions = [
            t for t in db['transactions'] 
            if t['customer_id'] == cid
        ]
        
        if customer_transactions:
            last_tx = max(
                customer_transactions, 
                key=lambda x: datetime.fromisoformat(x['timestamp'])
            )
            last_activity = datetime.fromisoformat(last_tx['timestamp'])
            
            if last_activity < three_days_ago:
                inactive_customers.append((cid, last_activity))
        else:
            inactive_customers.append((cid, None))
    
    if inactive_customers:
        alert = "⏰ **INACTIVE CUSTOMER ALERT**\n\n"
        for cid, last_activity in inactive_customers[:10]:
            if last_activity:
                days_inactive = (datetime.now() - last_activity).days
                alert += f"• {cid}: {days_inactive} days inactive\n"
            else:
                alert += f"• {cid}: No activity recorded\n"
        
        await bot.send_message(
            chat_id=ADMIN_CHAT_ID,
            text=alert,
            parse_mode=ParseMode.MARKDOWN
        )

def run_scheduler():
    """Run scheduled tasks"""
    # Schedule daily report at 9 PM
    schedule.every().day.at("21:00").do(
        lambda: asyncio.run(generate_daily_report())
    )
    
    # Schedule weekly report on Sundays at 8 PM
    schedule.every().sunday.at("20:00").do(
        lambda: asyncio.run(generate_weekly_report())
    )
    
    # Check inactive customers every day at 10 AM
    schedule.every().day.at("10:00").do(
        lambda: asyncio.run(monitor_inactive_customers())
    )
    
    # Send customer alerts every day at 3 PM
    schedule.every().day.at("15:00").do(
        lambda: asyncio.run(send_customer_alerts())
    )
    
    print("=" * 50)
    print("AUTO REPORTER STARTED")
    print("=" * 50)
    print("Scheduled Tasks:")
    print("• Daily Report: 9:00 PM")
    print("• Weekly Report: Sunday 8:00 PM")
    print("• Inactive Check: 10:00 AM")
    print("• Customer Alerts: 3:00 PM")
    print("-" * 50)
    
    # Keep running
    while True:
        schedule.run_pending()
        time.sleep(60)  # Check every minute

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    # Test immediate report (comment out for production)
    print("Sending test daily report...")
    asyncio.run(generate_daily_report())
    
    # Start scheduler
    run_scheduler()
#!/usr/bin/env python3
from typing import Dict, List, Optional, Any, Tuple, Set, Union
import json

def analyze_current_database():
    """Analyze the current merged database"""
    try:
        with open('customer_database.json', 'r') as f:
            data = json.load(f)
        
        print("📊 Current Database Analysis:")
        print(f"   • Total customers: {len(data.get('customers', {}))}")
        
        if data.get('customers'):
            customer_ids = list(data['customers'].keys())
            print(f"   • Customer IDs (first 10): {customer_ids[:10]}")
            
            # Sample customer structure
            first_customer = next(iter(data['customers'].values()))
            print(f"   • Sample customer structure:")
            for key, value in list(first_customer.items())[:8]:  # Show first 8 fields
                print(f"     - {key}: {value}")
            
            # Check for specific IDs from the new data
            new_data_ids = ['JP990', 'BBPERSONAL', 'DAKO', 'VALL']
            found_ids = [cid for cid in new_data_ids if cid in data['customers']]
            print(f"   • New data IDs found in current DB: {found_ids}")
            
        return data
    except Exception as e:
        print(f"❌ Error analyzing database: {e}")
        return None

def analyze_new_data_structure():
    """Analyze the structure of the new data"""
    print("\n🔍 New Data Structure Analysis:")
    print("   • Data appears to be a trading/agent management system")
    print("   • Contains customer IDs, agent hierarchies, trading performance")
    print("   • Key fields identified:")
    print("     - CustomerID, AgentID, MasterAgent")
    print("     - Balance fields: ActualBalance, PendingBalance, SettleFigure")
    print("     - Trading data: day1-day7, weekly P&L")
    print("     - Agent management: AgentType, Login, Password")

if __name__ == "__main__":
    current_db = analyze_current_database()
    analyze_new_data_structure()
    
    if current_db:
        print(f"\n💡 Integration Recommendations:")
        print("   1. Check if new data IDs overlap with existing customers")
        print("   2. Determine if this is additional data or replacement data")
        print("   3. Map field names between systems")
        print("   4. Decide on merge strategy (append vs. replace)")

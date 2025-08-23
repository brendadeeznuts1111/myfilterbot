"""
Database management for Fantdev Trading Bot
"""
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
import logging

logger = logging.getLogger(__name__)

@dataclass
class Customer:
    """Customer data model"""
    customer_id: str
    password: str
    balance: float
    weekly_pnl: float
    phone: str = ""
    telegram_id: Optional[int] = None
    telegram_username: Optional[str] = None
    active: bool = True
    last_activity: Optional[str] = None
    
    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'Customer':
        """Create from dictionary"""
        return cls(**data)

@dataclass
class Transaction:
    """Transaction data model"""
    timestamp: str
    customer_id: str
    type: str
    amount: Optional[float]
    message: str
    from_user: str
    chat_id: int
    status: str = "completed"
    
    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'Transaction':
        """Create from dictionary"""
        return cls(**data)

class Database:
    """Database manager with proper error handling and validation"""
    
    def __init__(self, db_path: str = "customer_database.json"):
        self.db_path = db_path
        self.data = self._load()
        self._ensure_structure()
        
    def _load(self) -> Dict:
        """Load database from file"""
        try:
            if os.path.exists(self.db_path):
                with open(self.db_path, 'r') as f:
                    return json.load(f)
            else:
                logger.warning(f"Database not found at {self.db_path}, creating new")
                return self._default_structure()
        except Exception as e:
            logger.error(f"Error loading database: {e}")
            return self._default_structure()
    
    def _default_structure(self) -> Dict:
        """Return default database structure"""
        return {
            "customers": {},
            "transactions": [],
            "alerts": {
                "large_win": 1000,
                "large_loss": -500,
                "low_balance": 100,
                "inactive_days": 3
            },
            "groups": {},
            "settings": {
                "last_backup": None,
                "version": "2.0"
            }
        }
    
    def _ensure_structure(self):
        """Ensure database has all required fields"""
        default = self._default_structure()
        for key, value in default.items():
            if key not in self.data:
                self.data[key] = value
    
    def save(self) -> bool:
        """Save database to file"""
        try:
            # Create backup before saving
            self._create_backup()
            
            with open(self.db_path, 'w') as f:
                json.dump(self.data, f, indent=2)
            return True
        except Exception as e:
            logger.error(f"Error saving database: {e}")
            return False
    
    def _create_backup(self):
        """Create backup of database"""
        try:
            backup_path = f"{self.db_path}.backup"
            if os.path.exists(self.db_path):
                with open(self.db_path, 'r') as src:
                    with open(backup_path, 'w') as dst:
                        dst.write(src.read())
                self.data['settings']['last_backup'] = datetime.now().isoformat()
        except Exception as e:
            logger.error(f"Error creating backup: {e}")
    
    # Customer operations
    def get_customer(self, customer_id: str) -> Optional[Customer]:
        """Get customer by ID"""
        try:
            data = self.data['customers'].get(customer_id.upper())
            if data:
                # Ensure customer_id is in data
                if 'customer_id' not in data:
                    data['customer_id'] = customer_id.upper()
                if 'telegram_id' not in data:
                    data['telegram_id'] = None
                if 'telegram_username' not in data:
                    data['telegram_username'] = None
                if 'last_activity' not in data:
                    data['last_activity'] = None
                if 'phone' not in data:
                    data['phone'] = ""
                return Customer.from_dict(data)
            return None
        except Exception as e:
            logger.error(f"Error getting customer {customer_id}: {e}")
            return None
    
    def get_all_customers(self) -> List[Customer]:
        """Get all customers"""
        customers = []
        for cid, data in self.data['customers'].items():
            try:
                # Ensure all required fields
                if 'customer_id' not in data:
                    data['customer_id'] = cid
                if 'telegram_id' not in data:
                    data['telegram_id'] = None
                if 'telegram_username' not in data:
                    data['telegram_username'] = None
                if 'last_activity' not in data:
                    data['last_activity'] = None
                if 'phone' not in data:
                    data['phone'] = ""
                    
                customers.append(Customer.from_dict(data))
            except Exception as e:
                logger.error(f"Error loading customer {cid}: {e}")
        return customers
    
    def update_customer(self, customer: Customer) -> bool:
        """Update customer data"""
        try:
            self.data['customers'][customer.customer_id] = customer.to_dict()
            return self.save()
        except Exception as e:
            logger.error(f"Error updating customer: {e}")
            return False
    
    def register_customer(self, customer_id: str, telegram_id: int, 
                         telegram_username: Optional[str] = None) -> bool:
        """Register customer with Telegram account"""
        try:
            customer = self.get_customer(customer_id)
            if customer:
                customer.telegram_id = telegram_id
                customer.telegram_username = telegram_username
                customer.last_activity = datetime.now().isoformat()
                return self.update_customer(customer)
            return False
        except Exception as e:
            logger.error(f"Error registering customer: {e}")
            return False
    
    def find_customer_by_telegram(self, telegram_id: int) -> Optional[Customer]:
        """Find customer by Telegram ID"""
        for customer in self.get_all_customers():
            if customer.telegram_id == telegram_id:
                return customer
        return None
    
    def update_balance(self, customer_id: str, amount: float, 
                      transaction_type: str) -> bool:
        """Update customer balance based on transaction"""
        try:
            customer = self.get_customer(customer_id)
            if not customer:
                return False
            
            if transaction_type == 'deposit':
                customer.balance += amount
            elif transaction_type == 'withdrawal':
                customer.balance -= amount
            
            customer.last_activity = datetime.now().isoformat()
            return self.update_customer(customer)
        except Exception as e:
            logger.error(f"Error updating balance: {e}")
            return False
    
    # Transaction operations  
    def add_transaction(self, transaction: Transaction) -> bool:
        """Add transaction to database"""
        try:
            self.data['transactions'].append(transaction.to_dict())
            
            # Keep only last 1000 transactions
            if len(self.data['transactions']) > 1000:
                self.data['transactions'] = self.data['transactions'][-1000:]
            
            return self.save()
        except Exception as e:
            logger.error(f"Error adding transaction: {e}")
            return False
    
    def get_customer_transactions(self, customer_id: str, 
                                 limit: int = 50) -> List[Transaction]:
        """Get transactions for a customer"""
        transactions = []
        for tx_data in self.data['transactions']:
            if tx_data.get('customer_id') == customer_id:
                try:
                    transactions.append(Transaction.from_dict(tx_data))
                except Exception as e:
                    logger.error(f"Error loading transaction: {e}")
        
        return transactions[-limit:]
    
    def get_recent_transactions(self, hours: int = 24) -> List[Transaction]:
        """Get recent transactions"""
        cutoff = datetime.now() - timedelta(hours=hours)
        recent = []
        
        for tx_data in self.data['transactions']:
            try:
                tx_time = datetime.fromisoformat(tx_data['timestamp'])
                if tx_time > cutoff:
                    recent.append(Transaction.from_dict(tx_data))
            except Exception as e:
                logger.error(f"Error processing transaction: {e}")
        
        return recent
    
    # Analytics
    def get_statistics(self) -> Dict[str, Any]:
        """Get database statistics"""
        try:
            customers = self.get_all_customers()
            return {
                'total_customers': len(customers),
                'active_customers': sum(1 for c in customers if c.active),
                'total_balance': sum(c.balance for c in customers),
                'total_weekly_pnl': sum(c.weekly_pnl for c in customers),
                'total_transactions': len(self.data['transactions']),
                'registered_users': sum(1 for c in customers if c.telegram_id),
                'at_risk': sum(1 for c in customers 
                             if c.balance < self.data['alerts']['low_balance'])
            }
        except Exception as e:
            logger.error(f"Error calculating statistics: {e}")
            return {}
    
    def get_top_performers(self, limit: int = 5) -> List[Customer]:
        """Get top performing customers by P&L"""
        customers = self.get_all_customers()
        return sorted(customers, key=lambda c: c.weekly_pnl, reverse=True)[:limit]
    
    def get_low_balance_customers(self) -> List[Customer]:
        """Get customers with low balance"""
        threshold = self.data['alerts']['low_balance']
        return [c for c in self.get_all_customers() if c.balance < threshold]
    
    def get_inactive_customers(self, days: int = 3) -> List[Customer]:
        """Get inactive customers"""
        cutoff = datetime.now() - timedelta(days=days)
        inactive = []
        
        for customer in self.get_all_customers():
            if customer.last_activity:
                try:
                    last_active = datetime.fromisoformat(customer.last_activity)
                    if last_active < cutoff:
                        inactive.append(customer)
                except:
                    pass
            else:
                inactive.append(customer)
        
        return inactive

# Global database instance
db = Database()
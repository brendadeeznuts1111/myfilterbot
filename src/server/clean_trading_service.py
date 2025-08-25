#!/usr/bin/env python3
"""
Clean Trading Service v3.0
Professional trading system with clean architecture and proper data structure
"""

import json
import logging
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, abort
from flask_cors import CORS
from typing import Dict, List, Optional, Any
import uuid
import hashlib

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('clean_trading.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Configuration
CONFIG = {
    'DB_FILE': 'clean_trading_database.json',
    'BACKUP_INTERVAL': 3600,  # 1 hour
    'MAX_IP_HISTORY': 100,
    'RATE_LIMIT': 100,
    'LOG_LEVEL': 'INFO'
}

class CleanDatabaseManager:
    """Clean database management for trading system"""
    
    def __init__(self, db_file: str):
        self.db_file = db_file
        self.backup_file = f"{db_file}.backup"
        self.last_backup = datetime.now()
    
    def load_database(self) -> Dict[str, Any]:
        """Load clean trading database"""
        try:
            with open(self.db_file, 'r') as f:
                data = json.load(f)
            
            # Validate database structure
            required_sections = ['system_info', 'customers', 'transactions', 'ip_tracking', 
                               'deleted_wagers', 'agent_hierarchy', 'system_config']
            
            for section in required_sections:
                if section not in data:
                    logger.warning(f"Missing section: {section}, creating default")
                    data[section] = self._get_default_section(section)
            
            # Auto-backup if needed
            self._check_backup_needed()
            
            return data
            
        except FileNotFoundError:
            logger.info(f"Database not found, creating new clean structure: {self.db_file}")
            return self._create_clean_database()
        except json.JSONDecodeError as e:
            logger.error(f"Database corruption detected: {e}")
            return self._restore_from_backup()
        except Exception as e:
            logger.error(f"Database loading error: {e}")
            abort(500, description="Database error")
    
    def save_database(self, data: Dict[str, Any]) -> bool:
        """Save database with atomic write"""
        try:
            # Create backup before saving
            self._create_backup()
            
            # Atomic write
            temp_file = f"{self.db_file}.tmp"
            with open(temp_file, 'w') as f:
                json.dump(data, f, indent=2, default=str)
            
            # Rename temp file to actual file
            import os
            os.rename(temp_file, self.db_file)
            
            logger.info("Clean database saved successfully")
            return True
            
        except Exception as e:
            logger.error(f"Database save error: {e}")
            return False
    
    def _create_clean_database(self) -> Dict[str, Any]:
        """Create a new clean trading database"""
        clean_db = {
            'system_info': {
                'created_at': datetime.now().isoformat(),
                'version': '3.0.0',
                'database_type': 'trading_system',
                'last_maintenance': datetime.now().isoformat(),
                'description': 'Clean Trading System Database - Professional Structure'
            },
            'customers': {},
            'transactions': [],
            'ip_tracking': {},
            'deleted_wagers': {},
            'agent_hierarchy': {},
            'system_config': {
                'trading_hours': {'start': '09:00', 'end': '17:00', 'timezone': 'UTC'},
                'risk_limits': {'max_daily_loss': 10000, 'max_position_size': 50000, 'max_leverage': 10},
                'fees': {'deposit_fee': 0.00, 'withdrawal_fee': 25.00, 'trading_fee': 0.10}
            }
        }
        self.save_database(clean_db)
        return clean_db
    
    def _get_default_section(self, section: str) -> Any:
        """Get default content for missing sections"""
        defaults = {
            'customers': {},
            'transactions': [],
            'ip_tracking': {},
            'deleted_wagers': {},
            'agent_hierarchy': {},
            'system_config': {
                'trading_hours': {'start': '09:00', 'end': '17:00', 'timezone': 'UTC'},
                'risk_limits': {'max_daily_loss': 10000, 'max_position_size': 50000, 'max_leverage': 10},
                'fees': {'deposit_fee': 0.00, 'withdrawal_fee': 25.00, 'trading_fee': 0.10}
            }
        }
        return defaults.get(section, {})
    
    def _create_backup(self) -> None:
        """Create database backup"""
        try:
            import shutil
            shutil.copy2(self.db_file, self.backup_file)
            self.last_backup = datetime.now()
            logger.info("Clean database backup created")
        except Exception as e:
            logger.warning(f"Backup creation failed: {e}")
    
    def _check_backup_needed(self) -> None:
        """Check if backup is needed"""
        if (datetime.now() - self.last_backup).total_seconds() > CONFIG['BACKUP_INTERVAL']:
            self._create_backup()
    
    def _restore_from_backup(self) -> Dict[str, Any]:
        """Restore database from backup"""
        try:
            with open(self.backup_file, 'r') as f:
                data = json.load(f)
            logger.info("Clean database restored from backup")
            return data
        except Exception as e:
            logger.error(f"Backup restoration failed: {e}")
            return self._create_clean_database()

class CleanTradingService:
    """Clean trading service with proper data structure"""
    
    def __init__(self, db_manager: CleanDatabaseManager):
        self.db_manager = db_manager
    
    def get_customer_info(self, customer_id: str) -> Dict[str, Any]:
        """Get clean customer information"""
        db = self.db_manager.load_database()
        customer = db.get('customers', {}).get(customer_id)
        
        if not customer:
            abort(404, description="Customer not found")
        
        # Get agent hierarchy info
        agent_info = db.get('agent_hierarchy', {}).get(customer.get('master_agent', ''), {})
        
        return {
            'customer_id': customer_id,
            'customer_info': customer,
            'agent_hierarchy': agent_info,
            'system_config': db.get('system_config', {})
        }
    
    def get_transaction_history(self, customer_id: str, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
        """Get clean transaction history"""
        db = self.db_manager.load_database()
        customer = db.get('customers', {}).get(customer_id)
        
        if not customer:
            abort(404, description="Customer not found")
        
        # Get transactions with pagination
        all_transactions = [t for t in db.get('transactions', []) 
                          if t.get('customer_id') == customer_id]
        
        # Sort by timestamp (newest first)
        all_transactions.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        # Apply pagination
        total = len(all_transactions)
        transactions = all_transactions[offset:offset + limit]
        
        return {
            'customer_id': customer_id,
            'customer_name': customer.get('name', customer_id),
            'total_transactions': total,
            'transactions': transactions,
            'pagination': {
                'limit': limit,
                'offset': offset,
                'total': total,
                'has_more': offset + limit < total
            }
        }
    
    def create_transaction(self, customer_id: str, transaction_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new clean transaction"""
        db = self.db_manager.load_database()
        customer = db.get('customers', {}).get(customer_id)
        
        if not customer:
            abort(404, description="Customer not found")
        
        # Validate transaction data
        required_fields = ['type', 'amount', 'description']
        for field in required_fields:
            if field not in transaction_data:
                abort(400, description=f"Missing required field: {field}")
        
        # Create clean transaction
        clean_transaction = {
            'id': str(uuid.uuid4()),
            'customer_id': customer_id,
            'agent_id': customer.get('agent_id'),
            'master_agent': customer.get('master_agent'),
            'type': transaction_data['type'],
            'amount': float(transaction_data['amount']),
            'description': transaction_data['description'],
            'status': 'pending',
            'timestamp': datetime.now().isoformat(),
            'created_at': datetime.now().isoformat(),
            'metadata': transaction_data.get('metadata', {})
        }
        
        # Add to database
        if 'transactions' not in db:
            db['transactions'] = []
        
        db['transactions'].append(clean_transaction)
        self.db_manager.save_database(db)
        
        logger.info(f"Clean transaction created for customer {customer_id}: {clean_transaction['id']}")
        
        return {
            'success': True,
            'transaction': clean_transaction,
            'message': 'Transaction created successfully'
        }

class CleanIPService:
    """Clean IP tracking service"""
    
    def __init__(self, db_manager: CleanDatabaseManager):
        self.db_manager = db_manager
    
    def track_ip(self, customer_id: str, ip_data: Dict[str, Any]) -> Dict[str, Any]:
        """Track customer IP with clean data structure"""
        db = self.db_manager.load_database()
        customer = db.get('customers', {}).get(customer_id)
        
        if not customer:
            abort(404, description="Customer not found")
        
        # Validate IP data
        if 'ip' not in ip_data:
            abort(400, description="IP address required")
        
        # Create clean IP record
        clean_ip_record = {
            'id': str(uuid.uuid4()),
            'customer_id': customer_id,
            'agent_id': customer.get('agent_id'),
            'master_agent': customer.get('master_agent'),
            'ip_address': ip_data['ip'],
            'user_agent': request.headers.get('User-Agent', ''),
            'referer': request.headers.get('Referer', ''),
            'timestamp': datetime.now().isoformat(),
            'created_at': datetime.now().isoformat(),
            'metadata': ip_data.get('metadata', {})
        }
        
        # Store in database
        if 'ip_tracking' not in db:
            db['ip_tracking'] = {}
        
        if customer_id not in db['ip_tracking']:
            db['ip_tracking'][customer_id] = []
        
        # Limit IP history
        ip_history = db['ip_tracking'][customer_id]
        if len(ip_history) >= CONFIG['MAX_IP_HISTORY']:
            ip_history.pop(0)
        
        ip_history.append(clean_ip_record)
        db['ip_tracking'][customer_id] = ip_history
        
        self.db_manager.save_database(db)
        
        logger.info(f"IP tracked for customer {customer_id}: {ip_data['ip']}")
        
        return {
            'success': True,
            'ip_record': clean_ip_record,
            'message': 'IP tracked successfully'
        }
    
    def get_ip_history(self, customer_id: str, limit: int = 50) -> Dict[str, Any]:
        """Get clean IP tracking history"""
        db = self.db_manager.load_database()
        customer = db.get('customers', {}).get(customer_id)
        
        if not customer:
            abort(404, description="Customer not found")
        
        ip_history = db.get('ip_tracking', {}).get(customer_id, [])
        
        # Sort by timestamp (newest first)
        ip_history.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        # Apply limit
        recent_ips = ip_history[:limit]
        
        return {
            'customer_id': customer_id,
            'customer_name': customer.get('name', customer_id),
            'ip_history': recent_ips,
            'total_tracked': len(ip_history)
        }

# Initialize services
db_manager = CleanDatabaseManager(CONFIG['DB_FILE'])
trading_service = CleanTradingService(db_manager)
ip_service = CleanIPService(db_manager)

# API Endpoints
@app.route('/api/customers/<customer_id>', methods=['GET'])
def get_customer(customer_id: str):
    """Get clean customer information"""
    try:
        return jsonify(trading_service.get_customer_info(customer_id))
    except Exception as e:
        logger.error(f"Get customer error: {e}")
        abort(500, description="Internal server error")

@app.route('/api/transactions/<customer_id>', methods=['GET', 'POST'])
def handle_transactions(customer_id: str):
    """Handle clean transactions"""
    try:
        if request.method == 'POST':
            transaction_data = request.get_json()
            if not transaction_data:
                abort(400, description="No transaction data provided")
            
            return jsonify(trading_service.create_transaction(customer_id, transaction_data))
        else:
            limit = request.args.get('limit', 100, type=int)
            offset = request.args.get('offset', 0, type=int)
            
            return jsonify(trading_service.get_transaction_history(customer_id, limit, offset))
            
    except Exception as e:
        logger.error(f"Transaction error: {e}")
        abort(500, description="Internal server error")

@app.route('/api/ip-tracking/<customer_id>', methods=['GET', 'POST'])
def handle_ip_tracking(customer_id: str):
    """Handle clean IP tracking"""
    try:
        if request.method == 'POST':
            ip_data = request.get_json()
            if not ip_data:
                abort(400, description="No IP data provided")
            
            return jsonify(ip_service.track_ip(customer_id, ip_data))
        else:
            limit = request.args.get('limit', 50, type=int)
            return jsonify(ip_service.get_ip_history(customer_id, limit))
            
    except Exception as e:
        logger.error(f"IP tracking error: {e}")
        abort(500, description="Internal server error")

@app.route('/api/system/status', methods=['GET'])
def system_status():
    """Get clean system status"""
    try:
        db = db_manager.load_database()
        
        # Calculate clean metrics
        total_customers = len(db.get('customers', {}))
        active_customers = len([c for c in db.get('customers', {}).values() if c.get('active', False)])
        
        # Transaction metrics
        transactions = db.get('transactions', [])
        recent_transactions = [t for t in transactions 
                             if (datetime.now() - datetime.fromisoformat(t.get('timestamp', '2000-01-01'))).days <= 7]
        
        # IP tracking metrics
        ip_records = sum(len(ips) for ips in db.get('ip_tracking', {}).values())
        
        return jsonify({
            'system_status': 'operational',
            'timestamp': datetime.now().isoformat(),
            'database_info': db.get('system_info', {}),
            'metrics': {
                'customers': {
                    'total': total_customers,
                    'active': active_customers,
                    'inactive': total_customers - active_customers
                },
                'transactions': {
                    'total': len(transactions),
                    'recent_7_days': len(recent_transactions)
                },
                'ip_tracking': {
                    'total_records': ip_records,
                    'customers_tracked': len(db.get('ip_tracking', {}))
                }
            },
            'system_config': db.get('system_config', {})
        })
        
    except Exception as e:
        logger.error(f"System status error: {e}")
        abort(500, description="Failed to get system status")

@app.route('/health', methods=['GET'])
def health_check():
    """Clean health check endpoint"""
    try:
        db = db_manager.load_database()
        
        return jsonify({
            'status': 'healthy',
            'service': 'Clean Trading Service v3.0',
            'timestamp': datetime.now().isoformat(),
            'database': 'clean_trading_database.json',
            'version': '3.0.0',
            'description': 'Professional trading system with clean architecture'
        })
        
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

# Error handlers
@app.errorhandler(400)
def bad_request(error):
    return jsonify({
        'error': 'Bad Request',
        'message': error.description,
        'timestamp': datetime.now().isoformat()
    }), 400

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'error': 'Not Found',
        'message': error.description,
        'timestamp': datetime.now().isoformat()
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'error': 'Internal Server Error',
        'message': 'An unexpected error occurred',
        'timestamp': datetime.now().isoformat()
    }), 500

if __name__ == '__main__':
    print("🚀 Starting Clean Trading Service v3.0...")
    print("🧹 Clean Architecture - No Mock Data!")
    print("📊 Available Endpoints:")
    print("   • Customer Info: /api/customers/{customer_id}")
    print("   • Transactions: /api/transactions/{customer_id}")
    print("   • IP Tracking: /api/ip-tracking/{customer_id}")
    print("   • System Status: /api/system/status")
    print("   • Health Check: /health")
    print("🌐 Service will run on http://localhost:5005")
    print("✨ Clean, professional trading system ready!")
    
    app.run(host='0.0.0.0', port=5005, debug=True)

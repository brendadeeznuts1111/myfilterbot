import json
from flask import Flask, request, jsonify
from datetime import datetime
import ipaddress

app = Flask(__name__)
DB_FILE = 'customer_database.json'

def load_database():
    try:
        with open(DB_FILE, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {'customers': {}, 'transactions': [], 'ip_tracking': {}}

def save_database(data):
    with open(DB_FILE, 'w') as f:
        json.dump(data, f, indent=2)

# IP Tracker Endpoint
@app.route('/api/ip-tracker/<customer_id>', methods=['GET', 'POST'])
def track_ip(customer_id):
    db = load_database()
    
    if request.method == 'POST':
        ip_data = request.json
        if 'ip_tracking' not in db:
            db['ip_tracking'] = {}
        
        if customer_id not in db['ip_tracking']:
            db['ip_tracking'][customer_id] = []
        
        ip_data['timestamp'] = datetime.now().isoformat()
        db['ip_tracking'][customer_id].append(ip_data)
        save_database(db)
        
        return jsonify({'success': True, 'message': 'IP tracked'})
    
    else:
        ip_history = db.get('ip_tracking', {}).get(customer_id, [])
        return jsonify({
            'customer_id': customer_id,
            'ip_history': ip_history,
            'total_tracked': len(ip_history)
        })

# Transaction History Endpoint
@app.route('/api/transactions/history/<customer_id>', methods=['GET'])
def transaction_history(customer_id):
    db = load_database()
    customer = db.get('customers', {}).get(customer_id)
    
    if not customer:
        return jsonify({'error': 'Customer not found'}), 404
    
    # Get all transactions for this customer
    transactions = [t for t in db.get('transactions', []) 
                   if t['customer_id'] == customer_id]
    
    # Sort by date (newest first)
    transactions.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
    
    return jsonify({
        'customer_id': customer_id,
        'customer_name': customer.get('name', customer_id),
        'total_transactions': len(transactions),
        'transactions': transactions
    })

# Collections (Settled Figures) Endpoint
@app.route('/api/collections/<customer_id>', methods=['GET'])
def get_collections(customer_id):
    db = load_database()
    customer = db.get('customers', {}).get(customer_id)
    
    if not customer:
        return jsonify({'error': 'Customer not found'}), 404
    
    # Calculate settled figures
    transactions = [t for t in db.get('transactions', []) 
                   if t.get('customer_id') == customer_id and t.get('status') == 'settled']
    
    total_deposits = sum(t.get('amount', 0) for t in transactions if t.get('type') == 'deposit')
    total_withdrawals = sum(t.get('amount', 0) for t in transactions if t.get('type') == 'withdrawal')
    net_settled = total_deposits - total_withdrawals
    
    return jsonify({
        'customer_id': customer_id,
        'total_deposits': total_deposits,
        'total_withdrawals': total_withdrawals,
        'net_settled': net_settled,
        'settled_transactions': len(transactions)
    })

# Deleted Wagers Endpoint
@app.route('/api/wagers/deleted/<customer_id>', methods=['GET', 'POST'])
def deleted_wagers(customer_id):
    db = load_database()
    
    if 'deleted_wagers' not in db:
        db['deleted_wagers'] = {}
    
    if request.method == 'POST':
        wager_data = request.json
        if customer_id not in db['deleted_wagers']:
            db['deleted_wagers'][customer_id] = []
        
        wager_data['deleted_at'] = datetime.now().isoformat()
        db['deleted_wagers'][customer_id].append(wager_data)
        save_database(db)
        
        return jsonify({'success': True, 'wager_deleted': wager_data})
    
    else:
        deleted = db['deleted_wagers'].get(customer_id, [])
        return jsonify({
            'customer_id': customer_id,
            'deleted_wagers': deleted,
            'total_deleted': len(deleted)
        })

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'service': 'Enhanced Transaction Service',
        'timestamp': datetime.now().isoformat(),
        'database': DB_FILE
    })

if __name__ == '__main__':
    print("🚀 Starting Enhanced Transaction Service...")
    print("📊 Available Endpoints:")
    print("   • IP Tracker: /api/ip-tracker/{customer_id}")
    print("   • Transaction History: /api/transactions/history/{customer_id}")
    print("   • Collections: /api/collections/{customer_id}")
    print("   • Deleted Wagers: /api/wagers/deleted/{customer_id}")
    print("   • Health Check: /health")
    print("🌐 Service will run on http://localhost:5004")
    
    app.run(host='0.0.0.0', port=5004, debug=True)

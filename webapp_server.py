from flask import Flask, send_file, jsonify, request
from flask_cors import CORS
import os
import json
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Store messages in memory (in production, use a database)
filtered_messages = []

@app.route('/')
def serve_webapp():
    """Serve the main webapp HTML"""
    return send_file('webapp.html')

@app.route('/api/messages')
def get_messages():
    """API endpoint to get filtered messages"""
    return jsonify({
        'messages': filtered_messages[-50:],  # Last 50 messages
        'total': len(filtered_messages)
    })

@app.route('/api/stats')
def get_stats():
    """API endpoint to get statistics"""
    today = datetime.now().date()
    today_count = sum(1 for msg in filtered_messages 
                     if datetime.fromisoformat(msg.get('timestamp', '')).date() == today)
    
    return jsonify({
        'total': len(filtered_messages),
        'today': today_count,
        'keywords': 29,  # Your keyword count
        'users': 1  # Important users count
    })

@app.route('/api/message', methods=['POST'])
def add_message():
    """Webhook endpoint for the bot to send messages"""
    data = request.json
    message = {
        'id': len(filtered_messages) + 1,
        'text': data.get('text'),
        'from': data.get('from'),
        'timestamp': datetime.now().isoformat(),
        'keyword': data.get('matched_keyword'),
        'chat': data.get('chat_name')
    }
    filtered_messages.append(message)
    return jsonify({'success': True, 'id': message['id']})

if __name__ == '__main__':
    # For development - in production use a proper web server
    print("=" * 50)
    print("TELEGRAM MINI APP SERVER")
    print("=" * 50)
    print("🌐 Server running at: http://localhost:5000")
    print("📱 Use ngrok to expose this for Telegram:")
    print("   ngrok http 5000")
    print("-" * 50)
    app.run(host='0.0.0.0', port=5000, debug=True)
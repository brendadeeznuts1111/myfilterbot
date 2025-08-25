import pytest
from flask import Flask
import sys
import os

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

from src.portal.routes.admin import admin_bp
from unittest.mock import MagicMock, patch
import json
from datetime import datetime, timedelta

@pytest.fixture
def app():
    app = Flask(__name__)
    app.register_blueprint(admin_bp)
    return app

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def mock_db():
    with patch('src.portal.routes.admin.db') as mock_db:
        yield mock_db

@pytest.fixture
def mock_load_customer_config_file():
    with patch('src.portal.routes.admin.load_customer_config_file') as mock_load_config:
        yield mock_load_config

def test_get_reports_success(client, mock_db):
    mock_customer1 = MagicMock()
    mock_customer1.customer_id = "CUST1"
    mock_customer1.balance = 1000.0
    mock_customer1.weekly_pnl = 50.0
    mock_customer1.active = True

    mock_customer2 = MagicMock()
    mock_customer2.customer_id = "CUST2"
    mock_customer2.balance = 2000.0
    mock_customer2.weekly_pnl = -20.0
    mock_customer2.active = False

    mock_db.get_all_customers.return_value = [mock_customer1, mock_customer2]

    response = client.get('/api/reports')
    assert response.status_code == 200
    data = json.loads(response.data)

    assert data['customerMetrics']['total'] == 2
    assert data['customerMetrics']['active'] == 1
    assert data['customerMetrics']['avgBalance'] == 1500
    assert data['weeklyPnL'] == 30
    mock_db.get_all_customers.assert_called_once()

def test_process_verification_success(client):
    response = client.post('/api/verify', json={
        "token": "mock_token",
        "action": "approve",
        "user_id": "user123"
    })
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] == True
    assert 'approved' in data['message']

def test_get_pending_verifications_success(client):
    response = client.get('/api/verifications/pending')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] == True
    assert data['count'] > 0

def test_get_audit_log_success(client):
    response = client.get('/api/audit-log')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] == True
    assert data['total'] > 0

def test_get_security_stats_success(client):
    response = client.get('/api/security-stats')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] == True
    assert 'stats' in data

def test_get_agents_list_success_enhanced_config(client, mock_db, mock_load_customer_config_file):
    mock_load_customer_config_file.return_value = {
        "version": "2.0",
        "customers": {
            "CUST1": {}, "CUST2": {}
        },
        "agents": {
            "AGENT1": {
                "agent_id": "AGENT1", "agent_type": "M", "agent_name": "Agent One",
                "status": "active", "assigned_customers": ["CUST1"]
            }
        }
    }
    mock_customer1 = MagicMock()
    mock_customer1.customer_id = "CUST1"
    mock_customer1.balance = 500.0
    mock_customer1.active = True
    mock_db.get_all_customers.return_value = [mock_customer1]
    mock_db.get_statistics.return_value = {}

    response = client.get('/api/fire22/agents')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] == True
    assert data['summary']['totalAgents'] == 1
    assert data['agents'][0]['agentID'] == "AGENT1"
    assert data['agents'][0]['balance'] == 500.0
    assert data['agents'][0]['totalCustomers'] == 1
    assert data['agents'][0]['activeCustomers'] == 1
    assert data['agents'][0]['configurationSource'] == 'enhanced'
    mock_load_customer_config_file.assert_called_once()
    mock_db.get_all_customers.assert_called_once()

def test_get_agents_list_success_basic_fallback(client, mock_db, mock_load_customer_config_file):
    mock_load_customer_config_file.return_value = None # Simulate no config file
    mock_customer1 = MagicMock()
    mock_customer1.customer_id = "CUST1"
    mock_customer1.balance = 1000.0
    mock_customer1.active = True
    mock_db.get_all_customers.return_value = [mock_customer1]
    mock_db.get_statistics.return_value = {"total_balance": 1000.0, "active_customers": 1}

    response = client.get('/api/fire22/agents')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] == True
    assert data['summary']['totalAgents'] == 1
    assert data['agents'][0]['agentID'] == "BLAKEPPH"
    assert data['agents'][0]['configurationSource'] == 'basic'
    mock_load_customer_config_file.assert_called_once()
    mock_db.get_all_customers.assert_called_once()

def test_get_fire22_dashboard_data_success(client, mock_db, mock_load_customer_config_file):
    mock_load_customer_config_file.return_value = {
        "customers": {
            "CUST1": {"telegram_username": "user1", "keywords": ["k1"]},
            "CUST2": {"telegram_username": "user2"}
        },
        "group_chats": {"chat1": {"name": "Chat1", "chat_id": "id1"}}
    }
    mock_customer1 = MagicMock()
    mock_customer1.customer_id = "CUST1"
    mock_customer1.balance = 1000.0
    mock_customer1.weekly_pnl = 50.0
    mock_customer1.active = True
    mock_customer1.telegram_id = "tele1"
    mock_customer1.last_activity = datetime.now().isoformat()

    mock_customer2 = MagicMock()
    mock_customer2.customer_id = "CUST2"
    mock_customer2.balance = 2000.0
    mock_customer2.weekly_pnl = -10.0
    mock_customer2.active = False
    mock_customer2.telegram_id = None
    mock_customer2.last_activity = datetime.now().isoformat()

    mock_db.get_all_customers.return_value = [mock_customer1, mock_customer2]
    mock_db.get_statistics.return_value = {
        "total_customers": 2, "active_customers": 1, "total_balance": 3000.0
    }

    response = client.get('/api/fire22/dashboard-data')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] == True
    assert data['stats']['totalCustomers'] == 2
    assert data['recentCustomers'][0]['customerID'] == "CUST1"
    assert data['recentCustomers'][0]['telegram_username'] == "user1"
    assert data['groupChats'][0]['name'] == "Chat1"
    mock_load_customer_config_file.assert_called_once()
    mock_db.get_all_customers.assert_called_once()
    mock_db.get_statistics.assert_called_once()

def test_export_reports_csv_success(client, mock_db):
    mock_customer1 = MagicMock()
    mock_customer1.customer_id = "CUST1"
    mock_customer1.balance = 100.0
    mock_customer1.weekly_pnl = 10.0
    mock_customer1.active = True
    mock_customer1.phone = "123"
    mock_customer1.last_activity = "2023-01-01"
    mock_db.get_all_customers.return_value = [mock_customer1]

    response = client.get('/api/export/csv')
    assert response.status_code == 200
    assert response.headers['Content-Type'] == 'text/csv'
    assert 'attachment; filename=customers_report_' in response.headers['Content-Disposition']
    assert "CUST1,100.0,10.0,True,123,2023-01-01" in response.data.decode()

def test_export_reports_json_success(client, mock_db):
    mock_customer1 = MagicMock()
    mock_customer1.customer_id = "CUST1"
    mock_customer1.balance = 100.0
    mock_customer1.weekly_pnl = 10.0
    mock_customer1.active = True
    mock_customer1.phone = "123"
    mock_customer1.last_activity = "2023-01-01"
    mock_db.get_all_customers.return_value = [mock_customer1]

    response = client.get('/api/export/json')
    assert response.status_code == 200
    assert response.headers['Content-Type'] == 'application/json'
    assert 'attachment; filename=customers_report_' in response.headers['Content-Disposition']
    data = json.loads(response.data)
    assert data['total_customers'] == 1
    assert data['customers'][0]['customer_id'] == "CUST1"

def test_export_reports_unsupported_format(client):
    response = client.get('/api/export/xml')
    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'Unsupported format' in data['error']

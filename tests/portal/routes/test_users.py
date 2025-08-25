import pytest
from flask import Flask
from src.portal.routes.users import users_bp
from unittest.mock import MagicMock, patch
import json
from datetime import datetime, timedelta

@pytest.fixture
def app():
    app = Flask(__name__)
    app.register_blueprint(users_bp)
    return app

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def mock_db():
    with patch('src.portal.routes.users.db') as mock_db:
        yield mock_db

@pytest.fixture
def mock_load_customer_config():
    with patch('src.portal.routes.users.load_customer_config') as mock_load_config:
        yield mock_load_config

def test_get_customer_data_success(client, mock_db, mock_load_customer_config):
    mock_customer = MagicMock()
    mock_customer.customer_id = "TESTCUST"
    mock_customer.balance = 1000.0
    mock_customer.weekly_pnl = 50.0
    mock_customer.active = True
    mock_customer.telegram_id = "12345"
    mock_customer.telegram_username = "testuser"
    mock_customer.phone = "123-456-7890"
    mock_customer.last_activity = (datetime.now() - timedelta(days=1)).isoformat()

    mock_transaction1 = MagicMock()
    mock_transaction1.transaction_id = "TX1"
    mock_transaction1.type = "deposit"
    mock_transaction1.amount = 100.0
    mock_transaction1.timestamp = datetime.now().isoformat()
    mock_transaction1.status = "completed"
    mock_transaction1.message = "Deposit 1"
    mock_transaction1.from_user = "UserA"

    mock_transaction2 = MagicMock()
    mock_transaction2.transaction_id = "TX2"
    mock_transaction2.type = "withdrawal"
    mock_transaction2.amount = 20.0
    mock_transaction2.timestamp = (datetime.now() - timedelta(days=1)).isoformat()
    mock_transaction2.status = "completed"
    mock_transaction2.message = "Withdrawal 1"
    mock_transaction2.from_user = "UserB"

    mock_db.get_customer.return_value = mock_customer
    mock_db.get_customer_transactions.return_value = [mock_transaction1, mock_transaction2]
    mock_load_customer_config.return_value = {"keywords": ["deposit"]}

    response = client.get('/api/customer/TESTCUST')
    assert response.status_code == 200
    data = json.loads(response.data)

    assert data['customer_id'] == "TESTCUST"
    assert data['balance'] == 1000.0
    assert data['transactions'][0]['keyword_match'] == True # TX1 has 'deposit' keyword
    assert data['transactions'][1]['keyword_match'] == False # TX2 does not

    mock_db.get_customer.assert_called_with("TESTCUST")
    mock_db.get_customer_transactions.assert_called_with("TESTCUST")
    mock_load_customer_config.assert_called_with("TESTCUST")

def test_get_customer_data_not_found(client, mock_db):
    mock_db.get_customer.return_value = None
    response = client.get('/api/customer/NONEXISTENT')
    assert response.status_code == 404
    data = json.loads(response.data)
    assert 'Customer not found' in data['error']

def test_get_global_stats_success(client, mock_db):
    mock_db.get_statistics.return_value = {
        'total_customers': 10,
        'active_customers': 5,
        'total_balance': 10000.0,
        'total_weekly_pnl': 200.0,
        'registered_users': 8
    }
    mock_performer1 = MagicMock()
    mock_performer1.customer_id = "PERF1"
    mock_performer1.weekly_pnl = 150.0
    mock_performer2 = MagicMock()
    mock_performer2.customer_id = "PERF2"
    mock_performer2.weekly_pnl = 100.0
    mock_db.get_top_performers.return_value = [mock_performer1, mock_performer2]

    response = client.get('/api/stats')
    assert response.status_code == 200
    data = json.loads(response.data)

    assert data['total_customers'] == 10
    assert data['top_performers'][0]['customer_id'] == "PERF1"
    mock_db.get_statistics.assert_called_once()
    mock_db.get_top_performers.assert_called_with(5)

def test_get_customer_transactions_success(client, mock_db):
    mock_transaction1 = MagicMock()
    mock_transaction1.timestamp = datetime.now().isoformat()
    mock_transaction1.type = "deposit"
    mock_transaction1.amount = 100.0
    mock_transaction1.message = "Test Deposit"
    mock_transaction1.from_user = "UserX"
    mock_transaction1.status = "completed"

    mock_db.get_customer_transactions.return_value = [mock_transaction1]

    response = client.get('/api/transactions/TESTCUST')
    assert response.status_code == 200
    data = json.loads(response.data)

    assert data['count'] == 1
    assert data['transactions'][0]['type'] == "deposit"
    mock_db.get_customer_transactions.assert_called_with("TESTCUST", limit=100)

def test_get_customer_transactions_empty(client, mock_db):
    mock_db.get_customer_transactions.return_value = []
    response = client.get('/api/transactions/EMPTYCUST')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['count'] == 0
    assert data['transactions'] == []

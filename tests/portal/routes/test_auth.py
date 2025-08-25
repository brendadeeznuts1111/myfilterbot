import pytest
from flask import Flask
from src.portal.routes.auth import auth_bp
from unittest.mock import MagicMock, patch
import json

@pytest.fixture
def app():
    app = Flask(__name__)
    app.register_blueprint(auth_bp)
    return app

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def mock_db():
    with patch('src.portal.routes.auth.db') as mock_db:
        yield mock_db

@pytest.fixture
def mock_generate_jwt_token():
    with patch('src.portal.routes.auth.generate_jwt_token') as mock_jwt:
        mock_jwt.return_value = "mock_jwt_token"
        yield mock_jwt

def test_login_success(client, mock_db, mock_generate_jwt_token):
    mock_customer = MagicMock()
    mock_customer.customer_id = "TESTCUST"
    mock_customer.password = "PASSWORD"
    mock_customer.balance = 1000.0
    mock_customer.weekly_pnl = 50.0
    mock_customer.active = True
    mock_customer.telegram_id = "12345"
    mock_customer.telegram_username = "testuser"
    mock_customer.phone = "123-456-7890"
    mock_customer.last_activity = "2023-01-01T10:00:00"

    mock_db.get_customer.return_value = mock_customer

    response = client.post('/api/login', json={
        'customer_id': 'TESTCUST',
        'password': 'PASSWORD'
    })

    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] == True
    assert data['token'] == "mock_jwt_token"
    assert data['customer']['customer_id'] == "TESTCUST"
    mock_db.get_customer.assert_called_with("TESTCUST")
    mock_generate_jwt_token.assert_called_with("TESTCUST")

def test_login_missing_credentials(client):
    response = client.post('/api/login', json={
        'customer_id': 'TESTCUST'
    })
    assert response.status_code == 400
    data = json.loads(response.data)
    assert data['success'] == False
    assert 'required' in data['error']

def test_login_customer_not_found(client, mock_db):
    mock_db.get_customer.return_value = None
    response = client.post('/api/login', json={
        'customer_id': 'NONEXISTENT',
        'password': 'PASSWORD'
    })
    assert response.status_code == 401
    data = json.loads(response.data)
    assert data['success'] == False
    assert 'not found' in data['error']

def test_login_invalid_password(client, mock_db):
    mock_customer = MagicMock()
    mock_customer.customer_id = "TESTCUST"
    mock_customer.password = "WRONGPASS"
    mock_db.get_customer.return_value = mock_customer

    response = client.post('/api/login', json={
        'customer_id': 'TESTCUST',
        'password': 'PASSWORD'
    })
    assert response.status_code == 401
    data = json.loads(response.data)
    assert data['success'] == False
    assert 'Invalid password' in data['error']

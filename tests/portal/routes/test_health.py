import pytest
from flask import Flask
import sys
import os

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

from src.portal.routes.health import health_bp
from unittest.mock import MagicMock, patch
import json
import os
from datetime import datetime

@pytest.fixture
def app():
    app = Flask(__name__)
    app.register_blueprint(health_bp)
    return app

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def mock_db():
    with patch('src.portal.routes.health.db') as mock_db:
        yield mock_db

@pytest.fixture
def mock_error_tracker():
    with patch('src.portal.routes.health.error_tracker') as mock_et:
        yield mock_et

def test_health_check_healthy(client, mock_db, mock_error_tracker):
    mock_db.get_all_customers.return_value = [MagicMock()]
    mock_db.get_group_members.return_value = [MagicMock()]
    mock_error_tracker.get_error_stats.return_value = {'total': 0, 'last_24h': 0}
    mock_error_tracker.get_recent_errors.return_value = []

    with patch('os.path.exists', return_value=True):
        response = client.get('/health')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'healthy'
        assert data['customers_loaded'] == 1
        assert data['members_loaded'] == 1

def test_health_check_degraded_errors(client, mock_db, mock_error_tracker):
    mock_db.get_all_customers.return_value = [MagicMock()]
    mock_db.get_group_members.return_value = [MagicMock()]
    mock_error_tracker.get_error_stats.return_value = {'total': 150, 'last_24h': 101}
    mock_error_tracker.get_recent_errors.return_value = []

    with patch('os.path.exists', return_value=True):
        response = client.get('/health')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'degraded'

def test_health_check_unhealthy_critical_errors(client, mock_db, mock_error_tracker):
    mock_db.get_all_customers.return_value = [MagicMock()]
    mock_db.get_group_members.return_value = [MagicMock()]
    mock_error_tracker.get_error_stats.return_value = {'total': 10, 'last_24h': 5}
    mock_error_tracker.get_recent_errors.return_value = [{'id': 'err1', 'severity': 'CRITICAL'}]

    with patch('os.path.exists', return_value=True):
        response = client.get('/health')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'unhealthy'

def test_detailed_health_check_success(client, mock_db, mock_error_tracker):
    mock_db.get_all_customers.return_value = [MagicMock()]
    mock_db.get_group_members.return_value = [MagicMock()]
    mock_db.get_statistics.return_value = {'total_balance': 1000, 'active_customers': 5}
    mock_error_tracker.get_error_stats.return_value = {'total': 0, 'last_24h': 0, 'by_category': {}, 'by_severity': {}}
    mock_error_tracker.get_recent_errors.side_effect = [[], []] # for critical and high

    with patch('os.path.exists', return_value=True):
        response = client.get('/health/detailed')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'healthy'
        assert data['database']['status'] == 'operational'
        assert data['database']['customers_loaded'] == 1

def test_liveness_probe(client):
    response = client.get('/health/live')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['status'] == 'alive'

def test_readiness_probe_ready(client, mock_db, mock_error_tracker):
    mock_db.get_all_customers.return_value = [MagicMock()]
    mock_error_tracker.get_error_stats.return_value = {'last_24h': 0}
    mock_error_tracker.get_recent_errors.return_value = []

    response = client.get('/health/ready')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['status'] == 'ready'

def test_readiness_probe_not_ready_critical_errors(client, mock_db, mock_error_tracker):
    mock_db.get_all_customers.return_value = [MagicMock()]
    mock_error_tracker.get_recent_errors.return_value = [{'id': 'err1', 'severity': 'CRITICAL'}]

    response = client.get('/health/ready')
    assert response.status_code == 503
    data = json.loads(response.data)
    assert data['status'] == 'not_ready'
    assert 'Critical errors detected' in data['error']

def test_health_metrics_success(client, mock_db, mock_error_tracker):
    mock_db.get_all_customers.return_value = [MagicMock()]
    mock_db.get_group_members.return_value = [MagicMock()]
    mock_db.get_statistics.return_value = {'total_balance': 1000, 'active_customers': 5}
    mock_error_tracker.get_error_stats.return_value = {'total': 10, 'last_24h': 5, 'by_category': {'API': 5}, 'by_severity': {'HIGH': 5}}
    mock_error_tracker.get_recent_errors.return_value = []

    response = client.get('/health/metrics')
    assert response.status_code == 200
    assert response.headers['Content-Type'] == 'text/plain; version=0.0.4'
    assert 'portal_customers_total 1' in response.data.decode()
    assert 'portal_health_status 1' in response.data.decode()

def test_health_errors_success(client, mock_error_tracker):
    mock_error_tracker.get_recent_errors.return_value = [{'id': 'err1', 'timestamp': datetime.now().isoformat(), 'category': 'API', 'severity': 'HIGH', 'error_message': 'Test Error'}]
    mock_error_tracker.get_error_stats.return_value = {'total': 1, 'last_24h': 1}

    response = client.get('/health/errors')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['count'] == 1
    assert data['errors'][0]['id'] == 'err1'

def test_resolve_health_error_success(client, mock_error_tracker):
    mock_error_tracker.resolve_error.return_value = True
    response = client.post('/health/errors/err1/resolve', json={'resolution': 'Fixed it'})
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] == True
    assert data['error_id'] == 'err1'
    mock_error_tracker.resolve_error.assert_called_with('err1', 'Fixed it')

def test_ping(client):
    response = client.get('/ping')
    assert response.status_code == 200
    assert response.data.decode() == 'pong'

def test_status(client):
    response = client.get('/status')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['status'] == 'online'

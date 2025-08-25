import pytest
from flask import Flask, make_response
import sys
import os

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

from src.portal.routes.static_pages import static_pages_bp
from unittest.mock import MagicMock, patch
import json
import os

@pytest.fixture
def app():
    app = Flask(__name__)
    app.register_blueprint(static_pages_bp)
    return app

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def mock_send_file():
    with patch('src.portal.routes.static_pages.send_file') as mock_sf:
        mock_sf.return_value = make_response("mock file content")
        yield mock_sf

@pytest.fixture
def mock_add_ngrok_headers():
    with patch('src.portal.routes.static_pages.add_ngrok_headers') as mock_headers:
        mock_headers.side_effect = lambda r: r # Simply return the response as is for testing
        yield mock_headers

def test_serve_portal(client, mock_send_file, mock_add_ngrok_headers):
    response = client.get('/')
    assert response.status_code == 200
    assert response.data.decode() == "mock file content"
    mock_send_file.assert_called_with('customer_portal_api.html')
    mock_add_ngrok_headers.assert_called_once()

def test_serve_manager(client, mock_send_file, mock_add_ngrok_headers):
    response = client.get('/manager.html?agentID=123&agentType=M')
    assert response.status_code == 200
    assert response.data.decode() == "mock file content"
    assert response.headers['X-Agent-ID'] == '123'
    assert response.headers['X-Agent-Type'] == 'M'
    mock_send_file.assert_called_with('manager.html')
    mock_add_ngrok_headers.assert_called_once()

def test_serve_large_database(client, mock_send_file, mock_add_ngrok_headers):
    response = client.get('/customer_database_2500.json')
    assert response.status_code == 200
    assert response.headers['Content-Type'] == 'application/json'
    mock_send_file.assert_called_with('customer_database_2500.json')
    mock_add_ngrok_headers.assert_called_once()

def test_serve_static_js(client, mock_send_file, mock_add_ngrok_headers):
    with patch('os.path.join', return_value='static/script.js'):
        response = client.get('/static/script.js')
        assert response.status_code == 200
        assert response.headers['Content-Type'] == 'application/javascript'
        mock_send_file.assert_called_with('static/script.js')
        mock_add_ngrok_headers.assert_called_once()

def test_serve_static_css(client, mock_send_file, mock_add_ngrok_headers):
    with patch('os.path.join', return_value='static/style.css'):
        response = client.get('/static/style.css')
        assert response.status_code == 200
        assert response.headers['Content-Type'] == 'text/css'
        mock_send_file.assert_called_with('static/style.css')
        mock_add_ngrok_headers.assert_called_once()

def test_serve_admin_portal(client, mock_send_file, mock_add_ngrok_headers):
    response = client.get('/admin')
    assert response.status_code == 200
    mock_send_file.assert_called_with('admin_portal.html')
    mock_add_ngrok_headers.assert_called_once()

def test_serve_cashier_dashboard(client, mock_send_file, mock_add_ngrok_headers):
    response = client.get('/cashier')
    assert response.status_code == 200
    mock_send_file.assert_called_with('admin_cashier_dashboard_enhanced.html')
    mock_add_ngrok_headers.assert_called_once()

def test_serve_admin_chat(client, mock_send_file, mock_add_ngrok_headers):
    # Test case where admin_security_center.html exists
    mock_send_file.side_effect = [make_response("security center"), make_response("chat interface")]
    response = client.get('/admin-chat')
    assert response.status_code == 200
    assert response.data.decode() == "security center"
    mock_send_file.assert_any_call('admin_security_center.html')
    mock_add_ngrok_headers.assert_called_once()

    # Reset mock and test fallback
    mock_send_file.reset_mock()
    mock_add_ngrok_headers.reset_mock()
    mock_send_file.side_effect = [Exception("File not found"), make_response("chat interface")]
    response = client.get('/admin-chat')
    assert response.status_code == 200
    assert response.data.decode() == "chat interface"
    mock_send_file.assert_any_call('admin_security_center.html')
    mock_send_file.assert_any_call('admin_chat_interface.html')
    mock_add_ngrok_headers.assert_called_once()

def test_serve_admin_security(client, mock_send_file, mock_add_ngrok_headers):
    response = client.get('/admin-security')
    assert response.status_code == 200
    mock_send_file.assert_called_with('admin_security_center.html')
    mock_add_ngrok_headers.assert_called_once()

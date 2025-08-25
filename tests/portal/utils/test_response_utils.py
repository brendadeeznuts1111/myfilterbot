import pytest
from flask import Flask, make_response
from src.portal.utils.response_utils import add_ngrok_headers

@pytest.fixture
def app():
    app = Flask(__name__)
    @app.route('/')
    def index():
        return "Hello"
    return app

def test_add_ngrok_headers(app):
    """Test that add_ngrok_headers correctly adds the required headers."""
    with app.test_request_context('/'):
        response = make_response("Test Content")
        modified_response = add_ngrok_headers(response)

        assert modified_response.headers['ngrok-skip-browser-warning'] == 'true'
        assert modified_response.headers['Access-Control-Allow-Origin'] == '*'
        assert modified_response.headers['Access-Control-Allow-Methods'] == 'GET, POST, OPTIONS'
        assert modified_response.headers['Access-Control-Allow-Headers'] == 'Content-Type'
        assert modified_response.data == b"Test Content"

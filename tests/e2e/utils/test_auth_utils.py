import pytest
import sys
import os

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

from src.portal.utils.auth_utils import generate_jwt_token
import base64
import json
from datetime import datetime, timedelta

def test_generate_jwt_token():
    """Test that generate_jwt_token produces a valid token with correct data."""
    customer_id = "TESTCUSTOMER123"
    token = generate_jwt_token(customer_id)

    assert isinstance(token, str)
    assert len(token) > 0

    # Decode the token and verify its contents
    decoded_data = json.loads(base64.b64decode(token).decode())

    assert "customer_id" in decoded_data
    assert decoded_data["customer_id"] == customer_id
    assert "issued_at" in decoded_data
    assert "expires_at" in decoded_data

    # Verify issued_at and expires_at are valid datetime strings
    issued_at = datetime.fromisoformat(decoded_data["issued_at"])
    expires_at = datetime.fromisoformat(decoded_data["expires_at"])

    assert issued_at <= datetime.now()
    assert expires_at > datetime.now()
    assert expires_at - issued_at == timedelta(hours=24)

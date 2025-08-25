import base64
import json
from datetime import datetime, timedelta

def generate_jwt_token(customer_id: str) -> str:
    """
    Generates a simplified JWT token for a given customer ID.
    The token includes issue and expiry times.
    """
    token_data = {
        'customer_id': customer_id,
        'issued_at': datetime.now().isoformat(),
        'expires_at': (datetime.now() + timedelta(hours=24)).isoformat()
    }
    token = base64.b64encode(json.dumps(token_data).encode()).decode()
    return token

#!/usr/bin/env python3
"""Test server on configurable port"""
import os
from unified_server import app

if __name__ == '__main__':
    port = int(os.getenv('TEST_SERVER_PORT', '5555'))
    app.run(host='0.0.0.0', port=port, debug=True)
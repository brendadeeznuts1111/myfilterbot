#!/usr/bin/env python3
"""Test server on port 5555"""
from unified_server import app

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5555, debug=True)
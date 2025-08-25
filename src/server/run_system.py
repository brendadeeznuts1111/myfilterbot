#!/usr/bin/env python3
"""
Integrated System Runner
Runs both the bot and portal server for complete integration
"""

import subprocess
import sys
import time
import threading
import signal
import os
from pathlib import Path

def print_banner():
    """Print startup banner"""
    print("=" * 80)
    print("🚀 FANTDEV INTEGRATED TRADING BOT & PORTAL SYSTEM")
    print("=" * 80)
    print("This script runs both components:")
    print("  • Enhanced Customer Portal Server (Port 5001)")
    print("  • Telegram Trading Bot with Portal Integration")
    print("  • Real-time WebSocket Communication")
    print("-" * 80)

def check_dependencies():
    """Check if required dependencies are installed"""
    required_packages = [
        'flask', 'flask-cors', 'flask-socketio', 
        'python-socketio', 'requests', 'python-telegram-bot'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print("❌ Missing required packages:")
        for package in missing_packages:
            print(f"   • {package}")
        print("\n📦 Install missing packages with:")
        print(f"   pip install {' '.join(missing_packages)}")
        print("\n💡 Or install all requirements:")
        print("   pip install -r requirements_portal_integration.txt")
        return False
    
    print("✅ All dependencies are installed")
    return True

def check_config_files():
    """Check if required configuration files exist"""
    required_files = [
        'customer_database.json',
        'customer_config.json'
    ]
    
    missing_files = []
    for file in required_files:
        if not Path(file).exists():
            missing_files.append(file)
    
    if missing_files:
        print("❌ Missing required configuration files:")
        for file in missing_files:
            print(f"   • {file}")
        print("\n📄 These files are required for authentication and customer data.")
        return False
    
    print("✅ All configuration files are present")
    return True

def run_portal_server():
    """Run the enhanced portal server"""
    print("🌐 Starting Enhanced Portal Server...")
    
    try:
        process = subprocess.Popen([
            sys.executable, 'enhanced_portal_server_integrated.py'
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        
        return process
    except Exception as e:
        print(f"❌ Failed to start portal server: {e}")
        return None

def run_bot():
    """Run the trading bot"""
    print("🤖 Starting Trading Bot...")
    
    try:
        process = subprocess.Popen([
            sys.executable, 'main_bot.py'
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        
        return process
    except Exception as e:
        print(f"❌ Failed to start bot: {e}")
        return None

def monitor_process(process, name):
    """Monitor a process and print its output"""
    def output_reader():
        try:
            for line in process.stdout:
                print(f"[{name}] {line.strip()}")
        except:
            pass
    
    def error_reader():
        try:
            for line in process.stderr:
                print(f"[{name} ERROR] {line.strip()}")
        except:
            pass
    
    # Start output monitoring threads
    stdout_thread = threading.Thread(target=output_reader, daemon=True)
    stderr_thread = threading.Thread(target=error_reader, daemon=True)
    
    stdout_thread.start()
    stderr_thread.start()

def main():
    """Main function to run the integrated system"""
    print_banner()
    
    # Check prerequisites
    if not check_dependencies():
        return 1
    
    if not check_config_files():
        return 1
    
    processes = []
    
    try:
        # Start portal server first
        print("\n" + "="*50)
        portal_process = run_portal_server()
        if not portal_process:
            return 1
        
        processes.append(('Portal Server', portal_process))
        monitor_process(portal_process, 'PORTAL')
        
        # Wait a bit for portal to start
        print("⏳ Waiting for portal server to initialize...")
        time.sleep(3)
        
        # Start bot
        print("\n" + "="*50)
        bot_process = run_bot()
        if not bot_process:
            return 1
        
        processes.append(('Trading Bot', bot_process))
        monitor_process(bot_process, 'BOT')
        
        print("\n✅ Both systems are running!")
        print("\n🔗 Access Points:")
        portal_url = os.getenv('PORTAL_SERVER_URL', 'http://localhost:5000')
        print(f"   • Customer Portal: {portal_url}/")
        print(f"   • Admin Portal: {portal_url}/admin")
        print(f"   • Health Check: {portal_url}/health")
        print("   • WebSocket: ws://localhost:5001/socket.io")
        
        print("\n📱 To expose publicly with ngrok:")
        print("   ngrok http 5001")
        
        print("\n💡 Features Active:")
        print("   ✅ Real-time customer portal with live data")
        print("   ✅ WebSocket updates from bot to portal")
        print("   ✅ Customer-specific keyword filtering")
        print("   ✅ JWT authentication with customer database")
        print("   ✅ Transaction detection and balance updates")
        
        print("\n⏹️  Press Ctrl+C to stop both systems")
        print("="*80)
        
        # Wait for processes to complete or be interrupted
        try:
            while all(process.poll() is None for _, process in processes):
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n🛑 Shutdown requested by user")
        
    except Exception as e:
        print(f"❌ Error running integrated system: {e}")
        return 1
    
    finally:
        # Clean up processes
        print("\n🧹 Cleaning up processes...")
        for name, process in processes:
            if process and process.poll() is None:
                print(f"   • Stopping {name}...")
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    print(f"   • Force killing {name}...")
                    process.kill()
        
        print("✅ System shutdown complete")
    
    return 0

if __name__ == '__main__':
    # Handle Ctrl+C gracefully
    def signal_handler(signum, frame):
        print("\n\n🛑 Received shutdown signal")
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n\n🛑 Interrupted by user")
        sys.exit(0)
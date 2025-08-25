#!/usr/bin/env python3
"""
Health Check Script with RSS Feed Generation
Monitors all portal endpoints and generates status reports
"""

import requests
import json
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
import sys
import time
from pathlib import Path

# Add src to path for error tracking integration
sys.path.insert(0, str(Path(__file__).parent / 'src'))
try:
    from error_handler import ErrorTracker, ErrorCategory, ErrorSeverity
    ERROR_TRACKING_AVAILABLE = True
except ImportError:
    ERROR_TRACKING_AVAILABLE = False
    print("⚠️ Error tracking not available - running in standalone mode")

class HealthChecker:
    def __init__(self, base_url=None):
        if base_url is None:
            base_url = os.getenv('PORTAL_SERVER_URL', 'http://localhost:5000')
        self.base_url = base_url
        self.error_tracker = ErrorTracker() if ERROR_TRACKING_AVAILABLE else None
        self.endpoints = [
            {'path': '/health', 'name': 'Health Check', 'critical': True},
            {'path': '/admin', 'name': 'Admin Portal', 'critical': True},
            {'path': '/api/reports', 'name': 'Reports API', 'critical': False},
            {'path': '/api/config', 'name': 'Configuration API', 'critical': False},
            {'path': '/api/stats', 'name': 'Statistics API', 'critical': False},
            {'path': '/api/members', 'name': 'Members API', 'critical': False},
            {'path': '/api/members/pending', 'name': 'Pending Members API', 'critical': False},
            {'path': '/api/export/csv', 'name': 'CSV Export', 'critical': False},
            {'path': '/api/export/json', 'name': 'JSON Export', 'critical': False}
        ]
        
    def check_endpoint(self, endpoint):
        """Check a single endpoint and return status"""
        try:
            start_time = time.time()
            response = requests.get(
                f"{self.base_url}{endpoint['path']}", 
                timeout=10,
                headers={'ngrok-skip-browser-warning': 'true'},
                allow_redirects=True
            )
            response_time = round((time.time() - start_time) * 1000, 2)
            
            return {
                'endpoint': endpoint['path'],
                'name': endpoint['name'],
                'status_code': response.status_code,
                'response_time_ms': response_time,
                'success': response.status_code < 400,
                'critical': endpoint['critical'],
                'content_type': response.headers.get('content-type', 'unknown'),
                'content_length': len(response.content) if response.content else 0,
                'error': None if response.status_code < 400 else f"HTTP {response.status_code}",
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
        except requests.exceptions.ConnectionError:
            error_result = {
                'endpoint': endpoint['path'],
                'name': endpoint['name'],
                'status_code': 0,
                'response_time_ms': 0,
                'success': False,
                'critical': endpoint['critical'],
                'content_type': 'error',
                'content_length': 0,
                'error': 'Connection refused - Server not running',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
            # Log to error tracker if available and critical
            if self.error_tracker and endpoint['critical']:
                self.error_tracker.log_error(
                    error=ConnectionError(f"Health check failed for {endpoint['path']}"),
                    category=ErrorCategory.NETWORK,
                    severity=ErrorSeverity.CRITICAL,
                    context={
                        'health_check': True,
                        'endpoint': endpoint['path'],
                        'critical': endpoint['critical']
                    },
                    recoverable=True
                )
            
            return error_result
            
        except Exception as e:
            error_result = {
                'endpoint': endpoint['path'],
                'name': endpoint['name'],
                'status_code': 0,
                'response_time_ms': 0,
                'success': False,
                'critical': endpoint['critical'],
                'content_type': 'error',
                'content_length': 0,
                'error': str(e)[:100],
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
            # Log to error tracker if available and critical
            if self.error_tracker and endpoint['critical']:
                self.error_tracker.log_error(
                    error=e,
                    category=ErrorCategory.API,
                    severity=ErrorSeverity.HIGH if endpoint['critical'] else ErrorSeverity.MEDIUM,
                    context={
                        'health_check': True,
                        'endpoint': endpoint['path'],
                        'critical': endpoint['critical']
                    },
                    recoverable=True
                )
            
            return error_result
    
    def run_health_check(self):
        """Run health check on all endpoints"""
        print("🏥 Running Health Check on Portal Endpoints...")
        print("=" * 60)
        
        results = []
        for endpoint in self.endpoints:
            result = self.check_endpoint(endpoint)
            results.append(result)
            
            # Print status
            status_icon = "✅" if result['success'] else "❌"
            critical_icon = "🔥" if result['critical'] and not result['success'] else ""
            
            print(f"{status_icon} {critical_icon} {result['name']:<20} "
                  f"[{result['status_code']}] "
                  f"{result['response_time_ms']}ms "
                  f"({result['endpoint']})")
            
            if result['error']:
                print(f"   Error: {result['error']}")
        
        return results
    
    def generate_summary(self, results):
        """Generate health check summary"""
        total = len(results)
        success_count = sum(1 for r in results if r['success'])
        critical_failures = [r for r in results if r['critical'] and not r['success']]
        avg_response_time = sum(r['response_time_ms'] for r in results if r['success']) / max(success_count, 1)
        
        print("\n" + "=" * 60)
        print("📊 HEALTH CHECK SUMMARY")
        print("=" * 60)
        print(f"Overall Status: {'🟢 HEALTHY' if len(critical_failures) == 0 else '🔴 UNHEALTHY'}")
        print(f"Endpoints Checked: {total}")
        print(f"Successful: {success_count}/{total} ({success_count/total*100:.1f}%)")
        print(f"Critical Failures: {len(critical_failures)}")
        print(f"Average Response Time: {avg_response_time:.1f}ms")
        
        if critical_failures:
            print(f"\n🚨 CRITICAL ISSUES:")
            for failure in critical_failures:
                print(f"   • {failure['name']}: {failure['error']}")
            
            # Log overall health status to error tracker if unhealthy
            if self.error_tracker and len(critical_failures) > 0:
                self.error_tracker.log_error(
                    error=Exception(f"Health check failed: {len(critical_failures)} critical endpoints down"),
                    category=ErrorCategory.API,
                    severity=ErrorSeverity.CRITICAL,
                    context={
                        'health_check_summary': True,
                        'total_endpoints': total,
                        'successful_endpoints': success_count,
                        'critical_failures': len(critical_failures),
                        'failed_endpoints': [f['endpoint'] for f in critical_failures]
                    },
                    recoverable=True
                )
        
        return {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'overall_status': 'healthy' if len(critical_failures) == 0 else 'unhealthy',
            'total_endpoints': total,
            'successful_endpoints': success_count,
            'critical_failures': len(critical_failures),
            'avg_response_time': avg_response_time,
            'details': results
        }
    
    def generate_rss_feed(self, results, summary):
        """Generate RSS feed for health check results"""
        
        # Create RSS root
        rss = ET.Element('rss', version='2.0')
        channel = ET.SubElement(rss, 'channel')
        
        # Channel info
        ET.SubElement(channel, 'title').text = 'Portal Health Check Status'
        ET.SubElement(channel, 'description').text = 'Real-time health monitoring for Fantdev Trading Portal'
        ET.SubElement(channel, 'link').text = self.base_url
        ET.SubElement(channel, 'lastBuildDate').text = datetime.now(timezone.utc).strftime('%a, %d %b %Y %H:%M:%S %z')
        ET.SubElement(channel, 'language').text = 'en-us'
        ET.SubElement(channel, 'generator').text = 'Portal Health Checker 1.0'
        
        # Add summary item
        item = ET.SubElement(channel, 'item')
        ET.SubElement(item, 'title').text = f"Health Check Summary - {summary['overall_status'].upper()}"
        ET.SubElement(item, 'description').text = f"""
        <![CDATA[
        <h3>Portal Health Status: {summary['overall_status'].upper()}</h3>
        <ul>
        <li><strong>Total Endpoints:</strong> {summary['total_endpoints']}</li>
        <li><strong>Successful:</strong> {summary['successful_endpoints']}/{summary['total_endpoints']} ({summary['successful_endpoints']/summary['total_endpoints']*100:.1f}%)</li>
        <li><strong>Critical Failures:</strong> {summary['critical_failures']}</li>
        <li><strong>Average Response Time:</strong> {summary['avg_response_time']:.1f}ms</li>
        </ul>
        ]]>
        """
        ET.SubElement(item, 'pubDate').text = datetime.now(timezone.utc).strftime('%a, %d %b %Y %H:%M:%S %z')
        ET.SubElement(item, 'guid').text = f"health-summary-{int(datetime.now().timestamp())}"
        
        # Add individual endpoint items
        for result in results:
            item = ET.SubElement(channel, 'item')
            status_text = "ONLINE" if result['success'] else "OFFLINE"
            critical_text = " (CRITICAL)" if result['critical'] else ""
            
            ET.SubElement(item, 'title').text = f"{result['name']} - {status_text}{critical_text}"
            
            description = f"""
            <![CDATA[
            <h4>{result['name']} Status Report</h4>
            <ul>
            <li><strong>Endpoint:</strong> {result['endpoint']}</li>
            <li><strong>Status:</strong> {status_text}</li>
            <li><strong>Status Code:</strong> {result['status_code']}</li>
            <li><strong>Response Time:</strong> {result['response_time_ms']}ms</li>
            <li><strong>Content Type:</strong> {result['content_type']}</li>
            <li><strong>Content Length:</strong> {result['content_length']} bytes</li>
            """
            
            if result['error']:
                description += f"<li><strong>Error:</strong> {result['error']}</li>"
            
            description += "</ul>]]>"
            
            ET.SubElement(item, 'description').text = description
            ET.SubElement(item, 'pubDate').text = datetime.fromisoformat(result['timestamp'].replace('Z', '+00:00')).strftime('%a, %d %b %Y %H:%M:%S %z')
            ET.SubElement(item, 'guid').text = f"endpoint-{result['endpoint'].replace('/', '-')}-{int(datetime.now().timestamp())}"
        
        return ET.tostring(rss, encoding='unicode', method='xml')
    
    def save_reports(self, results, summary, rss_content):
        """Save health check reports to files"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # Save JSON report
        json_file = f'health_check_{timestamp}.json'
        with open(json_file, 'w') as f:
            json.dump({
                'summary': summary,
                'results': results
            }, f, indent=2)
        
        # Save RSS feed
        rss_file = 'health_status.rss'
        with open(rss_file, 'w') as f:
            f.write('<?xml version="1.0" encoding="UTF-8"?>\n')
            f.write(rss_content)
        
        print(f"\n📝 Reports saved:")
        print(f"   • JSON: {json_file}")
        print(f"   • RSS: {rss_file}")
        
        return json_file, rss_file

def main():
    checker = HealthChecker()
    
    # Run health check
    results = checker.run_health_check()
    summary = checker.generate_summary(results)
    
    # Generate RSS feed
    rss_content = checker.generate_rss_feed(results, summary)
    
    # Save reports
    checker.save_reports(results, summary, rss_content)
    
    # Exit with appropriate code
    sys.exit(0 if summary['overall_status'] == 'healthy' else 1)

if __name__ == '__main__':
    main()
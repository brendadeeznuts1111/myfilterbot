#!/usr/bin/env python3
"""
Comprehensive Monitoring and Health Check System
Monitors all components for 200+ customer scaling
"""

import asyncio
import json
import logging
import time
import threading
import psutil
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, asdict
from enum import Enum
import sqlite3
from concurrent.futures import ThreadPoolExecutor
import subprocess
import socket
import os

from .database_enhanced import enhanced_db
from .cache_manager import cache_manager, connection_pool
from .group_manager import multi_group_manager
from .transaction_queue import transaction_queue
from .payment_gateway import payment_gateway
from .config import config

logger = logging.getLogger(__name__)

class HealthStatus(Enum):
    """System component health statuses"""
    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"
    UNKNOWN = "unknown"

class AlertLevel(Enum):
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

@dataclass
class HealthCheck:
    """Individual health check result"""
    component: str
    status: HealthStatus
    response_time: float
    message: str
    timestamp: datetime
    metrics: Dict[str, Any] = None
    error_details: Optional[str] = None
    
    def to_dict(self) -> Dict:
        data = asdict(self)
        data['status'] = self.status.value
        data['timestamp'] = self.timestamp.isoformat()
        return data

@dataclass
class Alert:
    """System alert"""
    id: str
    level: AlertLevel
    component: str
    message: str
    timestamp: datetime
    resolved: bool = False
    resolved_at: Optional[datetime] = None
    count: int = 1
    last_seen: Optional[datetime] = None
    
    def to_dict(self) -> Dict:
        data = asdict(self)
        data['level'] = self.level.value
        data['timestamp'] = self.timestamp.isoformat()
        if self.resolved_at:
            data['resolved_at'] = self.resolved_at.isoformat()
        if self.last_seen:
            data['last_seen'] = self.last_seen.isoformat()
        return data

class SystemMetrics:
    """System performance metrics"""
    
    def __init__(self):
        self.start_time = time.time()
    
    def get_system_metrics(self) -> Dict[str, Any]:
        """Get system performance metrics"""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            network = psutil.net_io_counters()
            
            return {
                'cpu': {
                    'usage_percent': cpu_percent,
                    'cores': psutil.cpu_count(),
                    'load_average': list(psutil.getloadavg()) if hasattr(psutil, 'getloadavg') else None
                },
                'memory': {
                    'usage_percent': memory.percent,
                    'total_mb': memory.total // (1024 * 1024),
                    'available_mb': memory.available // (1024 * 1024),
                    'used_mb': memory.used // (1024 * 1024)
                },
                'disk': {
                    'usage_percent': (disk.used / disk.total) * 100,
                    'total_gb': disk.total // (1024 * 1024 * 1024),
                    'free_gb': disk.free // (1024 * 1024 * 1024),
                    'used_gb': disk.used // (1024 * 1024 * 1024)
                },
                'network': {
                    'bytes_sent': network.bytes_sent,
                    'bytes_recv': network.bytes_recv,
                    'packets_sent': network.packets_sent,
                    'packets_recv': network.packets_recv,
                    'errors_in': network.errin,
                    'errors_out': network.errout
                },
                'uptime_seconds': time.time() - self.start_time
            }
        except Exception as e:
            logger.error(f"Error getting system metrics: {e}")
            return {}
    
    def get_process_metrics(self) -> Dict[str, Any]:
        """Get current process metrics"""
        try:
            process = psutil.Process()
            return {
                'pid': process.pid,
                'cpu_percent': process.cpu_percent(),
                'memory_info': {
                    'rss_mb': process.memory_info().rss // (1024 * 1024),
                    'vms_mb': process.memory_info().vms // (1024 * 1024),
                    'percent': process.memory_percent()
                },
                'threads': process.num_threads(),
                'open_files': len(process.open_files()),
                'connections': len(process.connections()),
                'create_time': process.create_time(),
                'status': process.status()
            }
        except Exception as e:
            logger.error(f"Error getting process metrics: {e}")
            return {}

class ComponentMonitor:
    """Monitors individual system components"""
    
    def __init__(self, monitoring_system):
        self.monitoring_system = monitoring_system
    
    async def check_database_health(self) -> HealthCheck:
        """Check database component health"""
        start_time = time.time()
        
        try:
            # Test database connection and basic operations
            stats = enhanced_db.get_statistics()
            customers = enhanced_db.get_all_customers(limit=1)
            
            response_time = time.time() - start_time
            
            # Check for concerning metrics
            if stats['total_customers'] == 0:
                status = HealthStatus.CRITICAL
                message = "No customers in database"
            elif response_time > 5.0:
                status = HealthStatus.WARNING
                message = f"Slow database response: {response_time:.2f}s"
            else:
                status = HealthStatus.HEALTHY
                message = f"Database operational with {stats['total_customers']} customers"
            
            return HealthCheck(
                component="database",
                status=status,
                response_time=response_time,
                message=message,
                timestamp=datetime.now(),
                metrics={
                    'customer_count': stats['total_customers'],
                    'transaction_count': stats['total_transactions'],
                    'active_customers': stats['active_customers'],
                    'connection_pool_size': len(enhanced_db._connection_pool)
                }
            )
            
        except Exception as e:
            return HealthCheck(
                component="database",
                status=HealthStatus.CRITICAL,
                response_time=time.time() - start_time,
                message="Database connection failed",
                timestamp=datetime.now(),
                error_details=str(e)
            )
    
    async def check_cache_health(self) -> HealthCheck:
        """Check cache system health"""
        start_time = time.time()
        
        try:
            # Test cache operations
            test_key = f"health_check_{int(time.time())}"
            test_value = {"test": True, "timestamp": time.time()}
            
            # Test set/get operations
            cache_manager.set(test_key, test_value, namespace="health")
            retrieved = cache_manager.get(test_key, namespace="health")
            
            response_time = time.time() - start_time
            
            if retrieved != test_value:
                status = HealthStatus.CRITICAL
                message = "Cache set/get operations failed"
            else:
                cache_stats = cache_manager.get_stats()
                hit_rate = cache_stats.get('hit_rate', 0)
                
                if hit_rate < 0.5:
                    status = HealthStatus.WARNING
                    message = f"Low cache hit rate: {hit_rate:.2%}"
                else:
                    status = HealthStatus.HEALTHY
                    message = f"Cache operational (hit rate: {hit_rate:.2%})"
            
            # Cleanup test key
            cache_manager.delete(test_key, namespace="health")
            
            return HealthCheck(
                component="cache",
                status=status,
                response_time=response_time,
                message=message,
                timestamp=datetime.now(),
                metrics=cache_manager.get_stats()
            )
            
        except Exception as e:
            return HealthCheck(
                component="cache",
                status=HealthStatus.CRITICAL,
                response_time=time.time() - start_time,
                message="Cache system failed",
                timestamp=datetime.now(),
                error_details=str(e)
            )
    
    async def check_queue_health(self) -> HealthCheck:
        """Check transaction queue health"""
        start_time = time.time()
        
        try:
            queue_stats = transaction_queue.get_queue_stats()
            response_time = time.time() - start_time
            
            pending_count = queue_stats.get('current_queue_size', 0)
            failed_count = queue_stats.get('total_failed', 0)
            success_rate = queue_stats.get('success_rate', 0)
            
            if pending_count > 1000:
                status = HealthStatus.CRITICAL
                message = f"Queue overloaded: {pending_count} pending transactions"
            elif success_rate < 90:
                status = HealthStatus.WARNING
                message = f"Low success rate: {success_rate:.1f}%"
            elif pending_count > 100:
                status = HealthStatus.WARNING
                message = f"High queue size: {pending_count} pending"
            else:
                status = HealthStatus.HEALTHY
                message = f"Queue operational ({pending_count} pending, {success_rate:.1f}% success)"
            
            return HealthCheck(
                component="transaction_queue",
                status=status,
                response_time=response_time,
                message=message,
                timestamp=datetime.now(),
                metrics=queue_stats
            )
            
        except Exception as e:
            return HealthCheck(
                component="transaction_queue",
                status=HealthStatus.CRITICAL,
                response_time=time.time() - start_time,
                message="Transaction queue check failed",
                timestamp=datetime.now(),
                error_details=str(e)
            )
    
    async def check_payment_gateway_health(self) -> HealthCheck:
        """Check payment gateway health"""
        start_time = time.time()
        
        try:
            available_processors = payment_gateway.get_available_processors()
            processor_stats = payment_gateway.get_processor_stats()
            response_time = time.time() - start_time
            
            enabled_count = processor_stats.get('enabled_processors', 0)
            total_count = processor_stats.get('total_processors', 0)
            
            if enabled_count == 0:
                status = HealthStatus.CRITICAL
                message = "No payment processors available"
            elif enabled_count < total_count:
                status = HealthStatus.WARNING
                message = f"Only {enabled_count}/{total_count} processors enabled"
            else:
                status = HealthStatus.HEALTHY
                message = f"All {enabled_count} payment processors operational"
            
            return HealthCheck(
                component="payment_gateway",
                status=status,
                response_time=response_time,
                message=message,
                timestamp=datetime.now(),
                metrics={
                    'available_processors': available_processors,
                    'processor_stats': processor_stats
                }
            )
            
        except Exception as e:
            return HealthCheck(
                component="payment_gateway",
                status=HealthStatus.CRITICAL,
                response_time=time.time() - start_time,
                message="Payment gateway check failed",
                timestamp=datetime.now(),
                error_details=str(e)
            )
    
    async def check_group_manager_health(self) -> HealthCheck:
        """Check group manager health"""
        start_time = time.time()
        
        try:
            group_stats = multi_group_manager.get_group_stats()
            response_time = time.time() - start_time
            
            total_groups = group_stats.get('total_groups', 0)
            active_groups = group_stats.get('active_groups', 0)
            messages_processed = group_stats.get('total_stats', {}).get('total_messages_processed', 0)
            
            if total_groups == 0:
                status = HealthStatus.WARNING
                message = "No groups configured"
            elif active_groups < total_groups:
                status = HealthStatus.WARNING
                message = f"Only {active_groups}/{total_groups} groups active"
            else:
                status = HealthStatus.HEALTHY
                message = f"All {active_groups} groups active ({messages_processed} messages processed)"
            
            return HealthCheck(
                component="group_manager",
                status=status,
                response_time=response_time,
                message=message,
                timestamp=datetime.now(),
                metrics=group_stats
            )
            
        except Exception as e:
            return HealthCheck(
                component="group_manager",
                status=HealthStatus.CRITICAL,
                response_time=time.time() - start_time,
                message="Group manager check failed",
                timestamp=datetime.now(),
                error_details=str(e)
            )
    
    async def check_external_services(self) -> List[HealthCheck]:
        """Check external service connectivity"""
        checks = []
        
        # Check Telegram API
        try:
            start_time = time.time()
            response = requests.get(
                f"https://api.telegram.org/bot{config.token}/getMe",
                timeout=10
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                status = HealthStatus.HEALTHY
                message = "Telegram API accessible"
            else:
                status = HealthStatus.WARNING
                message = f"Telegram API returned {response.status_code}"
            
            checks.append(HealthCheck(
                component="telegram_api",
                status=status,
                response_time=response_time,
                message=message,
                timestamp=datetime.now(),
                metrics={'status_code': response.status_code}
            ))
            
        except Exception as e:
            checks.append(HealthCheck(
                component="telegram_api",
                status=HealthStatus.CRITICAL,
                response_time=10.0,
                message="Telegram API unreachable",
                timestamp=datetime.now(),
                error_details=str(e)
            ))
        
        # Check portal servers
        for port, name in [(5000, "flask_portal"), (8080, "typescript_admin")]:
            try:
                start_time = time.time()
                response = requests.get(f"http://localhost:{port}/health", timeout=5)
                response_time = time.time() - start_time
                
                status = HealthStatus.HEALTHY if response.status_code == 200 else HealthStatus.WARNING
                message = f"{name} server responsive"
                
            except Exception as e:
                response_time = 5.0
                status = HealthStatus.WARNING
                message = f"{name} server not responding"
            
            checks.append(HealthCheck(
                component=name,
                status=status,
                response_time=response_time,
                message=message,
                timestamp=datetime.now()
            ))
        
        return checks

class MonitoringSystem:
    """Comprehensive system monitoring"""
    
    def __init__(self):
        self.metrics = SystemMetrics()
        self.component_monitor = ComponentMonitor(self)
        self.alerts: Dict[str, Alert] = {}
        self.health_history: List[Dict[str, Any]] = []
        self.alert_handlers: List[Callable[[Alert], None]] = []
        
        # Monitoring configuration
        self.check_interval = 30  # seconds
        self.alert_cooldown = 300  # 5 minutes
        self.history_retention = 7  # days
        
        # Background monitoring
        self.monitoring_enabled = True
        self.monitoring_thread = threading.Thread(target=self._monitoring_loop, daemon=True)
        self.monitoring_thread.start()
        
        logger.info("Comprehensive monitoring system initialized")
    
    def add_alert_handler(self, handler: Callable[[Alert], None]):
        """Add alert notification handler"""
        self.alert_handlers.append(handler)
    
    async def run_full_health_check(self) -> Dict[str, Any]:
        """Run complete health check of all components"""
        start_time = time.time()
        
        # Run all health checks concurrently
        checks = await asyncio.gather(
            self.component_monitor.check_database_health(),
            self.component_monitor.check_cache_health(),
            self.component_monitor.check_queue_health(),
            self.component_monitor.check_payment_gateway_health(),
            self.component_monitor.check_group_manager_health(),
            return_exceptions=True
        )
        
        # Add external service checks
        external_checks = await self.component_monitor.check_external_services()
        checks.extend(external_checks)
        
        # Process results
        health_report = {
            'timestamp': datetime.now().isoformat(),
            'overall_status': HealthStatus.HEALTHY.value,
            'total_response_time': time.time() - start_time,
            'components': {},
            'system_metrics': self.metrics.get_system_metrics(),
            'process_metrics': self.metrics.get_process_metrics()
        }
        
        critical_count = 0
        warning_count = 0
        
        for check in checks:
            if isinstance(check, Exception):
                continue
                
            component_name = check.component
            health_report['components'][component_name] = check.to_dict()
            
            # Update overall status
            if check.status == HealthStatus.CRITICAL:
                critical_count += 1
                health_report['overall_status'] = HealthStatus.CRITICAL.value
            elif check.status == HealthStatus.WARNING:
                warning_count += 1
                if health_report['overall_status'] != HealthStatus.CRITICAL.value:
                    health_report['overall_status'] = HealthStatus.WARNING.value
            
            # Generate alerts
            await self._process_health_check_alert(check)
        
        # Add summary
        health_report['summary'] = {
            'total_components': len(checks),
            'healthy_components': len(checks) - critical_count - warning_count,
            'warning_components': warning_count,
            'critical_components': critical_count
        }
        
        # Store in history
        self.health_history.append(health_report)
        self._cleanup_history()
        
        return health_report
    
    async def _process_health_check_alert(self, check: HealthCheck):
        """Process health check and generate alerts if needed"""
        alert_key = f"{check.component}_{check.status.value}"
        
        if check.status in [HealthStatus.WARNING, HealthStatus.CRITICAL]:
            level = AlertLevel.WARNING if check.status == HealthStatus.WARNING else AlertLevel.CRITICAL
            
            if alert_key in self.alerts:
                # Update existing alert
                alert = self.alerts[alert_key]
                alert.count += 1
                alert.last_seen = datetime.now()
                alert.message = check.message
            else:
                # Create new alert
                alert = Alert(
                    id=f"ALERT_{int(time.time())}_{alert_key}",
                    level=level,
                    component=check.component,
                    message=check.message,
                    timestamp=datetime.now(),
                    last_seen=datetime.now()
                )
                self.alerts[alert_key] = alert
                
                # Notify handlers
                for handler in self.alert_handlers:
                    try:
                        handler(alert)
                    except Exception as e:
                        logger.error(f"Alert handler error: {e}")
        else:
            # Check if we need to resolve an existing alert
            if alert_key.replace('_healthy', '_warning') in self.alerts:
                resolved_key = alert_key.replace('_healthy', '_warning')
                self.alerts[resolved_key].resolved = True
                self.alerts[resolved_key].resolved_at = datetime.now()
            
            if alert_key.replace('_healthy', '_critical') in self.alerts:
                resolved_key = alert_key.replace('_healthy', '_critical')
                self.alerts[resolved_key].resolved = True
                self.alerts[resolved_key].resolved_at = datetime.now()
    
    def get_active_alerts(self) -> List[Alert]:
        """Get all active (unresolved) alerts"""
        return [alert for alert in self.alerts.values() if not alert.resolved]
    
    def get_all_alerts(self, limit: int = 50) -> List[Alert]:
        """Get all alerts (resolved and unresolved)"""
        sorted_alerts = sorted(
            self.alerts.values(),
            key=lambda x: x.timestamp,
            reverse=True
        )
        return sorted_alerts[:limit]
    
    def get_health_history(self, hours: int = 24) -> List[Dict[str, Any]]:
        """Get health check history"""
        cutoff = datetime.now() - timedelta(hours=hours)
        
        filtered_history = []
        for report in reversed(self.health_history):
            report_time = datetime.fromisoformat(report['timestamp'])
            if report_time >= cutoff:
                filtered_history.append(report)
        
        return list(reversed(filtered_history))
    
    def get_monitoring_summary(self) -> Dict[str, Any]:
        """Get monitoring system summary"""
        active_alerts = self.get_active_alerts()
        recent_history = self.get_health_history(1)  # Last hour
        
        return {
            'monitoring_enabled': self.monitoring_enabled,
            'last_check': self.health_history[-1]['timestamp'] if self.health_history else None,
            'active_alerts': len(active_alerts),
            'total_alerts': len(self.alerts),
            'critical_alerts': len([a for a in active_alerts if a.level == AlertLevel.CRITICAL]),
            'warning_alerts': len([a for a in active_alerts if a.level == AlertLevel.WARNING]),
            'uptime': self.metrics.get_system_metrics().get('uptime_seconds', 0),
            'recent_health': recent_history[-1] if recent_history else None,
            'components_monitored': [
                'database', 'cache', 'transaction_queue', 'payment_gateway',
                'group_manager', 'telegram_api', 'flask_portal', 'typescript_admin'
            ]
        }
    
    def _monitoring_loop(self):
        """Background monitoring loop"""
        while self.monitoring_enabled:
            try:
                # Run health check
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    loop.run_until_complete(self.run_full_health_check())
                finally:
                    loop.close()
                
                # Wait for next check
                time.sleep(self.check_interval)
                
            except Exception as e:
                logger.error(f"Monitoring loop error: {e}")
                time.sleep(self.check_interval)
    
    def _cleanup_history(self):
        """Cleanup old health history"""
        if len(self.health_history) > 1000:  # Keep last 1000 reports
            self.health_history = self.health_history[-500:]
        
        # Cleanup resolved alerts older than retention period
        cutoff = datetime.now() - timedelta(days=self.history_retention)
        alerts_to_remove = []
        
        for key, alert in self.alerts.items():
            if (alert.resolved and 
                alert.resolved_at and 
                alert.resolved_at < cutoff):
                alerts_to_remove.append(key)
        
        for key in alerts_to_remove:
            del self.alerts[key]
    
    def shutdown(self):
        """Shutdown monitoring system"""
        self.monitoring_enabled = False
        logger.info("Monitoring system shutdown")

# Global monitoring system instance
monitoring_system = MonitoringSystem()

# Add default alert handler for admin notifications
async def admin_alert_handler(alert: Alert):
    """Send critical alerts to admin"""
    if alert.level == AlertLevel.CRITICAL:
        try:
            from telegram import Bot
            bot = Bot(token=config.token)
            
            alert_text = f"""
🚨 **CRITICAL ALERT**

**Component:** {alert.component}
**Message:** {alert.message}
**Time:** {alert.timestamp.strftime('%Y-%m-%d %H:%M:%S')}
**Alert ID:** {alert.id}

Please check system status immediately.
"""
            
            await bot.send_message(
                chat_id=config.admin_chat_id,
                text=alert_text,
                parse_mode='Markdown'
            )
            
        except Exception as e:
            logger.error(f"Failed to send admin alert: {e}")

# Register admin alert handler
monitoring_system.add_alert_handler(
    lambda alert: asyncio.create_task(admin_alert_handler(alert))
)
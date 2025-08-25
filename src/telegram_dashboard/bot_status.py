"""
Bot health monitoring and status tracking for dashboard integration
"""
import asyncio
import json
import logging
import time
try:
    import psutil
except ImportError:
    psutil = None
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, asdict
from enum import Enum
import threading

from telegram import Bot
from telegram.error import TelegramError, NetworkError, TimedOut, BadRequest

class BotStatus(Enum):
    """Bot status enumeration"""
    HEALTHY = "healthy"
    WARNING = "warning"
    ERROR = "error"
    OFFLINE = "offline"
    STARTING = "starting"
    STOPPING = "stopping"

@dataclass
class HealthMetrics:
    """System health metrics"""
    cpu_usage: float
    memory_usage: float
    disk_usage: float
    network_status: str
    uptime: str
    response_time: float
    error_rate: float
    message_rate: float

@dataclass
class BotHealthStatus:
    """Comprehensive bot health status"""
    status: BotStatus
    last_check: str
    uptime: str
    api_status: str
    webhook_status: str
    database_status: str
    connection_quality: str
    error_count: int
    warning_count: int
    performance_score: float
    system_metrics: HealthMetrics
    recent_errors: List[Dict[str, Any]]
    api_calls_today: int
    rate_limit_remaining: int
    last_message_processed: str

class TelegramBotMonitor:
    """Comprehensive Telegram bot health monitoring"""
    
    def __init__(self, bot_token: str, admin_chat_id: str, check_interval: int = 30):
        self.bot_token = bot_token
        self.admin_chat_id = admin_chat_id
        self.check_interval = check_interval
        self.bot = Bot(token=bot_token)
        self.logger = logging.getLogger(__name__)
        
        # Monitoring state
        self.is_monitoring = False
        self.current_status = BotStatus.OFFLINE
        self.start_time = None
        self.last_check_time = None
        
        # Health data
        self.health_history: List[BotHealthStatus] = []
        self.error_log: List[Dict[str, Any]] = []
        self.performance_metrics: Dict[str, List[float]] = {
            'response_times': [],
            'cpu_usage': [],
            'memory_usage': [],
            'message_rates': []
        }
        
        # Statistics
        self.stats = {
            'total_checks': 0,
            'healthy_checks': 0,
            'warning_checks': 0,
            'error_checks': 0,
            'offline_checks': 0,
            'api_calls_today': 0,
            'errors_today': 0,
            'average_response_time': 0,
            'uptime_percentage': 100.0,
            'last_restart': None
        }
        
        # Thresholds
        self.thresholds = {
            'cpu_warning': 70.0,
            'cpu_error': 90.0,
            'memory_warning': 80.0,
            'memory_error': 95.0,
            'disk_warning': 85.0,
            'disk_error': 95.0,
            'response_time_warning': 2.0,
            'response_time_error': 5.0,
            'error_rate_warning': 5.0,
            'error_rate_error': 15.0
        }
        
        # Alert callbacks
        self.alert_callbacks: List[Callable] = []
        
        # API rate limiting tracking
        self.api_calls_log = []
        self.rate_limit_info = {
            'remaining': 30,
            'reset_time': time.time() + 60
        }
    
    async def start_monitoring(self):
        """Start continuous bot health monitoring"""
        try:
            self.is_monitoring = True
            self.start_time = datetime.now()
            self.current_status = BotStatus.STARTING
            
            # Initial health check
            await self.perform_health_check()
            
            # Start monitoring loop
            monitoring_task = asyncio.create_task(self._monitoring_loop())
            
            # Start performance metrics collection
            metrics_task = asyncio.create_task(self._collect_performance_metrics())
            
            # Start API rate limit tracking
            rate_limit_task = asyncio.create_task(self._track_rate_limits())
            
            self.logger.info("Bot health monitoring started")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to start bot monitoring: {e}")
            self.current_status = BotStatus.ERROR
            return False
    
    async def stop_monitoring(self):
        """Stop bot health monitoring"""
        try:
            self.is_monitoring = False
            self.current_status = BotStatus.STOPPING
            
            # Allow current checks to complete
            await asyncio.sleep(1)
            
            self.current_status = BotStatus.OFFLINE
            self.logger.info("Bot health monitoring stopped")
            return True
            
        except Exception as e:
            self.logger.error(f"Error stopping bot monitoring: {e}")
            return False
    
    async def perform_health_check(self) -> BotHealthStatus:
        """Perform comprehensive health check"""
        try:
            check_start_time = time.time()
            self.last_check_time = datetime.now()
            
            # Test API connectivity
            api_status = await self._check_api_status()
            
            # Check webhook status (if applicable)
            webhook_status = await self._check_webhook_status()
            
            # Test database connectivity
            database_status = self._check_database_status()
            
            # Collect system metrics
            system_metrics = self._collect_system_metrics()
            
            # Calculate response time
            response_time = time.time() - check_start_time
            
            # Determine overall status
            overall_status = self._calculate_overall_status(
                api_status, webhook_status, database_status, system_metrics, response_time
            )
            
            # Get recent errors
            recent_errors = self._get_recent_errors(limit=10)
            
            # Calculate performance score
            performance_score = self._calculate_performance_score(
                system_metrics, response_time, recent_errors
            )
            
            # Create health status
            health_status = BotHealthStatus(
                status=overall_status,
                last_check=self.last_check_time.isoformat(),
                uptime=str(datetime.now() - self.start_time) if self.start_time else "0:00:00",
                api_status=api_status,
                webhook_status=webhook_status,
                database_status=database_status,
                connection_quality=self._assess_connection_quality(response_time),
                error_count=len([e for e in self.error_log if self._is_today(e['timestamp'])]),
                warning_count=self._count_warnings(),
                performance_score=performance_score,
                system_metrics=system_metrics,
                recent_errors=recent_errors,
                api_calls_today=self.stats['api_calls_today'],
                rate_limit_remaining=self.rate_limit_info['remaining'],
                last_message_processed=self._get_last_message_time()
            )
            
            # Store health status
            self.health_history.append(health_status)
            
            # Keep only last 100 health checks
            if len(self.health_history) > 100:
                self.health_history = self.health_history[-100:]
            
            # Update statistics
            self._update_statistics(health_status)
            
            # Check for alerts
            await self._check_alerts(health_status)
            
            self.current_status = overall_status
            return health_status
            
        except Exception as e:
            self.logger.error(f"Error performing health check: {e}")
            self._log_error("health_check", str(e))
            
            error_status = BotHealthStatus(
                status=BotStatus.ERROR,
                last_check=datetime.now().isoformat(),
                uptime="Unknown",
                api_status="error",
                webhook_status="unknown",
                database_status="unknown",
                connection_quality="poor",
                error_count=len(self.error_log),
                warning_count=0,
                performance_score=0.0,
                system_metrics=HealthMetrics(0, 0, 0, "unknown", "0:00:00", 999, 100, 0),
                recent_errors=[],
                api_calls_today=0,
                rate_limit_remaining=0,
                last_message_processed="unknown"
            )
            
            self.current_status = BotStatus.ERROR
            return error_status
    
    async def _monitoring_loop(self):
        """Main monitoring loop"""
        while self.is_monitoring:
            try:
                await self.perform_health_check()
                await asyncio.sleep(self.check_interval)
                
            except Exception as e:
                self.logger.error(f"Error in monitoring loop: {e}")
                self._log_error("monitoring_loop", str(e))
                await asyncio.sleep(10)  # Short delay on error
    
    async def _collect_performance_metrics(self):
        """Collect system performance metrics"""
        while self.is_monitoring:
            try:
                if psutil is not None:
                    # CPU usage
                    cpu_percent = psutil.cpu_percent(interval=1)
                    self.performance_metrics['cpu_usage'].append(cpu_percent)
                    
                    # Memory usage
                    memory = psutil.virtual_memory()
                    self.performance_metrics['memory_usage'].append(memory.percent)
                else:
                    # Fallback when psutil not available
                    self.performance_metrics['cpu_usage'].append(0.0)
                    self.performance_metrics['memory_usage'].append(0.0)
                
                # Keep only last 60 measurements (1 hour at 1-minute intervals)
                for metric in self.performance_metrics.values():
                    if len(metric) > 60:
                        metric.pop(0)
                
                await asyncio.sleep(60)  # Collect every minute
                
            except Exception as e:
                self.logger.error(f"Error collecting performance metrics: {e}")
                await asyncio.sleep(60)
    
    async def _track_rate_limits(self):
        """Track API rate limits"""
        while self.is_monitoring:
            try:
                # Clean old API calls (older than 1 minute)
                current_time = time.time()
                self.api_calls_log = [
                    call_time for call_time in self.api_calls_log
                    if current_time - call_time < 60
                ]
                
                # Update rate limit info
                self.rate_limit_info['remaining'] = max(0, 30 - len(self.api_calls_log))
                
                await asyncio.sleep(5)  # Check every 5 seconds
                
            except Exception as e:
                self.logger.error(f"Error tracking rate limits: {e}")
                await asyncio.sleep(10)
    
    async def _check_api_status(self) -> str:
        """Check Telegram API connectivity"""
        try:
            start_time = time.time()
            
            # Test API call
            bot_info = await self.bot.get_me()
            
            response_time = time.time() - start_time
            
            # Log API call for rate limiting
            self.api_calls_log.append(time.time())
            self.stats['api_calls_today'] += 1
            
            if response_time < self.thresholds['response_time_warning']:
                return "healthy"
            elif response_time < self.thresholds['response_time_error']:
                return "warning"
            else:
                return "slow"
                
        except NetworkError:
            return "network_error"
        except TimedOut:
            return "timeout"
        except BadRequest as e:
            return f"bad_request: {str(e)[:100]}"
        except TelegramError as e:
            return f"telegram_error: {str(e)[:100]}"
        except Exception as e:
            self.logger.error(f"Unexpected error in API status check: {e}")
            return f"error: {str(e)[:100]}"
    
    async def _check_webhook_status(self) -> str:
        """Check webhook status if applicable"""
        try:
            webhook_info = await self.bot.get_webhook_info()
            
            if webhook_info.url:
                if webhook_info.has_custom_certificate:
                    return "webhook_active_custom"
                else:
                    return "webhook_active"
            else:
                return "polling"
                
        except Exception as e:
            return f"webhook_error: {str(e)[:50]}"
    
    def _check_database_status(self) -> str:
        """Check database connectivity"""
        try:
            # Try to check database file existence and permissions
            database_files = [
                "customer_database.json",
                "customer_config.json"
            ]
            
            for db_file in database_files:
                if os.path.exists(db_file):
                    if os.access(db_file, os.R_OK | os.W_OK):
                        continue
                    else:
                        return "permission_error"
                else:
                    return "file_missing"
            
            return "healthy"
            
        except Exception as e:
            return f"error: {str(e)[:50]}"
    
    def _collect_system_metrics(self) -> HealthMetrics:
        """Collect comprehensive system metrics"""
        try:
            if psutil is None:
                # Fallback metrics when psutil is not available
                return HealthMetrics(
                    cpu_usage=0.0,
                    memory_usage=0.0,
                    disk_usage=0.0,
                    network_status="unknown",
                    uptime=str(datetime.now() - self.start_time) if self.start_time else "0:00:00",
                    response_time=0.0,
                    error_rate=0.0,
                    message_rate=0.0
                )
            
            # CPU usage
            cpu_usage = psutil.cpu_percent(interval=0.1)
            
            # Memory usage
            memory = psutil.virtual_memory()
            memory_usage = memory.percent
            
            # Disk usage
            disk = psutil.disk_usage('/')
            disk_usage = (disk.used / disk.total) * 100
            
            # Network status
            network_status = "connected"  # Simplified
            
            # Uptime
            uptime = str(datetime.now() - self.start_time) if self.start_time else "0:00:00"
            
            # Response time (from recent checks)
            response_time = 0.0
            if len(self.performance_metrics['response_times']) > 0:
                response_time = sum(self.performance_metrics['response_times']) / len(self.performance_metrics['response_times'])
            
            # Error rate (errors in last hour)
            recent_errors = [e for e in self.error_log if self._is_recent_hour(e['timestamp'])]
            error_rate = len(recent_errors) / max(1, self.stats['total_checks']) * 100
            
            # Message rate (simplified)
            message_rate = self.stats['api_calls_today'] / max(1, self._hours_since_start())
            
            return HealthMetrics(
                cpu_usage=cpu_usage,
                memory_usage=memory_usage,
                disk_usage=disk_usage,
                network_status=network_status,
                uptime=uptime,
                response_time=response_time,
                error_rate=error_rate,
                message_rate=message_rate
            )
            
        except Exception as e:
            self.logger.error(f"Error collecting system metrics: {e}")
            return HealthMetrics(0, 0, 0, "error", "0:00:00", 999, 100, 0)
    
    def _calculate_overall_status(self, api_status: str, webhook_status: str, 
                                database_status: str, metrics: HealthMetrics, 
                                response_time: float) -> BotStatus:
        """Calculate overall bot health status"""
        # Critical failures
        if api_status.startswith("network_error") or api_status.startswith("telegram_error"):
            return BotStatus.ERROR
        
        if database_status.startswith("error") or database_status == "file_missing":
            return BotStatus.ERROR
        
        # Warning conditions
        warning_conditions = [
            api_status == "slow",
            api_status == "timeout",
            database_status == "permission_error",
            metrics.cpu_usage > self.thresholds['cpu_warning'],
            metrics.memory_usage > self.thresholds['memory_warning'],
            metrics.disk_usage > self.thresholds['disk_warning'],
            response_time > self.thresholds['response_time_warning'],
            metrics.error_rate > self.thresholds['error_rate_warning']
        ]
        
        # Error conditions
        error_conditions = [
            metrics.cpu_usage > self.thresholds['cpu_error'],
            metrics.memory_usage > self.thresholds['memory_error'],
            metrics.disk_usage > self.thresholds['disk_error'],
            response_time > self.thresholds['response_time_error'],
            metrics.error_rate > self.thresholds['error_rate_error']
        ]
        
        if any(error_conditions):
            return BotStatus.ERROR
        elif any(warning_conditions):
            return BotStatus.WARNING
        else:
            return BotStatus.HEALTHY
    
    def _calculate_performance_score(self, metrics: HealthMetrics, 
                                   response_time: float, recent_errors: List) -> float:
        """Calculate overall performance score (0-100)"""
        try:
            score = 100.0
            
            # CPU penalty
            if metrics.cpu_usage > self.thresholds['cpu_warning']:
                score -= min(30, (metrics.cpu_usage - self.thresholds['cpu_warning']) * 1.5)
            
            # Memory penalty
            if metrics.memory_usage > self.thresholds['memory_warning']:
                score -= min(25, (metrics.memory_usage - self.thresholds['memory_warning']) * 1.25)
            
            # Disk penalty
            if metrics.disk_usage > self.thresholds['disk_warning']:
                score -= min(15, (metrics.disk_usage - self.thresholds['disk_warning']) * 0.75)
            
            # Response time penalty
            if response_time > self.thresholds['response_time_warning']:
                score -= min(20, (response_time - self.thresholds['response_time_warning']) * 10)
            
            # Error rate penalty
            if metrics.error_rate > 0:
                score -= min(25, metrics.error_rate * 2)
            
            # Recent errors penalty
            score -= min(15, len(recent_errors) * 3)
            
            return max(0.0, score)
            
        except Exception as e:
            self.logger.error(f"Error calculating performance score: {e}")
            return 50.0  # Default middle score on error
    
    def _assess_connection_quality(self, response_time: float) -> str:
        """Assess connection quality based on response time"""
        if response_time < 0.5:
            return "excellent"
        elif response_time < 1.0:
            return "good"
        elif response_time < 2.0:
            return "fair"
        elif response_time < 5.0:
            return "poor"
        else:
            return "very_poor"
    
    def _get_recent_errors(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent errors for dashboard display"""
        recent_errors = [
            e for e in self.error_log
            if self._is_recent_hour(e['timestamp'])
        ]
        return sorted(recent_errors, key=lambda x: x['timestamp'], reverse=True)[:limit]
    
    def _count_warnings(self) -> int:
        """Count current warning conditions"""
        warning_count = 0
        
        if self.current_status == BotStatus.WARNING:
            warning_count += 1
        
        # Add other warning conditions as needed
        return warning_count
    
    def _get_last_message_time(self) -> str:
        """Get timestamp of last processed message"""
        # This would need to be integrated with the message handler
        return datetime.now().isoformat()  # Placeholder
    
    def _update_statistics(self, health_status: BotHealthStatus):
        """Update monitoring statistics"""
        self.stats['total_checks'] += 1
        
        if health_status.status == BotStatus.HEALTHY:
            self.stats['healthy_checks'] += 1
        elif health_status.status == BotStatus.WARNING:
            self.stats['warning_checks'] += 1
        elif health_status.status == BotStatus.ERROR:
            self.stats['error_checks'] += 1
        elif health_status.status == BotStatus.OFFLINE:
            self.stats['offline_checks'] += 1
        
        # Update average response time
        if hasattr(health_status.system_metrics, 'response_time'):
            self.performance_metrics['response_times'].append(health_status.system_metrics.response_time)
            if len(self.performance_metrics['response_times']) > 100:
                self.performance_metrics['response_times'].pop(0)
            
            self.stats['average_response_time'] = sum(self.performance_metrics['response_times']) / len(self.performance_metrics['response_times'])
        
        # Calculate uptime percentage
        total_checks = self.stats['total_checks']
        healthy_and_warning = self.stats['healthy_checks'] + self.stats['warning_checks']
        if total_checks > 0:
            self.stats['uptime_percentage'] = (healthy_and_warning / total_checks) * 100
    
    async def _check_alerts(self, health_status: BotHealthStatus):
        """Check for alert conditions and notify"""
        alert_conditions = []
        
        # Critical status alerts
        if health_status.status == BotStatus.ERROR:
            alert_conditions.append({
                'level': 'critical',
                'message': 'Bot status is ERROR',
                'details': f"API: {health_status.api_status}, DB: {health_status.database_status}"
            })
        
        # Performance alerts
        if health_status.performance_score < 50:
            alert_conditions.append({
                'level': 'warning',
                'message': f'Low performance score: {health_status.performance_score:.1f}%',
                'details': f"CPU: {health_status.system_metrics.cpu_usage:.1f}%, Memory: {health_status.system_metrics.memory_usage:.1f}%"
            })
        
        # Rate limit alerts
        if health_status.rate_limit_remaining < 5:
            alert_conditions.append({
                'level': 'warning',
                'message': f'Low rate limit remaining: {health_status.rate_limit_remaining}',
                'details': 'API rate limit nearly exhausted'
            })
        
        # Send alerts
        for alert in alert_conditions:
            await self._send_alert(alert)
    
    async def _send_alert(self, alert: Dict[str, Any]):
        """Send alert to registered callbacks"""
        for callback in self.alert_callbacks:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(alert)
                else:
                    callback(alert)
            except Exception as e:
                self.logger.error(f"Error sending alert via callback: {e}")
    
    def _log_error(self, error_type: str, error_message: str):
        """Log error for tracking"""
        error_entry = {
            'timestamp': datetime.now().isoformat(),
            'type': error_type,
            'message': error_message
        }
        
        self.error_log.append(error_entry)
        
        # Keep only last 1000 errors
        if len(self.error_log) > 1000:
            self.error_log = self.error_log[-1000:]
        
        # Update daily error count
        if self._is_today(error_entry['timestamp']):
            self.stats['errors_today'] += 1
    
    def _is_today(self, timestamp: str) -> bool:
        """Check if timestamp is from today"""
        try:
            check_date = datetime.fromisoformat(timestamp).date()
            return check_date == datetime.now().date()
        except:
            return False
    
    def _is_recent_hour(self, timestamp: str) -> bool:
        """Check if timestamp is within the last hour"""
        try:
            check_time = datetime.fromisoformat(timestamp)
            return datetime.now() - check_time < timedelta(hours=1)
        except:
            return False
    
    def _hours_since_start(self) -> float:
        """Calculate hours since monitoring started"""
        if self.start_time:
            delta = datetime.now() - self.start_time
            return delta.total_seconds() / 3600
        return 1.0  # Default to 1 to avoid division by zero
    
    def add_alert_callback(self, callback: Callable):
        """Add alert callback function"""
        self.alert_callbacks.append(callback)
        self.logger.info("Alert callback added")
    
    def remove_alert_callback(self, callback: Callable):
        """Remove alert callback function"""
        if callback in self.alert_callbacks:
            self.alert_callbacks.remove(callback)
            self.logger.info("Alert callback removed")
    
    def get_current_status(self) -> Dict[str, Any]:
        """Get current bot status for dashboard"""
        if self.health_history:
            latest_health = self.health_history[-1]
            return asdict(latest_health)
        else:
            return {
                'status': self.current_status.value,
                'message': 'No health data available'
            }
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get comprehensive statistics"""
        return {
            **self.stats,
            'is_monitoring': self.is_monitoring,
            'current_status': self.current_status.value,
            'health_checks_count': len(self.health_history),
            'error_log_count': len(self.error_log)
        }
    
    def get_performance_trends(self) -> Dict[str, List[float]]:
        """Get performance trends for dashboard charts"""
        return {
            key: values[-30:] if len(values) > 30 else values
            for key, values in self.performance_metrics.items()
        }
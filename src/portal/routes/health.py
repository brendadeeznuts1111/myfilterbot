from flask import Blueprint, jsonify, request
from datetime import datetime
import logging
import os
import time

from src.portal.db.repositories import db
from error_handler import error_tracker, ErrorCategory, ErrorSeverity # Assuming error_tracker is accessible or passed

health_bp = Blueprint('health', __name__)
logger = logging.getLogger(__name__)

@health_bp.route('/health')
def health_check():
    """Basic health check endpoint with error tracking integration"""
    try:
        customers = db.get_all_customers()
        members = db.get_group_members()

        # Get error statistics from error tracker
        error_stats = error_tracker.get_error_stats()
        recent_errors = error_tracker.get_recent_errors(limit=5, severity=ErrorSeverity.CRITICAL)

        health_status = {
            'status': 'healthy',
            'database': os.path.exists('customer_database.json'),
            'customers_loaded': len(customers),
            'members_loaded': len(members),
            'timestamp': datetime.now().isoformat(),
            'error_tracking': {
                'total_errors': error_stats.get('total', 0),
                'errors_last_24h': error_stats.get('last_24h', 0),
                'critical_errors': len(recent_errors),
                'resolved_errors': error_stats.get('resolved', 0)
            }
        }

        # Determine if system is healthy based on error count
        if error_stats.get('last_24h', 0) > 100:
            health_status['status'] = 'degraded'
        if len(recent_errors) > 0:
            health_status['status'] = 'unhealthy'

        return jsonify(health_status)

    except Exception as e:
        # Log health check failure to error tracker
        error_tracker.log_error(
            error=e,
            category=ErrorCategory.API,
            severity=ErrorSeverity.HIGH,
            context={'endpoint': '/health', 'action': 'health_check'},
            recoverable=True
        )
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@health_bp.route('/health/detailed')
def detailed_health_check():
    """Detailed health check with comprehensive system status and error tracking"""
    start_time = time.time()

    try:
        # Check database files
        db_checks = {
            'customer_database': os.path.exists('customer_database.json'),
            'customer_database_2500': os.path.exists('customer_database_2500.json'),
            'customer_config': os.path.exists('customer_config.json'),
        }

        # Check critical paths
        path_checks = {
            'static_files': os.path.exists('static'),
            'templates': os.path.exists('templates'),
            'src_modules': os.path.exists('src'),
            'logs': os.path.exists('logs'),
        }

        # Get system stats
        try:
            stats = db.get_statistics()
            db_status = 'operational'
        except Exception as e:
            stats = {}
            db_status = f'error: {str(e)}'
            # Log database error
            error_tracker.log_error(
                error=e,
                category=ErrorCategory.DATABASE,
                severity=ErrorSeverity.HIGH,
                context={'endpoint': '/health/detailed', 'action': 'get_statistics'},
                recoverable=True
            )

        # Get error tracking statistics
        error_stats = error_tracker.get_error_stats()
        recent_critical = error_tracker.get_recent_errors(limit=3, severity=ErrorSeverity.CRITICAL)
        recent_high = error_tracker.get_recent_errors(limit=5, severity=ErrorSeverity.HIGH)

        # Determine overall health status
        health_status = 'healthy'
        if not all(db_checks.values()):
            health_status = 'degraded'
        if error_stats.get('last_24h', 0) > 50:
            health_status = 'degraded'
        if len(recent_critical) > 0 or db_status != 'operational':
            health_status = 'unhealthy'

        # Calculate uptime (approximate based on server start)
        uptime_seconds = int(time.time() - start_time)

        return jsonify({
            'status': health_status,
            'timestamp': datetime.now().isoformat(),
            'response_time_ms': round((time.time() - start_time) * 1000, 2),
            'database': {
                'status': db_status,
                'files': db_checks,
                'customers_loaded': len(db.get_all_customers()),
                'members_loaded': len(db.get_group_members()),
                'total_balance': stats.get('total_balance', 0),
                'active_customers': stats.get('active_customers', 0)
            },
            'error_tracking': {
                'status': 'active',
                'total_errors': error_stats.get('total', 0),
                'errors_last_24h': error_stats.get('last_24h', 0),
                'errors_by_category': error_stats.get('by_category', {}),
                'errors_by_severity': error_stats.get('by_severity', {}),
                'resolved_errors': error_stats.get('resolved', 0),
                'critical_errors': [
                    {
                        'id': err.get('id'),
                        'category': err.get('category'),
                        'message': err.get('error_message', '')[:100],
                        'timestamp': err.get('timestamp')
                    } for err in recent_critical
                ],
                'high_priority_errors': len(recent_high)
            },
            'paths': path_checks,
            'endpoints': {
                'total': len(health_bp.url_map._rules), # Use blueprint's rules
                'api': sum(1 for rule in health_bp.url_map._rules if '/api/' in rule.rule),
                'admin': sum(1 for rule in health_bp.url_map._rules if '/admin' in rule.rule),
            },
            'server': {
                'version': '2.0.0',
                'python_version': os.sys.version.split()[0],
                'platform': os.sys.platform,
                'uptime_seconds': uptime_seconds
            }
        })

    except Exception as e:
        # Log critical health check failure
        error_id = error_tracker.log_error(
            error=e,
            category=ErrorCategory.API,
            severity=ErrorSeverity.CRITICAL,
            context={'endpoint': '/health/detailed', 'action': 'detailed_health_check'},
            recoverable=False
        )
        return jsonify({
            'status': 'error',
            'error': str(e),
            'error_id': error_id,
            'timestamp': datetime.now().isoformat()
        }), 500

@health_bp.route('/health/live')
def liveness_probe():
    """Kubernetes-style liveness probe"""
    return jsonify({'status': 'alive', 'timestamp': datetime.now().isoformat()}), 200

@health_bp.route('/health/ready')
def readiness_probe():
    """Kubernetes-style readiness probe with error tracking"""
    try:
        # Check if database is accessible
        customers = db.get_all_customers()

        # Check error tracking system
        error_stats = error_tracker.get_error_stats()
        critical_errors = error_tracker.get_recent_errors(limit=1, severity=ErrorSeverity.CRITICAL)

        # System is not ready if there are recent critical errors
        if len(critical_errors) > 0:
            error_tracker.log_error(
                error=Exception("System not ready due to critical errors"),
                category=ErrorCategory.API,
                severity=ErrorSeverity.MEDIUM,
                context={'endpoint': '/health/ready', 'critical_errors': len(critical_errors)},
                recoverable=True
            )
            return jsonify({
                'status': 'not_ready',
                'error': 'Critical errors detected',
                'critical_error_count': len(critical_errors)
            }), 503

        if customers is not None:
            return jsonify({
                'status': 'ready',
                'timestamp': datetime.now().isoformat(),
                'error_stats': {
                    'last_24h': error_stats.get('last_24h', 0),
                    'resolved': error_stats.get('resolved', 0)
                }
            }), 200
        else:
            error_tracker.log_error(
                error=Exception("Database not loaded"),
                category=ErrorCategory.DATABASE,
                severity=ErrorSeverity.HIGH,
                context={'endpoint': '/health/ready'},
                recoverable=True
            )
            return jsonify({'status': 'not_ready', 'error': 'Database not loaded'}), 503

    except Exception as e:
        error_tracker.log_error(
            error=e,
            category=ErrorCategory.API,
            severity=ErrorSeverity.HIGH,
            context={'endpoint': '/health/ready', 'action': 'readiness_check'},
            recoverable=True
        )
        return jsonify({'status': 'not_ready', 'error': str(e)}), 503

@health_bp.route('/health/metrics')
def health_metrics():
    """Prometheus-style metrics endpoint with error tracking integration"""
    try:
        metrics = []

        # Database metrics
        customers = db.get_all_customers()
        members = db.get_group_members()
        stats = db.get_statistics()

        # Error tracking metrics
        error_stats = error_tracker.get_error_stats()
        critical_errors = error_tracker.get_recent_errors(limit=10, severity=ErrorSeverity.CRITICAL)

        # Determine health status based on errors
        health_status = 1  # healthy
        if error_stats.get('last_24h', 0) > 100:
            health_status = 0  # unhealthy
        if len(critical_errors) > 0:
            health_status = 0  # unhealthy

        # Database metrics
        metrics.append(f'# HELP portal_customers_total Total number of customers')
        metrics.append(f'# TYPE portal_customers_total gauge')
        metrics.append(f'portal_customers_total {len(customers)}')

        metrics.append(f'# HELP portal_members_total Total number of group members')
        metrics.append(f'# TYPE portal_members_total gauge')
        metrics.append(f'portal_members_total {len(members)}')

        metrics.append(f'# HELP portal_balance_total Total balance across all customers')
        metrics.append(f'# TYPE portal_balance_total gauge')
        metrics.append(f'portal_balance_total {stats.get("total_balance", 0)}')

        metrics.append(f'# HELP portal_active_customers Active customers count')
        metrics.append(f'# TYPE portal_active_customers gauge')
        metrics.append(f'portal_active_customers {stats.get("active_customers", 0)}')

        # Error tracking metrics
        metrics.append(f'# HELP portal_errors_total Total number of errors')
        metrics.append(f'# TYPE portal_errors_total counter')
        metrics.append(f'portal_errors_total {error_stats.get("total", 0)}')

        metrics.append(f'# HELP portal_errors_last_24h Errors in last 24 hours')
        metrics.append(f'# TYPE portal_errors_last_24h gauge')
        metrics.append(f'portal_errors_last_24h {error_stats.get("last_24h", 0)}')

        metrics.append(f'# HELP portal_errors_resolved Total resolved errors')
        metrics.append(f'# TYPE portal_errors_resolved counter')
        metrics.append(f'portal_errors_resolved {error_stats.get("resolved", 0)}')

        metrics.append(f'# HELP portal_critical_errors_active Active critical errors')
        metrics.append(f'# TYPE portal_critical_errors_active gauge')
        metrics.append(f'portal_critical_errors_active {len(critical_errors)}')

        # Error breakdown by category
        for category, count in error_stats.get('by_category', {}).items():
            metrics.append(f'# HELP portal_errors_by_category_{category.lower()} Errors by category: {category}')
            metrics.append(f'# TYPE portal_errors_by_category_{category.lower()} counter')
            metrics.append(f'portal_errors_by_category_{category.lower()} {count}')

        # Error breakdown by severity
        for severity, count in error_stats.get('by_severity', {}).items():
            metrics.append(f'# HELP portal_errors_by_severity_{severity.lower()} Errors by severity: {severity}')
            metrics.append(f'# TYPE portal_errors_by_severity_{severity.lower()} counter')
            metrics.append(f'portal_errors_by_severity_{severity.lower()} {count}')

        # Overall health status
        metrics.append(f'# HELP portal_health_status Portal health status (1=healthy, 0=unhealthy)')
        metrics.append(f'# TYPE portal_health_status gauge')
        metrics.append(f'portal_health_status {health_status}')

        return '\n'.join(metrics), 200, {'Content-Type': 'text/plain; version=0.0.4'}

    except Exception as e:
        # Log metrics generation failure
        error_tracker.log_error(
            error=e,
            category=ErrorCategory.API,
            severity=ErrorSeverity.MEDIUM,
            context={'endpoint': '/health/metrics', 'action': 'generate_metrics'},
            recoverable=True
        )
        # Return minimal metrics on error
        return f'portal_health_status 0\nportal_metrics_error 1', 500, {'Content-Type': 'text/plain; version=0.0.4'}

@health_bp.route('/health/errors')
def health_errors():
    """Get recent errors from error tracking system"""
    try:
        limit = request.args.get('limit', 10, type=int)
        category = request.args.get('category', None)
        severity = request.args.get('severity', None)

        # Get errors based on filters
        errors = error_tracker.get_recent_errors(limit=limit, category=category, severity=severity)
        error_stats = error_tracker.get_error_stats()

        # Format errors for response
        formatted_errors = []
        for error in errors:
            formatted_errors.append({
                'id': error.get('id'),
                'timestamp': error.get('timestamp'),
                'category': error.get('category'),
                'severity': error.get('severity'),
                'error_type': error.get('error_type'),
                'message': error.get('error_message', '')[:200],
                'resolved': error.get('resolved', False),
                'recoverable': error.get('recoverable', True),
                'user_id': error.get('user_id'),
                'context': error.get('context', {})
            })

        return jsonify({
            'errors': formatted_errors,
            'count': len(formatted_errors),
            'statistics': {
                'total': error_stats.get('total', 0),
                'last_24h': error_stats.get('last_24h', 0),
                'resolved': error_stats.get('resolved', 0),
                'by_category': error_stats.get('by_category', {}),
                'by_severity': error_stats.get('by_severity', {})
            },
            'timestamp': datetime.now().isoformat()
        })

    except Exception as e:
        error_tracker.log_error(
            error=e,
            category=ErrorCategory.API,
            severity=ErrorSeverity.LOW,
            context={'endpoint': '/health/errors', 'action': 'get_errors'},
            recoverable=True
        )
        return jsonify({'error': str(e)}), 500

@health_bp.route('/health/errors/<error_id>/resolve', methods=['POST'])
def resolve_health_error(error_id):
    """Mark an error as resolved"""
    try:
        resolution = request.json.get('resolution', 'Resolved via health check API')

        success = error_tracker.resolve_error(error_id, resolution)

        if success:
            return jsonify({
                'success': True,
                'error_id': error_id,
                'message': 'Error resolved successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Error not found'
            }), 404

    except Exception as e:
        error_tracker.log_error(
            error=e,
            category=ErrorCategory.API,
            severity=ErrorSeverity.LOW,
            context={'endpoint': f'/health/errors/{error_id}/resolve', 'action': 'resolve_error'},
            recoverable=True
        )
        return jsonify({'error': str(e)}), 500

@health_bp.route('/ping')
def ping():
    """Simple ping endpoint for uptime monitoring"""
    return 'pong', 200

@health_bp.route('/status')
def status():
    """Status endpoint with minimal info"""
    return jsonify({
        'status': 'online',
        'service': 'Fantdev Trading Portal',
        'timestamp': datetime.now().isoformat()
    })

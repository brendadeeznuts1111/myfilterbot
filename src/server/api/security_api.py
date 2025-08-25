"""
Security API Endpoints
Provides REST API for security management and monitoring
"""

from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

from ..security.security_engine import get_security_engine, EventType, ThreatLevel, ActionType

logger = logging.getLogger(__name__)

# Create blueprint for security routes
security_bp = Blueprint('security', __name__, url_prefix='/api/security')

def get_admin_from_request():
    """Get admin authentication from request (simplified for demo)"""
    # In production, this would validate JWT tokens or session
    admin_id = request.headers.get('X-Admin-ID')
    if admin_id == 'admin':
        return {'admin_id': admin_id, 'permissions': ['security_read', 'security_write']}
    return None

@security_bp.route('/status', methods=['GET'])
@cross_origin()
def get_security_status():
    """Get overall security system status"""
    try:
        admin = get_admin_from_request()
        if not admin:
            return jsonify({'error': 'Unauthorized'}), 401
        
        engine = get_security_engine()
        status = engine.get_security_status()
        
        # Add additional metrics
        status.update({
            'system_health': 'healthy',
            'last_updated': datetime.now().isoformat(),
            'monitoring_active': engine.running,
            'rules_configured': len(engine.data_store.rules),
            'total_actions_today': len([
                action for action in engine.data_store.actions.values()
                if action.timestamp.date() == datetime.now().date()
            ])
        })
        
        return jsonify({
            'success': True,
            'status': status
        })
        
    except Exception as e:
        logger.error(f"Error getting security status: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@security_bp.route('/events', methods=['GET'])
@cross_origin()
def get_security_events():
    """Get recent security events with filtering"""
    try:
        admin = get_admin_from_request()
        if not admin:
            return jsonify({'error': 'Unauthorized'}), 401
        
        # Get query parameters
        limit = int(request.args.get('limit', 50))
        hours = int(request.args.get('hours', 24))
        event_type = request.args.get('type')
        customer_id = request.args.get('customer_id')
        ip_address = request.args.get('ip_address')
        severity = request.args.get('severity')
        
        engine = get_security_engine()
        
        # Get events from specified time range
        cutoff = datetime.now() - timedelta(hours=hours)
        events = []
        
        for event in engine.data_store.events.values():
            if event.timestamp < cutoff:
                continue
                
            # Apply filters
            if event_type and event.event_type.value != event_type:
                continue
            if customer_id and event.customer_id != customer_id:
                continue
            if ip_address and event.ip_address != ip_address:
                continue
            if severity and event.severity.value != severity:
                continue
                
            events.append({
                'event_id': event.event_id,
                'event_type': event.event_type.value,
                'customer_id': event.customer_id,
                'ip_address': event.ip_address,
                'user_agent': event.user_agent,
                'timestamp': event.timestamp.isoformat(),
                'severity': event.severity.value,
                'metadata': event.metadata,
                'processed': event.processed
            })
        
        # Sort by timestamp (newest first) and limit
        events.sort(key=lambda e: e['timestamp'], reverse=True)
        events = events[:limit]
        
        return jsonify({
            'success': True,
            'events': events,
            'total_count': len(events),
            'filters_applied': {
                'hours': hours,
                'type': event_type,
                'customer_id': customer_id,
                'ip_address': ip_address,
                'severity': severity
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting security events: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@security_bp.route('/actions', methods=['GET'])
@cross_origin()
def get_security_actions():
    """Get recent security actions taken"""
    try:
        admin = get_admin_from_request()
        if not admin:
            return jsonify({'error': 'Unauthorized'}), 401
        
        limit = int(request.args.get('limit', 50))
        hours = int(request.args.get('hours', 24))
        action_type = request.args.get('type')
        
        engine = get_security_engine()
        
        # Get actions from specified time range
        cutoff = datetime.now() - timedelta(hours=hours)
        actions = []
        
        for action in engine.data_store.actions.values():
            if action.timestamp < cutoff:
                continue
                
            if action_type and action.action_type.value != action_type:
                continue
                
            actions.append({
                'action_id': action.action_id,
                'action_type': action.action_type.value,
                'target': action.target,
                'reason': action.reason,
                'rule_id': action.rule_id,
                'timestamp': action.timestamp.isoformat(),
                'duration': action.duration,
                'metadata': action.metadata or {}
            })
        
        # Sort by timestamp (newest first) and limit
        actions.sort(key=lambda a: a['timestamp'], reverse=True)
        actions = actions[:limit]
        
        return jsonify({
            'success': True,
            'actions': actions,
            'total_count': len(actions)
        })
        
    except Exception as e:
        logger.error(f"Error getting security actions: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@security_bp.route('/rules', methods=['GET'])
@cross_origin()
def get_security_rules():
    """Get configured security rules"""
    try:
        admin = get_admin_from_request()
        if not admin:
            return jsonify({'error': 'Unauthorized'}), 401
        
        engine = get_security_engine()
        rules = []
        
        for rule in engine.data_store.rules.values():
            rules.append({
                'rule_id': rule.rule_id,
                'name': rule.name,
                'description': rule.description,
                'event_type': rule.event_type.value,
                'conditions': rule.conditions,
                'actions': [action.value for action in rule.actions],
                'enabled': rule.enabled,
                'priority': rule.priority,
                'cooldown_minutes': rule.cooldown_minutes
            })
        
        return jsonify({
            'success': True,
            'rules': rules,
            'total_count': len(rules)
        })
        
    except Exception as e:
        logger.error(f"Error getting security rules: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@security_bp.route('/rules/<rule_id>', methods=['PUT'])
@cross_origin()
def update_security_rule(rule_id):
    """Update a security rule configuration"""
    try:
        admin = get_admin_from_request()
        if not admin:
            return jsonify({'error': 'Unauthorized'}), 401
        
        data = request.get_json()
        engine = get_security_engine()
        
        if rule_id not in engine.data_store.rules:
            return jsonify({'error': 'Rule not found'}), 404
        
        rule = engine.data_store.rules[rule_id]
        
        # Update rule properties
        if 'enabled' in data:
            rule.enabled = bool(data['enabled'])
        if 'priority' in data:
            rule.priority = int(data['priority'])
        if 'cooldown_minutes' in data:
            rule.cooldown_minutes = int(data['cooldown_minutes'])
        if 'conditions' in data:
            rule.conditions.update(data['conditions'])
        
        logger.info(f"Security rule updated: {rule_id} by admin {admin['admin_id']}")
        
        return jsonify({
            'success': True,
            'message': f'Rule {rule_id} updated successfully',
            'rule': {
                'rule_id': rule.rule_id,
                'name': rule.name,
                'enabled': rule.enabled,
                'priority': rule.priority,
                'cooldown_minutes': rule.cooldown_minutes,
                'conditions': rule.conditions
            }
        })
        
    except Exception as e:
        logger.error(f"Error updating security rule: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@security_bp.route('/audit', methods=['GET'])
@cross_origin()
def get_audit_log():
    """Get security audit log"""
    try:
        admin = get_admin_from_request()
        if not admin:
            return jsonify({'error': 'Unauthorized'}), 401
        
        limit = int(request.args.get('limit', 100))
        
        engine = get_security_engine()
        audit_entries = engine.get_audit_log(limit)
        
        return jsonify({
            'success': True,
            'audit_log': audit_entries,
            'total_count': len(audit_entries)
        })
        
    except Exception as e:
        logger.error(f"Error getting audit log: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@security_bp.route('/block-ip', methods=['POST'])
@cross_origin()
def manual_block_ip():
    """Manually block an IP address"""
    try:
        admin = get_admin_from_request()
        if not admin:
            return jsonify({'error': 'Unauthorized'}), 401
        
        data = request.get_json()
        ip_address = data.get('ip_address')
        reason = data.get('reason', 'Manual admin block')
        duration_hours = int(data.get('duration_hours', 1))
        
        if not ip_address:
            return jsonify({'error': 'IP address required'}), 400
        
        engine = get_security_engine()
        
        # Create manual block action
        success = await engine._block_ip(ip_address, 'manual_admin_block')
        
        if success:
            # Log the manual action
            engine._log_audit_event(
                None, 
                None, 
                f"Manual IP block by admin {admin['admin_id']}: {ip_address} - {reason}"
            )
            
            return jsonify({
                'success': True,
                'message': f'IP {ip_address} blocked successfully',
                'duration_hours': duration_hours
            })
        else:
            return jsonify({'error': 'Failed to block IP'}), 500
        
    except Exception as e:
        logger.error(f"Error blocking IP: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@security_bp.route('/unblock-ip', methods=['POST'])
@cross_origin()
def manual_unblock_ip():
    """Manually unblock an IP address"""
    try:
        admin = get_admin_from_request()
        if not admin:
            return jsonify({'error': 'Unauthorized'}), 401
        
        data = request.get_json()
        ip_address = data.get('ip_address')
        
        if not ip_address:
            return jsonify({'error': 'IP address required'}), 400
        
        engine = get_security_engine()
        
        if ip_address in engine.data_store.blocked_ips:
            del engine.data_store.blocked_ips[ip_address]
            
            engine._log_audit_event(
                None, 
                None, 
                f"Manual IP unblock by admin {admin['admin_id']}: {ip_address}"
            )
            
            return jsonify({
                'success': True,
                'message': f'IP {ip_address} unblocked successfully'
            })
        else:
            return jsonify({'error': 'IP address not blocked'}), 404
        
    except Exception as e:
        logger.error(f"Error unblocking IP: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@security_bp.route('/freeze-account', methods=['POST'])
@cross_origin()
def manual_freeze_account():
    """Manually freeze a customer account"""
    try:
        admin = get_admin_from_request()
        if not admin:
            return jsonify({'error': 'Unauthorized'}), 401
        
        data = request.get_json()
        customer_id = data.get('customer_id')
        reason = data.get('reason', 'Manual admin freeze')
        
        if not customer_id:
            return jsonify({'error': 'Customer ID required'}), 400
        
        engine = get_security_engine()
        
        success = await engine._freeze_account(customer_id, 'manual_admin_freeze')
        
        if success:
            engine._log_audit_event(
                None, 
                None, 
                f"Manual account freeze by admin {admin['admin_id']}: {customer_id} - {reason}"
            )
            
            return jsonify({
                'success': True,
                'message': f'Account {customer_id} frozen successfully'
            })
        else:
            return jsonify({'error': 'Failed to freeze account'}), 500
        
    except Exception as e:
        logger.error(f"Error freezing account: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@security_bp.route('/unfreeze-account', methods=['POST'])
@cross_origin()
def manual_unfreeze_account():
    """Manually unfreeze a customer account"""
    try:
        admin = get_admin_from_request()
        if not admin:
            return jsonify({'error': 'Unauthorized'}), 401
        
        data = request.get_json()
        customer_id = data.get('customer_id')
        
        if not customer_id:
            return jsonify({'error': 'Customer ID required'}), 400
        
        engine = get_security_engine()
        
        if customer_id in engine.data_store.frozen_accounts:
            del engine.data_store.frozen_accounts[customer_id]
            
            engine._log_audit_event(
                None, 
                None, 
                f"Manual account unfreeze by admin {admin['admin_id']}: {customer_id}"
            )
            
            return jsonify({
                'success': True,
                'message': f'Account {customer_id} unfrozen successfully'
            })
        else:
            return jsonify({'error': 'Account not frozen'}), 404
        
    except Exception as e:
        logger.error(f"Error unfreezing account: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@security_bp.route('/simulate-event', methods=['POST'])
@cross_origin()
def simulate_security_event():
    """Simulate a security event for testing (dev/staging only)"""
    try:
        # Only allow in development mode
        if request.headers.get('X-Environment') != 'development':
            return jsonify({'error': 'Not available in production'}), 403
        
        admin = get_admin_from_request()
        if not admin:
            return jsonify({'error': 'Unauthorized'}), 401
        
        data = request.get_json()
        event_type = data.get('event_type', 'failed_login')
        customer_id = data.get('customer_id')
        ip_address = data.get('ip_address', '192.168.1.100')
        metadata = data.get('metadata', {})
        
        engine = get_security_engine()
        
        # Create simulated event
        event_data = {
            'event_type': event_type,
            'customer_id': customer_id,
            'ip': ip_address,
            'user_agent': 'Test-Simulation/1.0',
            'metadata': metadata,
            'severity': 'medium'
        }
        
        actions = await engine.process_event(event_data)
        
        return jsonify({
            'success': True,
            'message': 'Security event simulated',
            'event_type': event_type,
            'actions_triggered': len(actions) if actions else 0,
            'actions': [
                {
                    'action_type': action.action_type.value,
                    'target': action.target,
                    'reason': action.reason
                } for action in actions
            ] if actions else []
        })
        
    except Exception as e:
        logger.error(f"Error simulating security event: {e}")
        return jsonify({'error': 'Internal server error'}), 500

def register_security_api(app):
    """Register security API blueprint with Flask app"""
    app.register_blueprint(security_bp)
    logger.info("🛡️ Security API endpoints registered")
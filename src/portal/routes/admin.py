from flask import Blueprint, jsonify, request, make_response
from datetime import datetime, timedelta
import logging

from src.portal.db.repositories import db
from src.portal.utils.config_utils import load_customer_config_file # Import the utility function

admin_bp = Blueprint('admin', __name__)
logger = logging.getLogger(__name__)

@admin_bp.route('/api/reports')
def get_reports():
    """Get analytics and reports data"""
    try:
        customers = db.get_all_customers()

        # Calculate metrics
        total_customers = len(customers)
        active_customers = sum(1 for c in customers if c.active)
        total_balance = sum(c.balance for c in customers)
        avg_balance = total_balance / total_customers if total_customers > 0 else 0

        # Calculate weekly P&L
        weekly_pnl = sum(c.weekly_pnl for c in customers if c.weekly_pnl)

        # Mock transaction data (would come from actual transaction logs)
        deposits = 75200
        withdrawals = 42800
        deposit_count = 47
        withdrawal_count = 23

        # Top performers
        top_performers = []
        for customer in sorted(customers, key=lambda c: c.weekly_pnl or 0, reverse=True)[:3]:
            if customer.weekly_pnl and customer.weekly_pnl > 0:
                top_performers.append({
                    'id': customer.customer_id,
                    'pnl': customer.weekly_pnl,
                    'trades': 12  # Mock data
                })

        # Risk indicators
        large_positions = sum(1 for c in customers if c.balance > 10000)
        inactive_accounts = sum(1 for c in customers if not c.active)

        return jsonify({
            'totalVolume': 125340,
            'activeTraders': active_customers,
            'weeklyPnL': int(weekly_pnl),
            'riskScore': 3.2,
            'customerMetrics': {
                'total': total_customers,
                'active': active_customers,
                'new': 3,  # Mock data - would track registrations
                'avgBalance': int(avg_balance)
            },
            'transactions': {
                'deposits': deposits,
                'withdrawals': withdrawals,
                'netFlow': deposits - withdrawals,
                'depositCount': deposit_count,
                'withdrawalCount': withdrawal_count
            },
            'topPerformers': top_performers,
            'risk': {
                'largePositions': large_positions,
                'withdrawalSpike': 'Normal',
                'inactiveAccounts': inactive_accounts
            }
        })

    except Exception as e:
        logger.error(f"Error generating reports: {e}")
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/api/verify', methods=['POST'])
def process_verification():
    """Process approval/denial of security verifications"""
    try:
        data = request.json
        token = data.get('token')
        action = data.get('action')  # 'approve' or 'deny'
        admin_id = data.get('admin_id', 'Admin')
        user_id = data.get('user_id')

        # Log the verification action
        logger.info(f"Verification {action} for token {token} by {admin_id}")

        # Here you would integrate with the Telegram bot to send the actual command
        # For now, we'll simulate the processing

        # Update audit log (in production, this would be a database)
        audit_entry = {
            'timestamp': datetime.now().isoformat(),
            'action': f"Verification {action}d",
            'token': token,
            'user_id': user_id,
            'admin': admin_id,
            'status': 'success'
        }

        return jsonify({
            'success': True,
            'message': f'Verification {action}d successfully',
            'audit_entry': audit_entry
        })

    except Exception as e:
        logger.error(f"Verification error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@admin_bp.route('/api/verifications/pending')
def get_pending_verifications():
    """Get all pending verifications"""
    try:
        # In production, this would query a database
        # For now, return mock data
        pending = [
            {
                'token': 'tok_' + datetime.now().strftime('%Y%m%d%H%M%S') + '_1',
                'user_id': '123456789',
                'username': '@john_doe',
                'customer_id': 'BB1045',
                'issue_type': 'Duplicate password',
                'timestamp': (datetime.now() - timedelta(minutes=5)).isoformat(),
                'priority': 'high'
            },
            {
                'token': 'tok_' + datetime.now().strftime('%Y%m%d%H%M%S') + '_2',
                'user_id': '987654321',
                'username': '@sarah_m',
                'customer_id': 'CC2056',
                'issue_type': 'Password reset',
                'timestamp': (datetime.now() - timedelta(minutes=12)).isoformat(),
                'priority': 'medium'
            }
        ]

        return jsonify({
            'success': True,
            'verifications': pending,
            'count': len(pending)
        })

    except Exception as e:
        logger.error(f"Error fetching pending verifications: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@admin_bp.route('/api/audit-log')
def get_audit_log():
    """Get audit log entries"""
    try:
        # In production, this would query an audit database
        # For now, return mock data
        entries = [
            {
                'timestamp': (datetime.now() - timedelta(hours=1)).isoformat(),
                'action': 'Registration Approved',
                'user': '@john_doe',
                'admin': 'Admin',
                'status': 'success'
            },
            {
                'timestamp': (datetime.now() - timedelta(hours=2)).isoformat(),
                'action': 'Password Reset Denied',
                'user': '@sarah_m',
                'admin': 'Admin',
                'status': 'denied'
            },
            {
                'timestamp': (datetime.now() - timedelta(hours=3)).isoformat(),
                'action': 'Registration Approved',
                'user': '@michael_j',
                'admin': 'Admin',
                'status': 'success'
            }
        ]

        return jsonify({
            'success': True,
            'entries': entries,
            'total': len(entries)
        })

    except Exception as e:
        logger.error(f"Error fetching audit log: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@admin_bp.route('/api/security-stats')
def get_security_stats():
    """Get real-time security statistics"""
    try:
        # Calculate current stats
        stats = {
            'pending_verifications': 4,
            'processed_today': 27,
            'avg_response_time': 43,  # seconds
            'system_status': 'online',
            'total_users': 342,
            'security_score': 94,  # percentage
            'failed_attempts': 12,
            'blocked_ips': 3
        }

        return jsonify({
            'success': True,
            'stats': stats,
            'timestamp': datetime.now().isoformat()
        })

    except Exception as e:
        logger.error(f"Error fetching security stats: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@admin_bp.route('/api/fire22/agents', methods=['GET'])
def get_agents_list():
    """Fire22 Manager API - Get list of agents by agent"""
    try:
        # Extract Fire22 parameters
        agent_id = request.args.get('agentID', '')
        agent_type = request.args.get('agentType', 'M')
        token = request.args.get('token', '')
        operation = request.args.get('operation', 'getListAgenstByAgent')
        agent_owner = request.args.get('agentOwner', '')

        # Log the Fire22 API call
        logger.info(f"Fire22 API call - AgentID: {agent_id}, Operation: {operation}, Owner: {agent_owner}")

        # Load customer config and database stats for real data
        customer_config = load_customer_config_file()
        customers = db.get_all_customers()
        stats = db.get_statistics()

        # Get configured customers only if config exists
        config_customers = []
        if customer_config and 'customers' in customer_config:
            config_customer_ids = set(customer_config['customers'].keys())
            config_customers = [c for c in customers if c.customer_id in config_customer_ids]

        # Use config customers if available, otherwise all customers
        active_customers = config_customers if config_customers else customers
        total_balance = sum(c.balance for c in active_customers)
        active_count = sum(1 for c in active_customers if c.active)

        # Build agents response from enhanced config
        agents_list = []
        if customer_config and 'agents' in customer_config:
            # Use enhanced agent configuration
            for agent_id_key, agent_data in customer_config['agents'].items():
                # Get assigned customers for this agent
                assigned = [c for c in active_customers if c.customer_id in agent_data.get('assigned_customers', [])]
                agent_balance = sum(c.balance for c in assigned)
                agent_active = sum(1 for c in assigned if c.active)

                agents_list.append({
                    'agentID': agent_data['agent_id'],
                    'agentType': agent_data['agent_type'],
                    'agentName': agent_data['agent_name'],
                    'status': agent_data['status'],
                    'email': agent_data.get('email', ''),
                    'phone': agent_data.get('phone', ''),
                    'timezone': agent_data.get('timezone', 'UTC'),
                    'commission': agent_data.get('commission', {}).get('rate', 0),
                    'commissionType': agent_data.get('commission', {}).get('type', 'percentage'),
                    'balance': agent_balance,
                    'totalCustomers': len(assigned),
                    'activeCustomers': agent_active,
                    'lastActivity': agent_data.get('last_login', datetime.now().isoformat()),
                    'permissions': list(k for k, v in agent_data.get('permissions', {}).items() if v),
                    'territory': agent_data.get('territory', {}),
                    'performanceTargets': agent_data.get('performance_targets', {}),
                    'site': 1,
                    'region': agent_data.get('territory', {}).get('regions', ['US'])[0],
                    'subAgents': agent_data.get('sub_agents', []),
                    'parentAgent': agent_data.get('parent_agent'),
                    'assignedCustomers': agent_data.get('assigned_customers', []),
                    'accessSchedule': agent_data.get('access_schedule', {}),
                    'createdAt': agent_data.get('created_at'),
                    'configurationSource': 'enhanced'
                })
        else:
            # Fallback to basic agent structure
            agents_list = [
                {
                    'agentID': 'BLAKEPPH',
                    'agentType': 'M',
                    'agentName': 'Blake Manager',
                    'status': 'active',
                    'commission': 15.5,
                    'balance': round(total_balance * 0.75, 2),
                    'totalCustomers': len(active_customers),
                    'activeCustomers': active_count,
                    'lastActivity': (datetime.now() - timedelta(minutes=5)).isoformat(),
                    'permissions': ['view_reports', 'manage_customers', 'process_payments'],
                    'site': 1,
                    'region': 'US',
                    'subAgents': ['3NOLAPPH'],
                    'configurationSource': 'basic'
                }
            ]

        # Fire22 response with enhanced agent data
        agents_response = {
            'success': True,
            'operation': operation,
            'agentID': agent_id,
            'agentType': agent_type,
            'timestamp': datetime.now().isoformat(),
            'configVersion': customer_config.get('version', '1.0') if customer_config else '1.0',
            'platform': customer_config.get('platform', {}) if customer_config else {},
            'agents': agents_list,
            'summary': {
                'totalAgents': len(agents_list),
                'activeAgents': sum(1 for a in agents_list if a['status'] == 'active'),
                'totalBalance': total_balance,
                'totalCustomers': len(active_customers),
                'totalCommission': sum(a.get('commission', 0) for a in agents_list),
                'configIntegration': {
                    'enabled': customer_config is not None,
                    'version': customer_config.get('version', '1.0') if customer_config else '1.0',
                    'configuredCustomers': len(config_customers) if config_customers else 0,
                    'groupChats': len(customer_config.get('group_chats', {})) if customer_config else 0,
                    'enhancedFeatures': customer_config.get('version', '1.0') == '2.0' if customer_config else False,
                    'businessIntelligence': 'business_intelligence' in customer_config if customer_config else False,
                    'securityFeatures': 'security' in customer_config if customer_config else False
                }
            }
        }

        # Add CORS headers for Fire22 integration
        response = make_response(jsonify(agents_response))
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'

        return response

    except Exception as e:
        logger.error(f"Error in Fire22 agents API: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'operation': operation,
            'timestamp': datetime.now().isoformat()
        }), 500

@admin_bp.route('/api/fire22/dashboard-data', methods=['GET'])
def get_fire22_dashboard_data():
    """Fire22 Manager API - Get dashboard data integrated with customer_config.json"""
    try:
        agent_id = request.args.get('agentID', '')

        # Load customer config for branding and settings
        customer_config = load_customer_config_file()

        # Get actual customer data from our database
        customers = db.get_all_customers()
        stats = db.get_statistics()

        # Filter customers based on customer_config.json if available
        config_customers = []
        if customer_config and 'customers' in customer_config:
            config_customer_ids = set(customer_config['customers'].keys())
            config_customers = [c for c in customers if c.customer_id in config_customer_ids]

            # If we have config customers, use those; otherwise use all customers
            if config_customers:
                customers = config_customers

        # Enhanced customer data with config integration
        enhanced_customers = []
        for c in customers[:20]:  # Last 20 customers
            customer_data = {
                'customerID': c.customer_id,
                'balance': c.balance,
                'weeklyPnL': c.weekly_pnl or 0,
                'active': c.active,
                'lastActivity': c.last_activity or datetime.now().isoformat(),
                'registrationStatus': 'registered' if c.telegram_id else 'pending'
            }

            # Add config data if available
            if customer_config and c.customer_id in customer_config.get('customers', {}):
                config_data = customer_config['customers'][c.customer_id]
                customer_data.update({
                    'telegram_username': config_data.get('telegram_username', ''),
                    'keywords': config_data.get('keywords', []),
                    'group_chat_id': config_data.get('group_chat_id'),
                    'config_active': config_data.get('active', True)
                })

            enhanced_customers.append(customer_data)

        # Format for Fire22 manager dashboard
        dashboard_data = {
            'success': True,
            'agentID': agent_id,
            'timestamp': datetime.now().isoformat(),
            'config': {
                'platform_name': 'Fantdev Trading',
                'group_chats': customer_config.get('group_chats', {}) if customer_config else {},
                'global_keywords': customer_config.get('global_keywords', []) if customer_config else [],
                'total_config_customers': len(customer_config.get('customers', {})) if customer_config else 0
            },
            'stats': {
                'totalCustomers': len(customers),
                'activeCustomers': stats.get('active_customers', 0),
                'totalBalance': stats.get('total_balance', 0),
                'totalRevenue': round(stats.get('total_balance', 0) * 0.15, 2),  # 15% commission estimate
                'totalTransactions': sum(1 for c in customers if c.weekly_pnl != 0),
                'averageBalance': stats.get('total_balance', 0) / max(len(customers), 1),
                'configuredCustomers': len([c for c in customers if customer_config and c.customer_id in customer_config.get('customers', {})])
            },
            'recentCustomers': enhanced_customers,
            'topPerformers': [
                {
                    'customerID': c.customer_id,
                    'weeklyPnL': c.weekly_pnl or 0,
                    'balance': c.balance,
                    'hasConfig': customer_config and c.customer_id in customer_config.get('customers', {})
                }
                for c in sorted(customers, key=lambda x: x.weekly_pnl or 0, reverse=True)[:10]
            ],
            'groupChats': [
                {
                    'name': chat_data['name'],
                    'chat_id': chat_data['chat_id'],
                    'monitor': chat_data.get('monitor', False)
                }
                for chat_key, chat_data in customer_config.get('group_chats', {}).items()
            ] if customer_config else [],
            'alerts': [
                {
                    'type': 'info',
                    'message': f'System operational - {len(customers)} customers managed',
                    'timestamp': datetime.now().isoformat()
                },
                {
                    'type': 'success',
                    'message': f'Config integration active - {len(customer_config.get("customers", {}))} configured customers',
                    'timestamp': datetime.now().isoformat()
                } if customer_config else {
                    'type': 'warning',
                    'message': 'Customer config not loaded - using database only',
                    'timestamp': datetime.now().isoformat()
                }
            ]
        }

        return jsonify(dashboard_data)

    except Exception as e:
        logger.error(f"Error getting Fire22 dashboard data: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@admin_bp.route('/api/export/<format_type>')
def export_reports(format_type):
    """Export reports in different formats"""
    try:
        customers = db.get_all_customers()

        if format_type == 'csv':
            # Generate CSV content
            csv_content = "Customer ID,Balance,Weekly P&L,Active,Phone,Last Activity\n"
            for customer in customers:
                csv_content += f"{customer.customer_id},{customer.balance},{customer.weekly_pnl or 0},{customer.active},{customer.phone or ''},{customer.last_activity or ''}\n"

            response = make_response(csv_content)
            response.headers['Content-Type'] = 'text/csv'
            response.headers['Content-Disposition'] = f'attachment; filename=customers_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
            return response

        elif format_type == 'json':
            # Generate JSON report
            report_data = {
                'generated_at': datetime.now().isoformat(),
                'total_customers': len(customers),
                'active_customers': sum(1 for c in customers if c.active),
                'total_balance': sum(c.balance for c in customers),
                'customers': [
                    {
                        'customer_id': c.customer_id,
                        'balance': c.balance,
                        'weekly_pnl': c.weekly_pnl or 0,
                        'active': c.active,
                        'phone': c.phone,
                        'last_activity': c.last_activity
                    } for c in customers
                ]
            }

            response = make_response(json.dumps(report_data, indent=2))
            response.headers['Content-Type'] = 'application/json'
            response.headers['Content-Disposition'] = f'attachment; filename=customers_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
            return response

        else:
            return jsonify({'error': 'Unsupported format. Use csv or json'}), 400

    except Exception as e:
        logger.error(f"Error exporting reports: {e}")
        return jsonify({'error': str(e)}), 500

from flask import Blueprint, jsonify, request
from datetime import datetime
import logging

from src.portal.db.repositories import db
from src.portal.db.models import GroupMember

members_bp = Blueprint('members', __name__)
logger = logging.getLogger(__name__)

@members_bp.route('/api/members')
def get_members():
    """Get all group members with their permissions"""
    try:
        members = db.get_group_members()
        member_stats = db.get_member_stats()

        formatted_members = []
        for member in members:
            formatted_members.append({
                'member_id': member.member_id,
                'telegram_id': member.telegram_id,
                'username': member.username,
                'group_id': member.group_id,
                'group_name': member.group_name,
                'join_date': member.join_date,
                'status': member.status,
                'permissions': member.permissions,
                'customer_id': member.customer_id
            })

        return jsonify({
            'members': formatted_members,
            'stats': member_stats
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@members_bp.route('/api/members/pending')
def get_pending_members():
    """Get pending members awaiting approval"""
    try:
        pending = db.get_pending_members()

        formatted = []
        for member in pending:
            formatted.append({
                'member_id': member.member_id,
                'telegram_id': member.telegram_id,
                'username': member.username,
                'group_id': member.group_id,
                'group_name': member.group_name,
                'join_date': member.join_date,
                'requested_permissions': member.permissions
            })

        return jsonify({
            'pending': formatted,
            'count': len(formatted)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@members_bp.route('/api/members/approve', methods=['POST'])
def approve_member():
    """Approve a member with permissions"""
    try:
        data = request.json
        group_id = data.get('group_id')
        telegram_id = data.get('telegram_id')
        permissions = data.get('permissions', {})

        success = db.approve_member(group_id, telegram_id, permissions)

        if success:
            return jsonify({
                'success': True,
                'message': 'Member approved successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to approve member'
            }), 400

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@members_bp.route('/api/members/deny', methods=['POST'])
def deny_member():
    """Deny a member"""
    try:
        data = request.json
        group_id = data.get('group_id')
        telegram_id = data.get('telegram_id')
        reason = data.get('reason', '')

        success = db.deny_member(group_id, telegram_id, reason)

        if success:
            return jsonify({
                'success': True,
                'message': 'Member denied'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to deny member'
            }), 400

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@members_bp.route('/api/members/update', methods=['POST'])
def update_member_permissions():
    """Update member permissions"""
    try:
        data = request.json
        group_id = data.get('group_id')
        telegram_id = data.get('telegram_id')
        permissions = data.get('permissions')

        success = db.update_member_permissions(group_id, telegram_id, permissions)

        if success:
            return jsonify({
                'success': True,
                'message': 'Permissions updated'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to update permissions'
            }), 400

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@members_bp.route('/api/members/add', methods=['POST'])
def add_member():
    """Add a new member (simulated for testing)"""
    try:
        data = request.json

        member = GroupMember(
            member_id=f"M{datetime.now().strftime('%Y%m%d%H%M%S')}",
            telegram_id=data.get('telegram_id'),
            username=data.get('username'),
            group_id=data.get('group_id'),
            group_name=data.get('group_name'),
            join_date=datetime.now().isoformat(),
            status='pending'
        )

        success = db.add_member(member)

        if success:
            return jsonify({
                'success': True,
                'member_id': member.member_id,
                'message': 'Member added to pending'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to add member'
            }), 400

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

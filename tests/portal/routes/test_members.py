import pytest
from flask import Flask
from src.portal.routes.members import members_bp
from unittest.mock import MagicMock, patch
import json
from datetime import datetime

@pytest.fixture
def app():
    app = Flask(__name__)
    app.register_blueprint(members_bp)
    return app

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def mock_db():
    with patch('src.portal.routes.members.db') as mock_db:
        yield mock_db

def test_get_members_success(client, mock_db):
    mock_member1 = MagicMock()
    mock_member1.member_id = "M1"
    mock_member1.telegram_id = "T1"
    mock_member1.username = "user1"
    mock_member1.group_id = "G1"
    mock_member1.group_name = "Group A"
    mock_member1.join_date = "2023-01-01"
    mock_member1.status = "active"
    mock_member1.permissions = {"can_view": True}
    mock_member1.customer_id = "CUST1"

    mock_member2 = MagicMock()
    mock_member2.member_id = "M2"
    mock_member2.telegram_id = "T2"
    mock_member2.username = "user2"
    mock_member2.group_id = "G2"
    mock_member2.group_name = "Group B"
    mock_member2.join_date = "2023-01-02"
    mock_member2.status = "pending"
    mock_member2.permissions = {"can_post": False}
    mock_member2.customer_id = "CUST2"

    mock_db.get_group_members.return_value = [mock_member1, mock_member2]
    mock_db.get_member_stats.return_value = {"total_members": 2, "active_members": 1}

    response = client.get('/api/members')
    assert response.status_code == 200
    data = json.loads(response.data)

    assert len(data['members']) == 2
    assert data['members'][0]['member_id'] == "M1"
    assert data['stats']['total_members'] == 2
    mock_db.get_group_members.assert_called_once()
    mock_db.get_member_stats.assert_called_once()

def test_get_pending_members_success(client, mock_db):
    mock_pending_member = MagicMock()
    mock_pending_member.member_id = "P1"
    mock_pending_member.telegram_id = "PT1"
    mock_pending_member.username = "pending_user"
    mock_pending_member.group_id = "PG1"
    mock_pending_member.group_name = "Pending Group"
    mock_pending_member.join_date = "2023-01-03"
    mock_pending_member.permissions = {"can_approve": True}

    mock_db.get_pending_members.return_value = [mock_pending_member]

    response = client.get('/api/members/pending')
    assert response.status_code == 200
    data = json.loads(response.data)

    assert data['count'] == 1
    assert data['pending'][0]['member_id'] == "P1"
    mock_db.get_pending_members.assert_called_once()

def test_approve_member_success(client, mock_db):
    mock_db.approve_member.return_value = True
    response = client.post('/api/members/approve', json={
        "group_id": "G1",
        "telegram_id": "T1",
        "permissions": {"can_view": True}
    })
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] == True
    mock_db.approve_member.assert_called_with("G1", "T1", {"can_view": True})

def test_approve_member_failure(client, mock_db):
    mock_db.approve_member.return_value = False
    response = client.post('/api/members/approve', json={
        "group_id": "G1",
        "telegram_id": "T1",
        "permissions": {"can_view": True}
    })
    assert response.status_code == 400
    data = json.loads(response.data)
    assert data['success'] == False

def test_deny_member_success(client, mock_db):
    mock_db.deny_member.return_value = True
    response = client.post('/api/members/deny', json={
        "group_id": "G1",
        "telegram_id": "T1",
        "reason": "Spam"
    })
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] == True
    mock_db.deny_member.assert_called_with("G1", "T1", "Spam")

def test_update_member_permissions_success(client, mock_db):
    mock_db.update_member_permissions.return_value = True
    response = client.post('/api/members/update', json={
        "group_id": "G1",
        "telegram_id": "T1",
        "permissions": {"can_edit": True}
    })
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] == True
    mock_db.update_member_permissions.assert_called_with("G1", "T1", {"can_edit": True})

def test_add_member_success(client, mock_db):
    mock_db.add_member.return_value = True
    response = client.post('/api/members/add', json={
        "telegram_id": "NEW_TELE",
        "username": "new_user",
        "group_id": "NEW_GROUP",
        "group_name": "New Group Name"
    })
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] == True
    mock_db.add_member.assert_called_once()
    # Further assertions could check the arguments passed to add_member if needed

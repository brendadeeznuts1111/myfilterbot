import pytest
from unittest.mock import MagicMock, patch
import sys
import os

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

from src.portal.db.repositories import (
    CustomerRepository, GroupRepository, StatisticsRepository,
    TransactionRepository, GroupMemberRepository, DatabaseCache, db
)
from src.portal.db.models import Customer, Transaction, GroupMember, GroupChat
from datetime import datetime, timedelta

# Mock the connection module
@pytest.fixture(autouse=True)
def mock_connection():
    with patch('src.portal.db.connection.get_db_connection') as mock_get_conn:
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_get_conn.return_value = mock_conn
        yield mock_conn, mock_cursor

# Fixture for DatabaseCache
@pytest.fixture
def db_cache():
    return DatabaseCache()

# Fixture for CustomerRepository
@pytest.fixture
def customer_repo(mock_connection, db_cache):
    mock_conn, mock_cursor = mock_connection
    return CustomerRepository(mock_conn, db_cache)

# Fixture for GroupRepository
@pytest.fixture
def group_repo(mock_connection, db_cache):
    mock_conn, mock_cursor = mock_connection
    return GroupRepository(mock_conn, db_cache)

# Fixture for StatisticsRepository
@pytest.fixture
def stats_repo(mock_connection, db_cache):
    mock_conn, mock_cursor = mock_connection
    return StatisticsRepository(mock_conn, db_cache)

# Fixture for TransactionRepository
@pytest.fixture
def transaction_repo(mock_connection, db_cache):
    mock_conn, mock_cursor = mock_connection
    return TransactionRepository(mock_conn, db_cache)

# Fixture for GroupMemberRepository
@pytest.fixture
def group_member_repo(mock_connection, db_cache):
    mock_conn, mock_cursor = mock_connection
    return GroupMemberRepository(mock_conn, db_cache)

# Test cases for DatabaseCache
def test_database_cache_set_get(db_cache):
    key = "test_key"
    value = {"data": "test_value"}
    db_cache.set(key, value)
    assert db_cache.get(key) == value

def test_database_cache_get_nonexistent(db_cache):
    assert db_cache.get("nonexistent_key") is None

def test_database_cache_invalidate(db_cache):
    key = "test_key"
    value = {"data": "test_value"}
    db_cache.set(key, value)
    db_cache.invalidate(key)
    assert db_cache.get(key) is None

def test_database_cache_invalidate_all(db_cache):
    db_cache.set("key1", "value1")
    db_cache.set("key2", "value2")
    db_cache.invalidate_all()
    assert db_cache.get("key1") is None
    assert db_cache.get("key2") is None

# Test cases for CustomerRepository
def test_customer_repository_get_customer(customer_repo, mock_cursor):
    mock_cursor.fetchone.return_value = ('CUST1', 1000.0, 50.0, 1, None, None, '2023-01-01T10:00:00')
    customer = customer_repo.get_customer('CUST1')
    assert customer.customer_id == 'CUST1'
    assert customer.balance == 1000.0
    mock_cursor.execute.assert_called_with("SELECT * FROM customers WHERE customer_id = ?", ('CUST1',))

def test_customer_repository_get_customer_not_found(customer_repo, mock_cursor):
    mock_cursor.fetchone.return_value = None
    customer = customer_repo.get_customer('NONEXISTENT')
    assert customer is None

def test_customer_repository_get_all_customers(customer_repo, mock_cursor):
    mock_cursor.fetchall.return_value = [
        ('CUST1', 1000.0, 50.0, 1, None, None, '2023-01-01T10:00:00'),
        ('CUST2', 2000.0, 100.0, 0, None, None, '2023-01-02T11:00:00')
    ]
    customers = customer_repo.get_all_customers()
    assert len(customers) == 2
    assert customers[0].customer_id == 'CUST1'
    mock_cursor.execute.assert_called_with("SELECT * FROM customers")

def test_customer_repository_add_customer(customer_repo, mock_connection):
    mock_conn, mock_cursor = mock_connection
    customer = Customer('NEWCUST', 500.0, 0.0, 1, None, None, datetime.now().isoformat())
    customer_repo.add_customer(customer)
    mock_cursor.execute.assert_called_once()
    mock_conn.commit.assert_called_once()

def test_customer_repository_update_customer(customer_repo, mock_connection):
    mock_conn, mock_cursor = mock_connection
    customer = Customer('CUST1', 1100.0, 60.0, 1, None, None, datetime.now().isoformat())
    customer_repo.update_customer(customer)
    mock_cursor.execute.assert_called_once()
    mock_conn.commit.assert_called_once()

# Test cases for GroupRepository
def test_group_repository_get_group_chat(group_repo, mock_cursor):
    mock_cursor.fetchone.return_value = ('GROUP1', 'Test Group', 'active', '2023-01-01T10:00:00')
    group_chat = group_repo.get_group_chat('GROUP1')
    assert group_chat.group_id == 'GROUP1'
    mock_cursor.execute.assert_called_with("SELECT * FROM group_chats WHERE group_id = ?", ('GROUP1',))

def test_group_repository_get_all_group_chats(group_repo, mock_cursor):
    mock_cursor.fetchall.return_value = [
        ('GROUP1', 'Test Group 1', 'active', '2023-01-01T10:00:00'),
        ('GROUP2', 'Test Group 2', 'inactive', '2023-01-02T11:00:00')
    ]
    group_chats = group_repo.get_all_group_chats()
    assert len(group_chats) == 2
    assert group_chats[0].group_id == 'GROUP1'

# Test cases for StatisticsRepository
def test_statistics_repository_get_statistics(stats_repo, mock_cursor):
    mock_cursor.fetchone.side_effect = [
        (10,), # total_customers
        (5,),  # active_customers
        (15000.0,), # total_balance
        (250.0,), # total_weekly_pnl
        (8,) # registered_users
    ]
    stats = stats_repo.get_statistics()
    assert stats['total_customers'] == 10
    assert stats['active_customers'] == 5
    assert stats['total_balance'] == 15000.0

def test_statistics_repository_get_top_performers(stats_repo, mock_cursor):
    mock_cursor.fetchall.return_value = [
        ('CUST1', 1000.0, 500.0, 1, None, None, '2023-01-01T10:00:00'),
        ('CUST2', 500.0, 200.0, 1, None, None, '2023-01-02T11:00:00')
    ]
    performers = stats_repo.get_top_performers(2)
    assert len(performers) == 2
    assert performers[0].customer_id == 'CUST1'

# Test cases for TransactionRepository
def test_transaction_repository_get_customer_transactions(transaction_repo, mock_cursor):
    mock_cursor.fetchall.return_value = [
        ('TX1', 'CUST1', 'deposit', 100.0, 'Message1', 'User1', 'completed', '2023-01-01T10:00:00'),
        ('TX2', 'CUST1', 'withdrawal', 50.0, 'Message2', 'User2', 'completed', '2023-01-01T11:00:00')
    ]
    transactions = transaction_repo.get_customer_transactions('CUST1')
    assert len(transactions) == 2
    assert transactions[0].transaction_id == 'TX1'
    mock_cursor.execute.assert_called_with(
        "SELECT * FROM transactions WHERE customer_id = ? ORDER BY timestamp DESC LIMIT ?",
        ('CUST1', 100)
    )

def test_transaction_repository_add_transaction(transaction_repo, mock_connection):
    mock_conn, mock_cursor = mock_connection
    transaction = Transaction('NEWTX', 'CUST1', 'deposit', 200.0, 'New deposit', 'User3', 'pending', datetime.now().isoformat())
    transaction_repo.add_transaction(transaction)
    mock_cursor.execute.assert_called_once()
    mock_conn.commit.assert_called_once()

# Test cases for GroupMemberRepository
def test_group_member_repository_get_group_member(group_member_repo, mock_cursor):
    mock_cursor.fetchone.return_value = ('MEM1', 'TELE1', 'user1', 'GROUP1', 'Group A', '2023-01-01', 'active', '{}', 'CUST1')
    member = group_member_repo.get_group_member('MEM1')
    assert member.member_id == 'MEM1'
    assert member.username == 'user1'

def test_group_member_repository_get_all_group_members(group_member_repo, mock_cursor):
    mock_cursor.fetchall.return_value = [
        ('MEM1', 'TELE1', 'user1', 'GROUP1', 'Group A', '2023-01-01', 'active', '{}', 'CUST1'),
        ('MEM2', 'TELE2', 'user2', 'GROUP2', 'Group B', '2023-01-02', 'pending', '{}', 'CUST2')
    ]
    members = group_member_repo.get_all_group_members()
    assert len(members) == 2
    assert members[0].member_id == 'MEM1'

def test_group_member_repository_add_member(group_member_repo, mock_connection):
    mock_conn, mock_cursor = mock_connection
    member = GroupMember('NEW_MEM', 'NEW_TELE', 'newuser', 'NEW_GROUP', 'New Group', datetime.now().isoformat(), 'pending', '{}', 'NEW_CUST')
    group_member_repo.add_member(member)
    mock_cursor.execute.assert_called_once()
    mock_conn.commit.assert_called_once()

def test_group_member_repository_approve_member(group_member_repo, mock_connection):
    mock_conn, mock_cursor = mock_connection
    group_member_repo.approve_member('GROUP1', 'TELE1', {'can_post': True})
    mock_cursor.execute.assert_called_once()
    mock_conn.commit.assert_called_once()

def test_group_member_repository_deny_member(group_member_repo, mock_connection):
    mock_conn, mock_cursor = mock_connection
    group_member_repo.deny_member('GROUP1', 'TELE1', 'reason')
    mock_cursor.execute.assert_called_once()
    mock_conn.commit.assert_called_once()

def test_group_member_repository_update_member_permissions(group_member_repo, mock_connection):
    mock_conn, mock_cursor = mock_connection
    group_member_repo.update_member_permissions('GROUP1', 'TELE1', {'can_edit': True})
    mock_cursor.execute.assert_called_once()
    mock_conn.commit.assert_called_once()

def test_group_member_repository_get_pending_members(group_member_repo, mock_cursor):
    mock_cursor.fetchall.return_value = [
        ('MEM2', 'TELE2', 'user2', 'GROUP2', 'Group B', '2023-01-02', 'pending', '{}', 'CUST2')
    ]
    pending_members = group_member_repo.get_pending_members()
    assert len(pending_members) == 1
    assert pending_members[0].status == 'pending'

def test_group_member_repository_get_member_stats(group_member_repo, mock_cursor):
    mock_cursor.fetchone.side_effect = [
        (10,), # total_members
        (5,),  # active_members
        (2,)   # pending_members
    ]
    stats = group_member_repo.get_member_stats()
    assert stats['total_members'] == 10
    assert stats['active_members'] == 5
    assert stats['pending_members'] == 2

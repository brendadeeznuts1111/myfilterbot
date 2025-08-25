from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Dict, List, Optional, Any

@dataclass
class Customer:
    customer_id: str
    password: str
    balance: float = 0.0
    weekly_pnl: float = 0.0
    phone: str = ""
    telegram_id: Optional[int] = None
    telegram_username: Optional[str] = None
    active: bool = True
    last_activity: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    risk_level: str = 'low'
    kyc_status: str = 'not_started'
    daily_limit: float = 10000.0
    withdrawal_limit: float = 5000.0

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now().isoformat()
        if self.updated_at is None:
            self.updated_at = datetime.now().isoformat()

    def to_dict(self) -> Dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict) -> 'Customer':
        # Handle boolean conversion from SQLite (0 or 1)
        if 'active' in data:
            data['active'] = bool(data['active'])
        return cls(**data)

@dataclass
class Transaction:
    transaction_id: str
    timestamp: str
    customer_id: str
    type: str
    amount: float
    message: Optional[str] = None
    from_user: Optional[str] = None
    chat_id: Optional[int] = None
    status: str = 'completed'
    payment_method: Optional[str] = None
    reference_id: Optional[str] = None
    fees: float = 0.0
    created_at: Optional[str] = None

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now().isoformat()

    def to_dict(self) -> Dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict) -> 'Transaction':
        return cls(**data)

@dataclass
class GroupMember:
    member_id: str
    telegram_id: int
    username: Optional[str]
    chat_id: str
    group_name: Optional[str] = None # Added for convenience, not in DB schema
    join_date: Optional[str] = None
    status: str = 'pending'
    permissions: Dict[str, Any] = None
    customer_id: Optional[str] = None

    def __post_init__(self):
        if self.join_date is None:
            self.join_date = datetime.now().isoformat()
        if self.permissions is None:
            self.permissions = {}

    def to_dict(self) -> Dict:
        d = asdict(self)
        # Convert permissions dict to JSON string for storage if needed
        if isinstance(d['permissions'], dict):
            d['permissions'] = json.dumps(d['permissions'])
        return d

    @classmethod
    def from_dict(cls, data: Dict) -> 'GroupMember':
        # Convert permissions JSON string to dict on load
        if 'permissions' in data and isinstance(data['permissions'], str):
            data['permissions'] = json.loads(data['permissions'])
        return cls(**data)

@dataclass
class GroupChat:
    """Enhanced group chat data model"""
    chat_id: str
    name: str
    description: str = ""
    active: bool = True
    created_at: str = None
    settings: Dict[str, Any] = None
    member_count: int = 0
    keywords: List[str] = None
    admin_ids: List[int] = None

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now().isoformat()
        if self.settings is None:
            self.settings = {
                "monitor_transactions": True,
                "auto_forward": True,
                "alert_threshold": 1000,
                "rate_limit": 10
            }
        if self.keywords is None:
            self.keywords = []
        if self.admin_ids is None:
            self.admin_ids = []

    def to_dict(self) -> Dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict) -> 'GroupChat':
        return cls(**data)

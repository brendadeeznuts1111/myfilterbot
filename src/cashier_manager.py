#!/usr/bin/env python3
"""
Cashier Management System
Handles deposit/withdrawal flows, limits, and verification
"""

import json
import uuid
import asyncio
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum
import logging
from dataclasses import dataclass, asdict
import hashlib
import secrets

from payment_gateway import (
    PaymentGateway, 
    PaymentMethod, 
    PaymentStatus,
    TransactionType,
    create_payment_gateway
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VerificationStatus(Enum):
    """KYC/AML verification statuses"""
    NOT_STARTED = "not_started"
    PENDING = "pending"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"

class RiskLevel(Enum):
    """Customer risk levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    BLOCKED = "blocked"

class WithdrawalStatus(Enum):
    """Withdrawal request statuses"""
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    PROCESSING = "processing"
    COMPLETED = "completed"
    REJECTED = "rejected"
    CANCELLED = "cancelled"

@dataclass
class CustomerLimits:
    """Customer transaction limits"""
    daily_deposit_limit: Decimal
    daily_withdrawal_limit: Decimal
    monthly_deposit_limit: Decimal
    monthly_withdrawal_limit: Decimal
    single_deposit_max: Decimal
    single_withdrawal_max: Decimal
    min_deposit: Decimal
    min_withdrawal: Decimal

@dataclass
class CustomerVerification:
    """Customer KYC/AML verification data"""
    customer_id: str
    verification_status: VerificationStatus
    risk_level: RiskLevel
    verified_at: Optional[datetime]
    documents: List[Dict[str, Any]]
    verification_data: Dict[str, Any]
    expires_at: Optional[datetime]

@dataclass
class WithdrawalRequest:
    """Withdrawal request data"""
    request_id: str
    customer_id: str
    amount: Decimal
    currency: str
    payment_method: PaymentMethod
    destination: Dict[str, Any]
    status: WithdrawalStatus
    created_at: datetime
    approved_at: Optional[datetime]
    processed_at: Optional[datetime]
    approved_by: Optional[str]
    rejection_reason: Optional[str]
    transaction_id: Optional[str]
    security_code: str

class CashierManager:
    """Main cashier management system"""
    
    def __init__(self, payment_gateway: PaymentGateway):
        self.payment_gateway = payment_gateway
        self.customer_limits: Dict[str, CustomerLimits] = {}
        self.customer_verifications: Dict[str, CustomerVerification] = {}
        self.withdrawal_requests: Dict[str, WithdrawalRequest] = {}
        self.daily_transactions: Dict[str, List[Dict]] = {}
        self.security_holds: Dict[str, Dict] = {}
        
        # Default limits
        self.default_limits = CustomerLimits(
            daily_deposit_limit=Decimal('5000'),
            daily_withdrawal_limit=Decimal('2000'),
            monthly_deposit_limit=Decimal('50000'),
            monthly_withdrawal_limit=Decimal('20000'),
            single_deposit_max=Decimal('2000'),
            single_withdrawal_max=Decimal('1000'),
            min_deposit=Decimal('10'),
            min_withdrawal=Decimal('50')
        )
        
        # Risk-based multipliers
        self.risk_multipliers = {
            RiskLevel.LOW: Decimal('2.0'),
            RiskLevel.MEDIUM: Decimal('1.0'),
            RiskLevel.HIGH: Decimal('0.5'),
            RiskLevel.BLOCKED: Decimal('0')
        }
        
    def get_customer_limits(self, customer_id: str) -> CustomerLimits:
        """Get customer transaction limits based on verification status"""
        if customer_id not in self.customer_limits:
            # Apply default limits
            limits = self.default_limits
            
            # Adjust based on verification status
            if customer_id in self.customer_verifications:
                verification = self.customer_verifications[customer_id]
                if verification.verification_status == VerificationStatus.APPROVED:
                    multiplier = self.risk_multipliers[verification.risk_level]
                    limits = CustomerLimits(
                        daily_deposit_limit=limits.daily_deposit_limit * multiplier,
                        daily_withdrawal_limit=limits.daily_withdrawal_limit * multiplier,
                        monthly_deposit_limit=limits.monthly_deposit_limit * multiplier,
                        monthly_withdrawal_limit=limits.monthly_withdrawal_limit * multiplier,
                        single_deposit_max=limits.single_deposit_max * multiplier,
                        single_withdrawal_max=limits.single_withdrawal_max * multiplier,
                        min_deposit=limits.min_deposit,
                        min_withdrawal=limits.min_withdrawal
                    )
            
            self.customer_limits[customer_id] = limits
        
        return self.customer_limits[customer_id]
    
    async def request_deposit(
        self,
        customer_id: str,
        amount: Decimal,
        currency: str,
        payment_method: PaymentMethod,
        **kwargs
    ) -> Dict[str, Any]:
        """Request a deposit"""
        
        # Check verification status
        verification_check = self._check_verification(customer_id, TransactionType.DEPOSIT)
        if not verification_check['allowed']:
            return {
                'success': False,
                'error': verification_check['reason'],
                'verification_required': verification_check.get('verification_required', False)
            }
        
        # Check limits
        limits = self.get_customer_limits(customer_id)
        limit_check = self._check_transaction_limits(
            customer_id, amount, TransactionType.DEPOSIT, limits
        )
        
        if not limit_check['allowed']:
            return {
                'success': False,
                'error': limit_check['reason'],
                'limit_exceeded': True,
                'current_limit': float(limit_check.get('limit', 0))
            }
        
        # Check for suspicious activity
        risk_check = self._check_risk_indicators(customer_id, amount, payment_method)
        if risk_check['risk_level'] == 'high':
            # Flag for manual review
            self._create_security_hold(customer_id, amount, 'High risk indicators detected')
            return {
                'success': False,
                'error': 'Transaction requires manual review',
                'review_required': True,
                'reference': risk_check['reference']
            }
        
        # Process deposit through payment gateway
        try:
            response = await self.payment_gateway.create_deposit(
                customer_id=customer_id,
                amount=amount,
                currency=currency,
                payment_method=payment_method,
                **kwargs
            )
            
            # Record transaction
            self._record_transaction(
                customer_id=customer_id,
                amount=amount,
                transaction_type=TransactionType.DEPOSIT,
                transaction_id=response.transaction_id,
                status=response.status
            )
            
            return {
                'success': response.status != PaymentStatus.FAILED,
                'transaction_id': response.transaction_id,
                'payment_url': response.payment_url,
                'status': response.status.value,
                'reference': response.reference_id
            }
            
        except Exception as e:
            logger.error(f"Deposit request error: {e}")
            return {
                'success': False,
                'error': 'Failed to process deposit request'
            }
    
    async def request_withdrawal(
        self,
        customer_id: str,
        amount: Decimal,
        currency: str,
        payment_method: PaymentMethod,
        destination: Dict[str, Any],
        **kwargs
    ) -> Dict[str, Any]:
        """Request a withdrawal"""
        
        # Check verification status
        verification_check = self._check_verification(customer_id, TransactionType.WITHDRAWAL)
        if not verification_check['allowed']:
            return {
                'success': False,
                'error': verification_check['reason'],
                'verification_required': verification_check.get('verification_required', False)
            }
        
        # Check limits
        limits = self.get_customer_limits(customer_id)
        limit_check = self._check_transaction_limits(
            customer_id, amount, TransactionType.WITHDRAWAL, limits
        )
        
        if not limit_check['allowed']:
            return {
                'success': False,
                'error': limit_check['reason'],
                'limit_exceeded': True,
                'current_limit': float(limit_check.get('limit', 0))
            }
        
        # Check available balance
        balance_check = await self._check_available_balance(customer_id, amount)
        if not balance_check['sufficient']:
            return {
                'success': False,
                'error': 'Insufficient balance',
                'available_balance': float(balance_check['available'])
            }
        
        # Create withdrawal request
        request_id = f"WR-{uuid.uuid4().hex[:12].upper()}"
        security_code = secrets.token_hex(8).upper()
        
        withdrawal_request = WithdrawalRequest(
            request_id=request_id,
            customer_id=customer_id,
            amount=amount,
            currency=currency,
            payment_method=payment_method,
            destination=destination,
            status=WithdrawalStatus.PENDING_APPROVAL,
            created_at=datetime.now(),
            approved_at=None,
            processed_at=None,
            approved_by=None,
            rejection_reason=None,
            transaction_id=None,
            security_code=security_code
        )
        
        self.withdrawal_requests[request_id] = withdrawal_request
        
        # Auto-approve for verified low-risk customers with small amounts
        if (self._should_auto_approve(customer_id, amount)):
            await self.approve_withdrawal(request_id, 'system_auto')
            status = WithdrawalStatus.APPROVED
        else:
            status = WithdrawalStatus.PENDING_APPROVAL
        
        return {
            'success': True,
            'request_id': request_id,
            'status': status.value,
            'security_code': security_code,
            'estimated_time': '1-3 business days',
            'requires_approval': status == WithdrawalStatus.PENDING_APPROVAL
        }
    
    async def approve_withdrawal(
        self, 
        request_id: str, 
        approved_by: str,
        override_checks: bool = False
    ) -> Dict[str, Any]:
        """Approve a withdrawal request"""
        
        if request_id not in self.withdrawal_requests:
            return {
                'success': False,
                'error': 'Withdrawal request not found'
            }
        
        request = self.withdrawal_requests[request_id]
        
        if request.status != WithdrawalStatus.PENDING_APPROVAL:
            return {
                'success': False,
                'error': f'Request already {request.status.value}'
            }
        
        # Final security checks unless overridden
        if not override_checks:
            security_check = self._final_security_check(request)
            if not security_check['passed']:
                request.status = WithdrawalStatus.REJECTED
                request.rejection_reason = security_check['reason']
                return {
                    'success': False,
                    'error': security_check['reason']
                }
        
        # Update request status
        request.status = WithdrawalStatus.APPROVED
        request.approved_at = datetime.now()
        request.approved_by = approved_by
        
        # Process withdrawal through payment gateway
        try:
            response = await self.payment_gateway.create_withdrawal(
                customer_id=request.customer_id,
                amount=request.amount,
                currency=request.currency,
                payment_method=request.payment_method,
                destination=request.destination
            )
            
            request.transaction_id = response.transaction_id
            request.status = WithdrawalStatus.PROCESSING
            
            # Record transaction
            self._record_transaction(
                customer_id=request.customer_id,
                amount=request.amount,
                transaction_type=TransactionType.WITHDRAWAL,
                transaction_id=response.transaction_id,
                status=response.status
            )
            
            return {
                'success': True,
                'transaction_id': response.transaction_id,
                'status': request.status.value
            }
            
        except Exception as e:
            logger.error(f"Withdrawal processing error: {e}")
            request.status = WithdrawalStatus.REJECTED
            request.rejection_reason = 'Processing error'
            return {
                'success': False,
                'error': 'Failed to process withdrawal'
            }
    
    def reject_withdrawal(
        self,
        request_id: str,
        reason: str,
        rejected_by: str
    ) -> Dict[str, Any]:
        """Reject a withdrawal request"""
        
        if request_id not in self.withdrawal_requests:
            return {
                'success': False,
                'error': 'Withdrawal request not found'
            }
        
        request = self.withdrawal_requests[request_id]
        
        if request.status != WithdrawalStatus.PENDING_APPROVAL:
            return {
                'success': False,
                'error': f'Request already {request.status.value}'
            }
        
        request.status = WithdrawalStatus.REJECTED
        request.rejection_reason = reason
        request.approved_by = rejected_by
        request.approved_at = datetime.now()
        
        return {
            'success': True,
            'request_id': request_id,
            'status': request.status.value,
            'reason': reason
        }
    
    def verify_customer(
        self,
        customer_id: str,
        verification_data: Dict[str, Any],
        documents: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Verify customer KYC/AML"""
        
        # Perform verification checks (mock implementation)
        risk_score = self._calculate_risk_score(verification_data)
        
        if risk_score < 30:
            risk_level = RiskLevel.LOW
            status = VerificationStatus.APPROVED
        elif risk_score < 70:
            risk_level = RiskLevel.MEDIUM
            status = VerificationStatus.APPROVED
        elif risk_score < 90:
            risk_level = RiskLevel.HIGH
            status = VerificationStatus.IN_REVIEW
        else:
            risk_level = RiskLevel.BLOCKED
            status = VerificationStatus.REJECTED
        
        verification = CustomerVerification(
            customer_id=customer_id,
            verification_status=status,
            risk_level=risk_level,
            verified_at=datetime.now() if status == VerificationStatus.APPROVED else None,
            documents=documents or [],
            verification_data=verification_data,
            expires_at=datetime.now() + timedelta(days=365) if status == VerificationStatus.APPROVED else None
        )
        
        self.customer_verifications[customer_id] = verification
        
        # Update limits based on verification
        self.get_customer_limits(customer_id)
        
        return {
            'success': True,
            'customer_id': customer_id,
            'verification_status': status.value,
            'risk_level': risk_level.value,
            'risk_score': risk_score,
            'expires_at': verification.expires_at.isoformat() if verification.expires_at else None
        }
    
    def get_pending_withdrawals(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get pending withdrawal requests"""
        pending = [
            asdict(req) for req in self.withdrawal_requests.values()
            if req.status == WithdrawalStatus.PENDING_APPROVAL
        ]
        
        # Sort by created_at
        pending.sort(key=lambda x: x['created_at'])
        
        return pending[:limit]
    
    def get_transaction_summary(self, customer_id: str) -> Dict[str, Any]:
        """Get customer transaction summary"""
        today = datetime.now().date()
        month_start = today.replace(day=1)
        
        # Get transactions for the customer
        transactions = self.daily_transactions.get(customer_id, [])
        
        # Calculate daily totals
        daily_deposits = sum(
            t['amount'] for t in transactions
            if t['date'] == today and t['type'] == TransactionType.DEPOSIT
        )
        
        daily_withdrawals = sum(
            t['amount'] for t in transactions
            if t['date'] == today and t['type'] == TransactionType.WITHDRAWAL
        )
        
        # Calculate monthly totals
        monthly_deposits = sum(
            t['amount'] for t in transactions
            if t['date'] >= month_start and t['type'] == TransactionType.DEPOSIT
        )
        
        monthly_withdrawals = sum(
            t['amount'] for t in transactions
            if t['date'] >= month_start and t['type'] == TransactionType.WITHDRAWAL
        )
        
        # Get limits
        limits = self.get_customer_limits(customer_id)
        
        # Get verification status
        verification = self.customer_verifications.get(customer_id)
        
        return {
            'customer_id': customer_id,
            'daily_deposits': float(daily_deposits),
            'daily_withdrawals': float(daily_withdrawals),
            'monthly_deposits': float(monthly_deposits),
            'monthly_withdrawals': float(monthly_withdrawals),
            'limits': {
                'daily_deposit_remaining': float(limits.daily_deposit_limit - daily_deposits),
                'daily_withdrawal_remaining': float(limits.daily_withdrawal_limit - daily_withdrawals),
                'monthly_deposit_remaining': float(limits.monthly_deposit_limit - monthly_deposits),
                'monthly_withdrawal_remaining': float(limits.monthly_withdrawal_limit - monthly_withdrawals)
            },
            'verification_status': verification.verification_status.value if verification else 'not_started',
            'risk_level': verification.risk_level.value if verification else 'unknown',
            'pending_withdrawals': len([
                r for r in self.withdrawal_requests.values()
                if r.customer_id == customer_id and r.status == WithdrawalStatus.PENDING_APPROVAL
            ])
        }
    
    def _check_verification(
        self,
        customer_id: str,
        transaction_type: TransactionType
    ) -> Dict[str, Any]:
        """Check customer verification requirements"""
        
        verification = self.customer_verifications.get(customer_id)
        
        # No verification on file
        if not verification:
            if transaction_type == TransactionType.WITHDRAWAL:
                return {
                    'allowed': False,
                    'reason': 'Verification required for withdrawals',
                    'verification_required': True
                }
            return {'allowed': True}
        
        # Check verification status
        if verification.verification_status == VerificationStatus.REJECTED:
            return {
                'allowed': False,
                'reason': 'Account verification rejected'
            }
        
        if verification.verification_status == VerificationStatus.EXPIRED:
            return {
                'allowed': False,
                'reason': 'Verification expired',
                'verification_required': True
            }
        
        # Check risk level
        if verification.risk_level == RiskLevel.BLOCKED:
            return {
                'allowed': False,
                'reason': 'Account blocked due to risk assessment'
            }
        
        return {'allowed': True}
    
    def _check_transaction_limits(
        self,
        customer_id: str,
        amount: Decimal,
        transaction_type: TransactionType,
        limits: CustomerLimits
    ) -> Dict[str, Any]:
        """Check transaction against limits"""
        
        today = datetime.now().date()
        month_start = today.replace(day=1)
        
        # Get existing transactions
        transactions = self.daily_transactions.get(customer_id, [])
        
        if transaction_type == TransactionType.DEPOSIT:
            # Check minimum
            if amount < limits.min_deposit:
                return {
                    'allowed': False,
                    'reason': f'Minimum deposit is {limits.min_deposit}',
                    'limit': limits.min_deposit
                }
            
            # Check single transaction max
            if amount > limits.single_deposit_max:
                return {
                    'allowed': False,
                    'reason': f'Maximum single deposit is {limits.single_deposit_max}',
                    'limit': limits.single_deposit_max
                }
            
            # Check daily limit
            daily_total = sum(
                t['amount'] for t in transactions
                if t['date'] == today and t['type'] == TransactionType.DEPOSIT
            )
            
            if daily_total + amount > limits.daily_deposit_limit:
                return {
                    'allowed': False,
                    'reason': f'Daily deposit limit exceeded',
                    'limit': limits.daily_deposit_limit
                }
            
            # Check monthly limit
            monthly_total = sum(
                t['amount'] for t in transactions
                if t['date'] >= month_start and t['type'] == TransactionType.DEPOSIT
            )
            
            if monthly_total + amount > limits.monthly_deposit_limit:
                return {
                    'allowed': False,
                    'reason': f'Monthly deposit limit exceeded',
                    'limit': limits.monthly_deposit_limit
                }
            
        else:  # WITHDRAWAL
            # Check minimum
            if amount < limits.min_withdrawal:
                return {
                    'allowed': False,
                    'reason': f'Minimum withdrawal is {limits.min_withdrawal}',
                    'limit': limits.min_withdrawal
                }
            
            # Check single transaction max
            if amount > limits.single_withdrawal_max:
                return {
                    'allowed': False,
                    'reason': f'Maximum single withdrawal is {limits.single_withdrawal_max}',
                    'limit': limits.single_withdrawal_max
                }
            
            # Check daily limit
            daily_total = sum(
                t['amount'] for t in transactions
                if t['date'] == today and t['type'] == TransactionType.WITHDRAWAL
            )
            
            if daily_total + amount > limits.daily_withdrawal_limit:
                return {
                    'allowed': False,
                    'reason': f'Daily withdrawal limit exceeded',
                    'limit': limits.daily_withdrawal_limit
                }
            
            # Check monthly limit
            monthly_total = sum(
                t['amount'] for t in transactions
                if t['date'] >= month_start and t['type'] == TransactionType.WITHDRAWAL
            )
            
            if monthly_total + amount > limits.monthly_withdrawal_limit:
                return {
                    'allowed': False,
                    'reason': f'Monthly withdrawal limit exceeded',
                    'limit': limits.monthly_withdrawal_limit
                }
        
        return {'allowed': True}
    
    def _check_risk_indicators(
        self,
        customer_id: str,
        amount: Decimal,
        payment_method: PaymentMethod
    ) -> Dict[str, Any]:
        """Check for risk indicators"""
        
        risk_score = 0
        risk_factors = []
        
        # Large transaction
        if amount > Decimal('5000'):
            risk_score += 20
            risk_factors.append('large_amount')
        
        # New customer
        if customer_id not in self.customer_verifications:
            risk_score += 30
            risk_factors.append('unverified')
        
        # Crypto payments
        if 'crypto' in payment_method.value.lower():
            risk_score += 15
            risk_factors.append('crypto_payment')
        
        # Multiple recent transactions
        recent_transactions = self.daily_transactions.get(customer_id, [])
        if len(recent_transactions) > 10:
            risk_score += 10
            risk_factors.append('high_activity')
        
        # Determine risk level
        if risk_score < 30:
            risk_level = 'low'
        elif risk_score < 60:
            risk_level = 'medium'
        else:
            risk_level = 'high'
        
        return {
            'risk_level': risk_level,
            'risk_score': risk_score,
            'risk_factors': risk_factors,
            'reference': f"RISK-{uuid.uuid4().hex[:8].upper()}"
        }
    
    async def _check_available_balance(
        self,
        customer_id: str,
        amount: Decimal
    ) -> Dict[str, Any]:
        """Check if customer has sufficient balance"""
        
        # This would integrate with your main database
        # For now, returning mock data
        available_balance = Decimal('10000')
        
        return {
            'sufficient': available_balance >= amount,
            'available': available_balance
        }
    
    def _should_auto_approve(self, customer_id: str, amount: Decimal) -> bool:
        """Determine if withdrawal should be auto-approved"""
        
        # Check verification
        verification = self.customer_verifications.get(customer_id)
        if not verification or verification.verification_status != VerificationStatus.APPROVED:
            return False
        
        # Check risk level
        if verification.risk_level not in [RiskLevel.LOW, RiskLevel.MEDIUM]:
            return False
        
        # Check amount threshold
        if amount > Decimal('500'):
            return False
        
        return True
    
    def _final_security_check(self, request: WithdrawalRequest) -> Dict[str, Any]:
        """Perform final security checks before processing withdrawal"""
        
        # Check for security holds
        if request.customer_id in self.security_holds:
            hold = self.security_holds[request.customer_id]
            if hold['active']:
                return {
                    'passed': False,
                    'reason': f"Security hold: {hold['reason']}"
                }
        
        # Check for duplicate requests
        recent_requests = [
            r for r in self.withdrawal_requests.values()
            if r.customer_id == request.customer_id
            and r.request_id != request.request_id
            and r.amount == request.amount
            and (datetime.now() - r.created_at).seconds < 300  # Within 5 minutes
        ]
        
        if recent_requests:
            return {
                'passed': False,
                'reason': 'Duplicate withdrawal request detected'
            }
        
        return {'passed': True}
    
    def _create_security_hold(
        self,
        customer_id: str,
        amount: Decimal,
        reason: str
    ):
        """Create a security hold on customer account"""
        
        self.security_holds[customer_id] = {
            'active': True,
            'amount': float(amount),
            'reason': reason,
            'created_at': datetime.now().isoformat(),
            'reference': f"HOLD-{uuid.uuid4().hex[:8].upper()}"
        }
    
    def _record_transaction(
        self,
        customer_id: str,
        amount: Decimal,
        transaction_type: TransactionType,
        transaction_id: str,
        status: PaymentStatus
    ):
        """Record transaction for limits tracking"""
        
        if customer_id not in self.daily_transactions:
            self.daily_transactions[customer_id] = []
        
        self.daily_transactions[customer_id].append({
            'transaction_id': transaction_id,
            'amount': float(amount),
            'type': transaction_type,
            'status': status,
            'date': datetime.now().date(),
            'timestamp': datetime.now().isoformat()
        })
    
    def _calculate_risk_score(self, verification_data: Dict[str, Any]) -> int:
        """Calculate risk score based on verification data"""
        
        score = 0
        
        # Country risk
        high_risk_countries = ['XX', 'YY', 'ZZ']  # Example high-risk country codes
        if verification_data.get('country') in high_risk_countries:
            score += 40
        
        # Age check
        age = verification_data.get('age', 0)
        if age < 21:
            score += 20
        elif age > 70:
            score += 10
        
        # Document verification
        if not verification_data.get('id_verified'):
            score += 30
        
        # Address verification
        if not verification_data.get('address_verified'):
            score += 20
        
        # PEP (Politically Exposed Person) check
        if verification_data.get('is_pep'):
            score += 50
        
        # Sanctions check
        if verification_data.get('sanctions_hit'):
            score += 100
        
        return min(score, 100)  # Cap at 100

# Initialize cashier manager
def create_cashier_manager() -> CashierManager:
    """Create and configure cashier manager"""
    payment_gateway = create_payment_gateway()
    return CashierManager(payment_gateway)

if __name__ == "__main__":
    # Test cashier manager
    async def test_cashier():
        cashier = create_cashier_manager()
        
        # Verify customer
        verification_result = cashier.verify_customer(
            customer_id="BB1042",
            verification_data={
                'country': 'US',
                'age': 30,
                'id_verified': True,
                'address_verified': True,
                'is_pep': False,
                'sanctions_hit': False
            }
        )
        print(f"Verification result: {verification_result}")
        
        # Request deposit
        deposit_result = await cashier.request_deposit(
            customer_id="BB1042",
            amount=Decimal('100'),
            currency="USD",
            payment_method=PaymentMethod.STRIPE
        )
        print(f"Deposit result: {deposit_result}")
        
        # Request withdrawal
        withdrawal_result = await cashier.request_withdrawal(
            customer_id="BB1042",
            amount=Decimal('50'),
            currency="USD",
            payment_method=PaymentMethod.PAYPAL,
            destination={'email': 'user@example.com'}
        )
        print(f"Withdrawal result: {withdrawal_result}")
        
        # Get transaction summary
        summary = cashier.get_transaction_summary("BB1042")
        print(f"Transaction summary: {summary}")
    
    # Run test
    asyncio.run(test_cashier())
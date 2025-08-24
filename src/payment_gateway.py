#!/usr/bin/env python3
"""
Payment Gateway Integration Module
Handles multiple payment processors and transaction management
"""

import json
import hashlib
import hmac
import uuid
import asyncio
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, Optional, List, Any
from decimal import Decimal
import logging
import requests
from dataclasses import dataclass, asdict

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PaymentStatus(Enum):
    """Payment transaction statuses"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"
    EXPIRED = "expired"
    REQUIRES_VERIFICATION = "requires_verification"

class PaymentMethod(Enum):
    """Supported payment methods"""
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    BANK_TRANSFER = "bank_transfer"
    PAYPAL = "paypal"
    STRIPE = "stripe"
    CRYPTO_BTC = "crypto_btc"
    CRYPTO_ETH = "crypto_eth"
    CRYPTO_USDT = "crypto_usdt"
    WIRE_TRANSFER = "wire_transfer"
    E_WALLET = "e_wallet"

class TransactionType(Enum):
    """Transaction types"""
    DEPOSIT = "deposit"
    WITHDRAWAL = "withdrawal"
    REFUND = "refund"
    CHARGEBACK = "chargeback"
    FEE = "fee"

@dataclass
class PaymentRequest:
    """Payment request data structure"""
    transaction_id: str
    customer_id: str
    amount: Decimal
    currency: str
    payment_method: PaymentMethod
    transaction_type: TransactionType
    description: str
    metadata: Dict[str, Any]
    created_at: datetime
    callback_url: Optional[str] = None
    return_url: Optional[str] = None

@dataclass
class PaymentResponse:
    """Payment response data structure"""
    transaction_id: str
    status: PaymentStatus
    payment_url: Optional[str] = None
    reference_id: Optional[str] = None
    processor_response: Optional[Dict] = None
    error_message: Optional[str] = None
    timestamp: datetime = None

class PaymentProcessor:
    """Base payment processor class"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.api_key = config.get('api_key')
        self.secret_key = config.get('secret_key')
        self.webhook_secret = config.get('webhook_secret')
        self.environment = config.get('environment', 'sandbox')
        self.enabled = config.get('enabled', True)
        self.priority = config.get('priority', 1)
        
    async def process_payment(self, request: PaymentRequest) -> PaymentResponse:
        """Process a payment request"""
        raise NotImplementedError
        
    async def verify_payment(self, transaction_id: str) -> PaymentResponse:
        """Verify payment status"""
        raise NotImplementedError
        
    def verify_webhook(self, payload: bytes, signature: str) -> bool:
        """Verify webhook signature"""
        raise NotImplementedError

class StripeProcessor(PaymentProcessor):
    """Stripe payment processor"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.base_url = "https://api.stripe.com/v1"
        
    async def process_payment(self, request: PaymentRequest) -> PaymentResponse:
        """Process Stripe payment"""
        try:
            headers = {
                'Authorization': f'Bearer {self.secret_key}',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
            
            data = {
                'amount': int(request.amount * 100),  # Stripe uses cents
                'currency': request.currency.lower(),
                'payment_method_types[]': 'card',
                'metadata': {
                    'customer_id': request.customer_id,
                    'transaction_id': request.transaction_id,
                    'type': request.transaction_type.value
                }
            }
            
            if request.callback_url:
                data['success_url'] = request.callback_url
                data['cancel_url'] = request.callback_url
            
            response = requests.post(
                f"{self.base_url}/payment_intents",
                headers=headers,
                data=data,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                return PaymentResponse(
                    transaction_id=request.transaction_id,
                    status=PaymentStatus.PENDING,
                    payment_url=result.get('next_action', {}).get('redirect_to_url', {}).get('url'),
                    reference_id=result['id'],
                    processor_response=result,
                    timestamp=datetime.now()
                )
            else:
                error_data = response.json()
                return PaymentResponse(
                    transaction_id=request.transaction_id,
                    status=PaymentStatus.FAILED,
                    error_message=error_data.get('error', {}).get('message', 'Unknown error'),
                    timestamp=datetime.now()
                )
                
        except Exception as e:
            logger.error(f"Stripe payment error: {e}")
            return PaymentResponse(
                transaction_id=request.transaction_id,
                status=PaymentStatus.FAILED,
                error_message=str(e),
                timestamp=datetime.now()
            )
    
    async def verify_payment(self, transaction_id: str) -> PaymentResponse:
        """Verify Stripe payment"""
        try:
            headers = {
                'Authorization': f'Bearer {self.secret_key}'
            }
            
            response = requests.get(
                f"{self.base_url}/payment_intents/{transaction_id}",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                status_map = {
                    'requires_payment_method': PaymentStatus.PENDING,
                    'requires_confirmation': PaymentStatus.PENDING,
                    'requires_action': PaymentStatus.PENDING,
                    'processing': PaymentStatus.PROCESSING,
                    'requires_capture': PaymentStatus.COMPLETED,
                    'succeeded': PaymentStatus.COMPLETED,
                    'canceled': PaymentStatus.CANCELLED
                }
                
                return PaymentResponse(
                    transaction_id=transaction_id,
                    status=status_map.get(result['status'], PaymentStatus.FAILED),
                    reference_id=result['id'],
                    processor_response=result,
                    timestamp=datetime.now()
                )
            else:
                return PaymentResponse(
                    transaction_id=transaction_id,
                    status=PaymentStatus.FAILED,
                    error_message="Payment verification failed",
                    timestamp=datetime.now()
                )
                
        except Exception as e:
            logger.error(f"Stripe verification error: {e}")
            return PaymentResponse(
                transaction_id=transaction_id,
                status=PaymentStatus.FAILED,
                error_message=str(e),
                timestamp=datetime.now()
            )
    
    def verify_webhook(self, payload: bytes, signature: str) -> bool:
        """Verify Stripe webhook signature"""
        try:
            import stripe
            stripe.Webhook.construct_event(
                payload, signature, self.webhook_secret
            )
            return True
        except:
            return False

class PayPalProcessor(PaymentProcessor):
    """PayPal payment processor"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.base_url = "https://api.paypal.com" if self.environment == "production" else "https://api.sandbox.paypal.com"
        self.client_id = config.get('client_id')
        
    async def _get_access_token(self) -> str:
        """Get PayPal access token"""
        try:
            headers = {
                'Accept': 'application/json',
                'Accept-Language': 'en_US'
            }
            
            data = 'grant_type=client_credentials'
            
            response = requests.post(
                f"{self.base_url}/v1/oauth2/token",
                headers=headers,
                data=data,
                auth=(self.client_id, self.secret_key),
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()['access_token']
            else:
                raise Exception("Failed to get PayPal access token")
                
        except Exception as e:
            logger.error(f"PayPal token error: {e}")
            raise
    
    async def process_payment(self, request: PaymentRequest) -> PaymentResponse:
        """Process PayPal payment"""
        try:
            access_token = await self._get_access_token()
            
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {access_token}'
            }
            
            data = {
                'intent': 'CAPTURE',
                'purchase_units': [{
                    'amount': {
                        'currency_code': request.currency,
                        'value': str(request.amount)
                    },
                    'custom_id': request.customer_id,
                    'invoice_id': request.transaction_id
                }],
                'application_context': {
                    'return_url': request.return_url,
                    'cancel_url': request.return_url
                }
            }
            
            response = requests.post(
                f"{self.base_url}/v2/checkout/orders",
                headers=headers,
                json=data,
                timeout=30
            )
            
            if response.status_code == 201:
                result = response.json()
                approval_url = None
                for link in result.get('links', []):
                    if link['rel'] == 'approve':
                        approval_url = link['href']
                        break
                
                return PaymentResponse(
                    transaction_id=request.transaction_id,
                    status=PaymentStatus.PENDING,
                    payment_url=approval_url,
                    reference_id=result['id'],
                    processor_response=result,
                    timestamp=datetime.now()
                )
            else:
                error_data = response.json()
                return PaymentResponse(
                    transaction_id=request.transaction_id,
                    status=PaymentStatus.FAILED,
                    error_message=error_data.get('message', 'PayPal payment failed'),
                    timestamp=datetime.now()
                )
                
        except Exception as e:
            logger.error(f"PayPal payment error: {e}")
            return PaymentResponse(
                transaction_id=request.transaction_id,
                status=PaymentStatus.FAILED,
                error_message=str(e),
                timestamp=datetime.now()
            )
    
    async def verify_payment(self, transaction_id: str) -> PaymentResponse:
        """Verify PayPal payment"""
        try:
            access_token = await self._get_access_token()
            
            headers = {
                'Authorization': f'Bearer {access_token}'
            }
            
            response = requests.get(
                f"{self.base_url}/v2/checkout/orders/{transaction_id}",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                status_map = {
                    'CREATED': PaymentStatus.PENDING,
                    'SAVED': PaymentStatus.PENDING,
                    'APPROVED': PaymentStatus.PROCESSING,
                    'VOIDED': PaymentStatus.CANCELLED,
                    'COMPLETED': PaymentStatus.COMPLETED,
                    'PAYER_ACTION_REQUIRED': PaymentStatus.REQUIRES_VERIFICATION
                }
                
                return PaymentResponse(
                    transaction_id=transaction_id,
                    status=status_map.get(result['status'], PaymentStatus.FAILED),
                    reference_id=result['id'],
                    processor_response=result,
                    timestamp=datetime.now()
                )
            else:
                return PaymentResponse(
                    transaction_id=transaction_id,
                    status=PaymentStatus.FAILED,
                    error_message="PayPal verification failed",
                    timestamp=datetime.now()
                )
                
        except Exception as e:
            logger.error(f"PayPal verification error: {e}")
            return PaymentResponse(
                transaction_id=transaction_id,
                status=PaymentStatus.FAILED,
                error_message=str(e),
                timestamp=datetime.now()
            )
    
    def verify_webhook(self, payload: bytes, signature: str) -> bool:
        """Verify PayPal webhook signature"""
        try:
            computed_signature = hmac.new(
                self.webhook_secret.encode('utf-8'),
                payload,
                hashlib.sha256
            ).hexdigest()
            
            return hmac.compare_digest(signature, computed_signature)
        except:
            return False

class PaymentGateway:
    """Main payment gateway managing multiple processors"""
    
    def __init__(self):
        self.processors: Dict[str, PaymentProcessor] = {}
        self.default_processor = None
        self.failover_enabled = True
        
        # Load processor configurations
        self._load_processors()
        
        logger.info(f"Payment gateway initialized with {len(self.processors)} processors")
    
    def _load_processors(self):
        """Load payment processors from configuration"""
        processor_configs = {
            'stripe': {
                'enabled': True,
                'priority': 1,
                'api_key': 'pk_test_...',
                'secret_key': 'sk_test_...',
                'webhook_secret': 'whsec_...',
                'environment': 'sandbox'
            },
            'paypal': {
                'enabled': True,
                'priority': 2,
                'client_id': 'sb_client_id',
                'secret_key': 'sb_secret',
                'webhook_secret': 'paypal_webhook_secret',
                'environment': 'sandbox'
            }
        }
        
        for name, config in processor_configs.items():
            if config.get('enabled', False):
                try:
                    if name == 'stripe':
                        processor = StripeProcessor(config)
                    elif name == 'paypal':
                        processor = PayPalProcessor(config)
                    else:
                        continue
                    
                    self.processors[name] = processor
                    
                    if not self.default_processor or config['priority'] < self.processors[self.default_processor].priority:
                        self.default_processor = name
                        
                except Exception as e:
                    logger.error(f"Failed to load processor {name}: {e}")
    
    async def process_payment(self, request: PaymentRequest, preferred_processor: str = None) -> PaymentResponse:
        """Process payment with failover support"""
        processor_order = []
        
        # Preferred processor first
        if preferred_processor and preferred_processor in self.processors:
            processor_order.append(preferred_processor)
        
        # Default processor
        if self.default_processor and self.default_processor not in processor_order:
            processor_order.append(self.default_processor)
        
        # Other processors by priority
        other_processors = sorted(
            [name for name in self.processors.keys() if name not in processor_order],
            key=lambda x: self.processors[x].priority
        )
        processor_order.extend(other_processors)
        
        # Try processors in order
        last_error = None
        for processor_name in processor_order:
            try:
                processor = self.processors[processor_name]
                if not processor.enabled:
                    continue
                
                logger.info(f"Attempting payment with processor: {processor_name}")
                response = await processor.process_payment(request)
                
                if response.status != PaymentStatus.FAILED:
                    logger.info(f"Payment successful with processor: {processor_name}")
                    return response
                else:
                    last_error = response.error_message
                    logger.warning(f"Payment failed with {processor_name}: {last_error}")
                    
            except Exception as e:
                last_error = str(e)
                logger.error(f"Payment error with {processor_name}: {e}")
                continue
        
        # All processors failed
        return PaymentResponse(
            transaction_id=request.transaction_id,
            status=PaymentStatus.FAILED,
            error_message=f"All payment processors failed. Last error: {last_error}",
            timestamp=datetime.now()
        )

# Global payment gateway instance
payment_gateway = PaymentGateway()

class StripeProcessor(PaymentProcessor):
    """Stripe payment processor"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.base_url = "https://api.stripe.com/v1"
        
    async def process_payment(self, request: PaymentRequest) -> PaymentResponse:
        """Process Stripe payment"""
        try:
            if request.transaction_type == TransactionType.DEPOSIT:
                # Create Stripe checkout session
                session_data = {
                    'payment_method_types[]': ['card'],
                    'line_items[0][price_data][currency]': request.currency.lower(),
                    'line_items[0][price_data][unit_amount]': int(request.amount * 100),
                    'line_items[0][price_data][product_data][name]': request.description,
                    'line_items[0][quantity]': 1,
                    'mode': 'payment',
                    'success_url': request.return_url or 'https://example.com/success',
                    'cancel_url': request.callback_url or 'https://example.com/cancel',
                    'client_reference_id': request.transaction_id,
                    'metadata[customer_id]': request.customer_id
                }
                
                # Mock response for demo
                return PaymentResponse(
                    transaction_id=request.transaction_id,
                    status=PaymentStatus.PENDING,
                    payment_url=f"https://checkout.stripe.com/pay/{request.transaction_id}",
                    reference_id=f"cs_{uuid.uuid4().hex[:24]}",
                    timestamp=datetime.now()
                )
            else:
                # Handle withdrawals via Stripe Connect
                return PaymentResponse(
                    transaction_id=request.transaction_id,
                    status=PaymentStatus.PROCESSING,
                    reference_id=f"po_{uuid.uuid4().hex[:24]}",
                    timestamp=datetime.now()
                )
                
        except Exception as e:
            logger.error(f"Stripe payment error: {e}")
            return PaymentResponse(
                transaction_id=request.transaction_id,
                status=PaymentStatus.FAILED,
                error_message=str(e),
                timestamp=datetime.now()
            )
    
    async def verify_payment(self, transaction_id: str) -> PaymentResponse:
        """Verify Stripe payment status"""
        # Mock verification
        return PaymentResponse(
            transaction_id=transaction_id,
            status=PaymentStatus.COMPLETED,
            timestamp=datetime.now()
        )
    
    def verify_webhook(self, payload: bytes, signature: str) -> bool:
        """Verify Stripe webhook signature"""
        expected_sig = hmac.new(
            self.webhook_secret.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected_sig, signature)

class PayPalProcessor(PaymentProcessor):
    """PayPal payment processor"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.base_url = "https://api.sandbox.paypal.com" if self.environment == 'sandbox' else "https://api.paypal.com"
        
    async def process_payment(self, request: PaymentRequest) -> PaymentResponse:
        """Process PayPal payment"""
        try:
            # Create PayPal order
            order_data = {
                "intent": "CAPTURE",
                "purchase_units": [{
                    "reference_id": request.transaction_id,
                    "amount": {
                        "currency_code": request.currency,
                        "value": str(request.amount)
                    },
                    "description": request.description
                }],
                "application_context": {
                    "return_url": request.return_url or "https://example.com/return",
                    "cancel_url": request.callback_url or "https://example.com/cancel"
                }
            }
            
            # Mock response
            return PaymentResponse(
                transaction_id=request.transaction_id,
                status=PaymentStatus.PENDING,
                payment_url=f"https://www.paypal.com/checkoutnow?token={uuid.uuid4().hex[:20]}",
                reference_id=f"PP-{uuid.uuid4().hex[:17].upper()}",
                timestamp=datetime.now()
            )
            
        except Exception as e:
            logger.error(f"PayPal payment error: {e}")
            return PaymentResponse(
                transaction_id=request.transaction_id,
                status=PaymentStatus.FAILED,
                error_message=str(e),
                timestamp=datetime.now()
            )

class CryptoProcessor(PaymentProcessor):
    """Cryptocurrency payment processor"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.wallet_addresses = config.get('wallet_addresses', {})
        self.network = config.get('network', 'mainnet')
        
    async def process_payment(self, request: PaymentRequest) -> PaymentResponse:
        """Process crypto payment"""
        try:
            crypto_type = request.payment_method.value.replace('crypto_', '').upper()
            wallet_address = self.wallet_addresses.get(crypto_type)
            
            if not wallet_address:
                raise ValueError(f"No wallet configured for {crypto_type}")
            
            # Generate unique payment address or memo
            payment_id = uuid.uuid4().hex[:16]
            
            # Calculate crypto amount based on current rates (mock)
            crypto_rates = {
                'BTC': 45000,
                'ETH': 3000,
                'USDT': 1
            }
            
            crypto_amount = float(request.amount) / crypto_rates.get(crypto_type, 1)
            
            payment_info = {
                'address': wallet_address,
                'amount': crypto_amount,
                'currency': crypto_type,
                'memo': payment_id,
                'expires_at': (datetime.now() + timedelta(hours=1)).isoformat()
            }
            
            return PaymentResponse(
                transaction_id=request.transaction_id,
                status=PaymentStatus.PENDING,
                reference_id=payment_id,
                processor_response=payment_info,
                timestamp=datetime.now()
            )
            
        except Exception as e:
            logger.error(f"Crypto payment error: {e}")
            return PaymentResponse(
                transaction_id=request.transaction_id,
                status=PaymentStatus.FAILED,
                error_message=str(e),
                timestamp=datetime.now()
            )

class PaymentGateway:
    """Main payment gateway orchestrator"""
    
    def __init__(self):
        self.processors: Dict[str, PaymentProcessor] = {}
        self.transactions: Dict[str, PaymentRequest] = {}
        self.webhooks: List[str] = []
        self.limits = {
            'min_deposit': Decimal('10'),
            'max_deposit': Decimal('10000'),
            'min_withdrawal': Decimal('50'),
            'max_withdrawal': Decimal('5000'),
            'daily_deposit_limit': Decimal('20000'),
            'daily_withdrawal_limit': Decimal('10000')
        }
        
    def register_processor(self, name: str, processor: PaymentProcessor):
        """Register a payment processor"""
        self.processors[name] = processor
        logger.info(f"Registered payment processor: {name}")
        
    async def create_deposit(
        self,
        customer_id: str,
        amount: Decimal,
        currency: str,
        payment_method: PaymentMethod,
        **kwargs
    ) -> PaymentResponse:
        """Create a deposit transaction"""
        
        # Validate amount
        if amount < self.limits['min_deposit']:
            return PaymentResponse(
                transaction_id="",
                status=PaymentStatus.FAILED,
                error_message=f"Minimum deposit is {self.limits['min_deposit']} {currency}",
                timestamp=datetime.now()
            )
            
        if amount > self.limits['max_deposit']:
            return PaymentResponse(
                transaction_id="",
                status=PaymentStatus.FAILED,
                error_message=f"Maximum deposit is {self.limits['max_deposit']} {currency}",
                timestamp=datetime.now()
            )
        
        # Create payment request
        transaction_id = f"DEP-{uuid.uuid4().hex[:12].upper()}"
        request = PaymentRequest(
            transaction_id=transaction_id,
            customer_id=customer_id,
            amount=amount,
            currency=currency,
            payment_method=payment_method,
            transaction_type=TransactionType.DEPOSIT,
            description=f"Deposit for customer {customer_id}",
            metadata=kwargs.get('metadata', {}),
            created_at=datetime.now(),
            callback_url=kwargs.get('callback_url'),
            return_url=kwargs.get('return_url')
        )
        
        # Store transaction
        self.transactions[transaction_id] = request
        
        # Route to appropriate processor
        processor = self._get_processor(payment_method)
        if not processor:
            return PaymentResponse(
                transaction_id=transaction_id,
                status=PaymentStatus.FAILED,
                error_message=f"Payment method {payment_method.value} not supported",
                timestamp=datetime.now()
            )
        
        # Process payment
        response = await processor.process_payment(request)
        
        # Log transaction
        logger.info(f"Deposit created: {transaction_id} - Status: {response.status.value}")
        
        return response
    
    async def create_withdrawal(
        self,
        customer_id: str,
        amount: Decimal,
        currency: str,
        payment_method: PaymentMethod,
        destination: Dict[str, Any],
        **kwargs
    ) -> PaymentResponse:
        """Create a withdrawal transaction"""
        
        # Validate amount
        if amount < self.limits['min_withdrawal']:
            return PaymentResponse(
                transaction_id="",
                status=PaymentStatus.FAILED,
                error_message=f"Minimum withdrawal is {self.limits['min_withdrawal']} {currency}",
                timestamp=datetime.now()
            )
            
        if amount > self.limits['max_withdrawal']:
            return PaymentResponse(
                transaction_id="",
                status=PaymentStatus.FAILED,
                error_message=f"Maximum withdrawal is {self.limits['max_withdrawal']} {currency}",
                timestamp=datetime.now()
            )
        
        # Create payment request
        transaction_id = f"WTH-{uuid.uuid4().hex[:12].upper()}"
        request = PaymentRequest(
            transaction_id=transaction_id,
            customer_id=customer_id,
            amount=amount,
            currency=currency,
            payment_method=payment_method,
            transaction_type=TransactionType.WITHDRAWAL,
            description=f"Withdrawal for customer {customer_id}",
            metadata={'destination': destination, **kwargs.get('metadata', {})},
            created_at=datetime.now()
        )
        
        # Store transaction
        self.transactions[transaction_id] = request
        
        # Route to appropriate processor
        processor = self._get_processor(payment_method)
        if not processor:
            return PaymentResponse(
                transaction_id=transaction_id,
                status=PaymentStatus.FAILED,
                error_message=f"Payment method {payment_method.value} not supported",
                timestamp=datetime.now()
            )
        
        # Process withdrawal
        response = await processor.process_payment(request)
        
        # Log transaction
        logger.info(f"Withdrawal created: {transaction_id} - Status: {response.status.value}")
        
        return response
    
    async def verify_transaction(self, transaction_id: str) -> PaymentResponse:
        """Verify transaction status"""
        if transaction_id not in self.transactions:
            return PaymentResponse(
                transaction_id=transaction_id,
                status=PaymentStatus.FAILED,
                error_message="Transaction not found",
                timestamp=datetime.now()
            )
        
        request = self.transactions[transaction_id]
        processor = self._get_processor(request.payment_method)
        
        if not processor:
            return PaymentResponse(
                transaction_id=transaction_id,
                status=PaymentStatus.FAILED,
                error_message="Processor not available",
                timestamp=datetime.now()
            )
        
        return await processor.verify_payment(transaction_id)
    
    def _get_processor(self, payment_method: PaymentMethod) -> Optional[PaymentProcessor]:
        """Get processor for payment method"""
        processor_map = {
            PaymentMethod.STRIPE: 'stripe',
            PaymentMethod.CREDIT_CARD: 'stripe',
            PaymentMethod.DEBIT_CARD: 'stripe',
            PaymentMethod.PAYPAL: 'paypal',
            PaymentMethod.CRYPTO_BTC: 'crypto',
            PaymentMethod.CRYPTO_ETH: 'crypto',
            PaymentMethod.CRYPTO_USDT: 'crypto'
        }
        
        processor_name = processor_map.get(payment_method)
        return self.processors.get(processor_name) if processor_name else None
    
    def get_transaction_history(
        self,
        customer_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Get customer transaction history"""
        customer_transactions = [
            asdict(tx) for tx in self.transactions.values()
            if tx.customer_id == customer_id
        ]
        
        # Sort by created_at descending
        customer_transactions.sort(
            key=lambda x: x['created_at'],
            reverse=True
        )
        
        return customer_transactions[offset:offset + limit]
    
    def get_transaction_stats(self, customer_id: str) -> Dict[str, Any]:
        """Get transaction statistics for customer"""
        customer_transactions = [
            tx for tx in self.transactions.values()
            if tx.customer_id == customer_id
        ]
        
        total_deposits = sum(
            tx.amount for tx in customer_transactions
            if tx.transaction_type == TransactionType.DEPOSIT
        )
        
        total_withdrawals = sum(
            tx.amount for tx in customer_transactions
            if tx.transaction_type == TransactionType.WITHDRAWAL
        )
        
        return {
            'total_deposits': float(total_deposits),
            'total_withdrawals': float(total_withdrawals),
            'net_balance': float(total_deposits - total_withdrawals),
            'transaction_count': len(customer_transactions),
            'pending_transactions': sum(
                1 for tx in customer_transactions
                if self.transactions[tx.transaction_id]
            )
        }

# Initialize gateway with processors
def create_payment_gateway() -> PaymentGateway:
    """Create and configure payment gateway"""
    gateway = PaymentGateway()
    
    # Register Stripe processor
    stripe_config = {
        'api_key': 'sk_test_dummy_key',
        'secret_key': 'sk_test_dummy_secret',
        'webhook_secret': 'whsec_dummy_webhook',
        'environment': 'sandbox'
    }
    gateway.register_processor('stripe', StripeProcessor(stripe_config))
    
    # Register PayPal processor
    paypal_config = {
        'api_key': 'paypal_client_id',
        'secret_key': 'paypal_secret',
        'webhook_secret': 'paypal_webhook_secret',
        'environment': 'sandbox'
    }
    gateway.register_processor('paypal', PayPalProcessor(paypal_config))
    
    # Register Crypto processor
    crypto_config = {
        'wallet_addresses': {
            'BTC': '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
            'ETH': '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8',
            'USDT': 'TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9'
        },
        'network': 'testnet'
    }
    gateway.register_processor('crypto', CryptoProcessor(crypto_config))
    
    return gateway

if __name__ == "__main__":
    # Test payment gateway
    async def test_gateway():
        gateway = create_payment_gateway()
        
        # Test deposit
        response = await gateway.create_deposit(
            customer_id="BB1042",
            amount=Decimal('100'),
            currency="USD",
            payment_method=PaymentMethod.STRIPE,
            return_url="http://localhost:5000/payment/success",
            callback_url="http://localhost:5000/payment/cancel"
        )
        
        print(f"Deposit response: {response}")
        
        # Test withdrawal
        response = await gateway.create_withdrawal(
            customer_id="BB1042",
            amount=Decimal('50'),
            currency="USD",
            payment_method=PaymentMethod.PAYPAL,
            destination={'email': 'user@example.com'}
        )
        
        print(f"Withdrawal response: {response}")
    
    # Run test
    asyncio.run(test_gateway())
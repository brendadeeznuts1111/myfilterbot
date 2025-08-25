#!/usr/bin/env python3
"""
Transaction Queue System for High Volume Processing
Handles queued transactions, status tracking, and batch processing
"""

import asyncio
import json
import logging
import time
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
from concurrent.futures import ThreadPoolExecutor, as_completed
import uuid
from collections import defaultdict

from .database_manager import enhanced_db, Customer, Transaction
from .payment_gateway import payment_gateway, PaymentRequest, PaymentResponse, PaymentStatus, TransactionType
from .cache_manager import transaction_cache
from .config import config

logger = logging.getLogger(__name__)

class QueueStatus(Enum):
    """Transaction queue statuses"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    RETRYING = "retrying"
    EXPIRED = "expired"

class Priority(Enum):
    """Transaction priorities"""
    LOW = 1
    NORMAL = 2
    HIGH = 3
    URGENT = 4
    CRITICAL = 5

@dataclass
class QueuedTransaction:
    """Queued transaction with metadata"""
    id: str
    customer_id: str
    transaction_type: TransactionType
    amount: float
    currency: str = "USD"
    description: str = ""
    metadata: Dict[str, Any] = None
    priority: Priority = Priority.NORMAL
    status: QueueStatus = QueueStatus.PENDING
    created_at: datetime = None
    scheduled_at: datetime = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3
    timeout_seconds: int = 300
    payment_method: str = "auto"
    callback_url: Optional[str] = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()
        if self.scheduled_at is None:
            self.scheduled_at = self.created_at
        if self.metadata is None:
            self.metadata = {}
    
    def to_dict(self) -> Dict:
        data = asdict(self)
        # Convert datetime objects to ISO strings
        for field in ['created_at', 'scheduled_at', 'started_at', 'completed_at']:
            if data[field]:
                data[field] = data[field].isoformat()
        # Convert enums to values
        data['priority'] = self.priority.value
        data['status'] = self.status.value
        data['transaction_type'] = self.transaction_type.value
        return data
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'QueuedTransaction':
        # Convert ISO strings back to datetime objects
        for field in ['created_at', 'scheduled_at', 'started_at', 'completed_at']:
            if data.get(field):
                data[field] = datetime.fromisoformat(data[field])
        # Convert enum values back to enums
        data['priority'] = Priority(data['priority'])
        data['status'] = QueueStatus(data['status'])
        data['transaction_type'] = TransactionType(data['transaction_type'])
        return cls(**data)

class TransactionProcessor:
    """Processes individual transactions"""
    
    def __init__(self, queue_manager):
        self.queue_manager = queue_manager
        
    async def process_transaction(self, queued_tx: QueuedTransaction) -> bool:
        """Process a single transaction"""
        try:
            logger.info(f"Processing transaction {queued_tx.id} for customer {queued_tx.customer_id}")
            
            # Update status
            queued_tx.status = QueueStatus.PROCESSING
            queued_tx.started_at = datetime.now()
            self.queue_manager._update_transaction_status(queued_tx)
            
            # Get customer
            customer = enhanced_db.get_customer(queued_tx.customer_id)
            if not customer:
                raise Exception(f"Customer {queued_tx.customer_id} not found")
            
            # Create payment request
            payment_request = PaymentRequest(
                transaction_id=queued_tx.id,
                customer_id=queued_tx.customer_id,
                amount=queued_tx.amount,
                currency=queued_tx.currency,
                payment_method=queued_tx.payment_method,
                transaction_type=queued_tx.transaction_type,
                description=queued_tx.description,
                metadata=queued_tx.metadata,
                created_at=queued_tx.created_at,
                callback_url=queued_tx.callback_url
            )
            
            # Process payment based on transaction type
            if queued_tx.transaction_type in [TransactionType.DEPOSIT, TransactionType.WITHDRAWAL]:
                payment_response = await payment_gateway.process_payment(payment_request)
                
                if payment_response.status in [PaymentStatus.COMPLETED, PaymentStatus.PENDING]:
                    # Update customer balance if completed
                    if payment_response.status == PaymentStatus.COMPLETED:
                        balance_change = queued_tx.amount if queued_tx.transaction_type == TransactionType.DEPOSIT else -queued_tx.amount
                        customer.balance += balance_change
                        enhanced_db.update_customer(customer)
                        
                        # Invalidate cache
                        transaction_cache.invalidate_customer_transactions(queued_tx.customer_id)
                    
                    # Log transaction
                    transaction = Transaction(
                        timestamp=datetime.now().isoformat(),
                        customer_id=queued_tx.customer_id,
                        type=queued_tx.transaction_type.value,
                        amount=queued_tx.amount,
                        message=queued_tx.description,
                        from_user="system",
                        chat_id=0,
                        status=payment_response.status.value
                    )
                    enhanced_db.add_transaction(transaction)
                    
                    # Complete transaction
                    queued_tx.status = QueueStatus.COMPLETED
                    queued_tx.completed_at = datetime.now()
                    queued_tx.metadata.update({
                        'payment_response': {
                            'status': payment_response.status.value,
                            'reference_id': payment_response.reference_id,
                            'payment_url': payment_response.payment_url
                        }
                    })
                    
                    self.queue_manager._update_transaction_status(queued_tx)
                    logger.info(f"Transaction {queued_tx.id} completed successfully")
                    return True
                    
                else:
                    raise Exception(f"Payment failed: {payment_response.error_message}")
            
            else:
                # Handle other transaction types (fees, refunds, etc.)
                # For now, just mark as completed
                queued_tx.status = QueueStatus.COMPLETED
                queued_tx.completed_at = datetime.now()
                self.queue_manager._update_transaction_status(queued_tx)
                return True
                
        except Exception as e:
            logger.error(f"Transaction processing error for {queued_tx.id}: {e}")
            
            # Handle retry logic
            if queued_tx.retry_count < queued_tx.max_retries:
                queued_tx.retry_count += 1
                queued_tx.status = QueueStatus.RETRYING
                queued_tx.error_message = str(e)
                # Schedule retry with exponential backoff
                delay_seconds = (2 ** queued_tx.retry_count) * 60  # 2, 4, 8 minutes
                queued_tx.scheduled_at = datetime.now() + timedelta(seconds=delay_seconds)
                self.queue_manager._update_transaction_status(queued_tx)
                logger.info(f"Transaction {queued_tx.id} scheduled for retry {queued_tx.retry_count}/{queued_tx.max_retries} in {delay_seconds} seconds")
                return False
            else:
                # Max retries reached
                queued_tx.status = QueueStatus.FAILED
                queued_tx.error_message = str(e)
                queued_tx.completed_at = datetime.now()
                self.queue_manager._update_transaction_status(queued_tx)
                logger.error(f"Transaction {queued_tx.id} failed after {queued_tx.max_retries} retries: {e}")
                return False

class TransactionQueueManager:
    """Manages transaction queue and processing"""
    
    def __init__(self, max_workers: int = 10, batch_size: int = 50):
        self.max_workers = max_workers
        self.batch_size = batch_size
        self.queue: Dict[str, QueuedTransaction] = {}
        self.queue_lock = threading.RLock()
        self.processor = TransactionProcessor(self)
        
        # Worker pool
        self.executor = ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="tx-queue")
        
        # Processing statistics
        self.stats = {
            'total_queued': 0,
            'total_processed': 0,
            'total_completed': 0,
            'total_failed': 0,
            'total_retries': 0,
            'current_queue_size': 0,
            'processing_count': 0,
            'average_processing_time': 0,
            'processing_times': []
        }
        
        # Status tracking
        self.status_counts = defaultdict(int)
        self.priority_counts = defaultdict(int)
        
        # Background processing
        self.processing_enabled = True
        self.processing_thread = threading.Thread(target=self._processing_loop, daemon=True)
        self.processing_thread.start()
        
        logger.info(f"Transaction queue manager initialized with {max_workers} workers")
    
    def queue_transaction(self, 
                         customer_id: str,
                         transaction_type: TransactionType,
                         amount: float,
                         currency: str = "USD",
                         description: str = "",
                         priority: Priority = Priority.NORMAL,
                         scheduled_at: datetime = None,
                         metadata: Dict[str, Any] = None,
                         payment_method: str = "auto",
                         callback_url: str = None) -> str:
        """Queue a new transaction"""
        
        transaction_id = f"TXQ_{int(time.time())}_{str(uuid.uuid4())[:8].upper()}"
        
        queued_tx = QueuedTransaction(
            id=transaction_id,
            customer_id=customer_id,
            transaction_type=transaction_type,
            amount=amount,
            currency=currency,
            description=description,
            priority=priority,
            scheduled_at=scheduled_at,
            metadata=metadata or {},
            payment_method=payment_method,
            callback_url=callback_url
        )
        
        with self.queue_lock:
            self.queue[transaction_id] = queued_tx
            self.stats['total_queued'] += 1
            self.stats['current_queue_size'] = len(self.queue)
            self.status_counts[queued_tx.status.value] += 1
            self.priority_counts[queued_tx.priority.value] += 1
        
        logger.info(f"Queued transaction {transaction_id} for customer {customer_id}: {transaction_type.value} ${amount}")
        return transaction_id
    
    def get_transaction(self, transaction_id: str) -> Optional[QueuedTransaction]:
        """Get transaction by ID"""
        with self.queue_lock:
            return self.queue.get(transaction_id)
    
    def get_customer_transactions(self, customer_id: str, 
                                 status_filter: List[QueueStatus] = None) -> List[QueuedTransaction]:
        """Get transactions for a customer"""
        with self.queue_lock:
            transactions = []
            for tx in self.queue.values():
                if tx.customer_id == customer_id:
                    if not status_filter or tx.status in status_filter:
                        transactions.append(tx)
            
            # Sort by created_at descending
            return sorted(transactions, key=lambda x: x.created_at, reverse=True)
    
    def cancel_transaction(self, transaction_id: str) -> bool:
        """Cancel a pending transaction"""
        with self.queue_lock:
            tx = self.queue.get(transaction_id)
            if tx and tx.status in [QueueStatus.PENDING, QueueStatus.RETRYING]:
                tx.status = QueueStatus.CANCELLED
                tx.completed_at = datetime.now()
                self._update_transaction_status(tx)
                logger.info(f"Cancelled transaction {transaction_id}")
                return True
            return False
    
    def _update_transaction_status(self, tx: QueuedTransaction):
        """Update transaction status in queue"""
        with self.queue_lock:
            old_status = self.queue.get(tx.id, tx).status if tx.id in self.queue else None
            self.queue[tx.id] = tx
            
            # Update status counts
            if old_status:
                self.status_counts[old_status.value] -= 1
            self.status_counts[tx.status.value] += 1
            
            # Clean up completed transactions after some time
            if tx.status in [QueueStatus.COMPLETED, QueueStatus.FAILED, QueueStatus.CANCELLED]:
                if tx.completed_at and datetime.now() - tx.completed_at > timedelta(hours=24):
                    self._archive_transaction(tx)
    
    def _archive_transaction(self, tx: QueuedTransaction):
        """Archive completed transaction"""
        try:
            # Save to database or archive storage
            # For now, just remove from active queue
            with self.queue_lock:
                if tx.id in self.queue:
                    del self.queue[tx.id]
                    self.stats['current_queue_size'] = len(self.queue)
                    self.status_counts[tx.status.value] -= 1
        except Exception as e:
            logger.error(f"Error archiving transaction {tx.id}: {e}")
    
    def _get_processable_transactions(self) -> List[QueuedTransaction]:
        """Get transactions ready for processing"""
        with self.queue_lock:
            now = datetime.now()
            processable = []
            
            for tx in self.queue.values():
                if (tx.status in [QueueStatus.PENDING, QueueStatus.RETRYING] and 
                    tx.scheduled_at <= now):
                    processable.append(tx)
            
            # Sort by priority (higher first) then by scheduled time
            processable.sort(key=lambda x: (-x.priority.value, x.scheduled_at))
            
            return processable[:self.batch_size]
    
    def _processing_loop(self):
        """Main processing loop"""
        while self.processing_enabled:
            try:
                # Get transactions to process
                transactions_to_process = self._get_processable_transactions()
                
                if not transactions_to_process:
                    time.sleep(1)  # Wait before next check
                    continue
                
                # Process transactions concurrently
                futures = []
                for tx in transactions_to_process:
                    if self.stats['processing_count'] < self.max_workers:
                        future = self.executor.submit(self._process_transaction_sync, tx)
                        futures.append(future)
                        self.stats['processing_count'] += 1
                
                # Wait for some to complete
                if futures:
                    for future in as_completed(futures, timeout=5):
                        try:
                            result = future.result()
                            self.stats['processing_count'] -= 1
                        except Exception as e:
                            logger.error(f"Processing future error: {e}")
                            self.stats['processing_count'] -= 1
                
            except Exception as e:
                logger.error(f"Processing loop error: {e}")
                time.sleep(5)  # Wait longer on error
    
    def _process_transaction_sync(self, tx: QueuedTransaction) -> bool:
        """Synchronous wrapper for async transaction processing"""
        try:
            start_time = time.time()
            
            # Run async processing in a new event loop
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                result = loop.run_until_complete(self.processor.process_transaction(tx))
            finally:
                loop.close()
            
            # Update statistics
            processing_time = time.time() - start_time
            self.stats['total_processed'] += 1
            self.stats['processing_times'].append(processing_time)
            
            # Keep only recent processing times
            if len(self.stats['processing_times']) > 1000:
                self.stats['processing_times'] = self.stats['processing_times'][-500:]
            
            # Update average
            if self.stats['processing_times']:
                self.stats['average_processing_time'] = sum(self.stats['processing_times']) / len(self.stats['processing_times'])
            
            if result:
                self.stats['total_completed'] += 1
            else:
                if tx.status == QueueStatus.FAILED:
                    self.stats['total_failed'] += 1
                elif tx.status == QueueStatus.RETRYING:
                    self.stats['total_retries'] += 1
            
            return result
            
        except Exception as e:
            logger.error(f"Sync processing error for {tx.id}: {e}")
            return False
    
    def get_queue_stats(self) -> Dict[str, Any]:
        """Get queue statistics"""
        with self.queue_lock:
            return {
                **self.stats,
                'current_queue_size': len(self.queue),
                'status_breakdown': dict(self.status_counts),
                'priority_breakdown': dict(self.priority_counts),
                'success_rate': (self.stats['total_completed'] / self.stats['total_processed']) * 100 if self.stats['total_processed'] > 0 else 0
            }
    
    def get_queue_summary(self, limit: int = 20) -> Dict[str, Any]:
        """Get queue summary with recent transactions"""
        with self.queue_lock:
            recent_transactions = sorted(
                self.queue.values(), 
                key=lambda x: x.created_at, 
                reverse=True
            )[:limit]
            
            return {
                'stats': self.get_queue_stats(),
                'recent_transactions': [tx.to_dict() for tx in recent_transactions],
                'pending_count': sum(1 for tx in self.queue.values() if tx.status == QueueStatus.PENDING),
                'processing_count': sum(1 for tx in self.queue.values() if tx.status == QueueStatus.PROCESSING),
                'failed_count': sum(1 for tx in self.queue.values() if tx.status == QueueStatus.FAILED),
                'retrying_count': sum(1 for tx in self.queue.values() if tx.status == QueueStatus.RETRYING)
            }
    
    def cleanup_old_transactions(self, hours: int = 48):
        """Cleanup old completed transactions"""
        cutoff = datetime.now() - timedelta(hours=hours)
        cleaned_count = 0
        
        with self.queue_lock:
            transactions_to_remove = []
            for tx_id, tx in self.queue.items():
                if (tx.status in [QueueStatus.COMPLETED, QueueStatus.FAILED, QueueStatus.CANCELLED] and
                    tx.completed_at and tx.completed_at < cutoff):
                    transactions_to_remove.append(tx_id)
            
            for tx_id in transactions_to_remove:
                del self.queue[tx_id]
                cleaned_count += 1
            
            self.stats['current_queue_size'] = len(self.queue)
        
        if cleaned_count > 0:
            logger.info(f"Cleaned up {cleaned_count} old transactions")
        
        return cleaned_count
    
    def shutdown(self):
        """Shutdown queue manager"""
        self.processing_enabled = False
        if self.processing_thread.is_alive():
            self.processing_thread.join(timeout=10)
        
        self.executor.shutdown(wait=True)
        logger.info("Transaction queue manager shutdown complete")

# Global transaction queue manager
transaction_queue = TransactionQueueManager()

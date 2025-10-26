# SECURITY FIX: Enhanced Registration System with Duplicate Password Protection

"""
Enhanced registration system that prevents duplicate password vulnerabilities
and implements secure customer-telegram account linking.
"""

import json
import hashlib
from typing import Optional, List, Dict, Tuple, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class SecureRegistrationSystem:
    """Enhanced registration system with security controls"""
    db_path: str
    pending_registrations: Any
    
    def __init__(self, db_path: str = "data/customer_database.json") -> None:
        """
        Initialize SecureRegistrationSystem.
        
        Parameters:
            db_path (str): Filesystem path to the JSON customer database. Defaults to "data/customer_database.json".
        
        Details:
            Sets the database path and initializes an in-memory store (`pending_registrations`) used to track
            multi-step registrations that require admin verification (e.g., duplicate-password workflows).
        """
        self.db_path = db_path
        self.pending_registrations = {}  # Temporary storage for multi-step registration
        
    def validate_unique_credentials(self) -> Dict[str, List[str]]:
        """
        Audit database for duplicate passwords and return security report
        
        Returns:
            Dict with duplicate password analysis
        """
        try:
            with open(self.db_path, 'r') as f:
                data = json.load(f)
            
            password_map = {}
            duplicates = {}
            
            # Check for duplicate passwords
            for customer_id, customer_data in data.get('customers', {}).items():
                password = customer_data.get('password', '').upper()
                
                if password in password_map:
                    # Duplicate found
                    if password not in duplicates:
                        duplicates[password] = [password_map[password]]
                    duplicates[password].append(customer_id)
                else:
                    password_map[password] = customer_id
            
            return {
                'duplicate_passwords': duplicates,
                'total_customers': len(data.get('customers', {})),
                'unique_passwords': len(password_map),
                'security_risk_count': len(duplicates)
            }
            
        except Exception as e:
            logger.error(f"Error validating credentials: {e}")
            return {'error': str(e)}
    
    def secure_register_customer(self, customer_id: str, password: str, 
                                telegram_id: int, telegram_username: str = None) -> Dict[str, any]:
        """
        Secure registration with duplicate password protection
        
        Args:
            customer_id: Customer ID to register
            password: Customer password
            telegram_id: Telegram user ID
            telegram_username: Optional Telegram username
            
        Returns:
            Dict with registration result and security info
        """
        try:
            # Step 1: Load database
            with open(self.db_path, 'r') as f:
                data = json.load(f)
            
            customers = data.get('customers', {})
            customer_id = customer_id.upper()
            password = password.upper()
            
            # Step 2: Validate customer exists
            if customer_id not in customers:
                return {
                    'success': False,
                    'error': 'CUSTOMER_NOT_FOUND',
                    'message': 'Customer ID not found in system'
                }
            
            customer = customers[customer_id]
            
            # Step 3: Validate password
            if customer.get('password', '').upper() != password:
                return {
                    'success': False,
                    'error': 'INVALID_PASSWORD',
                    'message': 'Invalid password for this customer'
                }
            
            # Step 4: Check if customer already registered
            if customer.get('telegram_id'):
                return {
                    'success': False,
                    'error': 'ALREADY_REGISTERED',
                    'message': f'Customer {customer_id} is already registered to Telegram ID {customer["telegram_id"]}',
                    'registered_to': customer.get('telegram_username', 'Unknown')
                }
            
            # Step 5: Check for duplicate password security risk
            duplicate_check = self._find_duplicate_passwords(customers, password, customer_id)
            
            if duplicate_check['has_duplicates']:
                # SECURITY RISK: Multiple customers with same password
                logger.warning(f"SECURITY ALERT: Password '{password}' is used by multiple customers: {duplicate_check['customers']}")
                
                # Require additional verification for duplicate passwords
                verification_token = self._generate_verification_token(customer_id, telegram_id)
                
                return {
                    'success': False,
                    'error': 'DUPLICATE_PASSWORD_SECURITY',
                    'message': 'Multiple customers share this password. Additional verification required.',
                    'security_warning': True,
                    'duplicate_customers': duplicate_check['customers'],
                    'verification_required': True,
                    'verification_token': verification_token,
                    'instructions': f'To complete registration, admin must verify customer {customer_id} identity and confirm this Telegram account belongs to them.'
                }
            
            # Step 6: Check if Telegram ID already used
            existing_customer = self._find_customer_by_telegram(customers, telegram_id)
            if existing_customer:
                return {
                    'success': False,
                    'error': 'TELEGRAM_ID_IN_USE',
                    'message': f'This Telegram account is already registered to customer {existing_customer}',
                    'registered_customer': existing_customer
                }
            
            # Step 7: Successful registration
            customer['telegram_id'] = telegram_id
            customer['telegram_username'] = telegram_username
            customer['last_activity'] = datetime.now().isoformat()
            customer['registration_date'] = datetime.now().isoformat()
            
            # Save database
            with open(self.db_path, 'w') as f:
                json.dump(data, f, indent=2)
            
            return {
                'success': True,
                'customer_id': customer_id,
                'balance': customer.get('balance', 0),
                'weekly_pnl': customer.get('weekly_pnl', 0),
                'message': f'Successfully registered customer {customer_id}',
                'security_status': 'SECURE' if not duplicate_check['has_duplicates'] else 'VERIFIED'
            }
            
        except Exception as e:
            logger.error(f"Error in secure registration: {e}")
            return {
                'success': False,
                'error': 'SYSTEM_ERROR',
                'message': 'System error during registration'
            }
    
    def admin_verify_duplicate_password_registration(self, verification_token: str, 
                                                   admin_confirmation: bool) -> Dict[str, any]:
        """
        Admin verification for duplicate password registrations
        
        Args:
            verification_token: Token from initial registration attempt
            admin_confirmation: Admin confirms this registration is legitimate
            
        Returns:
            Final registration result
        """
        try:
            # Decode verification token
            registration_data = self.pending_registrations.get(verification_token)
            if not registration_data:
                return {
                    'success': False,
                    'error': 'INVALID_TOKEN',
                    'message': 'Verification token not found or expired'
                }
            
            if not admin_confirmation:
                # Admin denied registration
                del self.pending_registrations[verification_token]
                return {
                    'success': False,
                    'error': 'ADMIN_DENIED',
                    'message': 'Registration denied by administrator'
                }
            
            # Admin approved - complete registration
            customer_id = registration_data['customer_id']
            telegram_id = registration_data['telegram_id']
            telegram_username = registration_data['telegram_username']
            
            # Complete the registration
            result = self._complete_verified_registration(customer_id, telegram_id, telegram_username)
            
            # Clean up pending registration
            del self.pending_registrations[verification_token]
            
            return result
            
        except Exception as e:
            logger.error(f"Error in admin verification: {e}")
            return {
                'success': False,
                'error': 'SYSTEM_ERROR',
                'message': 'System error during admin verification'
            }
    
    def _find_duplicate_passwords(self, customers: Dict, password: str, 
                                 exclude_customer: str) -> Dict[str, any]:
        """Find other customers using the same password"""
        duplicates = []
        
        for cid, customer_data in customers.items():
            if (cid != exclude_customer and 
                customer_data.get('password', '').upper() == password):
                duplicates.append(cid)
        
        return {
            'has_duplicates': len(duplicates) > 0,
            'customers': duplicates,
            'count': len(duplicates)
        }
    
    def _find_customer_by_telegram(self, customers: Dict, telegram_id: int) -> Optional[str]:
        """Find customer already using this Telegram ID"""
        for cid, customer_data in customers.items():
            if customer_data.get('telegram_id') == telegram_id:
                return cid
        return None
    
    def _generate_verification_token(self, customer_id: str, telegram_id: int) -> str:
        """Generate verification token for pending registration"""
        token_data = f"{customer_id}_{telegram_id}_{datetime.now().timestamp()}"
        token = hashlib.md5(token_data.encode()).hexdigest()[:16]
        
        # Store pending registration
        self.pending_registrations[token] = {
            'customer_id': customer_id,
            'telegram_id': telegram_id,
            'telegram_username': None,
            'created': datetime.now().isoformat()
        }
        
        return token
    
    def _complete_verified_registration(self, customer_id: str, telegram_id: int, 
                                      telegram_username: str) -> Dict[str, any]:
        """Complete a verified registration"""
        try:
            with open(self.db_path, 'r') as f:
                data = json.load(f)
            
            customer = data['customers'][customer_id]
            customer['telegram_id'] = telegram_id
            customer['telegram_username'] = telegram_username
            customer['last_activity'] = datetime.now().isoformat()
            customer['registration_date'] = datetime.now().isoformat()
            customer['verification_status'] = 'ADMIN_VERIFIED'
            
            with open(self.db_path, 'w') as f:
                json.dump(data, f, indent=2)
            
            return {
                'success': True,
                'customer_id': customer_id,
                'balance': customer.get('balance', 0),
                'weekly_pnl': customer.get('weekly_pnl', 0),
                'message': f'Customer {customer_id} registration completed with admin verification',
                'security_status': 'ADMIN_VERIFIED'
            }
            
        except Exception as e:
            logger.error(f"Error completing verified registration: {e}")
            return {
                'success': False,
                'error': 'SYSTEM_ERROR',
                'message': 'Error completing registration'
            }
    
    def generate_security_report(self) -> Dict[str, any]:
        """Generate comprehensive security report"""
        try:
            credential_audit = self.validate_unique_credentials()
            
            with open(self.db_path, 'r') as f:
                data = json.load(f)
            
            customers = data.get('customers', {})
            
            # Registration statistics
            registered_count = sum(1 for c in customers.values() if c.get('telegram_id'))
            unregistered_count = len(customers) - registered_count
            
            # Security risk analysis
            weak_passwords = []
            for cid, customer in customers.items():
                password = customer.get('password', '')
                if len(password) < 6:
                    weak_passwords.append({'customer_id': cid, 'password_length': len(password)})
            
            return {
                'summary': {
                    'total_customers': len(customers),
                    'registered_customers': registered_count,
                    'unregistered_customers': unregistered_count,
                    'duplicate_password_groups': len(credential_audit.get('duplicate_passwords', {})),
                    'weak_passwords': len(weak_passwords)
                },
                'security_risks': {
                    'duplicate_passwords': credential_audit.get('duplicate_passwords', {}),
                    'weak_passwords': weak_passwords,
                    'pending_verifications': len(self.pending_registrations)
                },
                'recommendations': self._generate_security_recommendations(credential_audit, weak_passwords)
            }
            
        except Exception as e:
            logger.error(f"Error generating security report: {e}")
            return {'error': str(e)}
    
    def _generate_security_recommendations(self, credential_audit: Dict, 
                                         weak_passwords: List) -> List[str]:
        """Generate security recommendations"""
        recommendations = []
        
        if credential_audit.get('duplicate_passwords'):
            recommendations.append("🚨 CRITICAL: Update duplicate passwords immediately")
            recommendations.append("📋 Review customer accounts with duplicate passwords for potential security issues")
        
        if weak_passwords:
            recommendations.append("⚠️ Update customers with weak passwords (less than 6 characters)")
        
        if not recommendations:
            recommendations.append("✅ No immediate security risks detected")
        
        recommendations.extend([
            "🔐 Implement password complexity requirements",
            "📱 Enable two-factor authentication for high-value accounts",
            "🔍 Regular security audits of customer credentials",
            "📊 Monitor for suspicious login patterns"
        ])
        
        return recommendations


# Example usage and testing
if __name__ == "__main__":
    # Initialize secure registration system
    secure_reg = SecureRegistrationSystem()
    
    # Generate security audit
    print("🔍 SECURITY AUDIT REPORT")
    print("=" * 50)
    
    audit = secure_reg.validate_unique_credentials()
    print(f"Total customers: {audit.get('total_customers', 0)}")
    print(f"Unique passwords: {audit.get('unique_passwords', 0)}")
    print(f"Duplicate password groups: {len(audit.get('duplicate_passwords', {}))}")
    
    if audit.get('duplicate_passwords'):
        print("\n⚠️ DUPLICATE PASSWORD SECURITY RISKS:")
        for password, customers in audit['duplicate_passwords'].items():
            print(f"Password '{password}' used by: {', '.join(customers)}")
    
    # Test secure registration
    print("\n🧪 TESTING SECURE REGISTRATION")
    print("-" * 30)
    
    # Test normal registration
    result1 = secure_reg.secure_register_customer("BB1043", "I5H8", 123456789, "@testuser")
    print(f"Normal registration: {result1.get('message', 'Failed')}")
    
    # Test duplicate password registration (if any exist)
    if audit.get('duplicate_passwords'):
        first_dup_password = list(audit['duplicate_passwords'].keys())[0]
        first_dup_customer = audit['duplicate_passwords'][first_dup_password][0]
        
        result2 = secure_reg.secure_register_customer(
            first_dup_customer, 
            first_dup_password, 
            987654321, 
            "@duptest"
        )
        print(f"Duplicate password registration: {result2.get('message', 'Failed')}")
        if result2.get('verification_required'):
            print(f"Verification token: {result2.get('verification_token')}")

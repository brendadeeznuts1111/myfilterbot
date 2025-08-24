# Fantdev Trading Bot - Project Standards & Guidelines

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture Standards](#architecture-standards)
3. [Coding Standards](#coding-standards)
4. [Environment Configuration](#environment-configuration)
5. [API Standards](#api-standards)
6. [Security Standards](#security-standards)
7. [Testing Standards](#testing-standards)
8. [Documentation Standards](#documentation-standards)

## 🎯 Project Overview

**Project Name:** Fantdev Trading Bot System  
**Version:** 2.1.0  
**Runtime:** Bun v1.2.20+ (TypeScript) & Python 3.8+ (Bot Core)  
**Primary Technologies:** Telegram Bot API, React, TypeScript, Python, WebSocket, SQLite

### Core Components
- **Telegram Bot Core** - Python-based bot handling trading operations
- **Admin Portal** - TypeScript/React dashboard for administration
- **Customer Portal** - Customer-facing trading interface
- **Worker System** - High-performance background processing
- **API Gateway** - RESTful API for system integration

## 🏗️ Architecture Standards

### Directory Structure
```
myfilterbot/
├── src/                      # Core source code
│   ├── components/          # React components
│   ├── hooks/              # React hooks
│   ├── services/           # Business logic services
│   ├── telegram_dashboard/ # Telegram integration
│   └── branding/           # Branding assets
├── cloudflare-worker/      # Cloudflare Workers
├── logs/                   # Application logs
├── templates/              # HTML templates
├── backup/                 # Legacy code backup
└── test_logs/             # Test execution logs
```

### Module Organization
- **Single Responsibility**: Each module handles one specific domain
- **Dependency Injection**: Use constructor injection for dependencies
- **Interface Segregation**: Define minimal interfaces for contracts
- **Layer Separation**: Maintain clear boundaries between layers

## 💻 Coding Standards

### TypeScript/JavaScript Standards

#### File Naming
- **Components**: PascalCase (e.g., `AdminPanel.tsx`)
- **Utilities**: camelCase (e.g., `formatDate.ts`)
- **Config Files**: kebab-case (e.g., `env.config.ts`)
- **Test Files**: `*.test.ts` or `*.spec.ts`

#### Code Style
```typescript
// Use Bun.env for environment variables
import { config } from './src/env.config';

// Prefer const over let
const API_URL = config.API_BASE_URL;

// Use async/await over promises
async function fetchData(): Promise<Data> {
  try {
    const response = await fetch(API_URL);
    return await response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

// Use TypeScript interfaces
interface Customer {
  id: string;
  balance: number;
  isActive: boolean;
}

// Destructure objects
const { id, balance } = customer;

// Use template literals
const message = `Customer ${id} has balance: $${balance}`;
```

### Python Standards

#### File Naming
- **Modules**: snake_case (e.g., `error_handler.py`)
- **Classes**: PascalCase in file, snake_case filename
- **Constants**: UPPER_SNAKE_CASE

#### Code Style
```python
# Use type hints
from typing import Dict, List, Optional

def process_transaction(
    customer_id: str,
    amount: float,
    transaction_type: str = "deposit"
) -> Dict[str, any]:
    """
    Process a customer transaction.
    
    Args:
        customer_id: Unique customer identifier
        amount: Transaction amount
        transaction_type: Type of transaction (deposit/withdrawal)
    
    Returns:
        Transaction result dictionary
    """
    pass

# Use dataclasses for data structures
from dataclasses import dataclass

@dataclass
class Customer:
    id: str
    balance: float
    active: bool = True

# Handle errors explicitly
try:
    result = process_transaction(customer_id, amount)
except ValueError as e:
    logger.error(f"Transaction failed: {e}")
    raise

# Use context managers
with open('customer_database.json', 'r') as f:
    data = json.load(f)
```

## 🔧 Environment Configuration

### Environment Files
```bash
.env                 # Local development (git ignored)
.env.example         # Template with dummy values (committed)
.env.production      # Production values (git ignored)
.env.test           # Test environment (git ignored)
```

### Required Environment Variables
```env
# Core Configuration
BOT_TOKEN=             # Telegram bot token
ADMIN_CHAT_ID=         # Admin group chat ID
DATABASE_PATH=         # Path to customer database

# Security
JWT_SECRET=            # Min 32 chars for production
SESSION_SECRET=        # Session encryption key

# API Configuration
API_BASE_URL=          # Base API URL
PORTAL_SERVER_PORT=    # Portal server port
ADMIN_SERVER_PORT=     # Admin server port

# Feature Flags
ENABLE_WEBSOCKET=      # Enable WebSocket connections
ENABLE_AUTO_REPORTER=  # Enable automated reporting
ENABLE_ERROR_TRACKING= # Enable error tracking
```

### Using Environment Variables

#### TypeScript
```typescript
import { config } from './src/env.config';

// Access typed configuration
const botToken = config.BOT_TOKEN;
const isProduction = config.NODE_ENV === 'production';

// With validation
import { validateEnv } from './src/env.config';
validateEnv(config);
```

#### Python
```python
import os
from src.config import Config

# Load from environment or config
config = Config.from_env()
bot_token = config.token
admin_chat_id = config.admin_chat_id
```

## 🌐 API Standards

### RESTful Endpoints

#### Naming Convention
- **Collections**: Plural nouns (`/api/customers`, `/api/transactions`)
- **Resources**: Singular with ID (`/api/customer/{id}`)
- **Actions**: Verb as sub-resource (`/api/member/{id}/approve`)

#### HTTP Methods
- **GET**: Retrieve resources
- **POST**: Create new resources
- **PUT**: Full update of resource
- **PATCH**: Partial update
- **DELETE**: Remove resource

#### Response Format
```json
{
  "success": true,
  "data": {
    "customer": {
      "id": "BB1042",
      "balance": 1500
    }
  },
  "message": "Customer retrieved successfully",
  "timestamp": "2025-08-24T10:30:00Z"
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid customer ID format",
    "details": {
      "field": "customer_id",
      "value": "invalid-id"
    }
  },
  "timestamp": "2025-08-24T10:30:00Z"
}
```

### WebSocket Standards

#### Event Naming
- Use snake_case: `balance_update`, `transaction_complete`
- Prefix with domain: `customer_balance_update`, `admin_notification`

#### Message Format
```json
{
  "event": "customer_balance_update",
  "data": {
    "customer_id": "BB1042",
    "balance": 1500,
    "change": 100
  },
  "timestamp": "2025-08-24T10:30:00Z"
}
```

## 🔒 Security Standards

### Authentication
- **JWT Tokens**: Use for API authentication
- **Session Management**: Implement timeout and refresh
- **Password Policy**: Minimum 8 characters, mixed case, numbers

### Data Protection
- **Encryption**: Encrypt sensitive data at rest
- **HTTPS Only**: Enforce HTTPS in production
- **Input Validation**: Validate all user inputs
- **SQL Injection**: Use parameterized queries

### Rate Limiting
```typescript
// Implement rate limiting
const rateLimiter = {
  windowMs: 60000,      // 1 minute
  maxRequests: 100,     // 100 requests per window
  message: "Too many requests"
};
```

### Security Headers
```typescript
// Add security headers
const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Strict-Transport-Security": "max-age=31536000",
  "Content-Security-Policy": "default-src 'self'"
};
```

## 🧪 Testing Standards

### Test Organization
```
tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
├── e2e/           # End-to-end tests
└── fixtures/      # Test data
```

### Test Naming
- **Describe what is being tested**: `test_customer_balance_update`
- **Include expected outcome**: `test_invalid_customer_id_raises_error`
- **Use descriptive assertions**: `expect(balance).toBe(1500)`

### Test Coverage Requirements
- **Minimum Coverage**: 80% code coverage
- **Critical Paths**: 100% coverage for payment/transaction code
- **Edge Cases**: Test boundary conditions and error paths

### Python Testing
```python
import pytest
from unittest.mock import Mock, patch

def test_process_transaction():
    """Test transaction processing with valid data."""
    # Arrange
    customer_id = "BB1042"
    amount = 100.0
    
    # Act
    result = process_transaction(customer_id, amount)
    
    # Assert
    assert result["success"] is True
    assert result["new_balance"] == 1600.0

@pytest.mark.parametrize("amount,expected", [
    (100, True),
    (-50, True),
    (0, False),
])
def test_transaction_amounts(amount, expected):
    """Test various transaction amounts."""
    result = process_transaction("BB1042", amount)
    assert result["success"] is expected
```

### TypeScript Testing
```typescript
import { describe, it, expect, beforeEach } from 'bun:test';

describe('CustomerService', () => {
  let service: CustomerService;
  
  beforeEach(() => {
    service = new CustomerService();
  });
  
  it('should update customer balance', async () => {
    // Arrange
    const customerId = 'BB1042';
    const amount = 100;
    
    // Act
    const result = await service.updateBalance(customerId, amount);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.newBalance).toBe(1600);
  });
  
  it('should handle invalid customer ID', async () => {
    // Act & Assert
    await expect(
      service.updateBalance('invalid', 100)
    ).rejects.toThrow('Invalid customer ID');
  });
});
```

## 📚 Documentation Standards

### Code Documentation

#### TypeScript/JavaScript
```typescript
/**
 * Process a customer transaction.
 * 
 * @param customerId - Unique customer identifier
 * @param amount - Transaction amount in USD
 * @param type - Transaction type (deposit/withdrawal)
 * @returns Transaction result with new balance
 * @throws {ValidationError} If customer ID is invalid
 * @example
 * ```typescript
 * const result = await processTransaction('BB1042', 100, 'deposit');
 * console.log(result.newBalance); // 1600
 * ```
 */
async function processTransaction(
  customerId: string,
  amount: number,
  type: TransactionType
): Promise<TransactionResult> {
  // Implementation
}
```

#### Python
```python
def process_transaction(
    customer_id: str,
    amount: float,
    transaction_type: str = "deposit"
) -> Dict[str, any]:
    """
    Process a customer transaction.
    
    Args:
        customer_id: Unique customer identifier (e.g., 'BB1042')
        amount: Transaction amount in USD
        transaction_type: Type of transaction ('deposit' or 'withdrawal')
    
    Returns:
        dict: Transaction result containing:
            - success (bool): Whether transaction succeeded
            - new_balance (float): Updated customer balance
            - transaction_id (str): Unique transaction ID
    
    Raises:
        ValueError: If customer_id is invalid
        InsufficientFundsError: If withdrawal exceeds balance
    
    Example:
        >>> result = process_transaction('BB1042', 100.0, 'deposit')
        >>> print(result['new_balance'])
        1600.0
    """
    pass
```

### README Standards
Every module should have a README with:
1. **Purpose**: What the module does
2. **Installation**: Setup instructions
3. **Usage**: Code examples
4. **API Reference**: Available functions/classes
5. **Configuration**: Required settings
6. **Testing**: How to run tests

### Commit Message Standards
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test additions/changes
- `chore`: Build/tool changes

**Examples:**
```bash
feat(portal): Add customer balance dashboard
fix(bot): Handle timeout in transaction processing
docs(api): Update WebSocket event documentation
test(customer): Add balance update test cases
```

## 🚀 Performance Standards

### Response Times
- **API Endpoints**: < 200ms average
- **Database Queries**: < 50ms
- **WebSocket Events**: < 100ms latency
- **Page Load**: < 3 seconds

### Resource Limits
- **Memory Usage**: < 512MB per process
- **CPU Usage**: < 70% sustained
- **Connection Pool**: Max 100 concurrent
- **File Uploads**: Max 10MB

### Optimization Guidelines
- **Use Caching**: Implement Redis caching for frequently accessed data
- **Batch Operations**: Group database operations
- **Lazy Loading**: Load resources on demand
- **Connection Pooling**: Reuse database connections

## 🔄 Version Control Standards

### Branch Naming
- **Feature**: `feature/add-customer-dashboard`
- **Bugfix**: `fix/transaction-timeout-error`
- **Hotfix**: `hotfix/critical-payment-bug`
- **Release**: `release/v2.1.0`

### Pull Request Guidelines
1. **Title**: Clear description of changes
2. **Description**: What, why, and how
3. **Testing**: Evidence of testing
4. **Screenshots**: For UI changes
5. **Breaking Changes**: Clearly marked

### Code Review Checklist
- [ ] Code follows project standards
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No sensitive data exposed
- [ ] Performance impact considered
- [ ] Error handling implemented
- [ ] Security implications reviewed

## 📊 Monitoring Standards

### Logging Levels
- **ERROR**: System errors requiring attention
- **WARN**: Potential issues
- **INFO**: Important events
- **DEBUG**: Detailed debugging info

### Metrics to Track
- **Response Times**: API endpoint latency
- **Error Rates**: Errors per minute
- **Transaction Volume**: Transactions per hour
- **User Activity**: Active users per day
- **System Health**: CPU, memory, disk usage

### Alert Thresholds
- **Error Rate**: > 1% triggers alert
- **Response Time**: > 500ms triggers warning
- **Memory Usage**: > 80% triggers alert
- **Failed Transactions**: > 5 in 5 minutes

---

## 📝 Summary

These standards ensure consistency, maintainability, and quality across the Fantdev Trading Bot system. All contributors should familiarize themselves with these guidelines and apply them consistently.

**Last Updated:** August 24, 2025  
**Version:** 1.0.0  
**Maintained By:** Fantdev Development Team
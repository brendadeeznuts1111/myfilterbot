# Development Guide - Fantdev Trading Bot

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Bun 1.2.20+
- Git
- Telegram Bot Token
- Admin Chat ID

### Initial Setup

```bash
# Clone repository
git clone https://github.com/fantdev/myfilterbot.git
cd myfilterbot

# Setup environment
cp config/env.example .env
# Edit .env with your configuration

# Install dependencies
pip install -r config/requirements_enhanced.txt
bun install

# Start admin portal (recommended first)
ADMIN_PASSWORD=your_password PORT=3000 bun run src/admin-server.ts

# Or start individual services
bun run dev:admin      # Admin portal
bun run dev:bot        # Telegram bot
bun run dev:server     # Main server
```

### ⚠️ **IMPORTANT: Configuration Best Practices**

**DO NOT** create new YAML parsers or configuration systems. The codebase already has a **comprehensive, production-ready** configuration system at `src/utils/yaml-config.ts`.

**✅ CORRECT:**
```typescript
import { getConfig } from '@/utils/yaml-config';
const appConfig = await getConfig('app.yaml');
```

**❌ WRONG:**
```typescript
// Don't do this - duplicates existing functionality
import { parse } from "yaml";
import { expandEnv } from "./env-expander";
```

See [Configuration Best Practices](./CONFIGURATION_BEST_PRACTICES.md) for complete guidelines.

## 🛠️ Development Environment

### Environment Configuration

Create a `.env` file in the project root:

```env
# Core Configuration
BOT_TOKEN=your_bot_token_here
ADMIN_CHAT_ID=your_admin_chat_id
DATABASE_PATH=customer_database.json

# API Configuration
API_BASE_URL=http://localhost:3003/api
PORTAL_SERVER_PORT=5000
ADMIN_SERVER_PORT=3003

# Security
JWT_SECRET=generate_32_char_secret_here
SESSION_SECRET=generate_session_secret_here

# Development Settings
NODE_ENV=development
DEBUG_MODE=true
LOG_LEVEL=debug
```

### VS Code Setup

Recommended extensions:
- Python
- Pylance
- ESLint
- Prettier
- TypeScript
- Bun for Visual Studio Code

`.vscode/settings.json`:
```json
{
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": true,
  "python.formatting.provider": "black",
  "editor.formatOnSave": true,
  "typescript.tsdk": "node_modules/typescript/lib",
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[python]": {
    "editor.defaultFormatter": "ms-python.black-formatter"
  }
}
```

## 📁 Project Structure

```
myfilterbot/
├── src/                    # Core source code
│   ├── components/        # React components
│   ├── hooks/            # React hooks
│   ├── services/         # Business logic
│   ├── telegram_dashboard/ # Telegram integration
│   ├── utils/            # Utilities (including YAML config)
│   ├── bot/              # Python bot implementation
│   └── server/           # Server implementations
├── config/                # Configuration files
│   ├── *.yaml            # YAML configuration files
│   ├── environments/     # Environment-specific configs
│   └── env.config.ts     # Environment variables
├── templates/             # HTML templates
├── logs/                 # Application logs
├── tests/                # Test suites
│   ├── typescript/       # TypeScript tests
│   └── python/           # Python tests
└── main_bot.py          # Bot entry point
```

## ⚙️ **Configuration System**

### **Current Implementation Status** ✅

The project has a **comprehensive, production-ready** configuration system:

- **YAML Configuration**: `src/utils/yaml-config.ts` - Full-featured with hot-reload
- **Environment Variables**: `config/env.config.ts` - Centralized environment config
- **Feature Flags**: Built-in feature flag system with rollout percentages
- **Hot-Reload**: Automatic configuration reloading during development
- **Caching**: Performance-optimized with intelligent caching
- **Validation**: Schema validation support with Zod

### **Key Configuration Files**
- `config/app.yaml` - Main application configuration
- `config/features.yaml` - Feature flags and toggles
- `config/telegram.yaml` - Telegram bot configuration
- `config/database.yaml` - Database connection settings
- `config/services.yaml` - Service configurations

### **Usage Examples**
```typescript
// Load configuration
import { getConfig } from '@/utils/yaml-config';
const appConfig = await getConfig('app.yaml');

// Use feature flags
import { isFeatureEnabled } from '@/utils/yaml-config';
const isDebugMode = await isFeatureEnabled('debug_mode');

// Hot-reload support
import { configManager } from '@/utils/yaml-config';
configManager.watch('app.yaml', (newConfig) => {
  console.log('Configuration updated!');
});
```

**⚠️ Important:** Do not create new configuration systems. Use the existing robust system.

## 🔧 Development Workflow

### 1. Feature Development

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes
# ... edit files ...

# Run tests
python3 test_integration.py
bun test

# Commit changes
git add .
git commit -m "feat: add new feature"

# Push to remote
git push origin feature/your-feature-name
```

### 2. Running Services

#### Telegram Bot
```bash
# Development mode with hot reload
python3 main_bot.py

# With debug output
DEBUG_MODE=true python3 main_bot.py
```

#### Admin Portal
```bash
# Development server
bun run admin_portal_server.ts

# With watch mode
bun --watch admin_portal_server.ts
```

#### Customer Portal
```bash
# Start portal server
python3 portal_server.py

# Or TypeScript version
bun run enhanced_admin_server.ts
```

### 3. Database Management

#### View Database
```python
python3
>>> import json
>>> with open('customer_database.json') as f:
...     data = json.load(f)
>>> print(json.dumps(data, indent=2))
```

#### Reset Database
```bash
# Backup current
cp customer_database.json customer_database.backup.json

# Reset to default
cp customer_database.default.json customer_database.json
```

## 🧪 Testing

### Python Tests

```bash
# Run all tests
python3 -m pytest

# Specific test file
python3 test_integration.py

# With coverage
python3 -m pytest --cov=src

# Verbose output
python3 test_integration.py -v
```

### TypeScript/Bun Tests

```bash
# Run all tests
bun test

# Specific test
bun test src/report_worker.test.ts

# Watch mode
bun test --watch

# Coverage
bun test --coverage
```

### Manual Testing

1. **Bot Commands**
```
/start - Initialize bot
/register BB1042 password - Register customer
/balance - Check balance
/help - Show help
/admin - Admin commands (admin only)
/stats - Show statistics (admin only)
```

2. **API Endpoints**
```bash
# Health check
curl http://localhost:3003/health

# Get customers
curl http://localhost:3003/api/customers

# Get member stats
curl http://localhost:3003/api/stats
```

3. **WebSocket Testing**
```javascript
// Browser console
const ws = new WebSocket('ws://localhost:3004');
ws.onmessage = (e) => console.log('Message:', e.data);
ws.send(JSON.stringify({event: 'subscribe', type: 'all'}));
```

## 🐛 Debugging

### Python Debugging

#### Using pdb
```python
import pdb

def process_transaction(customer_id, amount):
    pdb.set_trace()  # Breakpoint
    # ... rest of code
```

#### Logging
```python
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

logger.debug("Debug message")
logger.info("Info message")
logger.error("Error message")
```

### TypeScript Debugging

#### Console Debugging
```typescript
console.log('Debug:', variable);
console.error('Error:', error);
console.table(data);
console.time('operation');
// ... code ...
console.timeEnd('operation');
```

#### Bun Inspector
```bash
# Start with inspector
bun --inspect admin_portal_server.ts

# Open chrome://inspect in Chrome
```

### Common Issues

#### Bot Not Responding
```bash
# Check bot token
echo $BOT_TOKEN

# Test connection
curl https://api.telegram.org/bot${BOT_TOKEN}/getMe

# Check logs
tail -f logs/bot.log
```

#### Database Lock
```bash
# Remove lock file
rm customer_database.json.lock

# Check permissions
ls -la customer_database.json
```

#### Port Already in Use
```bash
# Find process
lsof -i :5000

# Kill process
kill -9 <PID>
```

## 🚢 Deployment

### Production Build

```bash
# Build TypeScript
bun build ./admin_portal_server.ts --outdir ./dist

# Minify assets
bun build ./src/index.tsx --minify --outdir ./dist

# Create production env
cp .env.production .env
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM oven/bun:latest as builder
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun build ./admin_portal_server.ts --outdir ./dist

FROM oven/bun:slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

CMD ["bun", "run", "dist/admin_portal_server.js"]
```

### Environment Variables for Production

```env
NODE_ENV=production
DEBUG_MODE=false
LOG_LEVEL=error
JWT_SECRET=<secure_32_char_secret>
SESSION_SECRET=<secure_session_secret>
ENABLE_METRICS=true
RATE_LIMIT_ENABLED=true
```

## 📊 Monitoring

### Application Logs

```bash
# View logs
tail -f logs/app.log

# Error logs
tail -f logs/error.log

# Filter by date
grep "2025-08-24" logs/app.log
```

### Performance Monitoring

```python
# Add to main_bot.py
import psutil

def log_performance():
    cpu = psutil.cpu_percent()
    memory = psutil.virtual_memory().percent
    logger.info(f"CPU: {cpu}%, Memory: {memory}%")
```

### Health Checks

```bash
# Create health check script
#!/bin/bash
curl -f http://localhost:3003/health || exit 1
curl -f http://localhost:5000/health || exit 1
```

## 🔐 Security

### Secrets Management

Never commit secrets. Use environment variables:

```bash
# Generate secrets
openssl rand -hex 32  # For JWT_SECRET
openssl rand -hex 16  # For SESSION_SECRET
```

### Input Validation

Always validate user input:

```python
def validate_customer_id(customer_id: str) -> bool:
    """Validate customer ID format."""
    import re
    pattern = r'^BB\d{4}$'
    return bool(re.match(pattern, customer_id))
```

### Rate Limiting

Implement rate limiting:

```typescript
const rateLimiter = {
  requests: new Map(),
  check(ip: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(ip) || [];
    const recent = requests.filter(t => now - t < 60000);
    
    if (recent.length >= 100) return false;
    
    recent.push(now);
    this.requests.set(ip, recent);
    return true;
  }
};
```

## 📝 Code Style

### Python Style Guide

Follow PEP 8:
```python
# Good
def calculate_balance(customer_id: str, amount: float) -> float:
    """Calculate new balance after transaction."""
    pass

# Bad
def calc(c,a):
    pass
```

### TypeScript Style Guide

```typescript
// Good
interface Customer {
  id: string;
  balance: number;
  isActive: boolean;
}

async function updateBalance(
  customerId: string,
  amount: number
): Promise<Customer> {
  // Implementation
}

// Bad
function update(c: any, a: any) {
  // Implementation
}
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Ensure all tests pass
5. Submit pull request

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Added new tests
- [ ] Updated documentation

## Screenshots (if applicable)
```

## 📚 Resources

- [Python Telegram Bot Documentation](https://docs.python-telegram-bot.org/)
- [Bun Documentation](https://bun.sh/docs)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Project Standards](./PROJECT_STANDARDS.md)

---

**Last Updated:** August 24, 2025  
**Maintained By:** Fantdev Development Team
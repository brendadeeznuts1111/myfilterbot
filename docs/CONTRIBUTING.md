# 🤝 Contributing to Fantdev Trading Bot

Welcome! We're excited that you want to contribute to the Fantdev Trading Bot project. This guide will help you get started quickly and effectively.

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [Development Setup](#development-setup)
3. [Code Standards](#code-standards)
4. [Testing Guidelines](#testing-guidelines)
5. [Pull Request Process](#pull-request-process)
6. [Code Review](#code-review)

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have:

- **Python 3.8+** installed
- **Bun 1.2.20+** runtime
- **Git** for version control
- A **Telegram Bot Token** for testing (get from [@BotFather](https://t.me/botfather))

### First-Time Setup

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/your-username/myfilterbot.git
   cd myfilterbot
   ```

2. **Set up environment:**
   ```bash
   # Copy environment template
   cp config/env.example .env

   # Edit with your test credentials
   nano .env
   ```

3. **Install dependencies:**
   ```bash
   # Install Python dependencies
   pip install -r config/requirements_enhanced.txt

   # Install Bun dependencies
   bun install
   ```

4. **Verify setup:**
   ```bash
   # Run all tests to ensure everything works
   bun run ci
   ```

## 🔧 Development Setup

### Running the Application

**Start all services in development mode:**
```bash
bun run dev
```

**Or start individual services:**
```bash
bun run dev:bot       # Python bot only
bun run dev:server    # Admin server only
bun run dev:web       # React dev server only
```

### Development Tools

- **Hot Reload**: All services support hot reload during development
- **Type Checking**: Run `bun run type-check` for TypeScript validation
- **Linting**: Run `bun run lint` for code quality checks
- **Testing**: Run `bun test` for TypeScript tests, `pytest` for Python tests

## 📝 Code Standards

### General Guidelines

- Follow the [Documentation Style Guide](docs/DOCUMENTATION_STYLE_GUIDE.md)
- Read the [Project Standards](docs/development/PROJECT_STANDARDS.md)
- Use consistent naming conventions from [NAMING_CONVENTIONS.md](NAMING_CONVENTIONS.md)

### TypeScript/JavaScript

- Use **TypeScript** for all new code
- Follow **ESLint** and **Prettier** configurations
- Use **async/await** over promises
- Include **JSDoc** comments for public APIs

### Python

- Follow **PEP 8** style guidelines
- Use **type hints** for all functions
- Include **docstrings** for all public functions
- Use **dataclasses** for data structures

### Commit Messages

Follow conventional commit format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Examples:**
```bash
feat(bot): add customer balance alerts
fix(api): handle timeout in transaction processing
docs(readme): update installation instructions
test(customer): add balance update test cases
```

## 🧪 Testing Guidelines

### Running Tests

```bash
# Run all tests
bun run test:all

# Run specific test suites
bun run test:ts        # TypeScript tests
bun run test:python    # Python tests

# Run with coverage
bun run test:coverage
```

### Writing Tests

- **Unit tests**: Test individual functions/methods
- **Integration tests**: Test component interactions
- **End-to-end tests**: Test complete user workflows
- **Minimum 80% coverage** for new code

### Test Structure

**TypeScript:**
```typescript
import { describe, it, expect } from 'bun:test';

describe('CustomerService', () => {
  it('should update customer balance', async () => {
    // Arrange
    const service = new CustomerService();

    // Act
    const result = await service.updateBalance('BB1042', 100);

    // Assert
    expect(result.success).toBe(true);
  });
});
```

**Python:**
```python
import pytest

def test_process_transaction():
    """Test transaction processing with valid data."""
    # Arrange
    customer_id = "BB1042"
    amount = 100.0

    # Act
    result = process_transaction(customer_id, amount)

    # Assert
    assert result["success"] is True
```

## 🔄 Pull Request Process

### Before Submitting

1. **Run quality checks:**
   ```bash
   bun run ci
   ```

2. **Update documentation** if needed

3. **Add tests** for new functionality

4. **Test manually** in development environment

### PR Guidelines

1. **Clear title**: Describe what the PR does
2. **Detailed description**: Explain the what, why, and how
3. **Link issues**: Reference related issues
4. **Screenshots**: Include for UI changes
5. **Breaking changes**: Clearly mark any breaking changes

### PR Template

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
- [ ] Added tests for new functionality
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project standards
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No sensitive data exposed
```

## 👀 Code Review

### Review Checklist

- [ ] **Functionality**: Code works as intended
- [ ] **Standards**: Follows project coding standards
- [ ] **Tests**: Adequate test coverage
- [ ] **Documentation**: Updated where necessary
- [ ] **Security**: No security vulnerabilities
- [ ] **Performance**: No performance regressions

### Review Process

1. **Automated checks** must pass
2. **At least one approval** from maintainer
3. **All conversations resolved**
4. **Up-to-date** with main branch

## 🆘 Getting Help

- **Documentation**: Check [docs/](docs/) directory
- **Issues**: Search existing issues first
- **Discussions**: Use GitHub Discussions for questions
- **Discord**: Join our development Discord (link in README)

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing!** 🎉

**Last Updated:** August 25, 2025
**Version:** 1.0.0

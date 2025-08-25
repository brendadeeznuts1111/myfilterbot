# 🚀 Bunx for Bot Development - Advanced Package Execution Guide

## Overview

`bunx --package` provides reliable, fast package execution for bot development workflows, eliminating binary resolution conflicts and improving CI/CD performance.

## 🎯 Key Benefits

- **Reliable Execution**: Explicit package specification prevents binary conflicts
- **Faster CI/CD**: Eliminates package lookup overhead
- **Multiple Binary Support**: Run different binaries from the same package
- **Scoped Package Support**: Handle scoped packages correctly
- **Custom User-Agents**: Better API identification and rate limiting

## 📦 Installation

Bunx is included with Bun 1.0.0+. No additional installation required.

```bash
# Verify Bun version
bun --version

# Should be 1.0.0 or higher
```

## 🔧 Basic Usage

### Standard Package Execution

```bash
# Execute a package directly
bunx --package typescript tsc --noEmit

# Execute with custom User-Agent
bunx --package typescript --user-agent "Fantdev-Build/3.0.0" tsc --noEmit
```

### Multiple Binary Support

```bash
# Run different binaries from the same package
bunx --package renovate renovate-config-validator
bunx --package renovate renovate-github

# Scoped packages
bunx -p @angular/cli ng new my-app
bunx -p @vue/cli vue create my-project
```

## 🤖 Bot Development Workflows

### TypeScript Compilation

```bash
# Fast type checking for bot code
bunx --package typescript tsc --noEmit --skipLibCheck

# With custom User-Agent for monitoring
bunx --package typescript \
  --user-agent "Fantdev-Bot-Build/3.0.0" \
  tsc --noEmit --skipLibCheck
```

### Code Quality Tools

```bash
# ESLint for bot code quality
bunx --package eslint eslint src/bot/**/*.ts

# Prettier for code formatting
bunx --package prettier prettier --write src/bot/**/*.ts

# Type checking with custom config
bunx --package typescript tsc --project tsconfig.bot.json
```

### Testing and Validation

```bash
# Run Jest tests for bot logic
bunx --package jest jest tests/bot/

# Run Vitest for fast testing
bunx --package vitest vitest run tests/bot/

# Validate bot configuration
bunx --package ajv-cli ajv validate -s config/bot-schema.json -d config/bot-config.json
```

## 🔄 CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/bot-ci.yml
name: Bot CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  bot-quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      
      - name: Install dependencies
        run: bun install
      
      - name: Type check bot code
        run: |
          bunx --package typescript \
            --user-agent "Fantdev-CI/3.0.0" \
            tsc --noEmit --skipLibCheck
      
      - name: Lint bot code
        run: |
          bunx --package eslint eslint src/bot/**/*.ts
      
      - name: Test bot functionality
        run: |
          bunx --package jest jest tests/bot/ --coverage
      
      - name: Validate bot config
        run: |
          bunx --package ajv-cli ajv validate \
            -s config/bot-schema.json \
            -d config/bot-config.json
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - quality
  - test
  - deploy

bot-quality:
  stage: quality
  image: oven/bun:latest
  script:
    - bun install
    - bunx --package typescript tsc --noEmit
    - bunx --package eslint eslint src/bot/**/*.ts
    - bunx --package prettier prettier --check src/bot/**/*.ts
  only:
    - merge_requests

bot-test:
  stage: test
  image: oven/bun:latest
  script:
    - bun install
    - bunx --package jest jest tests/bot/ --coverage
  coverage: '/All files[^|]*\|[^|]*\|[^|]*\|[^|]*\|[^|]*\s+(\d+)/'
  only:
    - main
    - develop
```

## 🚀 Advanced Bot Workflows

### Multi-Package Bot Development

```bash
# Bot framework development
bunx --package typescript tsc --project tsconfig.bot.json
bunx --package eslint eslint src/bot/**/*.ts
bunx --package prettier prettier --write src/bot/**/*.ts
bunx --package jest jest tests/bot/ --coverage

# Bot deployment
bunx --package wrangler wrangler deploy --env production
bunx --package vercel vercel --prod

# Bot monitoring
bunx --package lighthouse lighthouse https://bot.example.com
bunx --package pa11y pa11y https://bot.example.com
```

### Bot Configuration Management

```bash
# Validate bot configuration
bunx --package ajv-cli ajv validate \
  -s config/bot-schema.json \
  -d config/bot-config.json

# Generate bot documentation
bunx --package typedoc typedoc src/bot/index.ts

# Bundle bot code
bunx --package esbuild esbuild src/bot/index.ts --bundle --outdir=dist/
```

### Bot Testing and Quality

```bash
# Run bot tests with coverage
bunx --package jest jest tests/bot/ \
  --coverage \
  --collectCoverageFrom="src/bot/**/*.ts" \
  --coverageReporters=text,lcov,html

# Performance testing
bunx --package autocannon autocannon -c 100 -d 30 http://localhost:3000/api/bot

# Load testing
bunx --package artillery artillery run tests/load/bot-load-test.yml
```

## 🔧 Custom Scripts

### Package.json Scripts

```json
{
  "scripts": {
    "bot:type-check": "bunx --package typescript tsc --noEmit --skipLibCheck",
    "bot:lint": "bunx --package eslint eslint src/bot/**/*.ts",
    "bot:format": "bunx --package prettier prettier --write src/bot/**/*.ts",
    "bot:test": "bunx --package jest jest tests/bot/ --coverage",
    "bot:validate": "bunx --package ajv-cli ajv validate -s config/bot-schema.json -d config/bot-config.json",
    "bot:build": "bunx --package esbuild esbuild src/bot/index.ts --bundle --outdir=dist/",
    "bot:deploy": "bunx --package wrangler wrangler deploy --env production"
  }
}
```

### Shell Scripts

```bash
#!/bin/bash
# scripts/bot-quality.sh

echo "🔍 Running bot code quality checks..."

# Type checking
echo "📝 Type checking..."
bunx --package typescript \
  --user-agent "Fantdev-Bot-Quality/3.0.0" \
  tsc --noEmit --skipLibCheck

if [ $? -eq 0 ]; then
  echo "✅ Type checking passed"
else
  echo "❌ Type checking failed"
  exit 1
fi

# Linting
echo "🧹 Linting..."
bunx --package eslint eslint src/bot/**/*.ts

if [ $? -eq 0 ]; then
  echo "✅ Linting passed"
else
  echo "❌ Linting failed"
  exit 1
fi

# Formatting
echo "🎨 Formatting..."
bunx --package prettier prettier --check src/bot/**/*.ts

if [ $? -eq 0 ]; then
  echo "✅ Formatting passed"
else
  echo "❌ Formatting failed"
  exit 1
fi

echo "🎉 All bot quality checks passed!"
```

## 📊 Performance Monitoring

### Custom User-Agent Tracking

```bash
# Track different build types
bunx --package typescript \
  --user-agent "Fantdev-Bot-Dev/3.0.0" \
  tsc --noEmit

bunx --package typescript \
  --user-agent "Fantdev-Bot-CI/3.0.0" \
  tsc --noEmit

bunx --package typescript \
  --user-agent "Fantdev-Bot-Prod/3.0.0" \
  tsc --noEmit
```

### Build Time Monitoring

```bash
# Time bot builds
time bunx --package typescript tsc --noEmit

# Compare with npm
time npx typescript tsc --noEmit

# Compare with yarn
time yarn dlx typescript tsc --noEmit
```

## 🚨 Troubleshooting

### Common Issues

#### Issue: Package Not Found
```bash
# Problem: bunx can't find package
bunx typescript tsc --noEmit

# Solution: Use --package flag
bunx --package typescript tsc --noEmit
```

#### Issue: Binary Resolution Conflicts
```bash
# Problem: Multiple packages with same binary name
bunx eslint src/**/*.ts

# Solution: Specify exact package
bunx --package eslint eslint src/**/*.ts
```

#### Issue: Scoped Package Problems
```bash
# Problem: Scoped package execution fails
bunx @angular/cli ng new my-app

# Solution: Use -p flag
bunx -p @angular/cli ng new my-app
```

### Debug Mode

```bash
# Enable debug output
DEBUG=* bunx --package typescript tsc --noEmit

# Verbose package resolution
bunx --package typescript --verbose tsc --noEmit
```

## 🔍 Best Practices

1. **Always Use --package**: Prevents binary resolution conflicts
2. **Custom User-Agents**: Track different execution contexts
3. **Package Versioning**: Specify versions for reproducible builds
4. **Error Handling**: Check exit codes in CI/CD scripts
5. **Performance Monitoring**: Track build times and optimize
6. **Documentation**: Document all bot development workflows

## 📚 Additional Resources

- [Bun Documentation](https://bun.sh/docs/cli/bunx)
- [TypeScript Compiler Options](https://www.typescriptlang.org/docs/handbook/compiler-options.html)
- [ESLint Configuration](https://eslint.org/docs/user-guide/configuring)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)
- [GitHub Actions](https://docs.github.com/en/actions)
- [GitLab CI](https://docs.gitlab.com/ee/ci/)

---

**Bunx for Bot Development Guide** | Last Updated: December 2024 | FantDev Trading Platform
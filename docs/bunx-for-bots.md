# Bunx for Bot Development: Advanced Scenarios

## Overview

`bunx` is Bun's package runner that allows you to execute packages without installing them globally. This guide covers advanced `bunx --package` scenarios specifically designed for bot development in the Fantdev Trading Bot project.

## Key Benefits for Bot Development

- **No Global Dependencies**: Run tools without polluting your system
- **Version Pinning**: Ensure consistent tool versions across environments
- **CI/CD Friendly**: Perfect for automated bot deployment pipelines
- **Performance**: Faster than npm/npx due to Bun's optimizations

## Basic Usage Patterns

### Running Development Tools

```bash
# Run TypeScript compiler
bunx --package typescript tsc --version

# Run ESLint
bunx --package eslint eslint src/ --ext .ts

# Run Prettier
bunx --package prettier prettier --write src/
```

### Bot-Specific Tools

```bash
# Run Telegram Bot API tools
bunx --package @grammyjs/runner grammy-runner src/bot/telegram_bot.ts

# Run Discord Bot tools
bunx --package discord.js discord.js --version

# Run Trading Bot testing tools
bunx --package jest jest --testPathPattern=src/bot/
```

## Advanced Bot Development Scenarios

### 1. Bot Testing and Validation

```bash
# Run bot health checks
bunx --package @types/jest jest --testPathPattern=health --verbose

# Validate bot configuration
bunx --package ajv-cli ajv validate -s config/schema.json -d config/bot.yml

# Test bot API endpoints
bunx --package newman newman run tests/postman/bot-api.json
```

### 2. Bot Deployment and CI/CD

```bash
# Deploy bot to production
bunx --package pm2 pm2 start src/bot/telegram_bot.ts --name "fantdev-bot"

# Run bot in Docker
bunx --package docker-compose docker-compose up -d bot

# Deploy to cloud platforms
bunx --package serverless serverless deploy --stage production
```

### 3. Bot Monitoring and Analytics

```bash
# Monitor bot performance
bunx --package clinic clinic doctor -- node src/bot/telegram_bot.ts

# Generate bot analytics reports
bunx --package lighthouse lighthouse --output=json --output-path=reports/

# Monitor bot logs
bunx --package pino-pretty pino-pretty < bot.log
```

## Package Management Strategies

### Version Pinning

```bash
# Pin specific versions for consistency
bunx --package typescript@5.0.0 tsc --version
bunx --package eslint@8.0.0 eslint --version
bunx --package prettier@3.0.0 prettier --version
```

### Multiple Package Execution

```bash
# Run multiple tools in sequence
bunx --package typescript tsc && \
bunx --package eslint eslint src/ && \
bunx --package prettier prettier --check src/
```

### Custom Package Scripts

```bash
# Create custom bot development scripts
bunx --package tsx tsx scripts/bot-dev.ts

# Run custom bot validation
bunx --package tsx tsx scripts/validate-bot-config.ts
```

## Bot Development Workflows

### 1. Development Environment Setup

```bash
#!/bin/bash
# scripts/setup-bot-dev.sh

echo "Setting up bot development environment..."

# Install development dependencies
bunx --package typescript tsc --init
bunx --package eslint eslint --init
bunx --package prettier prettier --init

# Setup bot configuration
bunx --package tsx tsx scripts/setup-bot-config.ts

echo "Bot development environment ready!"
```

### 2. Bot Testing Pipeline

```bash
#!/bin/bash
# scripts/test-bot.sh

echo "Running bot test pipeline..."

# Type checking
bunx --package typescript tsc --noEmit

# Linting
bunx --package eslint eslint src/bot/ --ext .ts

# Unit tests
bunx --package jest jest --testPathPattern=src/bot/

# Integration tests
bunx --package jest jest --testPathPattern=integration/

# E2E tests
bunx --package playwright playwright test

echo "Bot test pipeline completed!"
```

### 3. Bot Deployment Pipeline

```bash
#!/bin/bash
# scripts/deploy-bot.sh

echo "Deploying bot..."

# Build bot
bunx --package typescript tsc

# Run tests
bunx --package jest jest --testPathPattern=src/bot/

# Deploy to staging
bunx --package pm2 pm2 deploy staging

# Health check
bunx --package curl curl -f http://staging-bot:3000/health

# Deploy to production
bunx --package pm2 pm2 deploy production

echo "Bot deployment completed!"
```

## Integration with Project Scripts

### Package.json Scripts

```json
{
  "scripts": {
    "bot:dev": "bunx --package tsx tsx src/bot/telegram_bot.ts",
    "bot:test": "bunx --package jest jest --testPathPattern=src/bot/",
    "bot:lint": "bunx --package eslint eslint src/bot/ --ext .ts",
    "bot:format": "bunx --package prettier prettier --write src/bot/",
    "bot:build": "bunx --package typescript tsc",
    "bot:deploy": "bunx --package pm2 pm2 start src/bot/telegram_bot.ts"
  }
}
```

### Custom Bot Scripts

```typescript
// scripts/bot-utils.ts
import { execSync } from "child_process";

export class BotUtils {
  static runCommand(command: string): string {
    try {
      return execSync(command, { encoding: 'utf8' });
    } catch (error) {
      console.error(`Command failed: ${command}`);
      throw error;
    }
  }

  static validateBotConfig(): boolean {
    try {
      this.runCommand('bunx --package ajv-cli ajv validate -s config/schema.json -d config/bot.yml');
      return true;
    } catch {
      return false;
    }
  }

  static runBotTests(): boolean {
    try {
      this.runCommand('bunx --package jest jest --testPathPattern=src/bot/ --passWithNoTests');
      return true;
    } catch {
      return false;
    }
  }
}
```

## Performance Optimization

### Parallel Execution

```bash
# Run multiple bot tools in parallel
bunx --package typescript tsc --noEmit &
bunx --package eslint eslint src/bot/ &
bunx --package prettier prettier --check src/bot/ &
wait
```

### Caching Strategies

```bash
# Use Bun's built-in caching
BUN_CACHE_DIR=.bun-cache bunx --package typescript tsc

# Cache test results
bunx --package jest jest --cache --testPathPattern=src/bot/
```

## Troubleshooting

### Common Issues

1. **Package Not Found**: Ensure the package name is correct
2. **Version Conflicts**: Use specific version pins when needed
3. **Permission Issues**: Check file permissions and ownership

### Debug Mode

```bash
# Enable verbose logging
DEBUG=* bunx --package typescript tsc

# Show package resolution
bunx --package typescript --verbose tsc --version
```

## Best Practices

### 1. Version Consistency

```bash
# Use package.json for version management
bunx --package typescript@$(node -p "require('./package.json').devDependencies.typescript") tsc
```

### 2. Error Handling

```bash
# Always check exit codes
bunx --package typescript tsc || exit 1
bunx --package eslint eslint src/ || exit 1
```

### 3. Documentation

```bash
# Document tool versions
echo "Tool versions:" > tools-versions.txt
bunx --package typescript tsc --version >> tools-versions.txt
bunx --package eslint eslint --version >> tools-versions.txt
```

## Integration Examples

### GitHub Actions

```yaml
# .github/workflows/bot-test.yml
name: Bot Testing
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bunx --package typescript tsc --noEmit
      - run: bunx --package eslint eslint src/bot/
      - run: bunx --package jest jest --testPathPattern=src/bot/
```

### Docker Integration

```dockerfile
# Dockerfile.bot
FROM oven/bun:1

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install

COPY . .
RUN bunx --package typescript tsc

CMD ["bunx", "--package", "pm2", "pm2-runtime", "start", "dist/bot/telegram_bot.js"]
```

## Resources

- [Bunx Documentation](https://bun.sh/docs/cli/bunx)
- [Bun Package Management](https://bun.sh/docs/install)
- [Bun Performance Guide](https://bun.sh/docs/guides/performance)
- [Bun CI/CD Integration](https://bun.sh/docs/guides/ci-cd)
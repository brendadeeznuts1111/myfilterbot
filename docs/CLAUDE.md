# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development
```bash
# Start all services (recommended for development)
bun run dev                    # Runs bot + server + web concurrently

# Start individual services
bun run dev:bot               # Python bot only
bun run dev:server            # TypeScript admin server only  
bun run dev:web               # React development server only
bun run dev:admin             # Admin mobile interface only
```

### Production
```bash
bun run start                 # Start production services
bun run start:prod           # Same as above
bun run start:bot            # Production bot only
bun run start:server         # Production server only
```

### Build & Testing
```bash
bun run build                # Build with defines (uses scripts/build-with-defines.js)
bun run test                 # Run all tests (Python + TypeScript)
bun run test:ts              # TypeScript tests only
bun run test:python          # Python tests with pytest
bun run test:coverage        # Tests with coverage reports
bun run test:ci              # CI-compatible test run with JUnit output
```

### Code Quality
```bash
bun run lint                 # ESLint for TypeScript/React
bun run lint:fix             # Auto-fix linting issues
bun run lint:python          # Ruff linting for Python
bun run lint:python:fix      # Auto-fix Python linting
bun run format              # Prettier formatting
bun run format:python       # Black + isort for Python
bun run type-check          # TypeScript type checking
bun run quality:all         # Run all quality checks
bun run ci                  # Complete CI pipeline
```

### Cloudflare Workers
```bash
bun run worker:dev          # Develop Cloudflare worker locally
bun run worker:build        # Build worker for deployment  
bun run worker:deploy       # Deploy to Cloudflare
```

## Architecture Overview

This is a **hybrid Python-TypeScript system** with the following key components:

### Core Bot System (`src/bot/`)
- **Python-based Telegram bot** using python-telegram-bot library
- Entry point: `src/bot/main.py` 
- Modular handler system with chat tracking, transaction monitoring, and admin controls
- Uses JSON files for customer data persistence
- Integrates with TypeScript services via HTTP APIs and WebSockets

### TypeScript Server Infrastructure (`src/server/`)
- **High-performance Bun runtime** with native YAML/SQL support
- Admin server: `src/server/admin/index.ts` with YAML-based configuration
- REST API endpoints in `src/server/api/` for customer management
- Worker threads for background processing (report generation, WebSocket handling)
- Authentication via JWT with RBAC system

### React Web Interface (`src/web/`)
- **React 19** with TypeScript
- Component library: 23+ production-ready components in `src/web/components/`
- Real-time dashboard with WebSocket integration
- Custom hooks for API integration and authentication
- Responsive design with dark/light theme support

### Configuration System
- **YAML-first configuration** in `config/` directory
- Environment-specific configs: `config/environments/`
- Feature flags and service definitions in YAML
- Bun defines for dead code elimination

## Important Development Notes

### Project Structure Conventions
- **TypeScript/React**: PascalCase for components, kebab-case for utilities
- **Python**: snake_case throughout (see NAMING_CONVENTIONS.md)
- **Path aliases**: Use `@server/*`, `@web/*`, `@api/*`, etc. (defined in tsconfig.json)

### Technology Stack
- **Runtime**: Bun 1.2.20+ (leverages native YAML, SQL, and WebSocket features)
- **Bot Framework**: python-telegram-bot for Telegram integration  
- **Frontend**: React 19 + TypeScript with Tailwind CSS
- **Testing**: Bun test runner + pytest for Python
- **Linting**: ESLint + TypeScript ESLint + Ruff for Python

### Key Features
- **Worker Threads**: Background processing with Bun's high-performance worker implementation
- **Real-time Updates**: WebSocket-based live dashboard updates
- **Transaction Monitoring**: Regex-based pattern detection for financial transactions
- **Multi-customer Support**: JSON-based customer database with balance tracking
- **Cloudflare Integration**: Worker deployment for webhook handling

### Configuration Management
- Main app config: `config/app.yaml`
- Database config: `config/database.yaml`
- Feature flags: `config/features.yaml`
- Environment variables: Use `.env` files (see `config/env.example`)

### Testing Strategy
- **Unit tests**: `tests/unit/` (TypeScript) and `tests/python/` (Python)
- **Integration tests**: `tests/integration/` for full system testing
- **Coverage requirement**: 80% line coverage enforced by bunfig.toml
- **CI/CD**: Automated testing with JUnit XML output

### Performance Optimizations
- Bun defines for dead code elimination in production builds
- Native YAML imports (no runtime parsing overhead)
- Worker thread pooling for CPU-intensive operations  
- SQLite with optimized connection management
- Static asset optimization with Tailwind CSS

## Common Development Tasks

### Adding New API Endpoints
1. Define routes in `src/server/api/`
2. Add TypeScript types in `src/shared/types.ts`
3. Update React components to use new endpoints
4. Add corresponding tests in `tests/unit/` and `tests/integration/`

### Bot Command Development
1. Add handlers in `src/bot/handlers/handlers.py`
2. Register commands in `src/bot/main.py`
3. Update customer database schema if needed
4. Test with development Telegram bot

### React Component Development
1. Create components in `src/web/components/`
2. Use existing hooks from `src/web/hooks/`
3. Follow responsive design patterns
4. Add Storybook stories if applicable

## Troubleshooting

### Common Issues
- **Bun native features not working**: Check Bun version >= 1.2.20
- **TypeScript path resolution**: Verify `tsconfig.json` path aliases
- **Python imports failing**: Ensure `src/` is in PYTHONPATH
- **WebSocket connection issues**: Check CORS settings and port configuration

### Debug Commands
```bash
bun --version                # Verify Bun version
bun run type-check          # Check TypeScript configuration
python3 -c "import sys; print(sys.path)"  # Check Python path
bun test tests/config-test.test.ts  # Verify configuration
```
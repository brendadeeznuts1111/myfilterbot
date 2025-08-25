# Naming Conventions & Patterns

## File Naming Standards

### TypeScript/JavaScript Files
- **Components**: PascalCase (e.g., `ErrorBoundary.tsx`, `Dashboard.tsx`)
- **Utilities/Hooks**: kebab-case (e.g., `use-api.ts`, `date-utils.ts`)
- **Configuration**: kebab-case (e.g., `env.config.ts`, `tailwind.config.js`)
- **Entry Points**: kebab-case (e.g., `dev-server.ts`, `build.ts`)

### Python Files
- **Modules**: snake_case (e.g., `payment_gateway.py`, `chat_manager.py`)
- **Classes**: PascalCase (used within files)
- **Functions/Variables**: snake_case
- **Test Files**: snake_case with `.test.py` suffix (e.g., `handlers.test.py`)

### Configuration/Script Files
- **Scripts**: kebab-case (e.g., `enhanced-verify.sh`, `setup-integration.sh`)
- **Config Files**: kebab-case (e.g., `seo-config.json`, `customer-config.json`)

### Directory Naming
- **General**: kebab-case (e.g., `src/web/hooks/`, `src/server/admin/`)
- **React Components**: PascalCase if multi-file component (e.g., `components/Dashboard/`)

## Naming Patterns to Avoid
- `_enhanced`, `_v2`, `_seo_update`, `_integrated`, `_FIX` suffixes
- Redundant naming (e.g., `admin_admin_api.ts`)
- Generic names without context
- Mixed casing in same project

## API Endpoint Naming
- RESTful conventions with kebab-case
- Consistent prefixes: `/api/admin/`, `/api/payment/`, `/api/customer/`
- Plural nouns for resources: `/api/customers/`, `/api/transactions/`

## Service/Module Naming
- Be descriptive about functionality
- Avoid redundant context already provided by directory
- Use consistent suffixes: `service`, `manager`, `handler`, `api`

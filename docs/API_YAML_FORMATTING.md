# YAML Formatting API Documentation

## Overview

The YAML Formatting API provides endpoints for validating, formatting, and managing YAML configuration files. These endpoints integrate with the existing YAML configuration system and provide enhanced error handling and formatting capabilities.

## Base URL

```
http://localhost:3000/api
```

## Authentication

All endpoints require JWT authentication via the `Authorization` header or `dashboard_session` cookie.

---

## Endpoints

### 1. Enhanced YAML Configuration Save

**POST** `/api/yaml/{configName}`

Enhanced version of the existing YAML save endpoint with optional formatting.

#### Parameters

| Parameter | Type | Location | Description |
|-----------|------|----------|-------------|
| `configName` | string | path | Name of the configuration file (without extension) |
| `content` | string | body | YAML content to save |
| `format` | boolean | body | Optional. Whether to format the YAML before saving (default: false) |

#### Request Body

```json
{
  "content": "app:\n  name: fantdev-trading-bot\n  version: 2.1.0",
  "format": true
}
```

#### Response

**Success (200)**
```json
{
  "success": true,
  "message": "Configuration features saved successfully",
  "path": "./config/features.yaml",
  "formatted": true,
  "metrics": {
    "lines": 45,
    "keys": 23,
    "complexObjects": 12,
    "arrayItems": 8
  },
  "warnings": [
    "Feature 'newFeature' missing description. Add description for documentation."
  ],
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Error (400)**
```json
{
  "success": false,
  "error": "YAML formatting failed: Expected token",
  "errors": ["YAML Parse Error: Expected token"],
  "warnings": [],
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

### 2. YAML Formatting Operations

**POST** `/api/yaml-format/{action}`

Perform formatting operations on YAML content without saving to file.

#### Actions

- `format` - Format YAML with consistent styling
- `validate` - Validate YAML structure and provide warnings
- `normalize` - Normalize YAML to standard formatting

#### Parameters

| Parameter | Type | Location | Description |
|-----------|------|----------|-------------|
| `action` | string | path | Operation to perform: `format`, `validate`, or `normalize` |
| `content` | string | body | YAML content to process |
| `filename` | string | body | Optional. Filename for context in error messages |

#### Request Body

```json
{
  "content": "features:\n  newDashboard:\n    enabled: true\n    rolloutPercentage: 100",
  "filename": "features.yaml"
}
```

#### Response - Format Action

**Success (200)**
```json
{
  "success": true,
  "formatted": "features:\n  newDashboard:\n    enabled: true\n    rolloutPercentage: 100\n    description: \"Enhanced dashboard\"\n",
  "errors": [],
  "warnings": [
    "Feature 'newDashboard' missing description. Add description for documentation."
  ],
  "metrics": {
    "lines": 6,
    "keys": 4,
    "complexObjects": 2,
    "arrayItems": 0
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

#### Response - Validate Action

**Success (200)**
```json
{
  "success": true,
  "errors": [],
  "warnings": [
    "Feature 'newDashboard' missing description. Add description for documentation.",
    "Found 2 lines with trailing whitespace."
  ],
  "metrics": {
    "lines": 8,
    "keys": 4,
    "complexObjects": 2,
    "arrayItems": 0
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

#### Response - Normalize Action

**Success (200)**
```json
{
  "success": true,
  "normalized": "features:\n  newDashboard:\n    enabled: true\n    rolloutPercentage: 100\n",
  "message": "YAML normalized successfully",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

### 3. Batch YAML Operations

**POST** `/api/yaml-batch`

Perform batch operations on multiple YAML configurations.

#### Parameters

| Parameter | Type | Location | Description |
|-----------|------|----------|-------------|
| `operation` | string | body | Operation to perform: `validate` or `format` |
| `configs` | array | body | Array of configuration objects |

#### Request Body

```json
{
  "operation": "validate",
  "configs": [
    {
      "name": "app.yaml",
      "content": "app:\n  name: fantdev-trading-bot\n  version: 2.1.0"
    },
    {
      "name": "features.yaml", 
      "content": "features:\n  newDashboard:\n    enabled: true"
    }
  ]
}
```

#### Response

**Success (200)**
```json
{
  "success": true,
  "operation": "validate",
  "results": [
    {
      "name": "app.yaml",
      "result": {
        "valid": true,
        "errors": [],
        "warnings": [],
        "metrics": {
          "lines": 4,
          "keys": 3,
          "complexObjects": 1,
          "arrayItems": 0
        }
      }
    },
    {
      "name": "features.yaml",
      "result": {
        "valid": true,
        "errors": [],
        "warnings": [
          "Feature 'newDashboard' missing 'rolloutPercentage' property.",
          "Feature 'newDashboard' missing description."
        ],
        "metrics": {
          "lines": 4,
          "keys": 2,
          "complexObjects": 2,
          "arrayItems": 0
        }
      }
    }
  ],
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

## Validation Rules

### Project-Specific Validations

#### Feature Flags (`features.yaml`)
- **Required fields**: `enabled`, `rolloutPercentage`, `description`
- **Valid rolloutPercentage**: 0-100
- **Description**: Should be present for documentation

#### Agent Configuration (`agents.yml`)
- **Required fields**: `id`, `name`, `status`
- **Valid commission_rate**: 0-1 (if present)
- **Status values**: `active`, `suspended`, etc.

#### Server Configuration
- **Required sections**: `bot`, `admin`, `api`, `websocket`
- **Required fields per section**: `port`, `host` (recommended)

#### Environment Variables
- **Pattern**: `${VAR_NAME:-default}` or `${VAR_NAME}`
- **Warning**: Required variables without defaults in production configs

#### Security Checks
- **Hardcoded secrets**: Warns about potential secrets not using environment variables
- **Base64 patterns**: Detects potential encoded secrets
- **Secret keywords**: `password`, `secret`, `key`, `token`, `api_key`, `private`

### General Formatting Rules

#### Indentation
- **Standard**: 2 spaces (consistent with project)
- **No tabs**: Warns about tab usage
- **Consistent spacing**: Detects mixed indentation

#### Comments
- **Format**: `# comment` (space after hash)
- **Consistency**: Warns about mixed comment styles

#### Line Length
- **Limit**: 120 characters
- **Warning**: Lines exceeding limit

#### Whitespace
- **Trailing spaces**: Detected and warned
- **Blank lines**: Proper spacing between sections

---

## Error Codes

| HTTP Status | Description |
|-------------|-------------|
| 200 | Success |
| 400 | Invalid YAML syntax or validation failure |
| 401 | Unauthorized (missing or invalid JWT token) |
| 404 | Configuration file not found |
| 500 | Internal server error |

---

## Examples

### Format a Feature Flag Configuration

```bash
curl -X POST "http://localhost:3000/api/yaml-format/format" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "features:\n  newDashboard:\n    enabled:true\n    rolloutPercentage:   100",
    "filename": "features.yaml"
  }'
```

### Save and Format Configuration

```bash
curl -X POST "http://localhost:3000/api/yaml/features" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "features:\n  newDashboard:\n    enabled: true\n    rolloutPercentage: 100\n    description: \"New dashboard\"",
    "format": true
  }'
```

### Validate Multiple Configurations

```bash
curl -X POST "http://localhost:3000/api/yaml-batch" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "validate",
    "configs": [
      {
        "name": "app.yaml",
        "content": "app:\n  name: fantdev-trading-bot"
      }
    ]
  }'
```

---

## Integration with Existing System

### Hot Reload Support
- Changes to configuration files trigger hot reload when using `bun --hot`
- Formatted configurations maintain compatibility with existing imports

### Error Logging
- All operations integrate with the centralized error logging system
- Errors are logged with structured context for debugging

### Caching
- Validation results can be cached for performance
- Cache-busting headers prevent stale configuration issues

### TypeScript Integration
- Works seamlessly with existing YAML imports: `import config from './config/app.yaml'`
- Maintains type safety and tree-shaking benefits

---

## Best Practices

1. **Always validate** before saving configurations
2. **Use formatting** to maintain consistency across team
3. **Check warnings** for potential security and structure issues
4. **Test changes** with batch validation before deployment
5. **Keep descriptions** up to date for feature flags
6. **Use environment variables** for sensitive configuration values

---

## Rate Limiting

All endpoints are subject to the global rate limit:
- **Window**: 60 seconds  
- **Max requests**: 100 per window
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
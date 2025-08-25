# YAML API Quick Reference

## 🚀 Quick Start

All endpoints require JWT authentication. Base URL: `http://localhost:3000/api`

## 📋 Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| **POST** | `/yaml/{config}` | Save YAML config (enhanced with formatting) |
| **GET** | `/yaml/{config}` | Load YAML config |
| **POST** | `/yaml-format/format` | Format YAML content |
| **POST** | `/yaml-format/validate` | Validate YAML structure |
| **POST** | `/yaml-format/normalize` | Normalize YAML formatting |
| **POST** | `/yaml-batch` | Batch validate/format multiple configs |

## 🔧 Common Operations

### Format YAML
```bash
curl -X POST /api/yaml-format/format \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"content":"app:\n name:test","filename":"app.yaml"}'
```

### Save with Formatting  
```bash
curl -X POST /api/yaml/features \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"content":"features:\n  test: true","format":true}'
```

### Validate Configuration
```bash
curl -X POST /api/yaml-format/validate \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"content":"features:\n  test:\n    enabled: true"}'
```

### Batch Validation
```bash
curl -X POST /api/yaml-batch \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"operation":"validate","configs":[{"name":"app.yaml","content":"..."}]}'
```

## ✅ Response Examples

### Successful Format
```json
{
  "success": true,
  "formatted": "app:\n  name: test\n",
  "warnings": [],
  "metrics": {"lines": 2, "keys": 1}
}
```

### Validation with Warnings
```json
{
  "success": true,
  "warnings": [
    "Feature 'test' missing 'rolloutPercentage' property.",
    "Feature 'test' missing description."
  ],
  "metrics": {"lines": 3, "keys": 2}
}
```

### Error Response
```json
{
  "success": false,
  "error": "YAML Parse Error: Expected token",
  "errors": ["Invalid YAML syntax at line 2"]
}
```

## ⚠️ Validation Rules

### Feature Flags
- ✅ `enabled` (required)
- ✅ `rolloutPercentage: 0-100` (required)  
- ✅ `description` (recommended)

### Agent Config
- ✅ `id`, `name`, `status` (required)
- ✅ `commission_rate: 0-1` (if present)

### Security Checks
- ⚠️ Hardcoded secrets detection
- ⚠️ Missing environment variable defaults
- ⚠️ Base64 encoded values

### Formatting Standards
- 📏 2-space indentation
- 📏 120 character line limit
- 📏 No trailing whitespace
- 📏 Consistent comment spacing

## 🔐 Authentication

Include JWT token in one of these ways:

**Header:**
```bash
Authorization: Bearer YOUR_JWT_TOKEN
```

**Cookie:**
```bash
Cookie: dashboard_session=YOUR_JWT_TOKEN
```

## 🎯 Integration Tips

1. **Hot Reload**: Changes work with `bun --hot`
2. **Type Safety**: Maintains TypeScript imports
3. **Error Logging**: All operations logged centrally
4. **Caching**: Results cached for performance
5. **Batch Operations**: Process multiple configs efficiently

## 📊 Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Invalid YAML or validation failure |
| 401 | Authentication required |
| 404 | Configuration file not found |
| 500 | Server error |

---

**Full Documentation**: [API_YAML_FORMATTING.md](./API_YAML_FORMATTING.md)
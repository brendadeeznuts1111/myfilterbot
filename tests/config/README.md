# YAML Configuration Validation

This directory contains comprehensive validation tests for all YAML configuration files in the system, ensuring configuration integrity and preventing runtime errors.

## Files

### `yaml-validation.test.ts`
Comprehensive test suite that validates:
- ✅ YAML syntax for all `.yml` and `.yaml` files
- ✅ Schema validation for critical configurations
- ✅ Required key validation
- ✅ Type checking for data structures
- ✅ Cross-reference validation (agents ↔ masters)
- ✅ Data integrity checks

### Test Coverage

#### Agent Configuration (`agents.yml`)
- Agent structure and required fields
- Master structure and required fields
- Commission configuration validation
- Agent ID uniqueness
- Agent-master relationship validation
- Commission rate boundaries (0 < rate < 1)
- Customer assignment integrity

#### Telegram Configuration (`telegram.yml`, `telegram.yaml`)
- Bot token presence
- VIP configuration validation
- Fraud detection settings
- Multiple configuration format support

#### Database Configuration (`database.yaml`)
- Connection configurations (PostgreSQL, Redis, ClickHouse)
- Environment variable format validation
- Pool settings validation
- Required connection fields

#### Cross-Reference Validation
- Agents reference valid masters
- Masters correctly list their agents
- Unique telegram IDs across all users
- Unique agent and master codes

#### Data Integrity
- No duplicate customer assignments
- Positive integer customer IDs
- Valid financial amounts
- Valid date formats

## Usage

### Run All Tests
```bash
# Run the comprehensive test suite
bun test tests/config/yaml-validation.test.ts

# Run with verbose output
bun test tests/config/yaml-validation.test.ts --verbose
```

### Quick Validation Script
```bash
# Validate all YAML files
bun scripts/validate-config.ts

# Validate specific file
bun scripts/validate-config.ts config/agents.yml

# Verbose output with warnings
bun scripts/validate-config.ts --verbose
```

### Integration Testing
```bash
# Test customer-agent data integration
bun scripts/test-integration.ts
```

## Expected Output

### Successful Validation
```
bun test v1.2.21-canary.123 (7c45ed97)

 25 pass
 0 fail
 340 expect() calls
Ran 25 tests across 1 file. [19.00ms]
```

### Quick Script Success
```
🔍 YAML Configuration Validation Results
==================================================
✅ All 19 configuration files are valid!
```

### Integration Test Results
```
📊 Summary Statistics:
   Total Customers: 3,142
   Total Agents: 5
   Total Masters: 3
   Assigned Customers: 24
   Assignment Rate: 0.8%
   Avg Customers/Agent: 4.8

💰 Commission Analysis:
   Average Rate: 5.20%
   Min Rate: 4.50%
   Max Rate: 6.00%
```

## CI/CD Integration

Add to your build pipeline:

```yaml
# In your CI/CD pipeline
- name: Validate YAML Configuration
  run: |
    bun test tests/config/yaml-validation.test.ts
    bun scripts/validate-config.ts
    bun scripts/test-integration.ts
```

## Adding New Validations

To add validation for a new configuration file:

1. **Add to test suite**: Update `yaml-validation.test.ts` with specific validation rules
2. **Add to quick script**: Update `scripts/validate-config.ts` with file-specific validation
3. **Update interfaces**: Add TypeScript interfaces for new configuration structures

### Example: Adding New Config Validation

```typescript
// In yaml-validation.test.ts
describe("New Config Validation", () => {
  test("newconfig.yml has valid structure", () => {
    const config = configCache.get("newconfig.yml");
    expect(config.requiredField).toBeDefined();
    expect(typeof config.numericField).toBe('number');
  });
});

// In validate-config.ts
if (filename === "newconfig.yml") {
  this.validateNewConfig(content, result);
}
```

## Benefits

- **🚀 Fast Feedback**: Catches configuration issues immediately
- **🛡️ Prevents Runtime Errors**: Validates before deployment
- **📚 Living Documentation**: Tests document configuration requirements
- **🔄 CI/CD Ready**: Easy integration with build pipelines
- **👥 Developer Friendly**: Clear error messages and warnings

## Performance

- All validations complete in ~20ms
- 340+ validation checks across 19 configuration files
- Zero false positives with proper error/warning classification
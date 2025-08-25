# Tests Directory

This directory contains all automated tests for the Fantdev Trading Bot platform, organized by technology and purpose.

## Structure

```
tests/
├── python/                 # Python unit, integration, and system tests
│   └── ...                 # Individual Python test files (e.g., test_*.py)
├── typescript/             # TypeScript/JavaScript unit and integration tests
│   ├── demo/               # Demonstration test files (e.g., for specific features)
│   │   └── ...             # Individual demo test files
│   ├── rbac/               # Role-Based Access Control (RBAC) specific tests
│   │   └── rbac.test.ts
│   └── ...                 # All other TypeScript/JavaScript test files (e.g., *.test.ts)
└── README.md               # This file
```

## How to Run Tests

All tests can be run using the `bun test` command, which leverages Bun's built-in test runner.

### Run All Tests

To run all Python and TypeScript/JavaScript tests:

```bash
bun test
```

### Run Specific Test Suites

You can run tests for a specific language or directory:

#### Python Tests

To run all Python tests:

```bash
bun test tests/python/
# Or, if configured in package.json scripts:
bun run test:python
```

#### TypeScript/JavaScript Tests

To run all TypeScript/JavaScript tests:

```bash
bun test tests/typescript/
# Or, if configured in package.json scripts:
bun run test:ts
```

#### Specific Sub-directories (e.g., RBAC tests)

```bash
bun test tests/typescript/rbac/
```

### Run Tests with Coverage

To generate a test coverage report:

```bash
bun test --coverage
```

### Run Specific Test Files

To run tests from a particular file:

```bash
bun test tests/python/test_security_integration.py
bun test tests/typescript/web_analysis.test.ts
```

### Demo Tests

Demo test files are located in `tests/typescript/demo/`. You can run them individually if needed:

```bash
bun test tests/typescript/demo/demo_analytics_suite.ts
```

## Test Dependencies

Test dependencies are managed via `package.json` for TypeScript/JavaScript tests and `config/requirements_enhanced.txt` for Python tests.

## Continuous Integration

Tests are integrated into the CI/CD pipeline to ensure code quality and prevent regressions. Refer to the CI/CD configuration for details.

## Troubleshooting

- Ensure all dependencies are installed (`bun install` and `pip install -r config/requirements_enhanced.txt`).
- Check the console output for detailed error messages.
- Verify that services required for integration tests are running.

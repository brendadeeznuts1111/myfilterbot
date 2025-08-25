# Contributing to Fantdev Trading Bot

This guide provides a "golden path" for new contributors to get started quickly and effectively.

## 1. Setup Your Development Environment

To set up your local development environment, follow these steps:

1.  **Install Dependencies:**
    ```bash
    bun install
    ```

2.  **Set up Python Virtual Environment:**
    ```bash
    python -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    ```

## 2. Run the Application

To start both the bot and the web portal in watch mode:

```bash
bun dev
```

## 3. Before Pushing Your Changes

Before pushing your changes to a pull request, ensure your code passes all health checks:

```bash
bun run ci
```

This command will run linting, type checking, and all tests (TypeScript and Python) to ensure code quality and prevent regressions.

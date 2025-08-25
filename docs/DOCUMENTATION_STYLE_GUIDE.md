# 📚 Documentation Style Guide

## Overview

This style guide establishes consistent standards for all documentation in the Fantdev Trading Bot project. Following these guidelines ensures professional, maintainable, and user-friendly documentation.

## 🎯 Core Principles

1. **Clarity**: Write for your audience - be clear and concise
2. **Consistency**: Follow established patterns and conventions
3. **Completeness**: Provide all necessary information
4. **Currency**: Keep documentation up-to-date with code changes
5. **Accessibility**: Make content accessible to all skill levels

## 📝 Markdown Standards

### File Structure

Every documentation file should follow this structure:

```markdown
# Title (H1 - Only one per file)

Brief description of the document's purpose.

## Table of Contents (if >5 sections)

## Section 1 (H2)

### Subsection (H3)

#### Sub-subsection (H4 - use sparingly)

## Additional Sections

## Footer Information
```

### Headers

- **H1 (`#`)**: Document title only - one per file
- **H2 (`##`)**: Main sections
- **H3 (`###`)**: Subsections
- **H4 (`####`)**: Use sparingly for detailed breakdowns

```markdown
# Document Title
## Main Section
### Subsection
#### Detailed Point (avoid if possible)
```

### Emojis

Use emojis consistently for visual hierarchy and readability:

- **📚** Documentation/guides
- **🚀** Getting started/quick start
- **⚙️** Configuration/setup
- **🔧** Development/tools
- **🧪** Testing
- **🔒** Security
- **📊** Analytics/monitoring
- **🌐** API/web services
- **💡** Tips/best practices
- **⚠️** Warnings/important notes
- **✅** Completed items/success
- **❌** Errors/failures
- **🔍** Troubleshooting

### Code Blocks

Always specify the language for syntax highlighting:

```markdown
```bash
npm install
```

```typescript
const config = {
  apiUrl: 'https://api.example.com'
};
```

```python
def process_transaction(amount: float) -> bool:
    return amount > 0
```
```

### Lists

**Unordered Lists:**
```markdown
- First item
- Second item
  - Nested item
  - Another nested item
- Third item
```

**Ordered Lists:**
```markdown
1. First step
2. Second step
   1. Sub-step
   2. Another sub-step
3. Third step
```

### Links

**Internal Links:**
```markdown
[Setup Guide](docs/setup/QUICKSTART.md)
[API Documentation](docs/api/API_DOCUMENTATION.md)
```

**External Links:**
```markdown
[Bun Runtime](https://bun.sh/)
[React Documentation](https://react.dev/)
```

### Tables

Use tables for structured data:

```markdown
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Value 1  | Value 2  | Value 3  |
| Value 4  | Value 5  | Value 6  |
```

### Callouts

Use blockquotes for important information:

```markdown
> **Note:** This is important information that users should be aware of.

> **Warning:** This action cannot be undone.

> **Tip:** Use this approach for better performance.
```

## 🏗️ Document Types

### README Files

Every README should include:

1. **Project Title & Description**
2. **Key Features** (bullet points)
3. **Installation Instructions**
4. **Quick Start Guide**
5. **Project Structure** (if applicable)
6. **Usage Examples**
7. **Contributing Guidelines** (link)
8. **License Information**

### API Documentation

API docs should follow this structure:

```markdown
## Endpoint Name

### `METHOD /api/endpoint`

Brief description of what this endpoint does.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `param1` | string | Yes | Description |
| `param2` | number | No | Description |

#### Request Example

```json
{
  "param1": "value",
  "param2": 123
}
```

#### Response Example

```json
{
  "success": true,
  "data": {
    "result": "value"
  }
}
```

#### Error Responses

- `400 Bad Request`: Invalid parameters
- `401 Unauthorized`: Authentication required
- `404 Not Found`: Resource not found
```

### Setup Guides

Setup documentation should include:

1. **Prerequisites** (system requirements)
2. **Step-by-step installation**
3. **Configuration instructions**
4. **Verification steps**
5. **Troubleshooting common issues**

## 📋 Content Standards

### Terminology

Use consistent terminology throughout all documentation:

- **Project Name**: "Fantdev Trading Bot" (official name)
- **Repository**: "myfilterbot" (technical name)
- **Components**: Use exact names from codebase
- **File Paths**: Always use forward slashes, relative to project root

### Code Examples

All code examples must:

1. **Work as written** - test all examples
2. **Include context** - show imports/setup when needed
3. **Use realistic data** - avoid "foo/bar" examples
4. **Follow project conventions** - match actual codebase style

### Version Information

Always include version information:

```markdown
**Version:** 2.1.0
**Last Updated:** August 25, 2025
**Compatibility:** Bun 1.2.20+, Python 3.8+
```

### File Paths

Use consistent path formatting:

```markdown
- Relative paths: `src/bot/main.py`
- Directory references: `src/bot/`
- Configuration files: `config/env.example`
```

## 🔧 Technical Writing Guidelines

### Voice and Tone

- **Active voice**: "Run the command" not "The command should be run"
- **Present tense**: "The bot processes messages" not "The bot will process"
- **Direct instructions**: "Install dependencies" not "You might want to install"
- **Professional but friendly**: Avoid overly casual language

### Sentence Structure

- **Keep sentences concise** - aim for 15-20 words
- **One idea per sentence**
- **Use parallel structure** in lists
- **Avoid jargon** without explanation

### Common Patterns

**Installation Steps:**
```markdown
1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **Configure environment:**
   ```bash
   cp config/env.example .env
   ```

3. **Start the application:**
   ```bash
   bun run dev
   ```
```

**Feature Descriptions:**
```markdown
### Feature Name

Brief description of what the feature does and why it's useful.

**Key Benefits:**
- Benefit 1
- Benefit 2
- Benefit 3

**Usage Example:**
```typescript
// Code example showing how to use the feature
```
```

## 📊 Quality Checklist

Before publishing documentation, verify:

- [ ] **Accuracy**: All information is current and correct
- [ ] **Completeness**: All necessary information is included
- [ ] **Clarity**: Content is easy to understand
- [ ] **Consistency**: Follows style guide standards
- [ ] **Code Examples**: All examples work as written
- [ ] **Links**: All links are valid and working
- [ ] **Grammar**: No spelling or grammar errors
- [ ] **Formatting**: Proper markdown formatting
- [ ] **Structure**: Logical organization and flow

## 🔄 Maintenance

### Regular Updates

Documentation should be updated when:

- Code functionality changes
- New features are added
- Dependencies are updated
- Configuration requirements change
- User feedback indicates confusion

### Review Process

1. **Author Review**: Self-review using quality checklist
2. **Technical Review**: Verify technical accuracy
3. **Editorial Review**: Check for clarity and consistency
4. **User Testing**: Test instructions with fresh eyes

---

**Style Guide Version:** 1.0.0
**Last Updated:** August 25, 2025
**Maintained By:** Fantdev Development Team
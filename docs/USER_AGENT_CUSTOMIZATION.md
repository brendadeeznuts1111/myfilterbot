# User-Agent Customization with Bun CLI

Bun CLI provides a powerful `--user-agent` flag that allows you to override the default User-Agent header for all HTTP requests made using `fetch()` within your application.

## Overview

The `--user-agent` flag is useful for:
- Identifying your application to external services
- APIs that require a specific User-Agent
- Testing different User-Agent behaviors
- Compliance with service requirements

## Basic Usage

```bash
# Run with a custom user agent
bun --user-agent "MyCustomApp/1.0" your-script.ts

# Without the flag, it uses the default
bun your-script.ts
```

## Examples

### 1. Custom Application Identity

```bash
bun --user-agent "Fantdev-Trading-Bot/2.1.0" src/server/dashboard-server.ts
```

### 2. Testing Different User-Agents

```bash
# Test as a mobile app
bun --user-agent "MobileApp/1.0" examples/user-agent-demo.ts

# Test as a web crawler
bun --user-agent "WebCrawler/2.0" examples/user-agent-demo.ts

# Test as a specific bot
bun --user-agent "TradingBot/3.0" examples/user-agent-demo.ts
```

### 3. API Compliance

Some APIs require specific User-Agent strings:

```bash
# GitHub API compliance
bun --user-agent "MyApp/1.0 (contact@example.com)" src/github-integration.ts

# Twitter API compliance
bun --user-agent "MyBot/1.0" src/twitter-bot.ts
```

## Code Example

```typescript
// agent.js
const response = await fetch("https://httpbin.org/user-agent");
const data = await response.json();
console.log(data["user-agent"]);

// Run with: bun --user-agent "MyCustomApp/1.0" agent.js
// Output: MyCustomApp/1.0

// Run without flag: bun agent.js
// Output: Bun/1.2.18
```

## Integration with Existing Code

Our application already supports custom User-Agent headers in tests:

```typescript
// From tests/integration/api-endpoints.test.ts
const response = await fetch(`${baseURL}/api/customers`, {
  headers: {
    'User-Agent': 'Fantdev-Trading-Bot-Test/2.1.0',
    'Authorization': `Bearer ${authToken}`
  }
});
```

## Best Practices

1. **Use Semantic Versioning**: Include version numbers in your User-Agent
   ```
   MyApp/1.2.3
   ```

2. **Include Contact Information**: For production APIs, consider including contact info
   ```
   MyApp/1.0 (support@myapp.com)
   ```

3. **Be Descriptive**: Use names that clearly identify your application
   ```
   Fantdev-Trading-Bot/2.1.0
   ```

4. **Test Different Values**: Use the flag to test how your app behaves with different User-Agents

## Demo Script

Run the included demo script to see User-Agent customization in action:

```bash
# See current User-Agent
bun examples/user-agent-demo.ts

# Test with custom User-Agent
bun --user-agent "MyCustomApp/1.0" examples/user-agent-demo.ts
```

## Troubleshooting

### User-Agent Not Changing

- Ensure you're using the `--user-agent` flag before the script name
- Check that your script uses `fetch()` for HTTP requests
- Verify the flag is supported in your Bun version (v1.2.0+)

### Multiple User-Agent Headers

If you're setting User-Agent in both the flag and headers, the flag takes precedence:

```typescript
// This will use the --user-agent flag value, not the header
const response = await fetch(url, {
  headers: {
    'User-Agent': 'This will be ignored' // Flag overrides this
  }
});
```

## Related Documentation

- [Bun CLI Documentation](https://bun.sh/docs/cli)
- [HTTP User-Agent Header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/User-Agent)
- [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)

# Telegram API Rate Limiting & Webhook Setup

## ✅ Implementation Complete

Your Cloudflare Worker now includes comprehensive rate limiting for Telegram API calls and proper webhook management.

## 📊 Telegram API Rate Limits

### Official Limits
- **Global**: 30 messages/second across all chats
- **Per Chat**: 1 message/second to the same chat
- **Per Group**: 20 messages/minute to the same group
- **Batch Operations**: Maximum 50 requests per batch
- **Webhook Response**: Must respond within 60 seconds

### Our Implementation

1. **Rate Limiter** (`cloudflare-worker/src/rate-limiter.ts`)
   - Token bucket algorithm for each limit type
   - Automatic token refill based on time
   - Queue management for pending requests
   - Memory cleanup to prevent leaks

2. **Webhook Handler** (`cloudflare-worker/src/telegram-webhook.ts`)
   - Duplicate update prevention
   - Rate-limited admin notifications
   - Automatic cleanup of old data
   - Error handling for rate limit responses

3. **Setup Script** (`setup-webhook.ts`)
   - Interactive webhook configuration
   - Current webhook status checking
   - Safe webhook replacement
   - Secret generation

## 🚀 Quick Setup

### 1. Check Current Webhook Status
```bash
bun run setup-webhook.ts --info
```

### 2. Set Webhook (Interactive Mode)
```bash
bun run setup-webhook.ts --interactive
```

### 3. Set Webhook (Direct)
```bash
# For local development
bun run setup-webhook.ts --url http://localhost:8787/webhook

# For production (after deployment)
bun run setup-webhook.ts --url https://telegram-bot-worker.YOUR-SUBDOMAIN.workers.dev/webhook
```

### 4. Delete Webhook (if needed)
```bash
bun run setup-webhook.ts --delete
```

## 🔍 Monitoring Rate Limits

### Check Rate Limit Status
```bash
curl http://localhost:8787/api/rate-limit
```

Response:
```json
{
  "success": true,
  "rateLimit": {
    "global": {
      "tokens": 30,
      "maxTokens": 30
    },
    "activeChatLimits": 0,
    "activeGroupLimits": 0
  },
  "telegram": {
    "global": "30 messages/second",
    "perChat": "1 message/second",
    "perGroup": "20 messages/minute",
    "batchLimit": "50 requests/batch"
  }
}
```

## 🛡️ Rate Limiting Best Practices

### 1. **Batch Operations**
```typescript
// Good: Batch multiple operations
await rateLimiter.executeBatch(requests, 50);

// Bad: Individual rapid-fire requests
for (const request of requests) {
  await request(); // May hit rate limits
}
```

### 2. **Use Different Update Types**
- Use `answerCallbackQuery` for button responses (no rate limit)
- Use `editMessageText` instead of deleting and sending new
- Use inline keyboards to reduce message count

### 3. **Priority Queue**
Important messages (errors, alerts) should have priority over regular updates.

### 4. **Graceful Degradation**
If rate limited, queue messages or combine them rather than dropping.

## 📝 Webhook Security

### Secret Token
The webhook uses a secret token for validation:
```typescript
// Telegram sends this header
'X-Telegram-Bot-Api-Secret-Token': 'your-secret'

// Worker validates it
if (secret !== env.WEBHOOK_SECRET) {
  return new Response('Unauthorized', { status: 401 });
}
```

### IP Whitelisting (Optional)
Telegram webhooks come from these IP ranges:
- `149.154.160.0/20`
- `91.108.4.0/22`

## 🔧 Troubleshooting

### "Too Many Requests" Error
- Check rate limit status: `/api/rate-limit`
- Reduce message frequency
- Implement exponential backoff
- Use batch operations

### Webhook Not Receiving Updates
1. Check webhook info:
   ```bash
   bun run setup-webhook.ts --info
   ```
2. Verify secret token matches
3. Check worker logs:
   ```bash
   bun run worker:tail
   ```
4. Ensure bot privacy mode allows receiving messages

### Duplicate Updates
- Worker tracks `update_id` to prevent duplicates
- Automatically cleans old IDs to prevent memory issues

## 📊 Performance Tips

1. **Use Durable Objects** for state that needs consistency
2. **Use KV** for eventually consistent data
3. **Cache frequently accessed data** in Worker memory
4. **Batch Telegram API calls** when possible
5. **Use webhook** instead of polling (more efficient)

## 🔄 Integration with Your Bot

### Python Bot
```python
from src.chat_manager import chat_manager

# Bot automatically tracks chats
# Rate limiting handled by worker when using webhook
```

### TypeScript Services
```typescript
import { cloudflareClient } from '@/services/cloudflare-client';

// Check rate limit status
const status = await fetch(`${workerUrl}/api/rate-limit`);
```

## 📈 Next Steps

1. **Deploy to Production**:
   ```bash
   bun run worker:deploy
   ```

2. **Set Production Webhook**:
   ```bash
   bun run setup-webhook.ts --url https://your-worker.workers.dev/webhook
   ```

3. **Monitor Performance**:
   - Use `wrangler tail` for real-time logs
   - Check `/api/rate-limit` regularly
   - Set up alerts for rate limit warnings

4. **Scale Considerations**:
   - Consider using Telegram's `getUpdates` with offset for backup
   - Implement dead letter queue for failed messages
   - Use Cloudflare Analytics for monitoring

## 🎯 Summary

Your implementation now includes:
- ✅ Comprehensive rate limiting
- ✅ Webhook management script
- ✅ Duplicate update prevention
- ✅ Memory leak prevention
- ✅ Error handling
- ✅ Monitoring endpoints
- ✅ Full Bun integration

The worker respects all Telegram API limits and provides a robust foundation for your bot's infrastructure!
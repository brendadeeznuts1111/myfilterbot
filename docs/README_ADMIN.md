# Fantdev Trading Bot Admin Server

One command to rule them all:

```bash
ADMIN_PASSWORD=admin bun --hot src/admin-server.ts
```

Open http://localhost:3003/login  
Password: `admin` (or set `ADMIN_PASSWORD` env var)

## 🗺️ Quick Route Map

| What | URL | Auth | Description |
|------|-----|------|-------------|
| **Login** | `/login` | ❌ | Login page |
| **Dashboard** | `/dashboard` | ✅ | Full admin SPA |
| **Health Check** | `/health` | ❌ | Basic ping |
| **DB Health** | `/api/admin/health/db` | ✅ | Database latency |
| **Redis Health** | `/api/admin/health/redis` | ✅ | Cache status |
| **Bot Status** | `/api/admin/health/bot` | ✅ | Telegram bot check |
| **Customers** | `/api/admin/customers` | ✅ | All customers |
| **Stats** | `/api/admin/stats` | ✅ | System metrics |
| **Live Config** | `/api/admin/config` | ✅ | YAML configs |
| **Feature Flags** | `/api/features` | ✅ | Toggle features |
| **Logs** | `/api/admin/logs` | ✅ | Tail app logs |
| **WebSocket** | `/api/ws` | ✅ | Real-time updates |

## 🚀 Add a New Protected Route

1. **Drop handler inside `withAuth()` block:**
```typescript
// In admin-server.ts
if (url.pathname === '/api/admin/new-feature') {
  return withAuth((req, user) => {
    // Your logic here - user is already authenticated
    return Response.json({ feature: "data" });
  })(request);
}
```

2. **Add one line to `src/manifest.json`:**
```json
"GET  /api/admin/new-feature": "Protected – your feature description"
```

3. **Done!** Route is auto-secured with JWT auth.

## 🔧 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ADMIN_PASSWORD` | ✅ | - | Login password & JWT key |
| `PORT` | ❌ | 3003 | Server port |
| `NODE_ENV` | ❌ | development | Environment mode |
| `JWT_SECRET` | ❌ | ADMIN_PASSWORD | JWT signing key |

## 📁 Project Structure

```
src/
├── manifest.json           # Single source of truth
├── admin-server.ts         # Main server with route labels
├── static/dashboard/       # Dashboard SPA assets
│   ├── index.html         # Dashboard HTML
│   ├── dashboard.js       # Dashboard logic
│   └── styles.css         # Dashboard styles
└── services/
    └── dashboard-config-service.ts  # YAML hot-reload

config/
├── app.yaml               # Main app config
├── features.yaml          # Feature flags
└── *.yaml                 # Other configs
```

## 🔥 Hot-Reload Support

The server uses Bun's `--hot` flag for automatic reloading:
- Edit any `.ts` file → server restarts
- Edit any `.yaml` file → config reloads
- Edit dashboard files → refresh browser

## 🛡️ Security Model

- **Public routes**: No authentication needed
- **Protected routes**: JWT cookie required (12-hour expiry)
- **withAuth() wrapper**: Handles all auth logic
- **Rate limiting**: 100 requests/minute on API routes

## 📊 Dashboard Features

- **Real-time metrics**: WebSocket & SSE updates
- **YAML editor**: Live config editing with validation
- **Feature flags**: Toggle features without restart
- **Service monitoring**: Health checks for all components
- **Log viewer**: Real-time log streaming
- **Customer management**: CRUD operations

## 🎯 Common Tasks

### Check if everything is running:
```bash
curl http://localhost:3003/health
```

### Get auth token programmatically:
```bash
curl -X POST http://localhost:3003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"admin"}'
```

### Access protected endpoint:
```bash
curl http://localhost:3003/api/admin/stats \
  -H "Cookie: dashboard_session=YOUR_JWT_TOKEN"
```

## 💡 Tips for Junior Devs

1. **Start here**: Read `src/manifest.json` - it's the map
2. **Route labels**: Check top of `admin-server.ts` for all routes
3. **Auth is simple**: Wrap any route with `withAuth()` to protect it
4. **Test locally**: Always use `ADMIN_PASSWORD=admin` for local dev
5. **Check logs**: Server logs everything to console in dev mode

---

**Need help?** Check `src/manifest.json` first - it has all the answers!
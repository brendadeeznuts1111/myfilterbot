import { serve } from 'bun';
import adminPortal from '../dist/admin_portal_improved.html';
import { config, validateEnv } from '../config/env.config';
import { rbacApp } from "./server/rbac"; // Import rbacApp
import { authAppRoutes } from "./server/auth"; // Import authAppRoutes

// Validate environment on startup
try {
  validateEnv(config);
  console.log("✅ Environment configuration validated");
} catch (error) {
  console.error("❌ Environment validation failed:", error);
  process.exit(1);
}

// Use environment variables from Bun.env
const PORT = config.ADMIN_SERVER_PORT || 3002;
const API_BASE = config.API_BASE_URL || "/api";

const server = serve({
  port: PORT,
  
  // Automatic ETag support in Bun v1.2.20
  development: config.NODE_ENV !== "production",
  
  fetch(req) {
    const url = new URL(req.url);
    
    // CORS headers for API endpoints
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };
    
    // Handle preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    
    // Delegate to RBAC app if path starts with /rbac
    if (url.pathname.startsWith("/rbac")) {
      return rbacApp.fetch(req);
    }

    // Delegate to Auth app if path starts with /auth
    if (url.pathname.startsWith("/auth")) {
      return authAppRoutes.fetch(req);
    }

    // Serve admin portal HTML
    if (url.pathname === "/" || url.pathname === "/admin") {
      return new Response(adminPortal, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          // Automatic ETag will be added by Bun.serve
        },
      });
    }
    
    // API endpoints for the admin portal
    if (url.pathname === "/api/members") {
      return Response.json({
        members: [
          {
            id: 1,
            username: "alice_trader",
            group_name: "Trading Group A",
            telegram_id: 123456789,
            join_date: new Date().toISOString(),
            status: "pending"
          },
          {
            id: 2,
            username: "bob_investor",
            group_name: "Premium Signals",
            telegram_id: 987654321,
            join_date: new Date(Date.now() - 86400000).toISOString(),
            status: "approved",
            customer_id: "CUST-001"
          }
        ],
        stats: {
          total_members: 2,
          pending: 1,
          approved: 1,
          denied: 0,
          groups: 3
        }
      }, { headers: corsHeaders });
    }
    
    if (url.pathname === "/api/approve" && req.method === "POST") {
      return Response.json(
        { success: true, message: "Member approved" },
        { headers: corsHeaders }
      );
    }
    
    if (url.pathname === "/api/deny" && req.method === "POST") {
      return Response.json(
        { success: true, message: "Member denied" },
        { headers: corsHeaders }
      );
    }
    
    if (url.pathname === "/api/stats") {
      return Response.json({
        total_customers: 50,
        active_members: 45,
        pending_requests: 3,
        total_balance: 125000,
        daily_volume: 15000,
        success_rate: 0.89
      }, { headers: corsHeaders });
    }
    
    // API endpoints for customer data
    if (url.pathname === "/api/customer/balance") {
      // Example: Check for Authorization header
      if (!req.headers.get("Authorization")) {
        return new Response("Unauthorized", { status: 401, headers: corsHeaders });
      }
      return Response.json({ balance: 15000.75, currency: "USD" }, { headers: corsHeaders });
    }

    if (url.pathname === "/api/customer/analytics") {
      return Response.json({
        daily_transactions: 120,
        monthly_transactions: 3500,
        average_transaction_value: 125.50,
        top_categories: ["Trading", "Investments", "Savings"]
      }, { headers: corsHeaders });
    }

    if (url.pathname === "/api/customer/transactions") {
      return Response.json({
        transactions: [
          { id: 1, date: new Date().toISOString(), description: "Buy BTC", amount: -500, type: "debit" },
          { id: 2, date: new Date(Date.now() - 3600000).toISOString(), description: "Sell ETH", amount: 300, type: "credit" },
        ],
        total: 2
      }, { headers: corsHeaders });
    }

    if (url.pathname === "/api/customer/profile") {
      return Response.json({
        customer_id: "CUST-001",
        name: "John Doe",
        email: "john.doe@example.com",
        tier: "Gold",
        member_since: "2022-01-15"
      }, { headers: corsHeaders });
    }

    // API endpoints for notifications
    if (url.pathname === "/api/notifications") {
      return Response.json({
        notifications: [
          { id: 1, message: "New security alert!", type: "security", read: false },
          { id: 2, message: "Your monthly statement is ready.", type: "billing", read: true },
        ],
        unread_count: 1
      }, { headers: corsHeaders });
    }

    if (url.pathname === "/api/notifications/preferences") {
      return Response.json({
        email_enabled: true,
        sms_enabled: false,
        push_enabled: true,
        security_alerts: true,
        marketing_promotions: false
      }, { headers: corsHeaders });
    }

    // API endpoints for security
    if (url.pathname === "/api/security/status") {
      // Example: Check for specific permission (e.g., admin role)
      const userRole = req.headers.get("X-User-Role"); // Assuming a custom header for role
      if (userRole !== "admin") {
        return new Response("Forbidden: Insufficient permissions", { status: 403, headers: corsHeaders });
      }
      return Response.json({
        status: "secure",
        last_login: new Date().toISOString(),
        two_factor_enabled: true,
        active_sessions: 1
      }, { headers: corsHeaders });
    }

    // Health check endpoint
    if (url.pathname === "/health") {
      return Response.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        environment: config.NODE_ENV,
        uptime: process.uptime(),
      }, { headers: corsHeaders });
    }
    
    // 404 for unknown routes
    return new Response("Not Found", {
      status: 404,
      headers: corsHeaders
    });
  },
  
  error(error) {
    console.error("Server error:", error);
    return new Response("Internal Server Error", { status: 500 });
  },
});

console.log(`🚀 Admin Portal Server running at http://localhost:${PORT}`);
console.log(`📊 Environment: ${config.NODE_ENV}`);
console.log(`🔐 Debug Mode: ${config.DEBUG_MODE}`);
console.log(`⚡ WebSocket: ${config.ENABLE_WEBSOCKET ? 'Enabled' : 'Disabled'}`);
console.log(`📈 Metrics: ${config.ENABLE_METRICS ? 'Enabled' : 'Disabled'}`);

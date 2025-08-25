import { z } from "zod";
import { features } from "../config/features";
import { registerAnalyticsV2Routes } from "./server/analytics-v2";
import { registerRbacRoutes } from "./server/rbac";
import { registerAuthRoutes } from "./server/auth"; // Import registerAuthRoutes

const Env = z.object({ 
  BOT_TOKEN: z.string(), 
  DATABASE_URL: z.string(),
  FF_ANALYTICS: z.string().optional(), // Add FF_ANALYTICS to environment validation
  FF_RBAC: z.string().optional(),
  JWT_SECRET: z.string(), // Add JWT_SECRET to environment validation
});

try {
  Env.parse(process.env);  // throws if .env is missing keys
  console.log("Environment variables validated successfully.");

  // Conditionally register Analytics v2 routes if feature flag is enabled
  if (features.analyticsV2) {
    registerAnalyticsV2Routes();
  }

  // Conditionally register RBAC routes if feature flag is enabled
  if (features.rbac) {
    registerRbacRoutes();
  }

  // Register Auth routes
  registerAuthRoutes();

} catch (error) {
  console.error("❌ Invalid environment variables:", (error as z.ZodError).issues);
  process.exit(1);
}

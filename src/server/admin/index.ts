import { serve } from "bun";
import { execSync } from "child_process";

serve({
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/health") {
      const sha = process.env.VERCEL_GIT_COMMIT_SHA || execSync('git rev-parse HEAD').toString().trim();
      return new Response(JSON.stringify({ 
        status: "ok", 
        uptime: process.uptime(), 
        version: process.env.npm_package_version, 
        sha 
      }));
    }
    return new Response("404!");
  },
});

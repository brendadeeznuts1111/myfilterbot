import { Database } from "bun:sqlite";

interface AnalyticsEvent {
  eventType: string;
  timestamp: number;
  payload: Record<string, any>;
}

const db = new Database("analytics.db");

db.run(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    eventType TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    payload TEXT NOT NULL
  );
`);

export function registerAnalyticsV2Routes() {
  // This is a skeleton route handler for analytics-v2
  // In a real implementation, this would handle requests for analytics data
  // and interact with a database or other services.
  Bun.serve({
    fetch: async (req: Request): Promise<Response> => {
      const url = new URL(req.url);

      if (url.pathname === "/analytics/v2/data") {
        if (req.method === "GET") {
          const allEvents = db.prepare("SELECT * FROM events").all();
          return new Response(JSON.stringify(allEvents), {
            headers: { "Content-Type": "application/json" },
          });
        } else if (req.method === "POST") {
          try {
            const event: AnalyticsEvent = await req.json();
            console.log("Received analytics event:", event);
            db.run(
              "INSERT INTO events (eventType, timestamp, payload) VALUES (?, ?, ?)",
              event.eventType,
              event.timestamp,
              JSON.stringify(event.payload)
            );
            return new Response(JSON.stringify({ status: "success", message: "Event received and saved" }), {
              headers: { "Content-Type": "application/json" },
              status: 200,
            });
          } catch (error) {
            console.error("Error parsing or saving analytics event:", error);
            return new Response(JSON.stringify({ status: "error", message: "Invalid event data or database error" }), {
              headers: { "Content-Type": "application/json" },
              status: 400,
            });
          }
        }
      }
      return new Response("Not Found", { status: 404 });
    },
    // The port should be managed by the main application server, not hardcoded here.
    // This Bun.serve instance is for demonstration/testing purposes if run in isolation.
    // For integration, this fetch handler would be part of a larger Bun.serve setup.
    port: 3001,
  });
  console.log("Analytics v2 routes registered on port 3001 (for isolated testing)");
}

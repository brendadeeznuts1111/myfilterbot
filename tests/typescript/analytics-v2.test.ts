import { test, expect, beforeEach, beforeAll, afterAll } from "bun:test";
import { Database } from "bun:sqlite";

let db: Database;

beforeAll(() => {
  // Create in-memory database for testing
  db = new Database(":memory:");
  
  // Create events table
  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      eventType TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      payload TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

beforeEach(() => {
  // Clear events before each test
  db.run("DELETE FROM events");
});

afterAll(() => {
  // Close database connection
  if (db) {
    db.close();
  }
});

test("Analytics database operations work correctly", async () => {
  const event = {
    eventType: "page_view",
    timestamp: Date.now(),
    payload: {
      page: "/homepage",
      userId: "user123",
    },
  };

  // Insert event into database
  const insertResult = db.run(
    "INSERT INTO events (eventType, timestamp, payload) VALUES (?, ?, ?)",
    [event.eventType, event.timestamp, JSON.stringify(event.payload)]
  );
  
  // Check that the insert was successful
  expect(insertResult.changes).toBe(1);

  // Retrieve the event
  const events = db.query("SELECT * FROM events").all();
  expect(events.length).toBe(1);
  expect(events[0].eventType).toBe(event.eventType);
  expect(events[0].timestamp).toBe(event.timestamp);
  expect(JSON.parse(events[0].payload)).toEqual(event.payload);
});

test("Analytics database can handle multiple events", async () => {
  const events = [
    { eventType: "page_view", timestamp: Date.now(), payload: { page: "/homepage" } },
    { eventType: "click", timestamp: Date.now(), payload: { button: "submit" } },
    { eventType: "form_submit", timestamp: Date.now(), payload: { form: "contact" } }
  ];

  // Insert multiple events
  for (const event of events) {
    db.run(
      "INSERT INTO events (eventType, timestamp, payload) VALUES (?, ?, ?)",
      [event.eventType, event.timestamp, JSON.stringify(event.payload)]
    );
  }

  // Verify all events were inserted
  const allEvents = db.query("SELECT * FROM events").all();
  expect(allEvents.length).toBe(3);
  
  // Check event types
  const eventTypes = allEvents.map(e => e.eventType);
  expect(eventTypes).toContain("page_view");
  expect(eventTypes).toContain("click");
  expect(eventTypes).toContain("form_submit");
});

import { test, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";

const db = new Database("analytics.db");

beforeEach(() => {
  db.run("DELETE FROM events");
});

test("Analytics v2 GET data endpoint returns empty array initially", async () => {
  const response = await fetch("http://localhost:3001/analytics/v2/data");
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data).toEqual([]);
});

test("Analytics v2 POST data endpoint saves event and GET retrieves it", async () => {
  const event = {
    eventType: "page_view",
    timestamp: Date.now(),
    payload: {
      page: "/homepage",
      userId: "user123",
    },
  };

  // Post the event
  const postResponse = await fetch("http://localhost:3001/analytics/v2/data", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
  });

  expect(postResponse.status).toBe(200);
  const postData = await postResponse.json();
  expect(postData).toEqual({ status: "success", message: "Event received and saved" });

  // Retrieve the event
  const getResponse = await fetch("http://localhost:3001/analytics/v2/data");
  expect(getResponse.status).toBe(200);
  const getData = await getResponse.json();

  expect(getData.length).toBe(1);
  expect(getData[0].eventType).toBe(event.eventType);
  expect(getData[0].timestamp).toBe(event.timestamp);
  expect(JSON.parse(getData[0].payload)).toEqual(event.payload);
});

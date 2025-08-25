const server = Bun.serve({
  port: 0,
  static: {
    "/api/customers.json": Response.json({
      customers: [
        { id: 1, name: "John Doe", balance: 1500.50 },
        { id: 2, name: "Jane Smith", balance: 2300.75 },
        { id: 3, name: "Bob Johnson", balance: 890.00 }
      ],
      timestamp: new Date().toISOString()
    }),
    "/api/transactions.json": Response.json({
      transactions: [
        { id: 1, type: "deposit", amount: 500, customer: 1 },
        { id: 2, type: "withdrawal", amount: 200, customer: 2 },
        { id: 3, type: "deposit", amount: 1000, customer: 3 }
      ]
    })
  },
  fetch(req) {
    return new Response("404 Not Found", { status: 404 });
  }
});

console.log(`Server running at ${server.url}`);

const customersUrl = new URL("/api/customers.json", server.url);

const firstResponse = await fetch(customersUrl);
const etag = firstResponse.headers.get("etag");
const data = await firstResponse.json();

console.log("\nFirst request:");
console.log("Status:", firstResponse.status);
console.log("ETag:", etag);
console.log("Data received:", data.customers.length, "customers");

const cachedResponse = await fetch(customersUrl, {
  headers: {
    "If-None-Match": etag
  }
});

console.log("\nSecond request (with If-None-Match):");
console.log("Status:", cachedResponse.status);
console.log("Status Text:", cachedResponse.statusText);
console.log("Content-Length:", cachedResponse.headers.get("content-length") || "0");

setTimeout(() => {
  console.log("\nServer still running. Press Ctrl+C to exit.");
}, 1000);
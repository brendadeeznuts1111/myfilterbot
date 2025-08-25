const ws = new WebSocket("ws://localhost:3002");

ws.onopen = () => {
  console.log("✅ Connected to WebSocket server");
  ws.send(JSON.stringify({ type: "test", message: "Hello from test client" }));
};

ws.onmessage = (event) => {
  console.log("📨 Received:", event.data);
};

ws.onerror = (err) => {
  console.error("❌ WebSocket error:", err);
};

ws.onclose = () => {
  console.log("👋 WebSocket connection closed");
};

// Keep the script running for 5 seconds
setTimeout(() => {
  ws.close();
  process.exit(0);
}, 5000);
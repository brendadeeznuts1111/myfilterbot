#!/usr/bin/env bun

console.log("🧪 Testing all services...\n");

const services = [
  { name: "Admin Server", url: "http://localhost:3000/health" },
  { name: "API Server", url: "http://localhost:3001/health" },
  { name: "WebSocket Server", url: "http://localhost:3002/health" },
  { name: "Dashboard", url: "http://localhost:3000/" },
  { name: "Feature Flags", url: "http://localhost:3000/api/feature-flags" },
  { name: "YAML Config", url: "http://localhost:3000/api/yaml/dashboard" },
  { name: "Services Status", url: "http://localhost:3000/api/services/status" },
  { name: "Customers API", url: "http://localhost:3000/api/customers" },
];

async function testService(service) {
  try {
    const response = await fetch(service.url);
    const status = response.ok ? "✅" : "❌";
    const statusText = response.ok ? "OK" : `Error ${response.status}`;
    console.log(`${status} ${service.name}: ${statusText} (${service.url})`);
    
    if (service.name === "Dashboard" && response.ok) {
      const text = await response.text();
      if (text.includes("Fantdev Trading Bot")) {
        console.log("   └─ Dashboard HTML loaded correctly");
      }
    }
    
    return response.ok;
  } catch (error) {
    console.log(`❌ ${service.name}: Connection failed (${error.message})`);
    return false;
  }
}

async function testWebSocket() {
  return new Promise((resolve) => {
    console.log("\n🔌 Testing WebSocket connection...");
    const ws = new WebSocket("ws://localhost:3002");
    
    ws.onopen = () => {
      console.log("✅ WebSocket: Connected");
      ws.send(JSON.stringify({ type: "test", message: "Test from service checker" }));
    };
    
    ws.onmessage = (event) => {
      console.log("✅ WebSocket: Received response");
      ws.close();
      resolve(true);
    };
    
    ws.onerror = (error) => {
      console.log("❌ WebSocket: Connection error");
      resolve(false);
    };
    
    setTimeout(() => {
      ws.close();
      resolve(false);
    }, 3000);
  });
}

async function main() {
  let allPassed = true;
  
  // Test HTTP services
  for (const service of services) {
    const passed = await testService(service);
    if (!passed) allPassed = false;
  }
  
  // Test WebSocket
  const wsOk = await testWebSocket();
  if (!wsOk) allPassed = false;
  
  // Summary
  console.log("\n" + "=".repeat(50));
  if (allPassed) {
    console.log("✅ All services are running correctly!");
    console.log("\n📊 Dashboard: http://localhost:3000/");
    console.log("🔌 WebSocket: ws://localhost:3002");
    console.log("🚀 API: http://localhost:3001");
  } else {
    console.log("⚠️ Some services are not responding correctly.");
    console.log("Please check the logs above for details.");
  }
}

main();
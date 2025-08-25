/**
 * User-Agent Customization Demo
 * Demonstrates how to use Bun CLI's --user-agent flag
 *
 * Usage:
 * bun --user-agent "MyCustomApp/1.0" examples/user-agent-demo.ts
 * bun --user-agent "Fantdev-Trading-Bot/2.1.0" examples/user-agent-demo.ts
 * bun --user-agent "CustomBot/3.0.0" examples/user-agent-demo.ts
 */

async function demonstrateUserAgent() {
  console.log('🚀 User-Agent Customization Demo');
  console.log('================================');

  try {
    // Make a request to httpbin.org to see what User-Agent is being sent
    const response = await fetch('https://httpbin.org/user-agent');
    const data = await response.json();

    console.log('\n📡 Current User-Agent being sent:');
    console.log(`   ${data['user-agent']}`);

    console.log('\n💡 To customize the User-Agent, run this script with:');
    console.log(
      '   bun --user-agent "MyCustomApp/1.0" examples/user-agent-demo.ts'
    );
    console.log(
      '   bun --user-agent "Fantdev-Trading-Bot/2.1.0" examples/user-agent-demo.ts'
    );
    console.log(
      '   bun --user-agent "CustomBot/3.0.0" examples/user-agent-demo.ts'
    );

    console.log('\n🔧 Example with different User-Agents:');

    // Test different User-Agent values
    const userAgents = [
      'Fantdev-Trading-Bot/2.1.0',
      'CustomApp/1.0.0',
      'TestBot/3.0.0',
      'MyApp/2.0.0',
    ];

    for (const userAgent of userAgents) {
      const testResponse = await fetch('https://httpbin.org/user-agent', {
        headers: {
          'User-Agent': userAgent,
        },
      });
      const testData = await testResponse.json();
      console.log(`   ${userAgent} → ${testData['user-agent']}`);
    }

    console.log('\n✅ Demo completed successfully!');
  } catch (error) {
    console.error('❌ Error during demo:', error);
  }
}

// Run the demo
demonstrateUserAgent();

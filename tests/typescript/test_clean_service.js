// Test script to see what data is available from the clean trading service
const testEndpoints = async () => {
  const baseUrl = 'http://localhost:5005';
  
  console.log('🧪 Testing Clean Trading Service Endpoints...\n');
  
  try {
    // Test health endpoint
    const health = await fetch(`${baseUrl}/health`);
    const healthData = await health.json();
    console.log('✅ Health Check:', healthData);
    
    // Test system status
    const status = await fetch(`${baseUrl}/api/system/status`);
    const statusData = await status.json();
    console.log('\n📊 System Status:', statusData);
    
    // Test customer endpoints
    const customers = ['JP990', 'BBPERSONAL', 'DAKO'];
    
    for (const customerId of customers) {
      try {
        const customer = await fetch(`${baseUrl}/api/customers/${customerId}`);
        const customerData = await customer.json();
        console.log(`\n👤 Customer ${customerId}:`, customerData);
        
        // Test transactions for this customer
        const transactions = await fetch(`${baseUrl}/api/transactions/${customerId}`);
        const transactionData = await transactions.json();
        console.log(`📈 Transactions for ${customerId}:`, transactionData);
        
      } catch (error) {
        console.log(`❌ Error with customer ${customerId}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Service test failed:', error.message);
  }
};

// Run the test
testEndpoints();

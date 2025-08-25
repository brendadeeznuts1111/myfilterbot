/**
 * Form Helpers Usage Examples for Fantdev Trading Bot
 * 
 * This file demonstrates how to use the form helpers in your API endpoints
 */

import { 
  parseForm, 
  buildForm, 
  fetchForm, 
  processForm,
  parseFormWithDefaults,
  validateForm,
  sanitizeForm,
  parseFormTyped,
  processFormRoundTrip,
  parseTxHistoryForm,
  parseDepositForm,
  parseAuthForm,
  type TxHistoryQuery,
  type DepositForm,
  type AuthForm
} from '../src/utils/form-helpers';

// =============================================================================
// Example 1: Customer Deposit Form
// =============================================================================

async function handleDepositForm(request: Request) {
  try {
    // Parse form data with validation
    const formData = processForm(
      await request.text(),
      {
        customer_id: '',
        amount: 0,
        currency: 'USD',
        payment_method: '',
        reference: ''
      },
      ['customer_id', 'amount', 'payment_method']
    );

    if (!formData.valid) {
      return new Response(JSON.stringify({
        error: 'Validation failed',
        details: formData.errors
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Use the validated data
    const { customer_id, amount, currency, payment_method, reference } = formData.data;
    
    // Process deposit logic here...
    console.log(`Processing deposit: ${customer_id} - $${amount} ${currency}`);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Deposit processed successfully',
      transaction_id: `TXN_${Date.now()}`
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// =============================================================================
// Example 2: Customer Login Form
// =============================================================================

async function handleLoginForm(request: Request) {
  try {
    // Parse form data
    const formData = processForm(
      await request.text(),
      {
        username: '',
        password: '',
        remember_me: false
      },
      ['username', 'password']
    );

    if (!formData.valid) {
      return new Response(JSON.stringify({
        error: 'Username and password are required'
      }), { status: 400 });
    }

    const { username, password, remember_me } = formData.data;
    
    // Authenticate user logic here...
    console.log(`Login attempt: ${username}, remember: ${remember_me}`);
    
    return new Response(JSON.stringify({
      success: true,
      token: 'jwt_token_here',
      expires_in: remember_me ? 2592000 : 86400 // 30 days vs 1 day
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Authentication failed'
    }), { status: 500 });
  }
}

// =============================================================================
// Example 3: Customer Registration Form
// =============================================================================

async function handleRegistrationForm(request: Request) {
  try {
    // Parse and validate form
    const formData = processForm(
      await request.text(),
      {
        username: '',
        email: '',
        password: '',
        confirm_password: '',
        telegram_id: '',
        referral_code: ''
      },
      ['username', 'email', 'password', 'confirm_password']
    );

    if (!formData.valid) {
      return new Response(JSON.stringify({
        error: 'Missing required fields',
        details: formData.errors
      }), { status: 400 });
    }

    const { username, email, password, confirm_password, telegram_id, referral_code } = formData.data;

    // Additional validation
    if (password !== confirm_password) {
      return new Response(JSON.stringify({
        error: 'Passwords do not match'
      }), { status: 400 });
    }

    if (password.length < 8) {
      return new Response(JSON.stringify({
        error: 'Password must be at least 8 characters long'
      }), { status: 400 });
    }

    // Process registration logic here...
    console.log(`New user registration: ${username} (${email})`);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Registration successful',
      user_id: `USER_${Date.now()}`
    }), { 
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Registration failed'
    }), { status: 500 });
  }
}

// =============================================================================
// Example 4: Sending Form Data to External APIs
// =============================================================================

async function sendPaymentToGateway(paymentData: Record<string, any>) {
  try {
    // Build form data for external payment gateway
    const formPayload = buildForm({
      merchant_id: process.env.MERCHANT_ID || '',
      amount: paymentData.amount,
      currency: paymentData.currency,
      customer_email: paymentData.customer_email,
      callback_url: `${process.env.BASE_URL}/api/payment/callback`,
      success_url: `${process.env.BASE_URL}/payment/success`,
      cancel_url: `${process.env.BASE_URL}/payment/cancel`
    });

    // Send to payment gateway
    const response = await fetchForm(
      process.env.PAYMENT_GATEWAY_URL || 'https://api.payment-gateway.com/charge',
      {
        merchant_id: process.env.MERCHANT_ID || '',
        amount: paymentData.amount,
        currency: paymentData.currency,
        customer_email: paymentData.customer_email,
        callback_url: `${process.env.BASE_URL}/api/payment/callback`,
        success_url: `${process.env.BASE_URL}/payment/success`,
        cancel_url: `${process.env.BASE_URL}/payment/cancel`
      }
    );

    if (!response.ok) {
      throw new Error(`Payment gateway error: ${response.status}`);
    }

    const result = await response.json();
    return result;
    
  } catch (error) {
    console.error('Payment gateway error:', error);
    throw error;
  }
}

// =============================================================================
// Example 5: Form Data in WebSocket Messages
// =============================================================================

interface ChatMessageForm {
  message: string;
  customer_id: string;
  room_id?: string;
  message_type: 'text' | 'image' | 'file';
}

function processChatMessage(formData: string): ChatMessageForm | null {
  try {
    const parsed = parseForm(formData);
    
    // Validate required fields
    const validation = validateForm(parsed, ['message', 'customer_id', 'message_type']);
    
    if (!validation.valid) {
      console.error('Invalid chat message:', validation.errors);
      return null;
    }

    // Sanitize the data
    const sanitized = sanitizeForm(parsed);
    
    return {
      message: sanitized.message,
      customer_id: sanitized.customer_id,
      room_id: sanitized.room_id || 'general',
      message_type: sanitized.message_type as 'text' | 'image' | 'file'
    };
    
  } catch (error) {
    console.error('Error processing chat message:', error);
    return null;
  }
}

// =============================================================================
// NEW: Example 6: Enhanced Type-Safe Form Parsing
// =============================================================================

async function handleTransactionHistoryForm(request: Request) {
  try {
    // Parse with type safety and boolean coercion
    const txQuery = parseTxHistoryForm(await request.text());
    
    // Now txQuery.deposits === true instead of "checked"
    console.log(`Agent ${txQuery.agent_id} requesting ${txQuery.operation}`);
    console.log(`Deposits enabled: ${txQuery.deposits}`); // boolean
    console.log(`Withdrawals enabled: ${txQuery.withdrawals}`); // boolean
    
    // Process the query...
    const results = await processTransactionHistory(txQuery);
    
    return new Response(JSON.stringify({
      success: true,
      data: results,
      query: txQuery
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to process transaction history request'
    }), { status: 500 });
  }
}

// =============================================================================
// NEW: Example 7: Round-Trip Form Processing
// =============================================================================

async function handleFormProxy(request: Request) {
  try {
    // Process form with round-trip support
    const roundTrip = processFormRoundTrip(
      await request.text(),
      ["deposits", "withdrawals", "adjustments", "transfers", "fees", "promotional", "balances", "distribution"]
    );
    
    console.log('Original form:', roundTrip.original);
    console.log('Processed data:', roundTrip.data);
    console.log('Rebuilt form:', roundTrip.rebuilt);
    
    // Forward to external service with boolean values
    const externalResponse = await fetchForm(
      'https://external-api.example.com/transactions',
      roundTrip.data
    );
    
    // Return the external response
    return externalResponse;
    
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Proxy request failed'
    }), { status: 500 });
  }
}

// =============================================================================
// NEW: Example 8: Specialized Form Parsers
// =============================================================================

async function handleEnhancedDepositForm(request: Request) {
  try {
    // Use specialized deposit form parser
    const depositData = parseDepositForm(await request.text());
    
    // depositData is now properly typed with DepositForm interface
    console.log(`Processing deposit: ${depositData.customer_id} - $${depositData.amount} ${depositData.currency}`);
    
    // Process deposit...
    const result = await processDeposit(depositData);
    
    return new Response(JSON.stringify({
      success: true,
      transaction_id: result.id,
      amount: result.amount
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Deposit processing failed'
    }), { status: 500 });
  }
}

async function handleEnhancedAuthForm(request: Request) {
  try {
    // Use specialized auth form parser with boolean coercion
    const authData = parseAuthForm(await request.text());
    
    // authData.remember_me is now a boolean
    console.log(`Login attempt: ${authData.username}, remember: ${authData.remember_me}`);
    
    // Process authentication...
    const token = await authenticateUser(authData);
    
    return new Response(JSON.stringify({
      success: true,
      token,
      expires_in: authData.remember_me ? 2592000 : 86400
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Authentication failed'
    }), { status: 500 });
  }
}

// =============================================================================
// Helper functions (mock implementations)
// =============================================================================

async function processTransactionHistory(query: TxHistoryQuery) {
  // Mock implementation
  return { transactions: [], total: 0 };
}

async function processDeposit(data: DepositForm) {
  // Mock implementation
  return { id: `TXN_${Date.now()}`, amount: data.amount };
}

async function authenticateUser(data: AuthForm) {
  // Mock implementation
  return `jwt_token_${Date.now()}`;
}

// =============================================================================
// Export for use in other modules
// =============================================================================

export {
  handleDepositForm,
  handleLoginForm,
  handleRegistrationForm,
  sendPaymentToGateway,
  processChatMessage,
  handleTransactionHistoryForm,
  handleFormProxy,
  handleEnhancedDepositForm,
  handleEnhancedAuthForm
};

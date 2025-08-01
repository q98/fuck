const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Production configuration
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = [
    'http://localhost:3000',
    'http://161.35.229.94',
    'http://161.35.229.94:3000',
    'https://161.35.229.94',
    'https://161.35.229.94:3000'
];

// Stripe processing fees configuration
const STRIPE_FEE_PERCENTAGE = 0.029; // 2.9%
const STRIPE_FEE_FIXED = 0.30; // $0.30

// Initialize Stripe (will be reinitialized when keys are saved)
let stripe;
function initializeStripe() {
  if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('your_')) {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    console.log('✅ Stripe initialized successfully');
    return true;
  }
  console.log('⚠️ Stripe not initialized - missing or invalid API key');
  return false;
}

// Initialize Stripe on startup
initializeStripe();

// Middleware
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1 || !isProduction) {
            return callback(null, true);
        } else {
            return callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Calculate total amount including Stripe fees
function calculateTotalWithFees(baseAmount) {
  const stripeFee = (baseAmount * STRIPE_FEE_PERCENTAGE) + STRIPE_FEE_FIXED;
  const totalAmount = baseAmount + stripeFee;
  return {
    baseAmount: baseAmount,
    stripeFee: stripeFee,
    totalAmount: totalAmount
  };
}

// Calculate fees endpoint
app.post('/calculate-fees', (req, res) => {
  try {
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const calculation = calculateTotalWithFees(amount);
    
    res.json({
      baseAmount: calculation.baseAmount,
      stripeFee: calculation.stripeFee,
      totalAmount: calculation.totalAmount,
      feePercentage: STRIPE_FEE_PERCENTAGE * 100,
      feeFixed: STRIPE_FEE_FIXED
    });
  } catch (error) {
    console.error('Error calculating fees:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a PaymentIntent for Stripe Terminal
app.post('/create-payment-intent', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(400).json({ error: 'Stripe not configured' });
    }
    
    const { amount, currency = 'usd' } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Calculate total amount including Stripe fees
    const calculation = calculateTotalWithFees(amount);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(calculation.totalAmount * 100), // Convert to cents
      currency: currency,
      payment_method_types: ['card_present'],
      capture_method: 'automatic',
      metadata: {
        source: 'terminal',
        base_amount: (calculation.baseAmount * 100).toString(),
        stripe_fee: (calculation.stripeFee * 100).toString(),
        total_amount: (calculation.totalAmount * 100).toString()
      }
    });

    res.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      baseAmount: calculation.baseAmount,
      stripeFee: calculation.stripeFee,
      totalAmount: calculation.totalAmount
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cancel a PaymentIntent
app.post('/cancel-payment-intent', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(400).json({ error: 'Stripe not configured' });
    }
    
    const { payment_intent_id } = req.body;
    
    const paymentIntent = await stripe.paymentIntents.cancel(payment_intent_id);
    
    res.json({ success: true, payment_intent: paymentIntent });
  } catch (error) {
    console.error('Error canceling payment intent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get payment intent details
app.get('/payment-intent/:id', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(400).json({ error: 'Stripe not configured' });
    }
    
    const paymentIntent = await stripe.paymentIntents.retrieve(req.params.id);
    res.json(paymentIntent);
  } catch (error) {
    console.error('Error retrieving payment intent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create connection token for Stripe Terminal
app.post('/connection_token', async (req, res) => {
  try {
    console.log('📡 Connection token requested');
    
    if (!stripe) {
      console.error('❌ Stripe not initialized');
      return res.status(400).json({ error: 'Stripe not configured. Please set up your API keys first.' });
    }
    
    console.log('🔑 Creating connection token...');
    const connectionToken = await stripe.terminal.connectionTokens.create();
    console.log('✅ Connection token created successfully');
    
    res.json({ secret: connectionToken.secret });
  } catch (error) {
    console.error('❌ Error creating connection token:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check if Stripe is configured and get publishable key
app.get('/config', (req, res) => {
  const isConfigured = !!(
    process.env.STRIPE_SECRET_KEY && 
    process.env.STRIPE_PUBLISHABLE_KEY &&
    !process.env.STRIPE_SECRET_KEY.includes('your_') &&
    !process.env.STRIPE_PUBLISHABLE_KEY.includes('your_')
  );
  
  if (isConfigured) {
    res.json({
      configured: true,
      publishable_key: process.env.STRIPE_PUBLISHABLE_KEY
    });
  } else {
    res.json({
      configured: false,
      message: 'Stripe API keys need to be configured'
    });
  }
});

// Test Stripe API keys
app.post('/test-stripe-keys', async (req, res) => {
  try {
    const { publishable_key, secret_key } = req.body;
    
    if (!publishable_key || !secret_key) {
      return res.status(400).json({ error: 'Both API keys are required' });
    }
    
    // Test the secret key by creating a temporary Stripe instance
    const testStripe = require('stripe')(secret_key);
    
    // Try to retrieve account information to validate the key
    await testStripe.account.retrieve();
    
    // If we get here, the keys are valid
    res.json({ 
      valid: true, 
      message: 'API keys are valid' 
    });
    
  } catch (error) {
    console.error('Error testing Stripe keys:', error);
    res.status(400).json({ 
      error: error.message || 'Invalid API keys' 
    });
  }
});

// Save Stripe API keys to .env file
app.post('/save-stripe-keys', async (req, res) => {
  try {
    const { publishable_key, secret_key } = req.body;
    
    if (!publishable_key || !secret_key) {
      return res.status(400).json({ error: 'Both API keys are required' });
    }
    
    // Validate key formats
    if (!publishable_key.startsWith('pk_')) {
      return res.status(400).json({ error: 'Invalid publishable key format' });
    }
    
    if (!secret_key.startsWith('sk_')) {
      return res.status(400).json({ error: 'Invalid secret key format' });
    }
    
    // Test the keys first
    const testStripe = require('stripe')(secret_key);
    await testStripe.account.retrieve();
    
    // Create .env content
    const envContent = `STRIPE_SECRET_KEY=${secret_key}
STRIPE_PUBLISHABLE_KEY=${publishable_key}
PORT=${process.env.PORT || 3000}
NODE_ENV=${process.env.NODE_ENV || 'production'}
`;
    
    // Write to .env file
    fs.writeFileSync('.env', envContent);
    
    // Update current process environment
    process.env.STRIPE_SECRET_KEY = secret_key;
    process.env.STRIPE_PUBLISHABLE_KEY = publishable_key;
    
    // Reinitialize Stripe with new keys
    stripe = require('stripe')(secret_key);
    
    console.log('✅ Stripe API keys updated successfully');
    
    res.json({ 
      success: true, 
      message: 'API keys saved successfully' 
    });
    
  } catch (error) {
    console.error('Error saving Stripe keys:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to save API keys' 
    });
  }
});

// List connected readers
app.get('/readers', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(400).json({ error: 'Stripe not configured' });
    }
    
    const readers = await stripe.terminal.readers.list();
    res.json(readers);
  } catch (error) {
    console.error('Error listing readers:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`🌐 External access: http://161.35.229.94:${PORT}`);
  console.log(`📱 Environment: ${isProduction ? 'Production' : 'Development'}`);
  console.log('💳 Stripe Terminal POS ready for payments');
});
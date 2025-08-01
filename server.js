const express = require('express');
const cors = require('cors');
const path = require('path');
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

// Initialize Stripe
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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
    const connectionToken = await stripe.terminal.connectionTokens.create();
    res.json({ secret: connectionToken.secret });
  } catch (error) {
    console.error('Error creating connection token:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Stripe publishable key
app.get('/config', (req, res) => {
  res.json({
    publishable_key: process.env.STRIPE_PUBLISHABLE_KEY
  });
});

// List connected readers
app.get('/readers', async (req, res) => {
  try {
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
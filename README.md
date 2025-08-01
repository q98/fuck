# Stripe Terminal POS System

A simple point-of-sale web application that integrates with Stripe Terminal for processing in-person card payments.

## Features

- 🔍 **Reader Discovery**: Automatically discover available Stripe Terminal readers
- 🔌 **Terminal Connection**: Connect to physical payment terminals
- 💰 **Payment Processing**: Process card payments with real-time status updates
- 🧾 **Receipt Generation**: Generate and print customer receipts
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Prerequisites

Before running this application, you need:

1. **Stripe Account**: Sign up at [stripe.com](https://stripe.com)
2. **Stripe Terminal Reader**: Purchase a supported reader from Stripe
3. **Node.js**: Version 14 or higher
4. **API Keys**: Both publishable and secret keys from your Stripe dashboard

## Quick Start

### 1. Installation

```bash
# Install dependencies
npm install
```

### 2. Configuration

1. Copy the `.env` file and update it with your actual Stripe API keys:

```env
# Replace with your actual Stripe keys
STRIPE_SECRET_KEY=sk_test_your_actual_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_publishable_key_here

PORT=3000
```

2. **Get your Stripe API keys**:
   - Log in to your [Stripe Dashboard](https://dashboard.stripe.com)
   - Go to **Developers** → **API keys**
   - Copy your **Publishable key** and **Secret key**
   - Replace the placeholder values in `.env`

### 3. Running the Application

```bash
# Start the server
npm start

# For development with auto-reload
npm run dev
```

The application will be available at `http://localhost:3000`

## How to Use

### Setting Up Terminal Connection

1. **Discover Readers**: Click "🔍 Discover Readers" to find available terminals
2. **Select Reader**: Click on a reader from the list to select it
3. **Connect**: Click "🔌 Connect to Reader" to establish connection

### Processing Payments

1. **Enter Amount**: Input the payment amount in the "Amount ($)" field
2. **Charge Customer**: Click "💰 Charge Customer" to initiate payment
3. **Present Card**: Customer presents their card to the terminal
4. **Complete**: Payment processes automatically and receipt is generated

### Receipt Management

1. **View Receipt**: Receipt appears automatically after successful payment
2. **Print Receipt**: Click "🖨️ Print Receipt" to print (opens browser print dialog)
3. **New Transaction**: Click "🆕 New Transaction" to start over

## API Endpoints

The backend provides these REST endpoints:

- `GET /config` - Get Stripe publishable key
- `POST /create-payment-intent` - Create a new payment intent
- `POST /cancel-payment-intent` - Cancel an existing payment intent
- `GET /payment-intent/:id` - Get payment intent details
- `GET /readers` - List connected terminal readers

## Project Structure

```
├── server.js          # Express.js backend server
├── index.html         # Main application UI
├── style.css          # Application styles
├── script.js          # Frontend JavaScript logic
├── package.json       # Dependencies and scripts
├── .env              # Environment variables (create this)
└── README.md         # This documentation
```

## Development Notes

### Current Implementation

- **Demo Mode**: The app currently runs in simulation mode for demonstration
- **Simulated Reader**: Uses a simulated terminal reader for testing
- **Mock Payments**: Payment processing is simulated but follows real workflow

### Production Setup

For production use, you'll need to:

1. **Real Terminal**: Connect an actual Stripe Terminal reader
2. **Connection Tokens**: Implement proper connection token generation
3. **Webhooks**: Set up Stripe webhooks for payment confirmations
4. **HTTPS**: Deploy with SSL certificate for security
5. **Database**: Add transaction logging and receipt storage

### Security Considerations

- ✅ API keys stored server-side in environment variables
- ✅ Payment intents created on backend
- ✅ No sensitive data in frontend JavaScript
- ⚠️ Add input validation and rate limiting for production
- ⚠️ Implement proper error handling and logging

## Troubleshooting

### Common Issues

1. **"Please update your Stripe API keys"**
   - Make sure you've updated the `.env` file with real API keys
   - Ensure the keys don't contain the placeholder text

2. **Reader not found**
   - Check that your Stripe Terminal is powered on
   - Ensure it's connected to the same network
   - Verify the reader is registered in your Stripe account

3. **Payment failures**
   - Check your Stripe dashboard for error details
   - Ensure your account has Terminal features enabled
   - Verify the reader firmware is up to date

### Getting Help

- [Stripe Terminal Documentation](https://stripe.com/docs/terminal)
- [Stripe Terminal GitHub](https://github.com/stripe/terminal-js)
- [Stripe Support](https://support.stripe.com)

## License

MIT License - feel free to use this code for your own projects!# fuck

// Global variables
let terminal = null;
let selectedReader = null;
let currentPaymentIntent = null;
let stripeConfig = null;

// DOM elements
const connectionStatus = document.getElementById('connectionStatus');
const statusIndicator = document.getElementById('statusIndicator');
const discoverBtn = document.getElementById('discoverReaders');
const connectBtn = document.getElementById('connectReader');
const disconnectBtn = document.getElementById('disconnectReader');
const readersList = document.getElementById('readersList');
const connectedReader = document.getElementById('connectedReader');
const paymentAmount = document.getElementById('paymentAmount');
const processPaymentBtn = document.getElementById('processPayment');
const cancelPaymentBtn = document.getElementById('cancelPayment');
const paymentStatus = document.getElementById('paymentStatus');
const receiptSection = document.getElementById('receiptSection');
const receipt = document.getElementById('receipt');
const printReceiptBtn = document.getElementById('printReceipt');
const newTransactionBtn = document.getElementById('newTransaction');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');
const feeBreakdown = document.getElementById('feeBreakdown');
const baseAmountDisplay = document.getElementById('baseAmountDisplay');
const stripeFeeDisplay = document.getElementById('stripeFeeDisplay');
const totalAmountDisplay = document.getElementById('totalAmountDisplay');
const stripeSetupModal = document.getElementById('stripeSetupModal');
const setupPublishableKey = document.getElementById('setupPublishableKey');
const setupSecretKey = document.getElementById('setupSecretKey');
const saveStripeKeysBtn = document.getElementById('saveStripeKeys');
const testStripeKeysBtn = document.getElementById('testStripeKeys');
const setupStatus = document.getElementById('setupStatus');

// Initialize the application
async function init() {
    try {
        showLoading('Initializing...');
        
        // Check if Stripe is configured
        const configResponse = await fetch('/config');
        const configData = await configResponse.json();
        
        if (!configResponse.ok || !configData.configured) {
            hideLoading();
            showStripeSetup();
            return;
        }
        
        stripeConfig = configData;
        
        // Initialize Stripe Terminal
        terminal = StripeTerminal.create({
            onFetchConnectionToken: fetchConnectionToken,
            onUnexpectedReaderDisconnect: onUnexpectedDisconnect,
        });
        
        console.log('Stripe Terminal initialized successfully');
        hideLoading();
        
    } catch (error) {
        console.error('Initialization error:', error);
        hideLoading();
        showStripeSetup();
    }
}

// Show Stripe setup modal
function showStripeSetup() {
    stripeSetupModal.style.display = 'flex';
}

// Hide Stripe setup modal
function hideStripeSetup() {
    stripeSetupModal.style.display = 'none';
}

// Show setup status message
function showSetupStatus(message, type = 'processing') {
    setupStatus.className = `setup-status ${type}`;
    setupStatus.innerHTML = message;
}

// Test Stripe keys
async function testStripeKeys() {
    const publishableKey = setupPublishableKey.value.trim();
    const secretKey = setupSecretKey.value.trim();
    
    if (!publishableKey || !secretKey) {
        showSetupStatus('Please enter both API keys', 'error');
        return;
    }
    
    if (!publishableKey.startsWith('pk_')) {
        showSetupStatus('Publishable key should start with "pk_"', 'error');
        return;
    }
    
    if (!secretKey.startsWith('sk_')) {
        showSetupStatus('Secret key should start with "sk_"', 'error');
        return;
    }
    
    try {
        showSetupStatus('Testing API keys...', 'processing');
        
        const response = await fetch('/test-stripe-keys', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                publishable_key: publishableKey,
                secret_key: secretKey
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showSetupStatus('✅ API keys are valid!', 'success');
        } else {
            showSetupStatus(`❌ Invalid keys: ${result.error}`, 'error');
        }
    } catch (error) {
        showSetupStatus(`❌ Error testing keys: ${error.message}`, 'error');
    }
}

// Save Stripe keys
async function saveStripeKeys() {
    const publishableKey = setupPublishableKey.value.trim();
    const secretKey = setupSecretKey.value.trim();
    
    if (!publishableKey || !secretKey) {
        showSetupStatus('Please enter both API keys', 'error');
        return;
    }
    
    try {
        showSetupStatus('Saving API keys...', 'processing');
        
        const response = await fetch('/save-stripe-keys', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                publishable_key: publishableKey,
                secret_key: secretKey
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showSetupStatus('✅ Keys saved successfully! Initializing...', 'success');
            
            // Wait a moment then reinitialize
            setTimeout(() => {
                hideStripeSetup();
                window.location.reload();
            }, 2000);
        } else {
            showSetupStatus(`❌ Error saving keys: ${result.error}`, 'error');
        }
    } catch (error) {
        showSetupStatus(`❌ Error saving keys: ${error.message}`, 'error');
    }
}

// Fetch connection token from backend
async function fetchConnectionToken() {
    try {
        const response = await fetch('/connection_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to create connection token');
        }
        
        console.log('Connection token created successfully');
        return data.secret;
    } catch (error) {
        console.error('Connection token error:', error);
        throw error;
    }
}

// Handle unexpected reader disconnect
function onUnexpectedDisconnect() {
    console.log('Reader disconnected unexpectedly');
    updateConnectionStatus(false);
    enableDiscoverButton();
}

// Update connection status UI
function updateConnectionStatus(connected, readerLabel = null) {
    if (connected) {
        connectionStatus.textContent = `Connected to ${readerLabel || 'Reader'}`;
        statusIndicator.classList.add('connected');
        connectBtn.disabled = true;
        disconnectBtn.disabled = false;
        processPaymentBtn.disabled = false;
        connectedReader.innerHTML = `
            <h3>✅ Connected Reader</h3>
            <p><strong>Device:</strong> ${readerLabel || 'Unknown Reader'}</p>
            <p><strong>Status:</strong> Ready for payments</p>
        `;
        connectedReader.classList.add('show');
    } else {
        connectionStatus.textContent = 'Disconnected';
        statusIndicator.classList.remove('connected');
        connectBtn.disabled = true;
        disconnectBtn.disabled = true;
        processPaymentBtn.disabled = true;
        connectedReader.classList.remove('show');
    }
}

// Show loading overlay
function showLoading(text = 'Processing...') {
    loadingText.textContent = text;
    loadingOverlay.style.display = 'flex';
}

// Hide loading overlay
function hideLoading() {
    loadingOverlay.style.display = 'none';
}

// Show error message
function showError(message) {
    paymentStatus.className = 'payment-status error';
    paymentStatus.innerHTML = `<strong>Error:</strong> ${message}`;
}

// Show success message
function showSuccess(message) {
    paymentStatus.className = 'payment-status success';
    paymentStatus.innerHTML = `<strong>Success:</strong> ${message}`;
}

// Show processing message
function showProcessing(message) {
    paymentStatus.className = 'payment-status processing';
    paymentStatus.innerHTML = `<strong>Processing:</strong> ${message}`;
}

// Enable discover button
function enableDiscoverButton() {
    discoverBtn.disabled = false;
    connectBtn.disabled = true;
    readersList.innerHTML = '';
}

// Discover readers
async function discoverReaders() {
    try {
        showLoading('Discovering readers...');
        discoverBtn.disabled = true;
        
        // Discover real Stripe Terminal readers only
        const config = {
            simulated: false
        };
        
        const discoverResult = await terminal.discoverReaders(config);
        
        if (discoverResult.error) {
            throw new Error(discoverResult.error.message);
        }
        
        console.log('Discovered readers:', discoverResult.discoveredReaders);
        displayReaders(discoverResult.discoveredReaders);
        hideLoading();
        
        if (discoverResult.discoveredReaders.length === 0) {
            showError('No readers found. Make sure your Stripe Terminal is powered on and connected to the same network.');
        }
        
    } catch (error) {
        console.error('Discovery error:', error);
        showError('Failed to discover readers: ' + error.message);
        discoverBtn.disabled = false;
        hideLoading();
    }
}

// Display available readers
function displayReaders(readers) {
    readersList.innerHTML = '';
    
    if (readers.length === 0) {
        readersList.innerHTML = '<p>No readers found. Make sure your reader is powered on and connected.</p>';
        return;
    }
    
    readers.forEach(reader => {
        const readerElement = document.createElement('div');
        readerElement.className = 'reader-item';
        readerElement.innerHTML = `
            <h4>${reader.label}</h4>
            <p><strong>Type:</strong> ${reader.device_type}</p>
            <p><strong>ID:</strong> ${reader.id}</p>
        `;
        
        readerElement.addEventListener('click', () => {
            // Remove selection from other readers
            document.querySelectorAll('.reader-item').forEach(item => {
                item.classList.remove('selected');
            });
            
            // Select this reader
            readerElement.classList.add('selected');
            selectedReader = reader;
            connectBtn.disabled = false;
        });
        
        readersList.appendChild(readerElement);
    });
    
    discoverBtn.disabled = false;
}

// Connect to selected reader
async function connectToReader() {
    if (!selectedReader) {
        showError('Please select a reader first');
        return;
    }
    
    try {
        showLoading('Connecting to reader...');
        
        // Connect to real Stripe Terminal reader
        const connectResult = await terminal.connectReader(selectedReader);
        
        if (connectResult.error) {
            throw new Error(connectResult.error.message);
        }
        
        console.log('Connected to reader:', connectResult.reader);
        updateConnectionStatus(true, connectResult.reader.label);
        
        hideLoading();
        showSuccess(`Connected to ${connectResult.reader.label}`);
        
    } catch (error) {
        console.error('Connection error:', error);
        showError('Failed to connect: ' + error.message);
        hideLoading();
    }
}

// Disconnect from reader
async function disconnectFromReader() {
    try {
        showLoading('Disconnecting...');
        
        // Disconnect from real Stripe Terminal reader
        const disconnectResult = await terminal.disconnectReader();
        
        if (disconnectResult.error) {
            throw new Error(disconnectResult.error.message);
        }
        
        updateConnectionStatus(false);
        selectedReader = null;
        enableDiscoverButton();
        
        hideLoading();
        showSuccess('Disconnected from reader');
        
    } catch (error) {
        console.error('Disconnection error:', error);
        showError('Failed to disconnect: ' + error.message);
        hideLoading();
    }
}

// Process payment
async function processPayment() {
    const amount = parseFloat(paymentAmount.value);
    
    if (!amount || amount <= 0) {
        showError('Please enter a valid amount');
        return;
    }
    
    if (!selectedReader) {
        showError('Please connect to a reader first');
        return;
    }
    
    try {
        showLoading('Creating payment intent...');
        processPaymentBtn.disabled = true;
        cancelPaymentBtn.disabled = false;
        
        // Create payment intent
        const response = await fetch('/create-payment-intent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ amount })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error);
        }
        
        currentPaymentIntent = data;
        
        showLoading('Present card to reader...');
        showProcessing('Waiting for customer to present payment method...');
        
        // Collect payment method using real Stripe Terminal
        await collectPaymentMethod(currentPaymentIntent.client_secret);
        
    } catch (error) {
        console.error('Payment error:', error);
        showError('Payment failed: ' + error.message);
        resetPaymentState();
    }
}

// Collect payment method using real Stripe Terminal
async function collectPaymentMethod(clientSecret) {
    try {
        // Collect payment method from the terminal
        const collectResult = await terminal.collectPaymentMethod(clientSecret);
        
        if (collectResult.error) {
            throw new Error(collectResult.error.message);
        }
        
        showLoading('Processing payment...');
        
        // Process the payment
        const confirmResult = await terminal.processPayment(collectResult.paymentIntent);
        
        if (confirmResult.error) {
            throw new Error(confirmResult.error.message);
        } else if (confirmResult.paymentIntent) {
            console.log('Payment successful:', confirmResult.paymentIntent);
            onPaymentSuccess(confirmResult.paymentIntent);
        }
        
    } catch (error) {
        throw error;
    }
}

// Handle successful payment
function onPaymentSuccess(paymentIntent) {
    hideLoading();
    showSuccess(`Payment of $${(paymentIntent.amount / 100).toFixed(2)} processed successfully!`);
    
    generateReceipt(paymentIntent);
    resetPaymentState();
    
    // Show receipt section
    receiptSection.style.display = 'block';
    receiptSection.scrollIntoView({ behavior: 'smooth' });
}

// Generate receipt
function generateReceipt(paymentIntent) {
    const now = new Date();
    const card = paymentIntent.payment_method.card;
    
    // Extract fee information from metadata or current calculation
    const totalAmount = paymentIntent.amount / 100;
    const baseAmount = paymentIntent.metadata?.base_amount ? 
        parseInt(paymentIntent.metadata.base_amount) / 100 : totalAmount;
    const stripeFee = paymentIntent.metadata?.stripe_fee ? 
        parseInt(paymentIntent.metadata.stripe_fee) / 100 : 0;
    
    receipt.innerHTML = `
        <div class="receipt-header">
            <h3>PAYMENT RECEIPT</h3>
            <p>Transaction ID: ${paymentIntent.id}</p>
            <p>${now.toLocaleDateString()} ${now.toLocaleTimeString()}</p>
        </div>
        
        <div class="receipt-line">
            <span>Base Amount:</span>
            <span>$${baseAmount.toFixed(2)}</span>
        </div>
        
        <div class="receipt-line">
            <span>Processing Fee:</span>
            <span>$${stripeFee.toFixed(2)}</span>
        </div>
        
        <div class="receipt-line">
            <span>Payment Method:</span>
            <span>${card.brand.toUpperCase()} •••• ${card.last4}</span>
        </div>
        
        <div class="receipt-line">
            <span>Status:</span>
            <span>APPROVED</span>
        </div>
        
        <div class="receipt-line total">
            <span>TOTAL CHARGED:</span>
            <span>$${totalAmount.toFixed(2)}</span>
        </div>
        
        <div style="text-align: center; margin-top: 20px; font-size: 12px;">
            <p>Thank you for your business!</p>
            <p>Processing fees included in total</p>
            <p>Please keep this receipt for your records</p>
        </div>
    `;
}

// Cancel payment
async function cancelPayment() {
    if (!currentPaymentIntent) return;
    
    try {
        showLoading('Canceling payment...');
        
        const response = await fetch('/cancel-payment-intent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                payment_intent_id: currentPaymentIntent.payment_intent_id 
            })
        });
        
        if (response.ok) {
            showSuccess('Payment canceled');
        } else {
            throw new Error('Failed to cancel payment');
        }
        
        resetPaymentState();
        hideLoading();
        
    } catch (error) {
        console.error('Cancel error:', error);
        showError('Failed to cancel payment: ' + error.message);
        hideLoading();
    }
}

// Reset payment state
function resetPaymentState() {
    processPaymentBtn.disabled = false;
    cancelPaymentBtn.disabled = true;
    currentPaymentIntent = null;
}

// Print receipt (simulate)
function printReceipt() {
    // In a real implementation, you would integrate with a receipt printer
    // For demo, we'll open the print dialog
    window.print();
}

// Start new transaction
function newTransaction() {
    paymentAmount.value = '';
    feeBreakdown.style.display = 'none';
    receiptSection.style.display = 'none';
    paymentStatus.style.display = 'none';
    resetPaymentState();
    
    // Scroll back to payment section
    document.querySelector('.payment-section').scrollIntoView({ behavior: 'smooth' });
}

// Event listeners
discoverBtn.addEventListener('click', discoverReaders);
connectBtn.addEventListener('click', connectToReader);
disconnectBtn.addEventListener('click', disconnectFromReader);
processPaymentBtn.addEventListener('click', processPayment);
cancelPaymentBtn.addEventListener('click', cancelPayment);
printReceiptBtn.addEventListener('click', printReceipt);
newTransactionBtn.addEventListener('click', newTransaction);
saveStripeKeysBtn.addEventListener('click', saveStripeKeys);
testStripeKeysBtn.addEventListener('click', testStripeKeys);

// Calculate and display fees when amount changes
async function updateFeeCalculation() {
    const amount = parseFloat(paymentAmount.value);
    
    if (!amount || amount <= 0) {
        feeBreakdown.style.display = 'none';
        processPaymentBtn.disabled = true;
        return;
    }
    
    try {
        const response = await fetch('/calculate-fees', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ amount })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Update fee breakdown display
            baseAmountDisplay.textContent = `$${data.baseAmount.toFixed(2)}`;
            stripeFeeDisplay.textContent = `$${data.stripeFee.toFixed(2)}`;
            totalAmountDisplay.textContent = `$${data.totalAmount.toFixed(2)}`;
            
            feeBreakdown.style.display = 'block';
            processPaymentBtn.disabled = !selectedReader;
        } else {
            feeBreakdown.style.display = 'none';
            processPaymentBtn.disabled = true;
        }
    } catch (error) {
        console.error('Error calculating fees:', error);
        feeBreakdown.style.display = 'none';
        processPaymentBtn.disabled = true;
    }
}

// Initialize amount input formatting and fee calculation
paymentAmount.addEventListener('input', updateFeeCalculation);

// Initialize the application when page loads
document.addEventListener('DOMContentLoaded', init);
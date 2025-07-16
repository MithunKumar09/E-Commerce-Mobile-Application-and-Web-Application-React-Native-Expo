//backend/Routes/paymentRoutes.js
const Router = require("express");
const cors = require('cors');
require('dotenv').config();
const paymentRoute = Router();
const Wallet = require('../Models/walletModel');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../Models/orderModel');
const DebitTransactionHistory = require('../Models/debitTransactionHistoryModel');

// Middleware for handling Stripe Webhook
const rawBodyParser = require('express').raw({ type: 'application/json' });
let activeIntentType = null;

// Helper function to determine if the intent is for wallet
const isWalletIntent = (intentId) => {
  return activeIntentType === "wallet";
};

paymentRoute.post('/create-walletpayment-intent', async (req, res) => {
  const { amount, userEmail, userId } = req.body;

  try {
    // Log input data
    console.log("Received Data: ", { amount, userEmail, userId });

    if (!userEmail || !userId) {
      console.error("Validation Error: User Email and User ID are required.");
      return res.status(400).json({ error: "User Email and User ID are required." });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      payment_method_types: ['card'],
    });

    // Store initial transaction with pending status
    const newTransaction = await Wallet.create({
      userId,
      userEmail,
      amount: amount / 100,
      transactionType: 'credit',
      stripePaymentIntentId: paymentIntent.id,
      status: 'pending',
    });

    activeIntentType = "wallet";
    console.log("Transaction Stored in Database: ", newTransaction);

    res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
  } catch (error) {
    console.error("Error in create-payment-intent: ", error.message);
    res.status(400).send({ error: error.message });
  }
});

// Webhook to handle payment status updates
paymentRoute.post('/webhook-wallet', rawBodyParser, async (req, res) => {
  if (activeIntentType !== "wallet") {
    console.log("Ignoring non-wallet webhook request.");
    return res.status(400).send("Webhook Ignored: Not a Wallet Intent.");
  }
  const sig = req.headers['stripe-signature'];

  console.log("Received Webhook Request Signature: ", sig);

  let event;

  try {
    // Use the raw body buffer for Stripe verification
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    console.log("Webhook Event Verified: ", event);
  } catch (err) {
    console.error(`Webhook Signature Verification Failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (!isWalletIntent(event.data.object.id)) {
    console.log("Ignoring non-wallet webhook request.");
    return res.status(400).send("Webhook Ignored: Not a Wallet Intent.");
  }

  // Handle the specific Stripe event types
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    console.log("Payment Intent Succeeded: ", paymentIntent.id);

    try {
      const transaction = await Wallet.findOneAndUpdate(
        { stripePaymentIntentId: paymentIntent.id, intentType: 'wallet' },
        { status: 'succeeded' },
        { new: true }
      );

      if (transaction) {
        console.log(`Transaction updated to 'succeeded' for PaymentIntent ID: ${paymentIntent.id}`);
      } else {
        console.warn(`No matching transaction found for PaymentIntent ID: ${paymentIntent.id}`);
      }
    } catch (updateError) {
      console.error(`Error updating transaction status: ${updateError.message}`);
      return res.status(500).send('Failed to update transaction status.');
    }
  } else if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object;
    console.log("Payment Intent Failed: ", paymentIntent.id);

    try {
      const transaction = await Wallet.findOneAndUpdate(
        { stripePaymentIntentId: paymentIntent.id, intentType: 'wallet' },
        { status: 'failed' },
        { new: true }
      );

      if (transaction) {
        console.log(`Transaction updated to 'failed' for PaymentIntent ID: ${paymentIntent.id}`);
      } else {
        console.warn(`No matching transaction found for PaymentIntent ID: ${paymentIntent.id}`);
      }
    } catch (updateError) {
      console.error(`Error updating transaction status: ${updateError.message}`);
      return res.status(500).send('Failed to update transaction status.');
    }
  } else {
    console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

// Webhook to handle redeem funds logic with Dynamic Allocation Approach
paymentRoute.post('/redeem-funds', async (req, res) => {
  const { amount, userEmail, userId, intentIds } = req.body;

  console.log("Received data:", req.body);

  try {
    if (!amount || !userEmail || !userId || !intentIds || intentIds.length === 0) {
      return res.status(400).json({ error: "Amount, UserEmail, UserId, and intentIds are required." });
    }

    const walletTransactions = await Wallet.find({
      userId,
      userEmail,
      transactionType: 'credit',
      status: 'succeeded',
    }).sort({ timestamp: 1 }); // FIFO Logic

    let remainingAmount = amount;
    const validPayments = [];

    for (const intent of intentIds) {
      if (remainingAmount <= 0) break;

      const transaction = walletTransactions.find(
        txn => txn.stripePaymentIntentId === intent.stripePaymentIntentId
      );

      if (transaction) {
        const deductionAmount = Math.min(transaction.amount, intent.amount, remainingAmount);
        remainingAmount -= deductionAmount;

        transaction.amount -= deductionAmount;

        // Add or update the "debitTransactionHistory" field
        if (!transaction.debitTransactionHistory) {
          transaction.debitTransactionHistory = [];
        }

        transaction.debitTransactionHistory.push({
          amount: deductionAmount,
          stripePaymentIntentId: intent.stripePaymentIntentId,
          timestamp: new Date(),
        });

        await transaction.save();

                // Store debit transaction history in separate collection (DebitTransactionHistory)
                const newDebitTransactionHistory = new DebitTransactionHistory({
                  transactionId: transaction._id,
                  userId,
                  userEmail,
                  stripePaymentIntentId: intent.stripePaymentIntentId,
                  amount: deductionAmount,
                  timestamp: new Date(),
                });
        
                await newDebitTransactionHistory.save();

        validPayments.push({
          intentId: intent.stripePaymentIntentId,
          transactionType: 'debit',
          paymentMethod: 'wallet',
          status: 'succeeded',
          amount: deductionAmount,
        });

        console.log(`Debited ₹${deductionAmount} from transaction ${transaction._id}`);
      }
    }

    await deleteZeroAmountTransactions();

    if (remainingAmount > 0) {
      return res.status(400).json({ error: `Insufficient balance to redeem ₹${amount}` });
    }

    const updatedBalance = await updateWalletBalance(userId, userEmail);

    res.json({
      success: true,
      message: "Funds have been successfully redeemed.",
      updatedBalance,
      validPayments,
    });
  } catch (error) {
    console.error("Error in redeem-funds:", error.message);
    res.status(500).json({ error: "An error occurred while redeeming funds." });
  }
});



// Function to update the wallet balance
async function updateWalletBalance(userId, userEmail) {
  // Fetch the user's wallet balance and return the updated value.
  const wallet = await Wallet.findOne({ userId, userEmail }).sort({ timestamp: -1 });
  return wallet ? wallet.amount : 0;
}

// New helper function to handle zero-amount transactions
async function deleteZeroAmountTransactions() {
  try {
    const zeroAmountTransactions = await Wallet.find({ amount: 0 });
    for (const transaction of zeroAmountTransactions) {
      await Wallet.deleteOne({ _id: transaction._id });
      console.log(`Deleted transaction with ID: ${transaction._id} due to zero amount.`);
    }
  } catch (error) {
    console.error("Error deleting zero amount transactions:", error.message);
  }
}


// New Confirm Order Route (updated to handle the array-to-string issue)
paymentRoute.post('/confirm-order', async (req, res) => {
  const { total, userEmail, userId, orderId, selectedAddressId, paymentMethod, cartItems, paymentDetails, paid, orderSummary } = req.body;

  if (!paymentMethod) {
    return res.status(400).json({ error: "Payment method is required." });
  }

  if (!paymentDetails?.stripePaymentIntentIds?.length) {
    return res.status(400).json({ error: "stripePaymentIntentId is required." });
  }

  try {
    const stripePaymentIntentId = Array.isArray(paymentDetails.stripePaymentIntentIds)
      ? paymentDetails.stripePaymentIntentIds[0].stripePaymentIntentId
      : paymentDetails.stripePaymentIntentIds.stripePaymentIntentId;

    const validPaymentDetails = paymentDetails.stripePaymentIntentIds.map(intent => ({
      intentId: intent.stripePaymentIntentId,
      transactionType: 'debit',
      status: 'succeeded',
      amount: total,
      paymentMethod: 'wallet',
    }));

    const order = new Order({
      _id: orderId,
      userId,
      total,
      cartItems,
      selectedAddressId,
      paymentMethod,
      paid,
      paymentDetails: validPaymentDetails,
      orderSummary,
      orderStatus: 'Pending',
    });

    await order.save();

    if (paymentMethod === 'wallet') {
      // Check if the transaction with the same stripePaymentIntentId already exists in the history to prevent duplication
      const walletTransaction = await Wallet.findOne({
        userId,
        userEmail,
        stripePaymentIntentId: stripePaymentIntentId,
        transactionType: 'credit',
        status: 'succeeded',
      });

      if (walletTransaction) {
        // Fetch data from debitTransactionHistory
        const history = walletTransaction.debitTransactionHistory || [];
        // Check if the exact amount and payment details already exist in the history
        const existingHistoryEntry = history.find(entry => 
          entry.amount === total &&
          entry.stripePaymentIntentId === stripePaymentIntentId
        );

        if (!existingHistoryEntry) {
          // If no duplicate entry found, add new entry to debitTransactionHistory
          walletTransaction.debitTransactionHistory.push({
            amount: total,
            stripePaymentIntentId, // Optional: Ensure linking the exact intent
            timestamp: new Date(),
          });

          await walletTransaction.save();


          // Also, store this debit transaction in the DebitTransactionHistory collection
          const newDebitTransactionHistory = new DebitTransactionHistory({
            transactionId: walletTransaction._id,
            userId,
            userEmail,
            amount: total,
            stripePaymentIntentId,
            timestamp: new Date(),
          });

          await newDebitTransactionHistory.save();

          console.log(`Updated history for transaction ${walletTransaction._id} with debited amount ₹${total}`);
        } else {
          console.log(`History entry for stripePaymentIntentId ${stripePaymentIntentId} already exists. Skipping.`);
        }
      } else {
        console.log(`No credit transaction found for stripePaymentIntentId ${stripePaymentIntentId}.`);
      }
    }

    res.json({ success: true, message: 'Order Confirmed and Wallet Redeemed Successfully' });
  } catch (error) {
    console.error("Error in confirm-order:", error.message);
    res.status(500).json({ error: error.message || 'An error occurred while confirming your order.' });
  }
});

// Fetch Wallet Balance
paymentRoute.get('/wallet-balance/:email/:userId', async (req, res) => {
  try {
    const { email, userId } = req.params;
    if (!email || !userId) {
      return res.status(400).json({ error: "Email and User ID parameters are required." });
    }

    // Retrieve succeeded transactions matching userEmail and userId
    const transactions = await Wallet.find({
      userEmail: email,
      userId: userId,
      status: 'succeeded',
    });

    // Sum the transaction amounts and return the balance
    const balance = transactions.reduce((sum, txn) => {
      return txn.transactionType === 'credit' ? sum + txn.amount : sum - txn.amount;
    }, 0);

    // Log the fetched balance for debugging
    console.log(`Fetched balance for ${email} (UserID: ${userId}): ${balance}`);

    res.json({ balance, transactions });
  } catch (error) {
    console.error("Error fetching wallet balance: ", error.message);
    res.status(500).json({ error: 'Failed to fetch wallet balance' });
  }
});

// New Route: Fetch Transaction History
paymentRoute.get('/transaction-history/:email', async (req, res) => {
  const { email } = req.params;

  try {
    const transactions = await Wallet.find({ userEmail: email }).sort({ createdAt: -1 });
    res.status(200).json({ transactions });
  } catch (error) {
    console.error("Error fetching transaction history:", error.message);
    res.status(500).json({ error: "Failed to fetch transaction history." });
  }
});

module.exports = paymentRoute;
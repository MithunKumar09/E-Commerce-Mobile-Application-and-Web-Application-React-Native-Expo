//backend/Rutes/prepaidRoutes.js
const express = require('express');
const prepaidRouter = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require("../Models/orderModel");
const bodyParser = require('body-parser');

 //backend/Routes/prepaidRoutes.js
// PrePaid Route
prepaidRouter.post('/prepaid', async (req, res) => {
    const { total, userEmail, userId, orderId, selectedAddressId, paymentMethod, selectedItems, orderSummary } = req.body;
  
    console.log("Received Data for Order Payment: ", { total, userEmail, userId, orderId, selectedAddressId, paymentMethod, selectedItems, orderSummary });
  
    try {
      if (!selectedAddressId || !paymentMethod || !userId || !userEmail || !orderId || !total || !selectedItems || !orderSummary) {
        console.error('Missing required fields:', { selectedAddressId, paymentMethod, userId, userEmail, orderId, total, selectedItems, orderSummary });
        return res.status(400).json({ error: 'Order validation failed: Missing required fields' });
      }
  
      if (!['COD', 'Card'].includes(paymentMethod)) {
        console.error('Invalid payment method:', paymentMethod);
        return res.status(400).json({ error: 'Invalid payment method' });
      }
  
      console.log('Creating Payment Intent with amount:', total);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: total,
        currency: "usd",
        payment_method_types: ["card"],
      });
  
      const newOrder = await Order.create({
        _id: orderId,
        userId,
        userEmail,
        orderId,
        amount: total / 100,
        paymentMethod,
        selectedAddressId,
        total,
        status: "pending",
        cartItems: selectedItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          image: item.image,
          status: 'Pending',
        })),
        orderSummary: orderSummary,
        paymentDetails: [{
          intentId: paymentIntent.id,
          transactionType: 'debit',
          status: 'pending',
          amount: total,
          paymentMethod: 'Card'
        }]
      });
  
      console.log("Order Stored in Database: ", newOrder);
  
      res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id, orderSummary: orderSummary, });
    } catch (error) {
      console.error("Error in create-orderpayment-intent: ", error.message);
      res.status(400).json({ error: error.message });
    }
  });

// backend/Routes/userRoutes.js
// Webhook for Stripe Payment Intent
prepaidRouter.post("/webhook-order", express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers["stripe-signature"];

    if (!sig) {
        console.error("Webhook Error: Missing Stripe signature.");
        return res.status(400).send("Webhook Error: Missing Stripe signature.");
    }

    console.log("Received Webhook Request Signature: ", sig);

    if (!req.body || req.body.length === 0) {
        console.error("Webhook Error: Request body is empty or undefined");
        return res.status(400).send("Webhook Error: No payload provided.");
    }

    console.log("Received Raw Body: ", req.body.toString());
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET2);
        console.log("Webhook Event Verified: ", event);
    } catch (err) {
        console.error(`Webhook Signature Verification Failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const paymentIntent = event.data.object;
    console.log("Payment Intent Object: ", paymentIntent);

        // Check the intent_type before processing further
        if (paymentIntent && paymentIntent.intent_type && paymentIntent.intent_type !== 'payment') {
            console.log("Skipping processing for non-payment intent type:", paymentIntent.intent_type);
            return res.json({ received: true });
        }

    if (event.type === "payment_intent.succeeded") {
        console.log("Payment Intent Succeeded: ", paymentIntent.id);

        try {
            // Update order status in the database for 'succeeded' status
            const order = await Order.findOneAndUpdate(
                { "paymentDetails.intentId": paymentIntent.id },
                { $set: { status: 'Paid', 'paymentDetails.$.status': 'succeeded', paid: true } },
                { new: true }
            );

            if (order) {
                console.log("Order Updated Successfully: ", order);
            } else {
                console.error("Order not found for Payment Intent ID:", paymentIntent.id);
            }
        } catch (dbError) {
            console.error("Database Update Error:", dbError.message);
        }
    } else if (event.type === "payment_intent.payment_failed") {
        console.log("Payment Intent Failed: ", paymentIntent.id);

        try {
            // Update order status in the database for 'failed' status
            const order = await Order.findOneAndUpdate(
                { "paymentDetails.intentId": paymentIntent.id },
                { $set: { status: 'Failed', 'paymentDetails.$.status': 'failed', paid: false } },
                { new: true }
            );

            if (order) {
                console.log("Order Updated Successfully: ", order);
            } else {
                console.error("Order not found for Payment Intent ID:", paymentIntent.id);
            }
        } catch (dbError) {
            console.error("Database Update Error:", dbError.message);
        }
    } else if (event.type === "payment_intent.processing") {
        console.log("Payment Intent Pending: ", paymentIntent.id);

        try {
            // Update order status in the database for 'pending' status
            const order = await Order.findOneAndUpdate(
                { "paymentDetails.intentId": paymentIntent.id },
                { $set: { status: 'Pending', 'paymentDetails.$.status': 'pending', paid: false } },
                { new: true }
            );

            if (order) {
                console.log("Order Updated Successfully: ", order);
            } else {
                console.error("Order not found for Payment Intent ID:", paymentIntent.id);
            }
        } catch (dbError) {
            console.error("Database Update Error:", dbError.message);
        }
    }

    res.json({ received: true });
});


module.exports = prepaidRouter;
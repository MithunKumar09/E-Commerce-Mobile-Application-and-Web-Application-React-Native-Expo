//backend/services/OrderTrackNotification.js
const Order = require("../Models/orderModel");
const AssignOrder = require("../Models/AssignOrder");
const NotificationService = require("./notificationService");

/**
 * Function to send order tracking notifications.
 */
const sendOrderTrackingNotification = async () => {
  try {
    const orders = await Order.find({ trackingId: { $ne: null } }); // Find orders with trackingId
    if (!orders.length) {
      console.log("No orders with tracking IDs found.");
      return;
    }

    for (const order of orders) {
        // Skip notifications for orders with status "Cancelled"
        if (order.orderStatus === "Cancelled") {
          console.log(`Skipping notification for cancelled order ID: ${order._id}`);
          continue;
        }
        
      // Convert `order._id` to string to match `orderId` field in AssignOrder
      const assignedOrder = await AssignOrder.findOne({ orderId: order._id.toString() });
      if (!assignedOrder) {
        console.log(`No assigned order found for order ID: ${order._id}`);
        continue;
      }

      if (!assignedOrder.area || !assignedOrder.locationUpdateTime) {
        console.log(`Location or update time missing for order ID: ${order._id}`);
        continue;
      }

      // Fetch area and locationUpdateTime for notification
      const locationName = assignedOrder.area;
      const locationUpdateTime = assignedOrder.locationUpdateTime
        ? assignedOrder.locationUpdateTime.toLocaleString()
        : "unknown time";

      // Use orderStatus in the notification subject
      const orderStatus = order.orderStatus || "Order Tracking";
      const notificationSubject = `Order ${orderStatus}`;
      const message = `Your Order is on the way, ${locationName}. Last updated at ${locationUpdateTime}. Track your order now.`;

      const result = await NotificationService.sendNotification(
        order.userId,
        notificationSubject,
        message
      );

      if (result.success) {
        console.log(`Order tracking notification sent to user ${order.userId}`);
      } else {
        console.error(`Failed to send notification to user ${order.userId}`);
      }
    }
  } catch (error) {
    console.error("Error sending order tracking notifications:", error.message);
  }
};

module.exports = { sendOrderTrackingNotification };

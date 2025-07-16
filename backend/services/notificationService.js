//backend/services/notificationService.js
const axios = require('axios');
const User = require('../Models/userModel');  // Ensure the User model is imported

const NotificationService = {
  sendNotification: async (userId, title, message, imageUrl = null) => {
    try {
      if (!userId || !title || !message) {
        throw new Error('Invalid notification parameters.');
      }

      // Get the push token from the user's record in the database
      const user = await User.findById(userId);  // Check if the User is found by ID
      if (!user || !user.pushToken) {
        throw new Error('User push token not found.');
      }

      // Send the notification using Expo's push notification service
      const pushToken = user.pushToken;
      const notificationMessage = {
        to: pushToken,
        sound: 'default',
        title: title,
        body: message,
        data: { extraData: 'Some additional data', imageUrl },
      };

            // Check if imageUrl exists and include it in the notification payload
            if (imageUrl) {
                notificationMessage.data.imageUrl = imageUrl;  // Add imageUrl to the notification data
              }

      const response = await axios.post('https://exp.host/--/api/v2/push/send', notificationMessage);
      console.log('Notification sent:', response.data);
      return { success: true };

    } catch (error) {
      console.error('Error sending notification to user:', error.message);
      return { success: false, error: error.message };
    }
  },
};

module.exports = NotificationService;

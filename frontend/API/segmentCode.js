// frontend/API/segmentCode.js
import axios from 'axios';
import { SERVER_URL } from '../Constants/index';

const sendEventToBackend = async (eventName, properties = {}, user, isAuthenticated, source) => {
  if (!isAuthenticated) {
    console.error('User is not authenticated. Cannot send event.');
    return;
  }

  if (!eventName) {
    console.error('Event name is required.');
    return;
  }

  if (!user || !user.id) {
    console.error('User details are missing. Cannot send event.');
    return;
  }

  try {
    // Blocked event logic (this is an example, you can add conditions for blocking)
    const isBlocked = false;

    const eventData = {
      eventName,
      properties,
      userId: user.id,
      source: source || 'unknown',
      timestamp: new Date().toISOString(),
      isBlocked,
    };

    console.log('Sending event data to backend:', eventData);

    const response = await axios.post(
      `${SERVER_URL}/track-event`,
      eventData
    );

    console.log('Event sent to backend:', response.data);
  } catch (error) {
    console.error('Error sending event to backend:', error.message);
  }
};

export default sendEventToBackend;

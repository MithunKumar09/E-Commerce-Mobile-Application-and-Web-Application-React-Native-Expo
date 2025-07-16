//backend/routes/segment.js
const express = require('express');
const axios = require('axios');
require('dotenv').config(); // Load environment variables
const router = express.Router();

// Retrieve Segment Write Key from environment variable
const SEGMENT_WRITE_KEY = process.env.SEGMENT_WRITE_KEY;

// Endpoint to receive tracking events from the frontend
router.post('/track-event', async (req, res) => {
  const { eventName, properties, userId, source, timestamp, isBlocked } = req.body;

  // Validate required fields
  if (!eventName || !userId) {
    return res.status(400).json({ message: 'Event name and userId are required.' });
  }

  try {
    // Determine allowed and blocked counts
    const allowedCount = isBlocked ? 0 : 1;
    const blockedCount = isBlocked ? 1 : 0;
    const totalCount = allowedCount + blockedCount;

    // Prepare the event data to send to Segment
    const eventData = {
      userId: userId,
      event: eventName,
      properties: {
        ...properties,
        allowed: allowedCount,
        blocked: blockedCount,
        total: totalCount,
      },
      context: {
        source: source || 'unknown',
      },
      timestamp: timestamp || new Date().toISOString(),
    };

    console.log('Sending event data to Segment:', eventData);

    // Send event to Segment
    const response = await axios.post(
      'https://api.segment.io/v1/track',
      eventData,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(SEGMENT_WRITE_KEY + ':').toString('base64')}`,
        },
      }
    );

    console.log('Segment event sent:', response.data);
    res.status(200).json({ message: 'Event sent to Segment successfully.' });
  } catch (error) {
    console.error('Error sending event to Segment:', error.message);
    res.status(500).json({ message: 'Failed to send event to Segment.', error: error.message });
  }
});

module.exports = router;

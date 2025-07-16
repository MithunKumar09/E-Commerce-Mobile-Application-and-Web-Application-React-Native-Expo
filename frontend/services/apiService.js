//frontend/services/apiService.js
import axios from 'axios';
import { SERVER_URL } from '../Constants/index';
import { getData, storeData } from "../utils/storage";
import * as SecureStore from "expo-secure-store";
import { useUserStore } from '../src/store/userStore';

const API_URL = `${SERVER_URL}/user/store-push-token`;

export const storePushTokenInDatabase = async (pushToken) => {
    try {
      if (!pushToken) {
        console.error('Push token is missing.');
        return;
      }
  
      // Retrieve the authToken from SecureStore or other storage method
      const authToken = await SecureStore.getItemAsync("authToken"); // Assuming 'authToken' is stored here
  
      if (!authToken) {
        console.error('Authentication token is missing.');
        return;
      }
  
      // Add authToken to the headers
      const response = await axios.post(API_URL, {
        pushToken, // Send the generated push token
      }, {
        headers: {
          Authorization: `Bearer ${authToken}`, // Include the authToken in the request header
        },
      });
  
      console.log('Push token stored successfully:', response.data);
    } catch (error) {
      console.error('Error storing push token:', error.message);
    }
  };
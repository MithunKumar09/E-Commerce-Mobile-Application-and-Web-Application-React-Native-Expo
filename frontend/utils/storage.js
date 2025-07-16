//frontend/utils/asyncstorage.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// Function to store data in AsyncStorage
export const storeData = async (key, value) => {
  try {
    const stringifiedValue = JSON.stringify(value); // Ensure value is stringified
    await AsyncStorage.setItem(key, stringifiedValue);
    console.log(`Stored in AsyncStorage: ${key} = ${stringifiedValue}`);
  } catch (error) {
    console.error(`Error storing data in AsyncStorage for key: ${key}`, error);
  }
};

// Function to retrieve data from AsyncStorage
export const getData = async (key) => {
  try {
    const value = await AsyncStorage.getItem(key);
    console.log(`Retrieved from AsyncStorage: ${key} = ${value}`);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error(`Error retrieving data from AsyncStorage for key: ${key}`, error);
    return null; // Return null in case of an error
  }
};

// Function to remove data from AsyncStorage
export const removeData = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
    console.log(`Removed from AsyncStorage: ${key}`);
  } catch (error) {
    console.error(`Error removing data from AsyncStorage for key: ${key}`, error);
  }
};

// Function to store data in SecureStore (for sensitive data)
export const storeSecureData = async (key, value) => {
  try {
    await SecureStore.setItemAsync(key, value);
    console.log(`Stored in SecureStore: ${key} = ${value}`);
  } catch (error) {
    console.error(`Error storing data in SecureStore for key: ${key}`, error);
  }
};

// Function to retrieve data from SecureStore
export const getSecureData = async (key) => {
  try {
    const value = await SecureStore.getItemAsync(key);
    console.log(`Retrieved from SecureStore: ${key} = ${value}`);
    return value; // Return the string value from SecureStore
  } catch (error) {
    console.error(`Error retrieving data from SecureStore for key: ${key}`, error);
    return null; // Return null in case of an error
  }
};

// Function to remove data from SecureStore
export const removeSecureData = async (key) => {
  try {
    await SecureStore.deleteItemAsync(key);
    console.log(`Removed from SecureStore: ${key}`);
  } catch (error) {
    console.error(`Error removing data from SecureStore for key: ${key}`, error);
  }
};

export const clearAllUserData = async () => {
  try {
    await AsyncStorage.clear();
    await SecureStore.deleteItemAsync("authToken");
    await SecureStore.deleteItemAsync("adminToken");
    await SecureStore.deleteItemAsync("salesmanToken");
    console.log("All user data cleared from AsyncStorage and SecureStore.");
  } catch (error) {
    console.error("Error clearing all user data:", error);
  }
};


// Remove all cart items
export const clearCartData = async () => {
  try {
    await AsyncStorage.removeItem("cartItems");
    console.log("Cart items cleared from AsyncStorage.");
  } catch (error) {
    console.error("Error clearing cart data:", error);
  }
};

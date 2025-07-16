// src/store/userStore.js(zustand state management)
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { getData, storeData, removeData } from "../../utils/storage";
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useUserStore = create((set) => ({
  isAuthenticated: false,
  user: null,
  admin: null,
  salesman: null,
  cartItems: [],
  cartItemCount: 0,
  wishlist: {},

  // Check if the user is authenticated by verifying the presence of an auth token
  checkAuthentication: async () => {
    try {
      console.log("Checking authentication...");
      const token = await SecureStore.getItemAsync("authToken");
      const isAuthenticated = !!token;
      if (isAuthenticated) {
        const user = await getData("userProfile");
        set({ isAuthenticated, user });
        console.log("User data fetched:", user);
      } else {
        set({ isAuthenticated: false, user: null });
      }
      console.log("Authentication status:", isAuthenticated);
    } catch (error) {
      console.error("Error checking authentication:", error);
      set({ isAuthenticated: false });
    }
  },

  // Reset user to initial state
  resetUser: () => {
    console.log("Resetting user...");
    set({ isAuthenticated: false, user: null });
  },

// Check if the admin is authenticated by verifying the presence of an admin auth token
checkAdminAuthentication: async () => {
  try {
    console.log("Checking admin authentication...");
    const adminToken = await SecureStore.getItemAsync("adminToken");

    // If token exists, then the admin is authenticated
    const isAuthenticated = !!adminToken;

    if (isAuthenticated) {
      const admin = await getData("adminProfile");  // Ensure the correct key "adminProfile"
      if (admin) {
        set({ isAuthenticated, admin });
        console.log("Admin data fetched:", admin);
      } else {
        set({ isAuthenticated: false, admin: null });
        console.error("No admin profile found.");
      }
    } else {
      set({ isAuthenticated: false, admin: null });
      console.log("Admin token not found.");
    }

    console.log("Admin authentication status:", isAuthenticated);
  } catch (error) {
    console.error("Error checking admin authentication:", error);
    set({ isAuthenticated: false, admin: null });
  }
},

  // Sign out the admin and clear the admin auth token
  signOutAdmin: async () => {
    try {
      console.log("Signing out admin...");
      await SecureStore.deleteItemAsync("adminToken");
      set({ isAuthenticated: false, admin: null });
      console.log("Admin signed out successfully.");
    } catch (error) {
      console.error("Error during admin sign-out:", error);
    }
  },

  // Reset admin data when signing out
  resetAdmin: () => {
    console.log("Resetting admin...");
    set({ isAuthenticated: false, admin: null });
    SecureStore.deleteItemAsync('adminToken'); // Delete the admin token
    SecureStore.deleteItemAsync('adminData');  // Remove admin data from SecureStore
    AsyncStorage.removeItem('adminData');      // Remove admin data from AsyncStorage
    console.log("Admin data reset successfully.");
  },

  // Check if the admin is authenticated by verifying the presence of an admin auth token
  checkSalesmanAuthentication: async () => {
    try {
      console.log("Checking salesman authentication...");
      const salesmanToken = await SecureStore.getItemAsync("salesmanToken");
      const isAuthenticated = !!salesmanToken;
      if (isAuthenticated) {
        const salesman = await getData("salesmanProfile");
        set({ isAuthenticated, salesman });
        console.log("salesman data fetched:", salesman);
      } else {
        set({ isAuthenticated: false, salesman: null });
      }
      console.log("Salesman authentication status:", isAuthenticated);
    } catch (error) {
      console.error("Error checking salesman authentication:", error);
      set({ isAuthenticated: false });
    }
  },

  signOutSalesman: async () => {
    try {
      console.log("Signing out Salesman...");
  
      // Clear SecureStore data for the salesman
      await SecureStore.deleteItemAsync("salesmanToken");
      await SecureStore.deleteItemAsync("salesmanData");
  
      // Clear AsyncStorage data for the salesman
      await AsyncStorage.removeItem("salesmanProfile");
  
      // Reset salesman state in the Zustand store
      set({ isAuthenticated: false, salesman: null });
  
      console.log("Salesman signed out successfully.");
    } catch (error) {
      console.error("Error during Salesman sign-out:", error);
    }
  },
  
  resetSalesman: () => {
    console.log("Resetting Salesman...");
    
    // Reset the state and clear local storage
    set({ isAuthenticated: false, salesman: null });
    
    SecureStore.deleteItemAsync('salesmanToken');
    SecureStore.deleteItemAsync('salesmanData');
    AsyncStorage.removeItem('salesmanProfile');
  
    console.log("Salesman data reset successfully.");
  },
  

  // Set user data and mark as authenticated
  setUser: (user) => {
    console.log('Setting user data:', user);
    set({ user, isAuthenticated: true });
  },

  setAdmin: (admin) => {
    console.log('Setting admin data:', admin);
    set({ admin, isAuthenticated: true });
  },

  setSalesman: (salesman) => {
    console.log('Setting salesman data:', salesman);
    set({ salesman, isAuthenticated: true });
  },

  // Sign out the user and clear the auth token
  signOut: async () => {
    try {
      console.log('Signing out user...');
      await SecureStore.deleteItemAsync('authToken');
      set({ isAuthenticated: false, user: null });
      console.log('User signed out successfully.');
    } catch (error) {
      console.error('Error during sign-out:', error);
    }
  },

  // Clear all user data (both AsyncStorage and SecureStore)
  clearAllUserData: async () => {
    try {
      console.log("Clearing all user data...");
      
      // Clear data in AsyncStorage
      await AsyncStorage.clear();  // Clears all keys in AsyncStorage
      
      // Clear sensitive data from SecureStore
      await SecureStore.deleteItemAsync("authToken");
      await SecureStore.deleteItemAsync("userProfile");
      // Add more keys to delete as required (e.g., adminToken, salesmanToken, etc.)
      
      console.log("All user data cleared.");
    } catch (error) {
      console.error("Error clearing all user data:", error);
      throw new Error("Failed to clear all user data");
    }
  },

  // Set cart state and count
  setCartState: (cartItems, count) => {
    const updatedCartItems = cartItems || [];
    const updatedCount = count || updatedCartItems.length;
    set({ cartItems: updatedCartItems, cartItemCount: updatedCount });
    console.log("Cart state updated:", { updatedCartItems, updatedCount });

    // Persist the updated state
    storeData("cartItems", updatedCartItems);
    storeData("cartItemCount", updatedCount.toString());
  },

  // Additional action to add cart items and update count
  addToCart: (updatedCartItems) => {
    const count = updatedCartItems.length;
    set({ cartItems: updatedCartItems, cartItemCount: count });
    console.log("Cart item count updated:", count);

    // Persist the updated cart items
    storeData("cartItems", updatedCartItems);
    storeData("cartItemCount", count.toString());
  },

  // Reset cart data
  resetCart: () => {
    set({ cartItems: [], cartItemCount: 0 });
    console.log("Cart reset to initial state.");
    removeData("cartItems");
    removeData("cartItemCount");
  },

    // Check if cart items exist in AsyncStorage and set them in state
    checkCartItems: async () => {
      try {
        const cartItems = await getData("cartItems") || [];
        const cartItemCount = await getData("cartItemCount") || 0;
        set({ cartItems, cartItemCount });
      } catch (error) {
        console.error("Error loading cart from AsyncStorage:", error);
      }
    },

  // Additional action to update cart item count
  updateCartItemCount: (count) => {
    set({ cartItemCount: count });
  },



  loadCartItems: async () => {
    const savedCart = await getData("cart");
    if (savedCart) {
      set({ cartItems: savedCart });
    }
  },

  // Remove item from the cart
  removeFromCart: async (itemId) => {
    set((state) => {
      const updatedCart = state.cartItems.filter(item => item.id !== itemId);
      storeData('cartItems', updatedCart); // Persist the updated cart in AsyncStorage
      return { cartItems: updatedCart };
    });
  },

  // Clear cart items in both Zustand and AsyncStorage
  clearCart: async () => {
    set({ cartItems: [] });
    await removeData('cartItems'); // Clear cart data from AsyncStorage
    console.log('Cart items cleared from Zustand and AsyncStorage.');
  },


  setWishlist: (updatedWishlist) => {
    set({ wishlist: updatedWishlist });

    // Persist wishlist in AsyncStorage
    storeData("wishlist", updatedWishlist);
    console.log("Wishlist updated:", updatedWishlist);
  },

  loadWishlist: async () => {
    try {
      const savedWishlist = await getData("wishlist");
      set({ wishlist: savedWishlist || {} });
      console.log("Wishlist loaded from storage:", savedWishlist);
    } catch (error) {
      console.error("Error loading wishlist from storage:", error);
    }
  },
}));
//frontend/components/User/Footer.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import axios from 'axios';
import { SERVER_URL } from '../../Constants/index';
import { storeData, getData } from '../../utils/storage';
import { useUserStore } from '../../src/store/userStore';
import * as SecureStore from "expo-secure-store";

const Footer = () => {
  const [activeScreen, setActiveScreen] = useState('HomePage');
  const navigation = useNavigation();
  const route = useRoute();
  const { user, isAuthenticated, checkAuthentication, cartItemCount, setCartState } = useUserStore();

  // Update the active screen when the route changes
  useEffect(() => {
    if (route.name) {
      setActiveScreen(route.name);
    }
  }, [route]);

 // Fetch the cart count when the component mounts to ensure the correct value
  // Fetch the cart count when the component mounts to ensure the correct value
  useEffect(() => {
    const loadCartCount = async () => {
      try {
        const cartCount = await getData("cartItemCount");
        if (cartCount) {
          // If cartItemCount exists in storage, update the state
          const parsedCount = parseInt(cartCount, 10); // Ensure count is parsed to an integer
          setCartState([], parsedCount); // Set cart state with updated count
        }
      } catch (error) {
        console.error("Error fetching cart count from storage:", error);
      }
    };

    if (isAuthenticated) {
      loadCartCount();
    }
  }, [isAuthenticated, setCartState]);


  // Navigation handler
  const handleNavigation = (screen) => {
    if (screen === 'Profile' && !isAuthenticated) {
      alert('You need to log in to access this feature.');
      navigation.navigate('UserLogin');
      return;
    }
    if (navigation?.navigate) {
      navigation.navigate(screen);
    } else {
      console.error('Navigation object is not properly configured.');
    }
  };
  

  return (
    <View style={styles.footerContainer}>
      <View style={styles.footerItem}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => handleNavigation('HomePage')}
        >
          <FontAwesome
            name="home"
            size={24}
            color={activeScreen === 'HomePage' ? 'orange' : '#fff'} // Set color to orange for active
          />
          <Text style={styles.footerText}>Home</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.footerItem}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => handleNavigation('Cart')}
        >
          <FontAwesome
            name="shopping-cart"
            size={24}
            color={activeScreen === 'Cart' ? 'orange' : '#fff'} // Set color to orange for active
          />
                    <View style={styles.cartIconContainer}>
            <Text style={styles.cartCount}>{cartItemCount}</Text>
          </View>
          <Text style={styles.footerText}>Cart</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.footerItem}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => handleNavigation('Profile')} // Ensure correct name
        >
          <MaterialIcons
            name="account-circle"
            size={24}
            color={activeScreen === 'Profile' ? 'orange' : '#fff'} // Set color to orange for active
          />
          <Text style={styles.footerText}>Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footerItem}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => handleNavigation('About')}
        >
          <MaterialIcons
            name="info"
            size={24}
            color={activeScreen === 'About' ? 'orange' : '#fff'} // Set color to orange for active
          />
          <Text style={styles.footerText}>About</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#3e3e3e',
    paddingVertical: Platform.OS === 'ios' ? 10 : 15,
    paddingHorizontal: 20,
    position: 'absolute',
    bottom: 0,
    width: '100%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  footerItem: {
    alignItems: 'center',
  },
  iconButton: {
    alignItems: 'center',
    padding: 5,
  },
  footerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 5,
  },
  cartIconContainer: {
    position: 'absolute',
    top: 0,
    right: -5,  // Position the count number at the top right of the cart icon
    backgroundColor: '#fff',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartCount: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default Footer;

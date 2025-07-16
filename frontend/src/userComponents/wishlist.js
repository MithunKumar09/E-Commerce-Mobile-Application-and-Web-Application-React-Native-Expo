//wishlist.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SERVER_URL } from '../../Constants/index';
import { storeData, getData } from '../../utils/storage';
import { useUserStore } from '../../src/store/userStore';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import sendEventToBackend from '../../API/segmentCode';

const WishList = () => {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [isMobile, setIsMobile] = useState(Dimensions.get('window').width < 768);
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
      const [wishlist, setWishlist] = useState({});
  const [dialogMessage, setDialogMessage] = useState('');
  const navigation = useNavigation();

  const { isAuthenticated, user, checkAuthentication } = useUserStore();

  Dimensions.addEventListener('change', () => {
    setIsMobile(Dimensions.get('window').width < 768);
  });

    useEffect(() => {
      checkAuthentication();
    }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchWishlist();
    } else {
      setDialogMessage('You need to log in first.');
      setShowDialog(true);
    }
  }, [isAuthenticated]);

  const fetchWishlist = async () => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('authToken');
      console.log('Retrieved token:', token);  // Log the token
  
      const response = await axios.get(`${SERVER_URL}/user/retriveWishlist`, {
        headers: { Authorization: `Bearer ${token}` },
      });
  
      console.log('Response status:', response.status);  // Log the response status
      console.log('Wishlist data:', response.data);  // Log the actual wishlist data
  
      if (response.status === 200) {
        setWishlistItems(response.data);
      } else {
        console.log('Error fetching wishlist: ', response.data);  // Log if there's any error in the response
        setDialogMessage('Error fetching wishlist');
        setShowDialog(true);
      }
    } catch (error) {
      console.error('Error occurred:', error);  // Log the error if the request fails
      setDialogMessage('An error occurred while fetching the wishlist.');
      setShowDialog(true);
    } finally {
      setLoading(false);
    }
  };
  
// Updated onRemoveFromWishlist function
const handleRemoveFromWishlist = async (productId) => {
  try {
    if (!isAuthenticated) {
      navigation.navigate("userLogin");
      return;
    }

    const token = await SecureStore.getItemAsync("authToken");
    const headers = { Authorization: `Bearer ${token}` };
    const requestBody = { userId: user.id, wishlistStatus: 'removed' };

    const response = await axios.delete(`${SERVER_URL}/user/wishlist/${String(productId)}`, {
      headers,
      data: requestBody,
    });

    if (response.status === 200) {
      // Update the wishlist by filtering out the removed item
      const updatedWishlist = wishlistItems.filter((item) => item.productId !== productId);
      setWishlistItems(updatedWishlist); // Update local state

      // Save updated wishlist to AsyncStorage
      await storeData("wishlist", updatedWishlist);

      setDialogMessage("Product removed from wishlist!");
      setShowDialog(true);

      // Sending event to the backend
      const removedItem = wishlistItems.find((item) => item.productId === productId); // Find the removed item
      sendEventToBackend(
        "Removed from Wishlist",
        {
          productId: productId,
          productName: removedItem ? removedItem.productDetails.name : "Unknown Product",
        },
        user,
        isAuthenticated,
        "ProductsContainer"
      );

      setTimeout(() => setShowDialog(false), 2000);
    } else {
      console.error("Failed to remove product:", response.data.message);
    }
  } catch (error) {
    console.error("Error removing product from wishlist:", error);
    console.log("Error Details:", error.response?.data || error.message);
    alert("There was an issue removing the item from your wishlist.");
  }
};

const handleCartButton = (productId) => {
  if (!isAuthenticated) {
    navigation.navigate('userLogin');
    return;
  }
  navigation.navigate('SingleProduct', { productId, userId: user.id });
};

  return (
    <LinearGradient
      colors={["rgba(135, 206, 250, 0.8)", "rgba(255, 255, 255, 1)"]}
      style={styles.gradientBackground}
    >
      {/* Wishlist Header */}
      <View style={styles.wishlistHeader}>
        <Text style={styles.wishlistTitle}>Your Wishlist</Text>
        <Text style={styles.wishlistSubtitle}>
          Save your favorite products and shop them anytime!
        </Text>
      </View>

      {wishlistItems.length === 0 ? (
        // Display a message when the wishlist is empty
        <View style={styles.emptyWishlistContainer}>
          <Text style={styles.emptyWishlistText}>Empty Wishlist</Text>
        </View>
      ) : (
        <FlatList
          data={wishlistItems}
          keyExtractor={(item) => item._id ? item.productId?.toString() : Math.random().toString()}
          numColumns={isMobile ? 1 : 3}
          contentContainerStyle={styles.container}
          columnWrapperStyle={!isMobile && styles.columnWrapper}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, !isMobile && styles.webCard]}
              activeOpacity={0.8}
              onPress={() => console.log(`Product clicked: ${item.productDetails.name}`)}
            >
              <View style={styles.imageContainer}>
                {/* Show the fetched image URL */}
                <Image
                  source={{ uri: item.productDetails.images?.imageUrl || item.image }}
                  style={styles.productImage}
                />
              </View>
              <View style={styles.detailsContainer}>
                <Text style={styles.productName}>{item.productDetails.name}</Text>
                <Text style={styles.productDescription}>{item.productDetails.description}</Text>
                <Text style={styles.category}>Category: {item.productDetails.category}</Text>
                <Text style={styles.discount}>Discount: {item.productDetails.discount}%</Text>
                <View style={styles.priceContainer}>
                  <Text style={styles.originalPrice}>₹{item.productDetails.productPrice}</Text>
                  <Text style={styles.discountedPrice}>₹{item.productDetails.salePrice}</Text>
                </View>
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={styles.addToCartButton}
                    onPress={() => handleCartButton(item.productId)}
                  >
                    <FontAwesome name="cart-plus" size={16} color="#fff" />
                    <Text style={styles.buttonText}>Add to Cart</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveFromWishlist(item.productId)}
                  >
                    <FontAwesome name="trash" size={16} color="#fff" />
                    <Text style={styles.buttonText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 10,
    paddingBottom: 20,
    justifyContent: "center",
  },
  wishlistHeader: {
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    borderRadius: 15,
    marginBottom: 15,
  },
  wishlistTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2C3E50",
    marginBottom: 5,
  },
  wishlistSubtitle: {
    fontSize: 14,
    color: "#566573",
  },
  emptyWishlistContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyWishlistText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#888",
  },
  columnWrapper: {
    justifyContent: "space-between",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 15,
    margin: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
    elevation: 6,
    transform: [{ scale: 1 }],
  },
  cardHover: {
    transform: [{ scale: 1.05 }],
  },
  webCard: {
    width: "30%",
  },
  imageContainer: {
    width: "100%",
    height: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  productImage: {
    width: "90%",
    height: "90%",
    resizeMode: "contain",
  },
  detailsContainer: {
    padding: 12,
  },
  productName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2C3E50",
    marginBottom: 5,
  },
  productDescription: {
    fontSize: 14,
    color: "#7F8C8D",
    marginBottom: 8,
  },
  category: {
    fontSize: 14,
    color: "#3498DB",
    marginBottom: 5,
  },
  discount: {
    fontSize: 14,
    color: "#E74C3C",
    marginBottom: 10,
  },
  priceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  originalPrice: {
    textDecorationLine: "line-through",
    color: "#95A5A6",
  },
  discountedPrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#27AE60",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  addToCartButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#27AE60",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 15,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 8,
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E74C3C",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 15,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    marginLeft: 5,
  },
});

export default WishList;

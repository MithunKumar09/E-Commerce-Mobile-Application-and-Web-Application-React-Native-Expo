// frontend/components/User/CategoryProductsContainer.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome } from '@expo/vector-icons';
import axios from 'axios';
import { SERVER_URL } from '../../Constants/index';
import { storeData, getData } from '../../utils/storage';
import * as SecureStore from "expo-secure-store";
const { width } = Dimensions.get("window");
import AsyncStorage from '@react-native-async-storage/async-storage';
import sendEventToBackend from '../../API/segmentCode';
import { useUserStore } from '../../src/store/userStore';
import { useNavigation } from '@react-navigation/native';
import io from "socket.io-client";

const CategoryProductsContainer = ({ title, products, onViewAll }) => {
  const wishlist = useUserStore((state) => state.wishlist);
  const setWishlist = useUserStore((state) => state.setWishlist);
  const [cachedProducts, setCachedProducts] = useState(products || []);
  const [shuffledProducts, setShuffledProducts] = useState([]);
  const isMobile = width < 768;
  const isWeb = width >= 1024;
  const { isAuthenticated, user } = useUserStore();
  const [dialogMessage, setDialogMessage] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const navigation = useNavigation();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const socketConnection = io(SERVER_URL); // Establish WebSocket connection
    setSocket(socketConnection);

    // Listen for wishlist updates
    socketConnection.on("wishlistUpdated", (updatedWishlist) => {
      console.log("Wishlist updated in real-time:", updatedWishlist);
      setWishlist(updatedWishlist); // Update wishlist state
    });

    return () => {
      socketConnection.disconnect(); // Cleanup WebSocket connection on unmount
    };
  }, []);

  useEffect(() => {
    loadWishlist();
  }, []);

  useEffect(() => {
    if (products?.length > 0 && shuffledProducts.length === 0) {
      shuffleAndSetProducts(products); // Shuffle only once on mount or refresh
    }
  }, [products]);

  const loadWishlist = async () => {
    try {
      const savedWishlist = await getData("wishlist");
      console.log("Loaded Wishlist from storage:", savedWishlist);
      setWishlist(savedWishlist || {});
    } catch (error) {
      console.error("Error loading wishlist:", error);
    }
  };

  const shuffleArray = (array) => {
    // Fisher-Yates Shuffle Algorithm
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  const shuffleAndSetProducts = (productsToShuffle) => {
    if (productsToShuffle?.length > 1) {
      const shuffled = shuffleArray([...productsToShuffle]); // Shuffle a copy of the products array
      setShuffledProducts(shuffled);
    } else {
      setShuffledProducts(productsToShuffle); // If only one product, no shuffle
    }
  };

  const toggleFavorite = async (productId) => {
    try {
      if (!isAuthenticated) {
        navigation.navigate("UserLogin");
        return;
      }

      const userId = user?.id;
      if (!userId) {
        console.log("User ID is missing");
        return;
      }

      const token = await SecureStore.getItemAsync("authToken");
      if (!token) {
        console.error("Authorization token is missing");
        return;
      }

      const selectedProduct = products.find(product => product._id === productId);
      if (!selectedProduct) return;

      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };

      if (wishlist[productId]) {
        // Remove from wishlist
        await axios.delete(`${SERVER_URL}/user/wishlist/${productId}`, {
          data: { userId, wishlistStatus: 'removed' },
          ...config
        });
        const updatedWishlist = { ...wishlist };
        delete updatedWishlist[productId];
        setWishlist(updatedWishlist);
        await storeData("wishlist", updatedWishlist);
        setDialogMessage("Product removed from wishlist!");
        sendEventToBackend('Removed from Wishlist', {
          productId: selectedProduct._id,
          productName: selectedProduct.name,
        }, user, isAuthenticated, "CategoryProductsPage");
      } else {
        // Add to wishlist
        await axios.post(
          `${SERVER_URL}/user/wishlist`,
          { productId, userId, wishlistStatus: 'added' },
          config
        );
        const updatedWishlist = { ...wishlist, [productId]: selectedProduct };
        setWishlist(updatedWishlist);
        await storeData("wishlist", updatedWishlist);
        setDialogMessage("Product added to wishlist!");
        sendEventToBackend('Added to Wishlist', {
          productId: selectedProduct._id,
          productName: selectedProduct.name,
        }, user, isAuthenticated, "CategoryProductsPage");
      }
      setShowDialog(true);
      setTimeout(() => setShowDialog(false), 2000);
    } catch (error) {
      console.error("Error updating wishlist:", error);
      alert("There was an issue adding/removing the item from your wishlist.");
    }
  };

  const handleProductPress = async (productId) => {
    try {
      const token = await SecureStore.getItemAsync("authToken");
      const userId = user?.id;

      if (token && userId) {
        // Log the event to the backend
        sendEventToBackend(
          "Product Viewed",
          {
            productId,
            userId,

          },
          user,
          isAuthenticated,
          "CategoryProductsPage"
        );

        // Navigate to the SingleProduct screen
        navigation.navigate("SingleProduct", {
          productId,
          userId,
          token,
        });
      } else {
        alert("User not authenticated. Please log in.");
      }
    } catch (error) {
      console.error("Error navigating to product:", error);
    }
  };


  const renderProductCard = ({ item }) => (
    <TouchableOpacity
      onPress={() => handleProductPress(item._id)}
      style={[
        styles.card,
        { width: isMobile ? width / 2 - 20 : isWeb ? width / 5 - 20 : width / 4 - 20 },
      ]}
    >
      <Image source={{ uri: item.images?.imageUrl || item.image }} style={styles.Productimage} />
      {/* Heart Icon for Wishlist */}
      <TouchableOpacity
        style={styles.heartIconContainer}
        onPress={(e) => {
          e.preventDefault();
          toggleFavorite(item._id);
        }}
      >
        <FontAwesome
          name="heart"
          size={24}
          color={wishlist[item._id] ? "#ff5f57" : "#ccc"}
        />
      </TouchableOpacity>
      <Text style={styles.name}>{item.name}</Text>

      <View style={styles.priceContainer}>
        {item.productPrice && <Text style={styles.oldPrice}>{`$${item.productPrice}`}</Text>}
        <Text style={styles.price}>{`$${item.salePrice}`}</Text>
        {item.discount && <Text style={styles.discount}>-{item.discount}%</Text>}
      </View>

      <Text style={styles.category}>{item.category}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </TouchableOpacity>
  );

  const renderItemWithViewAllButton = ({ index, item }) => {
    const maxItems = isMobile ? 3 : 5;
    if (index === maxItems - 1) {
      return (
        <View style={[styles.cardWithButton]}>
          {renderProductCard({ item })}
          <TouchableOpacity style={styles.viewAllButton} onPress={onViewAll}>
            <Text style={styles.viewAllText}>View More</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return renderProductCard({ item });
  };

  return (
    <LinearGradient colors={["#DB70D7", "#80BFE5", "#ffffff"]} style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {isMobile ? (
        <ScrollView horizontal contentContainerStyle={styles.horizontalScroll}>
          {shuffledProducts.slice(0, 5).map((product, index) => (
            <View key={`product-${product._id || product.name}-${index}`} style={styles.card}>
              {renderProductCard({ item: product })}
              {index === 4 && (
                <TouchableOpacity style={styles.viewAllButton} onPress={onViewAll}>
                  <Text style={styles.viewAllText}>View More</Text>
                  <FontAwesome name="angle-right" size={20} color="#007BFF" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      ) : (
        <FlatList
          data={shuffledProducts.slice(0, 5)}
          renderItem={renderItemWithViewAllButton}
          keyExtractor={(item, index) => `${item._id || item.name}-${index}`}
          numColumns={5}
          contentContainerStyle={styles.grid}
        />
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 15,
    backgroundColor: "#f9f9f9",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 15,
    color: "#333", // dark text color for title
    textAlign: "center",
  },
  grid: {
    justifyContent: "space-evenly",
    marginTop: 10,
  },
  horizontalScroll: {
    flexDirection: "row",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 15,
    elevation: 5,
    margin: 10,
    padding: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 4 },
  },
  cardWithButton: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    margin: 8,
  },
  Productimage: {
    width: "100%",
    height: Dimensions.get("window").width < 768
      ? 200
      : Dimensions.get("window").width >= 1024
        ? 320
        : 270,
    borderRadius: 15,
    resizeMode: "cover",
  },
  heartIconContainer: {
    position: "absolute",
    top: 10,
    right: 12,
    backgroundColor: "#ffffff",
    padding: 8,
    borderRadius: 50,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    marginVertical: 6,
    color: "#333",
    textAlign: "center",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
  },
  oldPrice: {
    fontSize: 14,
    fontWeight: "500",
    textDecorationLine: "line-through",
    color: "#888",
    marginRight: 5,
  },
  price: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ff5f57",
    marginRight: 5,
  },
  discount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#e74c3c",
    backgroundColor: "#f2dede",
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  category: {
    fontSize: 14,
    fontWeight: "500",
    color: "#777",
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    color: "#555",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 15,
  },
  viewAllContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    width: "100%",
  },
  viewAllButton: {
    flexDirection: "row",
    backgroundColor: "#f8f9fa",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    alignSelf: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  viewAllText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007BFF",
    marginRight: 8,
  },
});

export default CategoryProductsContainer;

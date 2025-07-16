//SingleProduct.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert, Button
} from "react-native";
import { FontAwesome, MaterialIcons } from "@expo/vector-icons";
import RelatedProducts from "../../components/User/RelatedProducts";
import axios from "axios";
import { SERVER_URL } from "../../Constants/index";
import { getData, storeData } from "../../utils/storage";
import * as SecureStore from "expo-secure-store";
import { useUserStore } from '../../src/store/userStore';
import sendEventToBackend from '../../API/segmentCode';
import io from "socket.io-client";

const SingleProduct = ({ route, navigation }) => {
  const { productId, userId, token } = route.params;
  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [zoomedIndex, setZoomedIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const wishlist = useUserStore((state) => state.wishlist);
  const setWishlist = useUserStore((state) => state.setWishlist);
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(false);
  const [isInCart, setIsInCart] = useState(false);
  const screenWidth = Dimensions.get("window").width;
  const [dialogMessage, setDialogMessage] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const isMobile = screenWidth < 768;
  const { user, isAuthenticated, checkAuthentication, cartItems, setCartState, cartItemCount, addToCart } = useUserStore();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const socketConnection = io(SERVER_URL); // Establish WebSocket connection
    setSocket(socketConnection);

    // Listen for cart updates from the server
    socketConnection.on("cartUpdated", (updatedCart) => {
      console.log("Cart updated in real-time:", updatedCart);
      setCartState(updatedCart.items); // Update cart state with the new items
    });

    // Listen for wishlist updates
    socketConnection.on("wishlistUpdated", (updatedWishlist) => {
      console.log("Wishlist updated in real-time:", updatedWishlist);
      setWishlist(updatedWishlist); // Update wishlist state
    });

    return () => {
      socketConnection.disconnect(); // Cleanup WebSocket connection on unmount
    };
  }, [setWishlist]);

  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        console.log("Fetching details for productId:", productId);
        const response = await axios.get(`${SERVER_URL}/user/product/${productId}`);
        const productData = response.data;
        console.log("details", response.data);
        if (productData.images) {
          console.log("Images array:", productData.images);
          productData.mainImage = productData.images.imageUrl;
          productData.thumbnails = productData.images.thumbnailUrl;
        }

        setProduct(productData);
        setSelectedImage(productData.mainImage);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching product details:", error);
        setLoading(false);
      }
    };

    const loadWishlist = async () => {
      try {
        const savedWishlist = await getData("wishlist");
        if (savedWishlist) {
          setWishlist(savedWishlist);
        } else {
          console.log("Wishlist not found, initializing to empty object.");
          setWishlist({});
        }
      } catch (error) {
        console.error("Error loading wishlist:", error);
      }
    };

    const fetchWalletBalance = async () => {
      try {
        // Send GET request with email and userId
        const response = await axios.get(
          `${SERVER_URL}/wallet-balance/${user.email}/${user.id}`
        );

        console.log("Wallet Balance Response:", response.data);
        setWalletBalance(response.data.balance);
        console.log("Wallet Balance Retrieved:", response.data.balance);
      } catch (error) {
        console.error("Error fetching wallet balance:", error.message);
        Alert.alert("Error", "Failed to fetch wallet balance.");
      }
    };

    fetchProductDetails();
    loadWishlist();
    fetchWalletBalance();
  }, [productId]);

  const toggleFavorite = async (productId) => {
    try {
      const isAuthenticated = await SecureStore.getItemAsync("authToken"); // Check if user is authenticated
      if (!isAuthenticated) {
        alert("Please log in to add products to your wishlist.");
        navigation.navigate("userLogin"); // Redirect to login screen
        return;
      }

      const token = await SecureStore.getItemAsync("authToken");
      if (!token) {
        console.error("Authorization token is missing");
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const requestBody = { productId, wishlistStatus: wishlist[productId] ? 'removed' : 'added' };

      if (!product) {
        console.error("Product data is missing or undefined");
        return;
      }

      if (wishlist[productId]) {
        // Remove from wishlist
        await axios.delete(`${SERVER_URL}/user/wishlist/${productId}`, { headers, data: { wishlistStatus: 'removed' } });
        const updatedWishlist = { ...wishlist };
        delete updatedWishlist[productId];
        setWishlist(updatedWishlist);
        await storeData("wishlist", updatedWishlist);
        setDialogMessage("Product removed from wishlist!");

        // Segment event: Removed from wishlist
        sendEventToBackend("Removed from Wishlist", {
          productId: product._id,
          productName: product.name,
        }, user, isAuthenticated, "SingleProduct");
      } else {
        // Add to wishlist
        await axios.post(`${SERVER_URL}/user/wishlist`, requestBody, { headers });
        const updatedWishlist = { ...wishlist, [productId]: product };
        setWishlist(updatedWishlist);
        await storeData("wishlist", updatedWishlist);
        setDialogMessage("Product added to wishlist!");

        // Segment event: Added to wishlist
        sendEventToBackend("Added to Wishlist", {
          productId: product._id,
          productName: product.name,
        }, user, isAuthenticated, "SingleProduct");
      }

      setShowDialog(true);
      setTimeout(() => setShowDialog(false), 2000);
    } catch (error) {
      console.error("Error updating wishlist:", error);
      alert("There was an issue adding/removing the item from your wishlist.");
    }
  };


  useEffect(() => {
    checkAuthentication();
  }, []);

  /**
 * Checks if a product is already in the cart.
 * @param {Array} cartItems - Array of items in the cart.
 * @param {String} productId - The ID of the product to check.
 * @returns {Boolean} - True if the product is in the cart, false otherwise.
 */
  const isProductInCart = (cartItems, productId) => {
    return cartItems.some((item) => item.productId === productId);
  };

  // useEffect to update isInCart state whenever cartItems change
  useEffect(() => {
    if (cartItems) {
      setIsInCart(isProductInCart(cartItems, productId));
    }
  }, [cartItems, productId]);

  const handleAddToCart = async () => {
    console.log("Handle Add to Cart started.");

    Alert.alert(
      "Add to Cart",
      "Are you sure you want to add this product to your cart?",
      [
        {
          text: "Cancel",
          onPress: () => {
            console.log("Cancel Pressed");
          },
          style: "cancel",
        },
        {
          text: "OK",
          onPress: async () => {
            console.log("OK pressed, checking if user is authenticated.");

            if (isAuthenticated) {
              console.log("User is authenticated, proceeding with adding product to cart.");

              try {
                // Fetch the authentication token
                const token = await SecureStore.getItemAsync("authToken");
                console.log("Auth token retrieved:", token);

                // Fetch cart data
                const existingCart = await fetchCartData(user.id, token);
                console.log("Retrieved cart data:", existingCart);

                // Extract cart items
                const cartItems = existingCart?.items || [];
                console.log("Current cart items:", cartItems);

                // Check if the product is already in the cart
                if (isProductInCart(cartItems, productId)) {
                  setIsInCart(true);
                  console.log("Product is already in the cart.");
                  return;
                }

                // Prepare the request body to add the product to the cart
                const requestBody = {
                  productId: productId,
                  userId: user.id,
                  quantity: 1,
                  salesPrice: product.salePrice,
                };
                console.log("Request body for adding product to cart:", requestBody);

                // Set up headers for the request
                const headers = { Authorization: `Bearer ${token}` };
                console.log("Request headers:", headers);

                // Send the request to the backend to add the product
                const addResponse = await axios.post(`${SERVER_URL}/user/cart/add/${user.id}`, requestBody, { headers });
                console.log("Response from server after adding product:", addResponse);

                // Check if the product was successfully added to the cart
                if (addResponse.status === 201) {
                  console.log("Product successfully added to the cart.");
                  const updatedCartItems = [...cartItems, requestBody];

                  // Update cart state using setCartState from store
                  useUserStore.getState().setCartState(updatedCartItems);


                  // Segment event: Product added to cart
                  sendEventToBackend("Added to Cart", {
                    productId: product._id,
                    productName: product.name,
                    salesPrice: product.salePrice,
                  }, user, isAuthenticated, "SingleProduct");
                } else {
                  console.log("Failed to add product to cart. Status:", addResponse.status);
                }
              } catch (error) {
                console.error("Error adding product to cart:", error);
              }
            } else {
              console.log("User not authenticated. Prompting to log in.");
              alert("Please log in to add items to your cart.");
              navigation.navigate("UserLogin");
            }
          },
        },
      ],
      { cancelable: false }
    );
  };


  const fetchCartData = async (userId, token) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${SERVER_URL}/user/cart/${userId}`, { headers });

      if (response.status === 200) {
        console.log("Fetched cart data:", response.data);
        return response.data;
      } else {
        console.log("Failed to fetch cart data:", response.data.message);
        return { items: [] };
      }
    } catch (error) {
      console.error("Error fetching cart data:", error);
      return { items: [] };
    }
  };

  useEffect(() => {
    const checkCart = async () => {
      try {
        const token = await SecureStore.getItemAsync("authToken");
        const cartData = await fetchCartData(user.id, token);

        console.log("Checking cart for product:", productId);

        if (isProductInCart(cartData?.items || [], productId)) {
          console.log("Product is in cart. Updating button state.");
          setIsInCart(true);
        } else {
          setIsInCart(false);
        }
      } catch (error) {
        console.error("Error checking cart:", error);
      }
    };

    checkCart();
  }, [productId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0077b6" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load product details.</Text>
      </View>
    );
  }

  // Calculate the wallet offer price (5% discount)
  const walletOfferPrice = (product.salePrice * 0.95).toFixed(2);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.layout}>
        <View
          style={[
            styles.imageAndDetailsContainer,
            { flexDirection: isMobile ? "column" : "row" },
          ]}
        >
          {/* Image Section */}
          <View style={styles.imageSection}>
            <Image
              source={selectedImage ? { uri: selectedImage } : { uri: product.mainImage }}
              style={styles.productImage}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.thumbnailsContainer}
            >
              {(product.thumbnails || []).map((thumbnail, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    setSelectedImage(thumbnail);
                    setZoomedIndex(index);
                  }}
                >
                  <Image
                    source={{ uri: thumbnail }}
                    style={[
                      styles.thumbnail,
                      zoomedIndex === index && styles.selectedThumbnail,
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.wishlistIcon}
              onPress={() => toggleFavorite(productId, userId)}
            >
              <FontAwesome
                name="heart"
                size={24}
                color={wishlist[productId] ? "#ff5f57" : "#ccc"}
              />
            </TouchableOpacity>
          </View>

          {/* Details Section */}
          <View style={styles.detailsSection}>
            <Text style={styles.productName}>{product.name}</Text>
            <View style={styles.row}>
              <Text style={styles.salePrice}>₹{product.salePrice}</Text>
              <Text style={styles.productPrice}>₹{product.productPrice}</Text>
              <Text style={styles.discount}>-{product.discount}%</Text>
            </View>
            {/* Wallet Offer Section */}
            <View style={styles.walletOfferSection}>
              <Text style={styles.walletInfoText}>
                Wallet Balance: ₹{walletBalance.toFixed(2)}
              </Text>
              {walletBalance > 0 && (
                <>
                  <Text style={styles.walletOfferText}>
                    Buy using wallet offer 5% discount
                  </Text>
                  <Text style={styles.walletDiscountedPrice}>
                    Buy now for only ₹{walletOfferPrice}
                  </Text>
                </>
              )}
            </View>

            <Text style={styles.feature}>Category: {product.category}</Text>
            <Text style={styles.feature}>Brand: {product.brand}</Text>
            <Text style={styles.feature}>Color: {product.color}</Text>
            <View style={styles.featuresRow}>
              <FontAwesome name="truck" size={24} color="#0077b6" />
              <Text style={styles.featureText}>Free Delivery :{product.cashOnDelivery}</Text>
            </View>
            <View style={styles.featuresRow}>
              <MaterialIcons name="verified" size={24} color="#0077b6" />
              <Text style={styles.featureText}>1 Year Warranty</Text>
            </View>
            <View style={styles.featuresRow}>
              <MaterialIcons name="refresh" size={24} color="#0077b6" />
              <Text style={styles.featureText}>7 Days Return</Text>
            </View>
            <View style={styles.featuresRow}>
              <FontAwesome name="check-circle" size={24} color="#0077b6" />
              <Text style={styles.featureText}>Genuine Product</Text>
            </View>
            {product.quantity > 0 ? (
              <Text style={styles.inStock}>In Stock</Text>
            ) : (
              <Text style={styles.outOfStock}>Out Of Stock</Text>
            )}
            <Text style={styles.description}>{product.description}</Text>
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={product.quantity > 0 ? styles.buyNowButton : styles.disabledButton}
                disabled={product.quantity === 0}
              >
                <Text style={styles.buttonText}>Buy Now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  product.quantity > 0
                    ? isInCart
                      ? styles.goToCartButton
                      : styles.addToCartButton
                    : styles.disabledButton,
                ]}
                disabled={product.quantity === 0}
                onPress={() => {
                  isInCart ? navigation.navigate("Cart") : handleAddToCart();
                }}
              >
                <MaterialIcons name="add-shopping-cart" size={20} color="white" />
                <Text style={styles.buttonText}>{isInCart ? "Go to Cart" : "Add to Cart"}</Text>
              </TouchableOpacity>

            </View>
          </View>
        </View>

        {/* Related Products Section */}
        <View style={styles.relatedProductsContainer}>
          <RelatedProducts category={product.category} />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8" },
  layout: { flex: 1, padding: 15 },
  imageAndDetailsContainer: { flex: 1 },
  imageSection: {
    flex: 1,
    alignItems: "center",
    marginBottom: 20,
  },
  productImage: {
    width: "100%",
    height: 350,
    borderRadius: 10,
    resizeMode: "contain",
  },
  thumbnailsContainer: {
    flexDirection: "row",
    marginTop: 10,
  },
  thumbnail: {
    width: 70,
    height: 70,
    borderRadius: 5,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  selectedThumbnail: { borderWidth: 2, borderColor: "#0077b6" },
  wishlistIcon: { position: "absolute", top: 15, right: 15, zIndex: 1, },
  detailsSection: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  productName: { fontSize: 24, fontWeight: "bold", marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  salePrice: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#e63946",
    marginRight: 10,
  },
  productPrice: {
    fontSize: 16,
    color: "#999",
    textDecorationLine: "line-through",
    marginRight: 10,
  },
  discount: {
    fontSize: 14,
    fontWeight: "500",
    color: "#d9534f",
    backgroundColor: "#f8d7da",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  walletOfferSection: {
    marginVertical: 10,
    padding: 10,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  walletInfoText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  walletOfferText: {
    fontSize: 14,
    color: "#0077b6",
    marginBottom: 5,
  },
  walletDiscountedPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#d00000",
  },

  feature: { fontSize: 16, color: "#333", marginBottom: 5 },
  featuresRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  featureText: { fontSize: 16, color: "#333", marginLeft: 10 },
  inStock: { fontSize: 16, color: "#4caf50", marginBottom: 10 },
  outOfStock: { fontSize: 16, color: "#e63946", marginBottom: 10 },
  description: { fontSize: 16, color: "#555", lineHeight: 22, marginBottom: 20 },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  buyNowButton: {
    backgroundColor: "#e63946",
    padding: 15,
    borderRadius: 10,
    flex: 1,
    alignItems: "center",
    marginRight: 10,
  },
  addToCartButton: {
    backgroundColor: "#0077b6",
    padding: 15,
    borderRadius: 10,
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  goToCartButton: {
    backgroundColor: "#28a745", // Green color for "Go to Cart"
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#ccc", // Gray color for disabled state
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: { color: "white", fontSize: 16, fontWeight: "bold" },
  relatedProductsContainer: { marginTop: 30 },
});

export default SingleProduct;

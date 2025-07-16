//frontend/src/userComponents/cart.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert, ScrollView, Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome, MaterialIcons } from "@expo/vector-icons";
import CheckBox from "react-native-check-box";
import axios from "axios";
import { SERVER_URL } from '../../Constants/index';
import { useUserStore } from "../../src/store/userStore";
import { getData, storeData } from "../../utils/storage";
import * as SecureStore from "expo-secure-store";
import SkeletonComponent from "../../components/Loading/SkeletonComponent";
import { useNavigation } from '@react-navigation/native';
import sendEventToBackend from '../../API/segmentCode';
import io from "socket.io-client";

const Cart = ({ onQuantityChange, onCheckout }) => {
  const [isMobile, setIsMobile] = useState(Dimensions.get("window").width < 768);
  const [selectedItems, setSelectedItems] = useState([]);
  const [showCheckBoxes, setShowCheckBoxes] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const { user, isAuthenticated, checkAuthentication, setCartState } = useUserStore();
  const userId = user?.id;
  const [isLoading, setIsLoading] = useState(true);
  const [wishlist, setWishlist] = useState({});
  const [dialogMessage, setDialogMessage] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const navigation = useNavigation();
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [products, setProducts] = useState([]);
  const [loadedProductIds, setLoadedProductIds] = useState(new Set());
  const [socket, setSocket] = useState(null); // State to hold WebSocket connection

  useEffect(() => {
    const socketConnection = io(SERVER_URL); // Establish WebSocket connection
    setSocket(socketConnection);

    // Listen for cart updates from the server
    socketConnection.on("cartUpdated", (updatedCart) => {
      console.log("Cart updated in real-time:", updatedCart);
      setCartState(updatedCart.items); // Update cart state with the new items
    });

    return () => {
      socketConnection.disconnect(); // Cleanup WebSocket connection on unmount
    };
  }, []);

  useEffect(() => {
    checkAuthentication();
  }, []);

  useEffect(() => {
    const loadCartFromCache = async () => {
      try {
        const cachedCart = await getData(`cart_${user?.id}`);
        if (cachedCart) {
          setCartItems(cachedCart);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error loading cart from cache:", error.message);
      }
    };

    const fetchCartItems = async () => {
      try {
        const token = await SecureStore.getItemAsync("authToken");
        const headers = { Authorization: `Bearer ${token}` };

        // console.log("Fetching cart items...");

        // Fetch cart items first
        const cartResponse = await axios.get(`${SERVER_URL}/user/cart/${user.id}`, { headers });

        if (cartResponse.status === 200) {
          // console.log("Fetched cart data:", cartResponse.data);

          // Now retrieve complete product details for each product in the cart
          const cartItemsWithDetails = await Promise.all(
            cartResponse.data.items.map(async (cartItem) => {
              try {
                // console.log(`Fetching product details for productId: ${cartItem.productId}`);

                // Fetch product details using productId
                const productResponse = await axios.get(`${SERVER_URL}/user/${cartItem.productId}`);

                if (productResponse.status === 200) {
                  const productDetails = productResponse.data;
                  // console.log(`Product details retrieved for productId: ${cartItem.productId}`, productDetails);

                  // Ensure images are properly mapped and selected
                  const productImages = productDetails.images && productDetails.images.imageUrl ? productDetails.images.imageUrl : "";

                  return {
                    ...cartItem,
                    productDetails: {
                      ...productDetails,
                      imageUrl: productImages // Make sure the main image is used
                    },
                    quantity: cartItem.quantity
                  }; // Merge cart item with product details
                } else {
                  // console.log(`Failed to fetch details for productId ${cartItem.productId}`);
                  return cartItem; // Return cart item without details
                }
              } catch (error) {
                console.error(`Error fetching product details for productId ${cartItem.productId}:`, error);
                return cartItem; // Return cart item without details
              }
            })
          );

          // console.log("Updated cart items with product details:", cartItemsWithDetails);
          setCartItems(cartItemsWithDetails);
          await storeData(`cart_${user.id}`, cartItemsWithDetails);
          setIsLoading(false);
        } else {
          console.log("Failed to fetch cart data:", cartResponse.data.message);
          setCartItems([]);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error fetching cart data:", error);
        setCartItems([]);
        setIsLoading(false);
      }
    };

    const loadData = async () => {
      const cachedCart = await getData(`cart_${user?.id}`);
      if (!cachedCart) {
        fetchCartItems();
      } else {
        setCartItems(cachedCart);
        setIsLoading(false);
      }
    };

    loadCartFromCache();
    loadData();

    const loadWishlist = async () => {
      try {
        const savedWishlist = await getData("wishlist");
        setWishlist(savedWishlist || {});
      } catch (error) {
        console.error("Error loading wishlist:", error.message);
      }
    };

    loadWishlist();
  }, [isAuthenticated, userId]);



  Dimensions.addEventListener("change", () => {
    setIsMobile(Dimensions.get("window").width < 768);
  });

  const handleSelectAll = () => {
    if (showCheckBoxes) {
      setSelectedItems([]);
    } else {
      setSelectedItems(cartItems.map((item) => item.productId));
    }
    setShowCheckBoxes(!showCheckBoxes);
  };

  const handleLongPress = (itemId) => {
    if (!showCheckBoxes) {
      setShowCheckBoxes(true);
    }
    setSelectedItems((prevSelectedItems) =>
      prevSelectedItems.includes(itemId)
        ? prevSelectedItems.filter((id) => id !== itemId)
        : [...prevSelectedItems, itemId]
    );
  };

  const calculateTotalAmount = () => {
    if (selectedItems.length > 0) {
      return cartItems
        .filter((item) => selectedItems.includes(item.productId))
        .reduce((acc, item) => acc + item.salesPrice * item.quantity, 0);
    }
    // If no items are selected, calculate the total for all cart items
    return cartItems.reduce((acc, item) => acc + item.salesPrice * item.quantity, 0);
  };

  const subTotalAmount = calculateTotalAmount(); // This will now return the correct subtotal amount.

  const handleRemoveFromCart = async (productId) => {
    try {
      const token = await SecureStore.getItemAsync("authToken");
      // Call the backend to remove the product from the cart
      await axios.delete(`${SERVER_URL}/user/cart/${user.id}/${productId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-ID': user.id,
        },
      });

      // Filter out the removed product from the cart items
      const updatedCartItems = cartItems.filter((item) => item.productId !== productId);
      setCartItems(updatedCartItems);
      // Update the cartItems and cartItemCount in Zustand store
      useUserStore.getState().setCartState(updatedCartItems);

      // Store the updated cart in AsyncStorage
      await storeData(`cart_${user.id}`, updatedCartItems);

      // Show success alert
      Alert.alert("Product Removed", "Product removed from cart successfully.");
    } catch (error) {
      console.error("Error removing product:", error.response?.data || error.message);
      Alert.alert("Error", "Failed to remove product from cart.");
    }
  };


  const handleQuantityChange = async (itemId, newQuantity) => {
    if (newQuantity < 1) {
      return;
    }
    const updatedCartItems = cartItems.map((item) => {
      if (item.productId === itemId) {
        const availableStock = item.productDetails.quantity;
        if (newQuantity > availableStock) {
          Alert.alert(
            "Stock Limit Exceeded",
            `Only ${availableStock} units available for this product.`
          );
          newQuantity = availableStock;
        }
        if (availableStock === 0) {
          Alert.alert("Out of Stock", "This product is currently out of stock.");
          return item;
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    });

    setCartItems(updatedCartItems);
    await storeData(`cart_${user.id}`, updatedCartItems);

    if (onQuantityChange) {
      onQuantityChange(itemId, newQuantity);
    }
  };

  const toggleFavorite = async (productId) => {
    console.log("Product ID received:", productId);
    try {
      if (!isAuthenticated) {
        navigation.navigate("userLogin"); // Navigate to userLogin if not authenticated
        return;
      }

      const userId = user?.id;
      if (!userId) {
        console.log("User ID is missing");
        return;
      }
      const token = await SecureStore.getItemAsync("authToken");

      const headers = { Authorization: `Bearer ${token}` };
      const requestBody = { productId, userId };

      if (wishlist[productId]) {
        // Remove from wishlist
        const response = await axios.delete(`${SERVER_URL}/user/wishlist/${productId}`, {
          headers,
          data: { userId }, // Ensure correct data is sent
        });
        if (response.status === 200) {
          const updatedWishlist = { ...wishlist };
          delete updatedWishlist[productId]; // Remove the product from wishlist state
          setWishlist(updatedWishlist);
          await storeData("wishlist", updatedWishlist);
          setDialogMessage("Product removed from wishlist!");
        }
      } else {
        // Add to wishlist
        const selectedProduct = cartItems.find(product => product.productId === productId);
        if (!selectedProduct) return;

        const response = await axios.post(`${SERVER_URL}/user/wishlist`, { productId: selectedProduct.productId, userId }, { headers });
        if (response.status === 201) {
          const updatedWishlist = { ...wishlist, [selectedProduct.productId]: selectedProduct }; // Store entire product details
          setWishlist(updatedWishlist);
          await storeData("wishlist", updatedWishlist);
          setDialogMessage("Product added to wishlist!");
        }
      }

      setShowDialog(true);
      setTimeout(() => setShowDialog(false), 2000);
    } catch (error) {
      console.error("Error updating wishlist:", error);
      alert("There was an issue adding/removing the item from your wishlist.");
    }
  };

  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      Alert.alert("Please Select Items Now", "No items selected, select items and buy now.");
      return; // Prevent navigation if no items are selected
    }

    const selectedItemsWithProductId = selectedItems.length > 0
      ? cartItems.filter(item => selectedItems.includes(item.productId))
      : cartItems;

    const selectedItemsData = selectedItemsWithProductId.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.salesPrice,
      image: item.productDetails?.imageUrl,
    }));

    navigation.navigate('Order', {
      selectedItems: selectedItemsData,
      subTotalAmount: calculateTotalAmount()
    });
  };

  const fetchProducts = async () => {
    try {
      if (!hasMoreProducts || loadingMore) return;

      setLoadingMore(true);

      const savedWishlist = await getData("wishlist");

      // Fetch cached data and timestamp
      const cachedProducts = await getData("cachedProducts");
      const cachedTimestamp = await getData("cachedTimestamp");

      // Check if the cache is valid
      const now = Date.now();
      const cacheAge = now - (cachedTimestamp || 0);
      const isCacheValid = cacheAge <= 24 * 60 * 60 * 1000; // 24 hours

      if (isCacheValid && cachedProducts) {
        console.log("Using cached products");
        setProducts(cachedProducts);
        setFilteredProducts(cachedProducts);
        setHasMoreProducts(cachedProducts.length >= 10);
        return;
      }

      console.log("Fetching from backend...");
      const token = await SecureStore.getItemAsync("authToken");

      let cartProductIds = [];
      if (token && user?.id) {
        try {
          const headers = { Authorization: `Bearer ${token}` };
          const cartResponse = await axios.get(`${SERVER_URL}/user/cart/${user.id}`, { headers });
          console.log("Cart items fetched from prioritized:", cartResponse.data);
          cartProductIds =
            cartResponse.status === 200
              ? cartResponse.data.items.map((item) => item.productId)
              : [];
        } catch (cartError) {
          console.error("Error fetching cart items:", cartError);
          // Proceed without filtering by cart items
          cartProductIds = [];
        }
      } else {
        console.warn("User not authenticated, skipping cart item fetch.");
      }

      let fetchedProducts = [];
      if (!savedWishlist) {
        console.log("No wishlist found. Fetching default products.");
        const response = await axios.get(`${SERVER_URL}/user/products?page=${currentPage}&limit=10`);
        fetchedProducts = response.data;
      } else {
        const categoryCounts = {};
        Object.values(savedWishlist).forEach((item) => {
          if (item.category) {
            categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
          }
        });

        const sortedCategories = Object.keys(categoryCounts).sort(
          (a, b) => categoryCounts[b] - categoryCounts[a]
        );

        const prioritizedProducts = [];
        for (const category of sortedCategories) {
          const response = await axios.get(
            `${SERVER_URL}/user/products?category=${category}&page=${currentPage}&limit=10`
          );
          prioritizedProducts.push(...response.data);
        }

        const fetchedProductIds = new Set(prioritizedProducts.map((p) => p._id));
        const allProductsResponse = await axios.get(`${SERVER_URL}/user/products?page=${currentPage}&limit=10`);
        const remainingProducts = allProductsResponse.data.filter(
          (product) => !fetchedProductIds.has(product._id)
        );

        fetchedProducts = [...prioritizedProducts, ...remainingProducts];
      }

      // Filter out products already in the cart
      const newProducts = fetchedProducts.filter(
        (product) => !cartProductIds.includes(product._id) && !loadedProductIds.has(product._id)
      );

      if (newProducts.length > 0) {
        setProducts((prevProducts) => [...prevProducts, ...newProducts]);
        setFilteredProducts((prevFilteredProducts) => [...prevFilteredProducts, ...newProducts]);

        // Cache the new products with a timestamp
        await storeData("cachedProducts", [...products, ...newProducts]);
        await storeData("cachedTimestamp", now);

        // Update loaded product IDs
        const newLoadedIds = new Set(loadedProductIds);
        newProducts.forEach((product) => newLoadedIds.add(product._id));
        setLoadedProductIds(newLoadedIds);
      }

      if (fetchedProducts.length < 10) {
        setHasMoreProducts(false); // No more products to load
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setIsLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [currentPage]);




  const handleLoadMore = () => {
    if (!loadingMore && hasMoreProducts) {
      setLoadingMore(true);
      setCurrentPage((prevPage) => prevPage + 1); // Increment page number
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loadingMore && !hasMoreProducts) {
        setLoadingMore(false); // Reset the loading button after 20 seconds
      }
    }, 20000); // 20 seconds timeout

    return () => clearTimeout(timeout); // Clean up the timeout when component is unmounted
  }, [loadingMore, hasMoreProducts]);

  const handlePress = async (product) => {
    if (isAuthenticated) {
      const token = await SecureStore.getItemAsync("authToken");
      console.log("User is authenticated. Passing userId and token.");
      console.log("User ID:", user?.id);
      console.log("Token:", token);
      // Send Segment event here
      sendEventToBackend("Product Viewed", { productId: product._id }, user, isAuthenticated, 'cartPage');
      navigation.navigate("SingleProduct", { productId: product._id, userId: user?.id, token });
    } else {
      console.log("User is not authenticated. Navigating without userId and token.");
      navigation.navigate("SingleProduct", { productId: product._id });
    }
  };

  const handleAddToCart = async (product) => {
    console.log("Handle Add to Cart started.");
    sendEventToBackend("Product Clicked", { productId: product._id }, user, isAuthenticated, 'cartPage');
  };

  return (
    <LinearGradient
      colors={["rgba(255, 183, 77, 0.8)", "rgba(255, 255, 255, 1)"]}
      style={styles.gradientBackground}
    >
      <View style={styles.header}>
        <FontAwesome name="shopping-cart" size={24} color="#fff" />
        <Text style={styles.headerTitle}>Your Cart</Text>
        <TouchableOpacity onPress={handleSelectAll} style={styles.selectAllButton}>
          <Text style={styles.selectAllText}>
            {showCheckBoxes ? "Deselect All" : "Select All"}
          </Text>
        </TouchableOpacity>
      </View>
      {!isAuthenticated ? (
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>Please login to view your cart and add products.</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('userLogin')}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        </View>
      ) : cartItems.length === 0 ? (
        <View style={styles.emptyCartContainer}>
          <Text style={styles.emptyCartText}>Add product to cart and buy product now</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AllProducts')}
          >
            <FontAwesome name="plus-circle" size={45} color="#4caf50" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.container}>
          {isLoading ? (
            <View style={styles.container}>
              {/* Skeleton loading for cart items */}
              <View style={styles.skeletonList}>
                <SkeletonComponent style={styles.skeletonItem} width="100%" height={100} borderRadius={10} />
                <SkeletonComponent style={styles.skeletonItem} width="100%" height={100} borderRadius={10} />
                <SkeletonComponent style={styles.skeletonItem} width="100%" height={100} borderRadius={10} />
                <SkeletonComponent style={styles.skeletonItem} width="100%" height={100} borderRadius={10} />
              </View>

            </View>
          ) : (
            <FlatList
              data={cartItems}
              keyExtractor={(item) => (item._id ? item._id.toString() : item.productId.toString())}
              contentContainerStyle={styles.listContainer}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onLongPress={() => handleLongPress(item.productId)}
                  activeOpacity={0.9}
                >
                  <View
                    style={[
                      styles.card,
                      isMobile ? styles.cardMobile : styles.cardWeb,
                    ]}
                  >
                    {showCheckBoxes && (
                      <CheckBox
                        isChecked={selectedItems.includes(item.productId)}
                        onClick={() => handleLongPress(item.productId)}
                        style={styles.checkbox}
                      />
                    )}
                    <Image
                      source={{ uri: item.productDetails?.imageUrl }}
                      style={[
                        styles.productImage,
                        isMobile
                          ? styles.productImageMobile
                          : styles.productImageWeb,
                      ]}
                    />
                    <View style={styles.details}>
                      <Text
                        style={[
                          styles.productName,
                          isMobile
                            ? styles.productNameMobile
                            : styles.productNameWeb,
                        ]}
                      >
                        {item.productDetails?.name}
                      </Text>
                      <Text
                        style={[
                          styles.productDescription,
                          isMobile
                            ? styles.productDescriptionMobile
                            : styles.productDescriptionWeb,
                        ]}
                      >
                        {item.productDetails?.description}
                      </Text>
                      <Text style={styles.productPrice1}>
                        ₹{item.salesPrice}
                      </Text>
                      <View style={styles.quantityContainer}>
                        <TouchableOpacity
                          onPress={() =>
                            handleQuantityChange(item.productId, item.quantity - 1)
                          }
                        >
                          <FontAwesome
                            name="minus-circle"
                            size={24}
                            color="#f44336"
                          />
                        </TouchableOpacity>
                        <Text style={styles.quantity}>{item.quantity}</Text>
                        <TouchableOpacity
                          onPress={() =>
                            handleQuantityChange(item.productId, item.quantity + 1)
                          }
                        >
                          <FontAwesome
                            name="plus-circle"
                            size={24}
                            color="#4caf50"
                          />
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleRemoveFromCart(item.productId)}
                      >
                        <MaterialIcons name="delete" size={20} color="#fff" />
                        <Text style={styles.removeButtonText}>Remove</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.heartIconContainer}
                        onPress={() => toggleFavorite(item.productId, userId)}
                      >
                        <FontAwesome
                          name="heart"
                          size={24}
                          color={wishlist[item.productId] ? "#ff5f57" : "#ccc"}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}
      <View style={styles.footer}>
        <Text style={styles.totalText}>Subtotal: ${subTotalAmount.toFixed(2)}</Text>
        <TouchableOpacity onPress={handleCheckout} style={[styles.checkoutButton, { backgroundColor: selectedItems.length === 0 ? 'grey' : '#4caf50' }]}>
          <Text style={styles.checkoutText}>Proceed to Checkout</Text>
        </TouchableOpacity>
      </View>
      {showDialog && (
        <View style={styles.dialog}>
          <Text style={styles.dialogText}>{dialogMessage}</Text>
        </View>
      )}

      {/* Suggested Items */}
      <Text style={styles.suggestionsTitle}>Suggested for you</Text>
      <ScrollView style={styles.suggestionsList}>
        {filteredProducts.map((product, index) => (
          <TouchableOpacity
            onPress={() => handlePress(product)}
            key={`${product._id}-${index}`}
            style={styles.suggestionCard}
          >
            <Image
              source={{ uri: product.images?.imageUrl }}
              style={styles.suggestionImage}
            />
            <View style={styles.suggestionInfo}>
              <Text style={styles.productName2}>{product.name}</Text>
              <Text style={styles.productBrand}>{product.brand}</Text>
              <View style={styles.row}>
                <Text style={styles.salePrice}>${product.salePrice}</Text>
                <Text style={styles.productPrice}>${product.productPrice}</Text>
                <Text style={styles.discount}>-{product.discount}%</Text>
              </View>
              <Text style={styles.productDescription}>{product.description}</Text>
            </View>
            <TouchableOpacity
              onPress={() => handleAddToCart(product)}
              style={styles.cartButton}
            >
              <MaterialIcons
                name="add-shopping-cart"
                size={24}
                color="white"
                style={styles.cartIcon}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Load More Button */}
      {loadingMore && (
        <Animated.View style={styles.loadingMore}>
          <Text>Loading more products...</Text>
        </Animated.View>
      )}
      {!loadingMore && hasMoreProducts && (
        <TouchableOpacity onPress={handleLoadMore} style={styles.loadMoreButton}>
          <Text style={styles.loadMoreText}>Load More</Text>
        </TouchableOpacity>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },
  skeletonList: {
    flexDirection: "column",
    alignItems: "stretch",
    paddingHorizontal: 10,
    marginBottom: 20,
    paddingTop: 10,
    gap: 20,
  },
  skeletonItem: {
    width: "100%",
    height: 100,
    backgroundColor: "#E0E0E0",
    borderRadius: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ff9800",
    padding: 15,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginLeft: 10,
  },
  container: {
    padding: 10,
    flex: 1,
  },
  listContainer: {
    paddingBottom: 20,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 10,
    marginVertical: 10,
    padding: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 3,
  },
  cardMobile: {
    padding: 10,
  },
  cardWeb: {
    padding: 20,
  },
  productImage: {
    borderRadius: 5,
    marginRight: 10,
  },
  productImageMobile: {
    width: 80,
    height: 80,
  },
  productImageWeb: {
    width: 150,
    height: 150,
  },
  details: {
    flex: 1,
    justifyContent: "space-between",
  },
  productName: {
    fontWeight: "bold",
  },
  productNameMobile: {
    fontSize: 16,
  },
  productNameWeb: {
    fontSize: 20,
  },
  productDescription: {
    color: "#666",
  },
  productDescriptionMobile: {
    fontSize: 14,
  },
  productDescriptionWeb: {
    fontSize: 16,
  },
  productPrice1: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4caf50",
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  quantity: {
    fontSize: 16,
    fontWeight: "bold",
    marginHorizontal: 10,
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f44336",
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 10,
  },
  removeButtonText: {
    color: "#fff",
    marginLeft: 5,
  },
  footer: {
    backgroundColor: "#fff",
    borderTopColor: "#ddd",
    borderTopWidth: 1,
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  checkoutButton: {
    backgroundColor: "#4caf50",
    padding: 10,
    borderRadius: 5,
  },
  checkoutText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "bold",
  },
  selectAllButton: {
    marginLeft: "auto",
    backgroundColor: "#ff9800",
    padding: 8,
    borderRadius: 5,
  },
  selectAllText: {
    color: "#fff",
    fontSize: 14,
  },
  checkbox: {
    alignSelf: "center",
    marginRight: 10,
  },
  heartIconContainer: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 1,
    backgroundColor: "#ffffff",
    padding: 5,
    borderRadius: 50,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  messageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "rgba(255, 183, 77, 0.1)", // Subtle gradient effect
    borderRadius: 10,
    marginHorizontal: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 3,
  },
  messageText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    lineHeight: 24,
    letterSpacing: 0.5,
  },
  suggestionsTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginVertical: 10,
  },
  suggestionsList: {
    marginTop: 10,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'orange',
    marginBottom: 15,
    padding: 15,
    borderRadius: 15,
    elevation: 5,
  },
  suggestionImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
  },
  suggestionInfo: {
    flex: 1,
    marginLeft: 15,
  },
  productName2: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
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
  productbrand: {
    color: 'pink',
    fontSize: 14,
  },
  cartIcon: {
    backgroundColor: '#ff6f61',
    padding: 10,
    borderRadius: 20,
  },
  productdescription: {
    color: '#fff',
    backgroundColor: 'grey',
    fontSize: 12,
    fontStyle: 'italic',
  },
  loadMoreContainer: {
    alignItems: 'center',
    marginVertical: 15,
  },
  loadMoreButton: {
    backgroundColor: 'red',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  loadMoreText: {
    color: '#fff',
    fontSize: 16,
  },
  loginButton: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "orange",
    borderRadius: 5,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  emptyCartContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 20,
    padding: 20,
    backgroundColor: '#ffffff',
    borderStyle: 'dotted',
    borderWidth: 2,
    borderColor: '#cccccc',
    borderRadius: 10,
  },
  emptyCartText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#555555',
    marginBottom: 15,
    textAlign: 'center',
  },
  addButton: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
});

export default Cart;

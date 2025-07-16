import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet, Animated,
  TouchableOpacity,
  Alert,
} from 'react-native';
import axios from "axios";
import { SERVER_URL } from "../../Constants/index";
import { getData, storeData } from "../../utils/storage";
import * as SecureStore from "expo-secure-store";
import { useUserStore } from '../../src/store/userStore';
import { FontAwesome, MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from '@react-navigation/native';
import PromotionCard from '../../../frontend/components/User/PromotionCard';
import sendEventToBackend from '../../API/segmentCode';
const moment = require('moment');
import SkeletonComponent from "../../components/Loading/SkeletonComponent";
import io from "socket.io-client";

const TodaysDeals = () => {
  const [deals, setDeals] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState({});
  const timeLeftRef = useRef({});
  const { user, isAuthenticated, checkAuthentication, setCartState, cartItemCount, addToCart } = useUserStore();
  const [showPromotionCard, setShowPromotionCard] = useState(true);
  const navigation = useNavigation();
  const [socket, setSocket] = useState(null);

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
    fetchCartItems();
  }, []);

  useEffect(() => {
    // Fetch deals when component mounts
    fetchDeals();

    // Poll the server for deal updates every minute
    const dealPolling = setInterval(fetchDeals, 60000);

    // Update timers every second
    const timer = setInterval(() => updateTimers(), 1000);

    // Cleanup intervals on component unmount
    return () => {
      clearInterval(dealPolling);
      clearInterval(timer);
    };
  }, []);

  const fetchDeals = async () => {
    try {
      // Fetch only active deals
      console.log("Fetching active deals...");
      const response = await axios.get(`${SERVER_URL}/user/todaydeals/active`);
      const dealsData = response.data;
      // console.log("Fetched active deals:", dealsData);

      const detailedDeals = await Promise.all(
        dealsData.map(async (deal) => {
          try {
            // console.log(`Fetching product details for productId ${deal.productId}...`);
            const productResponse = await axios.get(
              `${SERVER_URL}/user/${deal.productId}`
            );
            const productDetails = productResponse.data;
            // console.log(`Fetched product details for productId ${deal.productId}:`, productDetails);

            const salePrice =
              productDetails.productPrice -
              (productDetails.productPrice * deal.discount) / 100;

            // Combine startDate and startTime, endDate and endTime
            const startDateTime = moment(
              `${deal.startDate} ${deal.startTime}`,
              'YYYY-MM-DD hh:mm A'
            ).format('YYYY-MM-DD HH:mm:ss');
            const endDateTime = deal.endDate && deal.endTime
              ? moment(
                `${deal.endDate} ${deal.endTime}`,
                'YYYY-MM-DD hh:mm A'
              ).format('YYYY-MM-DD HH:mm:ss')
              : null;

            return {
              ...deal,
              productDetails,
              originalPrice: productDetails.productPrice,
              discountedPrice: salePrice.toFixed(2),
              startDateTime,
              endDateTime,
            };
          } catch (error) {
            console.error(
              `Error fetching product details for productId ${deal.productId}:`,
              error
            );
            return { ...deal, productDetails: null };
          }
        })
      );

      // console.log("Detailed deals after processing:", detailedDeals);
      setDeals(detailedDeals);

      // Initialize timers in both state and ref
      const initialTimers = detailedDeals.reduce((acc, deal) => {
        if (deal.endDateTime) {
          const timeRemaining = calculateTimeLeft(deal.endDateTime);
          acc[deal._id] = timeRemaining;
        }
        return acc;
      }, {});
      setTimeLeft(initialTimers);
      timeLeftRef.current = initialTimers; // Update ref

    } catch {
      setError('Failed to fetch deals');
    } finally {
      setIsLoading(false); // Stop loading
    }
  };

  const calculateTimeLeft = (endDateTime) => {
    const now = moment();
    const end = moment(endDateTime, 'YYYY-MM-DD HH:mm:ss'); // Correct format
    const duration = moment.duration(end.diff(now));

    if (duration.asMilliseconds() <= 0) {
      return null;
    }

    return {
      hours: Math.floor(duration.asHours()),
      minutes: duration.minutes(),
      seconds: duration.seconds(),
    };
  };

  const updateTimers = () => {
    const updatedTimers = { ...timeLeftRef.current };
    Object.keys(updatedTimers).forEach((dealId) => {
      const deal = deals.find((d) => d._id === dealId);
      if (deal && deal.endDateTime) {
        const newTimeLeft = calculateTimeLeft(deal.endDateTime);
        updatedTimers[dealId] = newTimeLeft || null;
      }
    });

    setTimeLeft(updatedTimers);
    timeLeftRef.current = updatedTimers; // Sync ref with updated state
  };


  const handleAddToCart = async (productId, discountedPrice) => {
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

                // Add product to cart
                const cartDataResponse = await axios.post(
                  `${SERVER_URL}/user/cart/add/${user.id}`,
                  { productId, quantity: 1, salesPrice: discountedPrice },
                  { headers: { Authorization: `Bearer ${token}` } }
                );

                console.log("Fetched cart data:", cartDataResponse.data);

                // Check if the product was successfully added to the cart
                if (cartDataResponse.status === 201) {
                  console.log("Product successfully added to the cart.");

                  // Construct the new cart item object
                  const newCartItem = {
                    productId,
                    quantity: 1,
                    salesPrice: discountedPrice,
                  };

                  const updatedCartItems = [...cartItems, newCartItem];

                  // Update cart state using setCartState from store
                  useUserStore.getState().setCartState(updatedCartItems);

                  setCartItems(updatedCartItems);

                  // Segment event: Product added to cart
                  sendEventToBackend(
                    "Added to Cart",
                    {
                      productId: productId,
                      salesPrice: discountedPrice,
                    },
                    user,
                    isAuthenticated,
                    "SingleProduct"
                  );
                } else {
                  console.log(
                    "Failed to add product to cart. Status:",
                    cartDataResponse.status
                  );
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

  // Fetch cart items from the server
  const fetchCartItems = async () => {
    try {
      const token = await SecureStore.getItemAsync("authToken");
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${SERVER_URL}/user/cart/${user.id}`, { headers });

      if (response.status === 200) {
        setCartItems(response.data.items);
      }
    } catch (error) {
      console.error("Error fetching cart items:", error);
    }
  };
  const isProductInCart = (productId) => {
    return cartItems.some((item) => item.productId === productId);
  };

  const renderDealCard = ({ item }) => {
    const isExpired = timeLeft[item._id] === null;
    const inCart = isProductInCart(item.productId);
    return (
      <View
        style={[
          styles.dealCard,
          isExpired && styles.expiredCard,
        ]}
      >
        <Image
          source={{
            uri: item.productDetails?.images?.imageUrl || 'https://via.placeholder.com/150',
          }}
          style={styles.productImage}
        />
        <Text style={styles.productName}>
          {item.productName || 'Product Name'}
        </Text>
        <Text style={styles.price}>
          <Text style={styles.originalPrice}>
            ${item.originalPrice || '0.00'}{' '}
          </Text>
          <Text style={styles.discountedPrice}>
            ${item.discountedPrice || '0.00'}
          </Text>
        </Text>
        <Text style={styles.discount}>{item.discount}% Off</Text>
        {isExpired ? (
          <Text style={styles.expired}>Deal Expired</Text>
        ) : (
          <Text style={styles.timer}>
            {`${timeLeft[item._id]?.hours || 0}h : ${timeLeft[item._id]?.minutes || 0
              }m : ${timeLeft[item._id]?.seconds || 0}s`}
          </Text>
        )}

        {/* Add to Cart Button */}
        <TouchableOpacity
          style={[
            styles.addToCartButton,
            isExpired
              ? { backgroundColor: '#bdc3c7' } // Gray for expired deals
              : inCart
                ? { backgroundColor: '#27ae60' } // Green for "Go to Cart"
                : { backgroundColor: '#2980b9' }, // Blue for "Add to Cart"
          ]}
          onPress={() =>
            inCart
              ? navigation.navigate("Cart")
              : handleAddToCart(item.productId, item.discountedPrice)
          }
          disabled={isExpired} // Disable the button if the deal is expired
        >
          <Text style={styles.buttonText}>
            {inCart ? "Go to Cart" : "Add to Cart"}
          </Text>
        </TouchableOpacity>

      </View>
    );
  };

  const renderSkeleton = () => (
    <View style={styles.container}>
      <View style={styles.skeletonList}>
        {[...Array(4)].map((_, index) => (
          <Animated.View key={index} style={[styles.skeletonItem]}>
            <SkeletonComponent
              width="100%"
              height={100}
              borderRadius={10}
            />
          </Animated.View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {showPromotionCard && <PromotionCard onClose={() => setShowPromotionCard(false)} />}
      <Text style={styles.title}>Today's Deals</Text>
      {isLoading ? (
        renderSkeleton()
      ) : (
        <FlatList
          data={deals}
          renderItem={renderDealCard}
          keyExtractor={(item) => item._id.toString()}
          contentContainerStyle={styles.dealsList}
        />
      )}
    </View>
  );
  
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa', // Light grey for a modern look
    padding: 15,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#2c3e50', // Darker shade for better visibility
    marginBottom: 20,
    textAlign: 'center',
    textTransform: 'uppercase', // Gives a more professional feel
    fontFamily: 'Roboto', // Professional font choice
  },
  dealCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  expiredCard: {
    backgroundColor: '#eaeaea', // Softer grey for expired deals
    borderWidth: 1,
    borderColor: '#bdc3c7', // Light border for expired deals
  },
  productImage: {
    width: '100%',
    height: 220,
    resizeMode: 'cover',
    borderRadius: 12, // Rounded corners for better aesthetics
    borderWidth: 2,
    borderColor: '#ecf0f1', // Light border around the image
    marginBottom: 15,
  },
  productName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#34495e',
    marginBottom: 5,
    fontFamily: 'Roboto',
  },
  price: {
    fontSize: 18,
    color: '#7f8c8d',
    marginBottom: 10,
  },
  originalPrice: {
    textDecorationLine: 'line-through',
    color: '#bdc3c7',
    marginRight: 10,
  },
  discountedPrice: {
    color: '#e74c3c',
    fontWeight: 'bold',
    fontSize: 20,
  },
  discount: {
    fontSize: 16,
    color: '#2ecc71',
    marginVertical: 5,
    fontWeight: '500',
  },
  expiredTag: {
    fontSize: 16,
    color: '#c0392b',
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 5,
    textTransform: 'uppercase', // Make it look professional
  },
  timer: {
    fontSize: 16,
    color: '#2980b9',
    fontWeight: '500',
    marginVertical: 5,
  },
  addToCartButton: {
    backgroundColor: '#2980b9',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4, // For Android
    transform: [{ scale: 1 }],
    transition: 'transform 0.3s ease',
  },
  addToCartButtonHovered: {
    transform: [{ scale: 1.05 }], // Slight hover effect
  },
  addToCartButtonInCart: {
    backgroundColor: 'green', // Green background when item is in cart
  },
  buttonText: {
    color: '#ecf0f1',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Roboto',
  },
  dealsList: {
    paddingBottom: 20,
  },
  skeletonList: {
    gap: 16,
    marginVertical: 16,
  },
  skeletonItem: {
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  
});

export default TodaysDeals;

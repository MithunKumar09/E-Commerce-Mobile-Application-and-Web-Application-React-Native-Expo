//frontend/OrderDetails.js   //new
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert, Animated,
} from 'react-native';
import { ProgressBar, Colors } from 'react-native-paper';
import { FontAwesome, MaterialIcons, Entypo } from '@expo/vector-icons';
import axios from "axios";
import { SERVER_URL } from '../../Constants/index';
import { useUserStore } from "../../src/store/userStore";
import { getData, storeData } from "../../utils/storage";
import * as SecureStore from "expo-secure-store";
import SkeletonComponent from "../../components/Loading/SkeletonComponent";
import { useNavigation, useRoute } from '@react-navigation/native';
import CancelOrder from '../../components/User/CancelOrder';

const OrderDetails = () => {
  const [orderDetails, setOrderDetails] = useState(null);
  const [productDetails, setProductDetails] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imageIndex, setImageIndex] = useState(0);
  const route = useRoute();
  const navigation = useNavigation();
  const { orderId, userId, productId } = route.params || {};
  const { user, isAuthenticated, checkAuthentication } = useUserStore();
  const placeholderImage = 'https://via.placeholder.com/150';
  const slideAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkAuthentication();
  }, []);

  // Log the received parameters
  useEffect(() => {
    console.log("Received Parameters:");
    console.log("Order ID:", orderId);
    console.log("User ID:", userId);
    console.log("User ProductId:", productId);

    if (!orderId || !userId || !productId) {
      Alert.alert("Missing Data", "Order ID, User ID, or User Email is missing.");
    }
  }, [orderId, userId, productId]);

  // Convert productId array to a string if it's an array
  const productIdString = Array.isArray(productId) ? productId[0] : productId;
  console.log("Converted productIdString:", productIdString);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        // Log token retrieval
        const token = await SecureStore.getItemAsync("authToken");
        if (!token) {
          console.error("No token found, authentication required.");
          return;
        }
        console.log("Token retrieved:", token);

        // Fetch orders from the server
        const response = await axios.get(`${SERVER_URL}/user/order/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          }
        });

        console.log("Response from server:", response.data);

        // Filter the orders based on the orderId and productId
        if (response.data && response.data.orders) {
          const filteredOrders = response.data.orders.filter(order =>
            order._id === orderId &&
            order.cartItems.some(item => item.productId._id === productIdString)
          );

          if (filteredOrders.length > 0) {
            setOrders(filteredOrders);
            console.log("Filtered Orders:", filteredOrders);
            console.log("Order Summary:", filteredOrders[0]?.orderSummary);

            // Fetch complete product details using productId
            const productDetailsPromises = filteredOrders[0].cartItems.map(async (cartItem) => {
              const productId = cartItem.productId._id;
              try {
                const productResponse = await axios.get(`${SERVER_URL}/user/product/${productId}`, {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  }
                });
                console.log(`Product details for ${productId}:`, productResponse.data);
                return { productId, details: productResponse.data };
              } catch (error) {
                console.error(`Failed to fetch product details for ${productId}:`, error);
                return { productId, details: null };
              }
            });

            const productDetails = await Promise.all(productDetailsPromises);
            console.log("Complete Product Details:", productDetails);
            setProductDetails(productDetails); // Assuming `setProductDetails` state is defined to store product details
          } else {
            Alert.alert("No matching order found", "No order with the provided Order ID and Product ID was found.");
          }
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
        Alert.alert("Error", "Failed to fetch orders. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [orderId, userId, productIdString]);


  // Function to format the order date
  const formatOrderDate = (date) => {
    const orderDate = new Date(date);
    return `${orderDate.toLocaleDateString()} ${orderDate.toLocaleTimeString()}`;
  };

  // Fetch the shipping address details from the selectedAddressId
  const getShippingAddress = async (selectedAddressId) => {
    if (!selectedAddressId || !selectedAddressId._id) {
      console.log("No address available");
      return "No address available";
    }

    // Log the selectedAddressId to see its structure
    console.log("Selected Address ID:", selectedAddressId);

    try {
      // Fetch full address details from the backend
      const token = await SecureStore.getItemAsync("authToken");
      if (!token) {
        console.error("No token found, authentication required.");
        return;
      }

      const response = await axios.get(`${SERVER_URL}/user/address/${selectedAddressId._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      const address = response.data;
      if (!address) {
        console.error("No address details found for the given ID.");
        return "Address details not found";
      }

      // Log the full address data
      console.log("Full Address Data:", address);

      const { addressLine, street, state, pincode, flatNumber, phoneNumber, addressType, city } = address;

      // Log the extracted address fields
      console.log("Extracted Address Details:");
      console.log("Address Line:", addressLine);
      console.log("Street:", street);
      console.log("City:", city);
      console.log("State:", state);
      console.log("Pincode:", pincode);
      console.log("Flat Number:", flatNumber);
      console.log("Phone Number:", phoneNumber);
      console.log("Address Type:", addressType);

      return (
        <Text>
          {addressLine}, {street}, {city}, {state} - {pincode}{"\n"}
          Flat Number: {flatNumber}{"\n"}
          Phone Number: {phoneNumber}{"\n"}
          Address Type: {addressType}
        </Text>
      );

    } catch (error) {
      console.error("Error fetching full address:", error);
      return "Error fetching address";
    }
  };

  const getImagesFromCartItems = (cartItems) => {
    return cartItems && cartItems.length > 0
      ? cartItems.map((item) => item.image || placeholderImage)
      : [placeholderImage];
  };

  const startSlideAnimation = (images) => {
    // Start the animation immediately when images are available
    if (images.length > 1) {
      Animated.loop(
        Animated.timing(slideAnimation, {
          toValue: -Dimensions.get('window').width * (images.length - 1),
          duration: 3000 * images.length,
          useNativeDriver: true,
        })
      ).start();
    }
  };

  useEffect(() => {
    if (orders.length > 0 && orders[0].cartItems.length > 1) {
      const images = getImagesFromCartItems(orders[0].cartItems);
      startSlideAnimation(images);
    }
  }, [orders]);
// Function to dynamically adjust progress bar based on cartItems status
const getProgressIcon = (status) => {
  let iconStyle;
  switch (status) {
    case "Pending":
      iconStyle = styles.iconPending;
      return (
        <View style={styles.progressItem}>
          <MaterialIcons name="pending-actions" style={iconStyle} />
          <View style={styles.textContainer}>
            <Text style={styles.statusTitle}>Order Confirmed</Text>
            <Text style={styles.statusSubtitle}>Your order is confirmed and awaiting processing.</Text>
          </View>
        </View>
      );
    case "Processing":
      iconStyle = styles.iconProcessing;
      return (
        <View style={styles.progressItem}>
          <FontAwesome name="cogs" style={iconStyle} />
          <View style={styles.textContainer}>
            <Text style={styles.statusTitle}>Processing</Text>
            <Text style={styles.statusSubtitle}>Your order is being processed.</Text>
          </View>
        </View>
      );
    case "Shipped":
      iconStyle = styles.iconShipped;
      return (
        <View style={styles.progressItem}>
          <FontAwesome name="truck" style={iconStyle} />
          <View style={styles.textContainer}>
            <Text style={styles.statusTitle}>Order Packed</Text>
            <Text style={styles.statusSubtitle}>Your items are packed and ready for shipment.</Text>
          </View>
        </View>
      );
    case "Arrived":
      iconStyle = styles.iconArrived;
      return (
        <View style={styles.progressItem}>
          <MaterialIcons name="local-shipping" style={iconStyle} />
          <View style={styles.textContainer}>
            <Text style={styles.statusTitle}>Arrived</Text>
            <Text style={styles.statusSubtitle}>Your order has arrived at the destination.</Text>
          </View>
        </View>
      );
    case "Out for Delivery":
      iconStyle = styles.iconDelivery;
      return (
        <View style={styles.progressItem}>
          <Entypo name="location-pin" style={iconStyle} />
          <View style={styles.textContainer}>
            <Text style={styles.statusTitle}>Out for Delivery</Text>
            <Text style={styles.statusSubtitle}>Your order is on its way to you.</Text>
          </View>
        </View>
      );
    case "Delivered":
      iconStyle = styles.iconDelivered;
      return (
        <View style={styles.progressItem}>
          <FontAwesome name="home" style={iconStyle} />
          <View style={styles.textContainer}>
            <Text style={styles.statusTitle}>Delivered</Text>
            <Text style={styles.statusSubtitle}>Your order has been successfully delivered.</Text>
          </View>
        </View>
      );
    case "Cancelled":
      // New "Cancelled" status case with red icon
      iconStyle = styles.iconCancelled; // Red color icon style
      return (
        <View style={styles.progressItem}>
          <MaterialIcons name="cancel" style={iconStyle} />
          <View style={styles.textContainer}>
            <Text style={styles.statusTitle}>Cancelled</Text>
            <Text style={styles.statusSubtitle}>Your order has been cancelled.</Text>
          </View>
        </View>
      );
    default:
      return null;
  }
};


  // Update the "Payment orderSummary" and "Order Summary" dynamically
  const getOrderSummary = (orderSummary) => {
    return orderSummary && Array.isArray(orderSummary) ? orderSummary.map((summary, index) => (
      <View key={index} style={styles.summaryItem}>
        <Text style={styles.summaryName}>{summary.name}</Text>
        <Text style={styles.summaryValue}>₹{summary.value}</Text>
      </View>
    )) : null;
  };

  // Update Payment Information section
  const getPaymentInformation = (orderDetails) => {
    const { paymentMethod, paid } = orderDetails;
    return (
      <View style={styles.paymentInfoContainer}>
        <Text style={styles.paymentTitle}>Payment Method: {paymentMethod}</Text>
        <Text style={styles.paymentTitle}>Paid: {paid ? "Yes" : "No"}</Text>
      </View>
    );
  };

  // Function to calculate the arrival date based on the order date
  const calculateArrivalDate = (orderDate) => {
    const date = new Date(orderDate);

    // Calculate 7th day
    const seventhDay = new Date(date);
    seventhDay.setDate(seventhDay.getDate() + 7);

    // Calculate 8th day
    const eighthDay = new Date(date);
    eighthDay.setDate(eighthDay.getDate() + 8);

    // Determine the day names for 7th and 8th days
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    const seventhDayName = daysOfWeek[seventhDay.getDay()];
    const eighthDayName = daysOfWeek[eighthDay.getDay()];

    // Format the arrival text
    return `Arriving ${seventhDayName} / ${eighthDayName}`;
  };

  // Function to calculate and format the delivery date (7 days after the order date)
  const calculateDeliveryDate = (orderDate) => {
    const date = new Date(orderDate);
    date.setDate(date.getDate() + 7);
    return date.toLocaleDateString();
  };

  const trackOrder = () => {
    navigation.navigate('OrderTracking', { orderId });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {loading ? (
        <SkeletonComponent />
      ) : (
        <>
          {/* 1st Section: Header + Arriving Monday + See All Orders */}
          <View style={styles.sectionContainer}>
            <Text style={styles.headerTitle}>Order Details</Text>
            {/* Dynamically calculate and show the arrival date */}
            {orders.length > 0 && (
              <Text style={styles.arrivalText}>
                {calculateArrivalDate(orders[0].orderDate)}
              </Text>
            )}
            <TouchableOpacity onPress={() => navigation.navigate('OrdersList')} >
              <Text style={styles.seeAllText}>See All Orders</Text>
            </TouchableOpacity>
            {/* Display the images with sliding animation */}
            <View style={styles.largeImageContainer}>
              {orders.length > 0 && getImagesFromCartItems(orders[0].cartItems).length > 1 ? (
                <Animated.View
                  style={{
                    flexDirection: 'row',
                    transform: [{ translateX: slideAnimation }],
                  }}
                >
                  {getImagesFromCartItems(orders[0].cartItems).map((image, index) => (
                    <Image key={index} source={{ uri: image }} style={styles.largeImage} />
                  ))}
                </Animated.View>
              ) : (
                <Image source={{ uri: getImagesFromCartItems(orders[0]?.cartItems)[0] }} style={styles.largeImage} />
              )}
            </View>
          </View>

          {/* 2nd Section: Order Progress */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Order Status</Text>
            <View style={styles.progressContainer}>
              <Text style={styles.heading}>Order Progress</Text>
              {orders.length > 0 && (
                <View>
                  {getProgressIcon(orders[0].orderStatus,
                    orders[0].orderStatus === "Pending" ||
                    orders[0].orderStatus === "Shipped" ||
                    orders[0].orderStatus === "Out for Delivery" ||
                    orders[0].orderStatus === "Delivered"
                  )}
                </View>
              )}
            </View>

            <View style={styles.horizontalButtonsContainer}>
              <TouchableOpacity style={styles.horizontalButton}>
                <Text>Download Invoice</Text>
              </TouchableOpacity>
              <CancelOrder orderId={orderId} userId={userId} />
            </View>
          </View>

          {/* 3rd Section: Shipping Address */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Shipping Address</Text>
            {orders.length > 0 && orders[0]?.selectedAddressId && getShippingAddress(orders[0].selectedAddressId)}
          </View>

          {/* 4th Section: View Order Details */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Order Details</Text>
            {orders.length > 0 && (
              <>
                <Text style={styles.textContent}>Order Date: {formatOrderDate(orders[0].orderDate)}</Text>
                <Text style={styles.textContent}>Order ID: {orders[0]._id}</Text>
                <Text style={styles.textContent}>Order Total: ₹{(orders[0].total / 100).toFixed(2)}</Text>
              </>
            )}
          </View>

          {/* 5th Section: Shipment Details */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Shipment Details</Text>
            {orders.length > 0 && orders[0].cartItems.length > 0 && (
              <>
                {orders[0].cartItems.map((item, index) => {
                  // Find the product details for the current item
                  const productDetail = productDetails.find(
                    (product) => product.productId === item.productId._id
                  );
                  const brand = productDetail ? productDetail.details.brand : "N/A";

                  return (
                    <View key={index} style={styles.productContainer}>
                      <Image source={{ uri: item.image }} style={styles.productImage} />
                      <View style={styles.productInfo}>
                        <Text style={styles.productName}>{item.productId.name}</Text>
                        <Text style={styles.productBrand}>Brand: {brand}</Text>
                        <Text style={styles.productQuantity}>Quantity: {item.quantity}</Text>
                        <Text style={styles.productPrice}>Price: ₹{item.price}</Text>
                        <Text style={styles.textContent}>Status: {item.status}</Text>
                        <Text style={styles.textContent}>Delivery Estimate: {calculateDeliveryDate(orders[0].orderDate)}</Text>
                      </View>
                    </View>
                  );
                })}
              </>
            )}
          </View>

          {/* 6th Section: Track Order */}
          <View style={styles.trackContainer}>
            {orders.length > 0 && orders[0]?.trackingId ? ( // Check if trackingId exists
              <TouchableOpacity onPress={trackOrder} style={styles.trackButton}>
                <Text style={styles.trackButtonText}>Track Order</Text>
                <FontAwesome name="chevron-right" size={18} color="#000" style={styles.trackIcon} />
              </TouchableOpacity>
            ) : null /* Button is invisible if trackingId is not available */}
          </View>

          {/* 7th Section: Payment Information */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Payment Information</Text>
            {getPaymentInformation(orders[0])}
          </View>

          {/* 8th Section: Order Summary */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            <View style={styles.orderSummaryContainer}>
              {orders.length > 0 && getOrderSummary(orders[0]?.orderSummary)}
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  sectionContainer: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  arrivalText: {
    fontSize: 16,
    color: 'green',
    textAlign: 'center',
    marginVertical: 5,
  },
  seeAllText: {
    fontSize: 14,
    color: '#007bff',
    textAlign: 'center',
    marginBottom: 10,
  },
  largeImageContainer: {
    width: '100%',
    height: 300,
    overflow: 'hidden',
  },
  largeImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
    marginRight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  textContent: {
    fontSize: 14,
    marginBottom: 5,
  },
  progressContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  heading: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    marginHorizontal: 10,
  },
  iconPending: {
    fontSize: 24,
    color: "green",
    marginBottom: 20,
    marginRight: 10,
  },
  iconProcessing: {
    fontSize: 24,
    color: "orange",
    marginBottom: 20,
    marginRight: 10,
  },
  iconShipped: {
    fontSize: 24,
    color: "blue",
    marginBottom: 20,
    marginRight: 10,
  },
  iconArrived: {
    fontSize: 24,
    color: "purple",
    marginBottom: 20,
    marginRight: 10,
  },
  iconDelivery: {
    fontSize: 24,
    color: "green",
    marginBottom: 20,
    marginRight: 10,
  },
  iconDelivered: {
    fontSize: 24,
    color: "green",
    marginBottom: 20,
    marginRight: 10,
  },
  iconCancelled: {
    color: 'red',  // Red color for cancelled status
    fontSize: 24,
    
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#757575',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
  },
  statusMark: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'green',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginVertical: 5,
  },
  horizontalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  horizontalButton: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  productContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 10,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  productBrand: {
    fontSize: 14,
    color: '#777',
  },
  productQuantity: {
    fontSize: 14,
  },
  productPrice: {
    fontSize: 14,
    color: '#333',
  },
  trackContainer: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderColor: '#ccc',
    borderWidth: 1,
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trackButtonText: {
    color: 'green',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  trackIcon: {
    marginLeft: 8,
  },
  orderSummaryContainer: {
    backgroundColor: '#f9f9f9',  // Light background for contrast
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,  // Adds shadow for Android
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryName: {
    fontSize: 16,
    color: '#555',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  paymentInfoContainer: {
    marginTop: 10,
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  paymentTitle: {
    fontSize: 16,
    color: '#555',
    marginBottom: 5,
  },
});

export default OrderDetails;

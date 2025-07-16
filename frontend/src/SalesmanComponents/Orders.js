import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Button, Image
} from "react-native";
import { Ionicons, MaterialIcons, FontAwesome } from "@expo/vector-icons";
import * as Location from "expo-location";
import axios from 'axios';
import { SERVER_URL } from '../../Constants/index';
import { storeData, getData } from '../../utils/storage';
import { useUserStore } from '../../src/store/userStore'; // Import the user store
import { useNavigation } from '@react-navigation/native';
import * as SecureStore from "expo-secure-store";

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState(null);
  const [sendingLocation, setSendingLocation] = useState(false);
  const { isAuthenticated, checkSalesmanAuthentication } = useUserStore((state) => state);
  const [salesman, setSalesman] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [assignOrders, setAssignOrders] = useState([]);

  useEffect(() => {
    fetchOrders();
  }, []);

  // Fetch real data for the authenticated salesman
  useEffect(() => {
    const fetchSalesmanData = async () => {
      try {
        console.log("Starting authentication check...");
        await checkSalesmanAuthentication();
        console.log("Authentication check completed. Authenticated:", isAuthenticated);

        if (!isAuthenticated) {
          Alert.alert("Not Authenticated", "Please login to access this page.");
          setLoading(false);
          return;
        }

        console.log("Fetching token from SecureStore...");
        const token = await SecureStore.getItemAsync("salesmanToken");
        console.log("Retrieved token:", token);

        if (!token) {
          console.log("Token is missing or invalid.");
          Alert.alert("Error", "Failed to fetch token. Please login again.");
          setLoading(false);
          return;
        }

        console.log("Fetching salesman profile data...");
        const response = await axios.get(`${SERVER_URL}/salesman/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log("Salesman profile data retrieved:", response.data);

        const { _id } = response.data;

        if (_id) {
          console.log("Salesman ID retrieved:", _id);
          setSalesman({ _id });
        } else {
          console.error("Salesman ID is missing in response.");
          Alert.alert("Error", "Invalid salesman profile data.");
        }

      } catch (error) {
        console.error("Error fetching salesman data:", error.response?.data || error.message);
        Alert.alert(
          "Error",
          "An error occurred while fetching your profile data. Please try again later."
        );
      } finally {
        console.log("Setting loading to false.");
        setLoading(false);
      }
    };

    fetchSalesmanData();
  }, [isAuthenticated, checkSalesmanAuthentication]);

  const fetchOrders = async () => {
    try {
      if (!salesman || !salesman._id) {
        console.log("Salesman data not available.");
        return;
      }

      console.log("Fetching token for orders...");
      const salesmanToken = await SecureStore.getItemAsync('salesmanToken');
      console.log("Salesman token:", salesmanToken);

      if (!salesmanToken) {
        Alert.alert("Error", "Salesman token not found.");
        return;
      }

      console.log("Fetching assigned orders...");
      const response = await axios.get(`${SERVER_URL}/salesman/assignOrders/${salesman._id}`, {
        headers: {
          'Authorization': `Bearer ${salesmanToken}`,
        }
      });

      console.log("Assigned orders response:", response.data);
      const assignOrders = response.data;
      setAssignOrders(assignOrders); // Store assigned orders
      console.log("Assigned orders fetched:", assignOrders);

      console.log("Fetching detailed orders...");
      const ordersWithDetails = await Promise.all(
        assignOrders.map(async (assignOrder) => {
          const orderResponse = await axios.get(`${SERVER_URL}/salesman/orders/${assignOrder.orderId._id}`, {
            headers: {
              'Authorization': `Bearer ${salesmanToken}`,
            }
          });
          console.log("Order details retrieved:", orderResponse.data);

          // Fetch the address details based on selectedAddressId
          const addressResponse = await axios.get(`${SERVER_URL}/salesman/addresses/${orderResponse.data.selectedAddressId}`, {
            headers: {
              'Authorization': `Bearer ${salesmanToken}`,
            }
          });
          console.log("Address details retrieved:", addressResponse.data);

          // Fetch product details for each cartItem in the order
          const cartItemsWithProductDetails = await Promise.all(
            orderResponse.data.cartItems.map(async (cartItem) => {
              const productResponse = await axios.get(`${SERVER_URL}/salesman/products/${cartItem.productId}`, {
                headers: {
                  'Authorization': `Bearer ${salesmanToken}`,
                }
              });
              console.log("Product details retrieved:", productResponse.data);

              return {
                ...cartItem,
                productDetails: productResponse.data,
                imageUrl: productResponse.data.images.imageUrl,
              };
            })
          );

          return {
            ...assignOrder,
            orderDetails: {
              ...orderResponse.data,
              cartItems: cartItemsWithProductDetails // Add product details to the cart items
            },
            address: addressResponse.data // Add address details to the order
          };
        })
      );

      console.log("All orders with details fetched:", ordersWithDetails);
      setOrders(ordersWithDetails);
    } catch (error) {
      console.error("Error fetching orders:", error.response?.data || error.message);
      Alert.alert("Error", "Failed to fetch orders.");
    } finally {
      setLoading(false);
    }
  };
  


  const reverseGeocodeWithTimeout = async (coords, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("Reverse geocoding timeout exceeded."));
      }, timeout);
  
      Location.reverseGeocodeAsync(coords)
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  };
  
  const acceptOrder = async (order) => {
    const orderId = order.orderId?._id;
  
    // Check if orderId is defined
    if (!orderId) {
      Alert.alert("Error", "Order ID is not defined.");
      return;
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Location access is required to track orders.");
      return;
    }
  
    setSendingLocation(true);
    try {
      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation.coords);
  
      let areaInfo;
      try {
        areaInfo = await reverseGeocodeWithTimeout({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });
      } catch (error) {
        console.warn("Reverse geocoding failed or timed out:", error.message);
        areaInfo = [];
      }
  
      const areaName =
        areaInfo.length > 0
          ? `${areaInfo[0].district || areaInfo[0].city}, ${areaInfo[0].region}`
          : "Area name not found";
  
      const trackingId = generateTrackingId();
      const acceptedTime = new Date().toISOString();
      const locationUpdateTime = new Date().toISOString();
  
      await sendLocationToServer(
        orderId,
        currentLocation.coords,
        areaName,
        trackingId,
        acceptedTime,
        locationUpdateTime
      );
      await updateOrderStatus(
        orderId,
        "Accepted",
        trackingId,
        acceptedTime,
        locationUpdateTime
      );
  
      Alert.alert("Order Accepted", `Live location sent: ${areaName}`);
    } catch (error) {
      console.error("Error in acceptOrder:", error.message);
      Alert.alert("Error", "Failed to fetch live location or area name.");
    } finally {
      setSendingLocation(false);
    }
  };

  const generateTrackingId = () => {
    return `TRK${Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0')}`;
  };

  const sendLocationToServer = async (orderId, coords, areaName, trackingId, acceptedTime, locationUpdateTime) => {
    try {
      const response = await axios.post(`${SERVER_URL}/salesman/sendLocation`, {
        orderId,
        trackingId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        area: areaName,
        acceptedTime,
        locationUpdateTime,
      });
      console.log("Location sent successfully:", response.data);  // Log success response
    } catch (error) {
      if (error.response) {
        // Server responded with a status other than 2xx
        console.error("Error sending location to server:", error.response.data);
        Alert.alert("Error", error.response.data.message || "Failed to send location.");
      } else if (error.request) {
        // No response received from the server
        console.error("Error sending location to server:", error.request);
        Alert.alert("Error", "No response from server. Please check your connection.");
      } else {
        // Something happened in setting up the request
        console.error("Error sending location to server:", error.message);
        Alert.alert("Error", "An unexpected error occurred. Please try again.");
      }
    }
  };

  const updateOrderStatus = async (orderId, status, trackingId, acceptedTime, locationUpdateTime) => {
    try {
      const response = await axios.put(`${SERVER_URL}/salesman/updateOrderStatus`, {
        orderId,
        status,
        trackingId,
        acceptedTime,
        locationUpdateTime,
      });
      console.log("Order status updated successfully:", response.data);  // Log success response
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.orderId._id === orderId // Compare with orderId._id
            ? { ...order, status, trackingId }
            : order
        )
      );
    } catch (error) {
      if (error.response) {
        // Server responded with a status other than 2xx
        console.error("Error updating order status:", error.response.data);
        Alert.alert("Error", error.response.data.message || "Failed to update order status.");
      } else if (error.request) {
        // No response received from the server
        console.error("Error updating order status:", error.request);
        Alert.alert("Error", "No response from server. Please check your connection.");
      } else {
        // Something happened in setting up the request
        console.error("Error updating order status:", error.message);
        Alert.alert("Error", "An unexpected error occurred. Please try again.");
      }
    }
  };

  const updateLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.warn("Location permission not granted.");
        return;
      }
  
      const token = await SecureStore.getItemAsync("salesmanToken");
      if (!token) {
        console.error("No token found. Cannot update live location.");
        return;
      }
  
      for (const order of assignOrders) {
        if (order.status === "Accepted") {
          const currentLocation = await Location.getCurrentPositionAsync({});
          let areaInfo;
  
          try {
            areaInfo = await reverseGeocodeWithTimeout({
              latitude: currentLocation.coords.latitude,
              longitude: currentLocation.coords.longitude,
            });
          } catch (error) {
            console.warn("Reverse geocoding failed or timed out:", error.message);
            areaInfo = [];
          }
  
          const areaName =
            areaInfo.length > 0
              ? `${areaInfo[0].district || areaInfo[0].city}, ${areaInfo[0].region}`
              : "Area name not found";
  
          const locationUpdateTime = new Date().toISOString();
          await axios.post(
            `${SERVER_URL}/salesman/updateLiveLocation`,
            {
              orderId: order.orderId._id,
              salesmanId: salesman._id,
              latitude: currentLocation.coords.latitude,
              longitude: currentLocation.coords.longitude,
              area: areaName,
              locationUpdateTime,
            },
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
  
          console.log(
            "Live location updated successfully for order:",
            order.orderId._id
          );
        } else {
          console.log(
            `Skipping live location update for order ${order.orderId._id}: Status is ${order.status}`
          );
        }
      }
    } catch (error) {
      console.error("Error updating live location:", error.message);
      Alert.alert("Error", "Network or unexpected error occurred.");
    } finally {
      setTimeout(updateLocation, 3600000); // Schedule next update in 1 hour
    }
  };




  // Handle opening the modal to view full order details
  const openOrderDetails = (order) => {
    setSelectedOrder(order);
  };

  // Close the modal
  const closeOrderDetails = () => {
    setSelectedOrder(null);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Orders</Text>
        <MaterialIcons name="refresh" size={24} color="white" onPress={fetchOrders} />
      </View>

      {/* Loading Indicator */}
      {loading ? (
        <ActivityIndicator size="large" color="#6200EE" style={{ marginTop: 20 }} />
      ) : (
        <ScrollView style={styles.orderList}>
          {orders.map((order) => (
            <View key={order._id} style={styles.orderCard}>
              {/* Order Details */}
              <View>
                <Text style={styles.productName}>{order.productName}</Text>
                <Text style={styles.OrderId}>OrderID: {order.orderDetails._id}</Text>
                <Text>Payment Method: {order.orderDetails.paymentMethod}</Text>
                <Text>Total: {(order.orderDetails.total / 100).toFixed(2)}</Text>
                <Text style={styles.orderText}>Customer: {order.address?.username}</Text>
                <Text style={styles.orderText}>Delivery: {order.address ? `${order.address.state}, ${order.address.pincode}` : 'Address not found'}</Text>
                <Text style={styles.orderStatus}>
                  Status:{" "}
                  <Text style={styles.statusText(order.status)}>{order.orderDetails.orderStatus}</Text>
                </Text>
              </View>

              {/* Action Buttons */}
              {order.status === "Request Sent" && (
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => acceptOrder(order)}
                >
                  {sendingLocation ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <FontAwesome name="location-arrow" size={20} color="white" />
                      <Text style={styles.buttonText}>Accept</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {order.status === "Accepted" && (
                <Text style={styles.liveStatus}>
                  <Ionicons name="location" size={18} color="green" />
                  Live Location Active
                </Text>
              )}
              {/* Eye Icon to Open Order Details Modal */}
              <TouchableOpacity onPress={() => openOrderDetails(order)}>
                <Ionicons name="eye" size={24} color="#6200EE" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
      {/* Modal to View Full Order Details */}
      {selectedOrder && (
        <Modal
          visible={!!selectedOrder}
          onRequestClose={closeOrderDetails}
          animationType="slide"
          transparent={true}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Order Details</Text>
              <Text style={styles.modalText}>OrderID: {selectedOrder.orderDetails._id}</Text>
              <Text style={styles.modalText}>Payment Method: {selectedOrder.orderDetails.paymentMethod}</Text>
              <Text style={styles.modalText}>Total: {(selectedOrder.orderDetails.total / 100).toFixed(2)}</Text>
              <Text style={styles.modalText}>Customer: {selectedOrder.address.username}</Text>
              <Text style={styles.modalText}>
                Delivery Address: {selectedOrder.address.addressLine}, {selectedOrder.address.state}, {selectedOrder.address.pincode}
              </Text>
              <Text style={styles.modalText}>Status: {selectedOrder.orderDetails.orderStatus}</Text>

              <ScrollView style={styles.scrollView}>
                {/* Display Cart Items with Product Details */}
                <Text style={styles.sectionTitle}>Cart Items:</Text>
                {selectedOrder.orderDetails.cartItems.map((item, index) => (
                  <View key={index} style={styles.cartItemContainer}>
                    <Text style={styles.productTitle}>{item.productDetails?.name}</Text>
                    <Text style={styles.cartItemText}>Price: {item.price}</Text>
                    <Text style={styles.cartItemText}>Quantity: {item.quantity}</Text>

                    {/* Display Product Image */}
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={styles.productImage}
                    />

                    {/* Display Product Description */}
                    <Text style={styles.productDescription}>{item.productDetails?.description}</Text>

                    {/* Display Product Category */}
                    <Text style={styles.productCategory}>Category: {item.productDetails?.category}</Text>

                    {/* Display Additional Product Info */}
                    <Text style={styles.productInfo}>Brand: {item.productDetails?.brand}</Text>
                  </View>
                ))}
              </ScrollView>

              <Button title="Close" onPress={closeOrderDetails} />
            </View>
          </View>
        </Modal>
      )}


    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#6200EE",
    padding: 15,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  orderList: {
    marginTop: 20,
  },
  orderCard: {
    padding: 15,
    backgroundColor: "#f8f8f8",
    marginBottom: 10,
    borderRadius: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  productName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  OrderId: {
    fontSize: 14,
    color: "#888",
  },
  orderText: {
    fontSize: 14,
    color: "#333",
  },
  orderStatus: {
    fontSize: 14,
    color: "#6200EE",
    fontWeight: "bold",
  },
  statusText: (status) => ({
    color: status === "In Progress" ? "green" : "red",
  }),
  acceptButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6200EE",
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    marginLeft: 5,
    fontSize: 16,
  },
  liveStatus: {
    fontSize: 14,
    color: "green",
    marginTop: 10,
    fontStyle: "italic",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent overlay
    paddingHorizontal: 20,
  },
  modalContent: {
    width: '100%',
    height: '100%',
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingTop: 40, // For top padding to avoid overlapping with status bar
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  cartItemContainer: {
    padding: 10,
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  productTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  cartItemText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 6,
  },
  productImage: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    marginTop: 10,
    borderRadius: 8,
    alignSelf: 'center',
  },
  productDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    marginBottom: 6,
  },
  productCategory: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  productInfo: {
    fontSize: 14,
    color: '#666',
  },
  scrollView: {
    marginTop: 10,
    flex: 1,
  },
});

export default Orders;

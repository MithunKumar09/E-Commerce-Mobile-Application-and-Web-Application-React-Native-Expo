import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import { SERVER_URL } from '../../Constants/index';
import { useUserStore } from "../../src/store/userStore";
import * as SecureStore from "expo-secure-store";
import { useNavigation } from "@react-navigation/native";
import * as Clipboard from 'expo-clipboard';

const SkeletonComponent = ({ style }) => (
  <View style={[styles.skeletonBase, style]} />
);

const OrderList = () => {
  const [isMobile, setIsMobile] = useState(Dimensions.get("window").width < 768);
  const { user, checkAuthentication } = useUserStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCopied, setShowCopied] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const navigation = useNavigation();
  const userId = user.id;
  const [showTrackMessage, setShowTrackMessage] = useState(false);

  useEffect(() => {
    checkAuthentication();
  }, []);

  useEffect(() => {
    const handleDimensionChange = () => {
      setIsMobile(Dimensions.get("window").width < 768);
    };

    const subscription = Dimensions.addEventListener("change", handleDimensionChange);
    return () => subscription?.remove();
  }, []);

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
        const response = await axios.get(`${SERVER_URL}/user/orders/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: { userId },
        });

        // Log the response data to check its structure
        console.log("Response from server:", response.data);

        if (response.data.orders && response.data.orders.length > 0) {
          // Log each order's cartItems array
          response.data.orders.forEach((order, index) => {
            console.log(`Order ${index + 1} - Cart Items:`, order.cartItems);
          });

          console.log("Orders found:", response.data.orders);
          setOrders(response.data.orders);
        } else {
          console.log("No orders found.");
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      console.log("User ID found:", userId);
      fetchOrders();
    }
  }, [userId]);

  const handleViewDetails = (order) => {
    navigation.navigate("OrderDetails", {
      userId: userId,
      orderId: order._id,
      userEmail: order.userEmail,
      productId: order.cartItems.map((item) => item.productId?._id || "Unknown"),
    });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setShowTrackMessage((prev) => !prev); // Toggle the message visibility every 5 seconds
    }, 5000);

    return () => clearInterval(interval); // Cleanup interval on component unmount
  }, []);

  const handleCopyTrackingId = (trackingId, index) => {
    Clipboard.setString(trackingId);
    setCopiedIndex(index); // Set the index of the clicked copy icon
    setShowCopied(true); // Show the copied bubble

    setTimeout(() => {
      setShowCopied(false); // Hide the bubble after 2 seconds
    }, 2000);
  };


  return (
    <LinearGradient
      colors={["#e0e0e0", "#b8b8b8"]}
      style={styles.container}
    >
      <Text style={styles.headerTitle}>My Orders</Text>
      {loading ? (
        <View style={styles.skeletonContainer}>
          <SkeletonComponent style={styles.skeletonCard} />
          <SkeletonComponent style={styles.skeletonCard} />
          <SkeletonComponent style={styles.skeletonCard} />
        </View>
      ) : (
      <FlatList
        data={orders && orders.length > 0 ? orders : []}
        keyExtractor={(item) => item._id.toString()}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item, index }) => (
          <View style={styles.card}>
            {item.cartItems.map((cartItem) => (
              <View key={cartItem._id} style={styles.itemCard}>
                <Image
                  source={{ uri: cartItem.image || 'https://via.placeholder.com/150' }}
                  style={[styles.productImage, { width: isMobile ? 80 : 150, height: isMobile ? 80 : 150 }]}
                />
                <View style={styles.details}>
                  <Text style={styles.productName}>{cartItem.productId?.name || "Unknown Product"}</Text>
                  <Text style={styles.orderStatus}>
                    Status:{" "}
                    <Text style={[styles.statusBadge, cartItem.status === "Shipped" ? styles.shipped : styles.pending]}>
                      {cartItem.status}
                    </Text>
                  </Text>
                  <Text style={styles.productPrice}>${cartItem.price}</Text>
                  <Text style={styles.Quantity}>Quantity: {cartItem.quantity}</Text>
                </View>
              </View>
            ))}
            <Text style={styles.orderDate}>Order Date: {item.orderDate}</Text>
            {item.deliveryDate && (
              <Text style={styles.deliveryDate}>Delivery Date: {item.deliveryDate || "N/A"}</Text>
            )}
            <Text style={styles.trackingID}>Order ID: {item._id}</Text>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionButton} onPress={() => handleViewDetails(item)}>
                <MaterialIcons name="visibility" size={20} color="#fff" />
                <Text style={styles.actionText}>View Details</Text>
              </TouchableOpacity>
              {item.trackingId && (
                <View>
                                    {showTrackMessage && (
                    <View style={styles.trackMessageContainer}>
                      <Text style={styles.trackMessage}>Track Your Order</Text>
                    </View>
                  )}
                  <View style={styles.trackingIdContainer}>
                    <Text style={styles.trackingIdText}>Tracking ID: {item.trackingId}</Text>
                    <TouchableOpacity style={styles.copyIcon} onPress={() => handleCopyTrackingId(item.trackingId, index)}>
                      <MaterialIcons name="content-copy" size={20} color="#555" />
                    </TouchableOpacity>
                    {showCopied && copiedIndex === index && (
                      <Text style={styles.copiedBubble}>Copied</Text>
                    )}
                  </View>
                </View>
              )}
            </View>
          </View>
        )}
      />
    )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  listContainer: {
    paddingBottom: 50,
  },
  card: {
    backgroundColor: "#fff",
    marginBottom: 15,
    padding: 10,
    borderRadius: 8,
    elevation: 3,
  },
  itemCard: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  productImage: {
    borderRadius: 8,
  },
  details: {
    marginLeft: 10,
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  orderStatus: {
    marginTop: 5,
    fontSize: 14,
  },
  statusBadge: {
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 4,
  },
  shipped: {
    backgroundColor: '#4CAF50',
    color: '#fff',
  },
  pending: {
    backgroundColor: '#FF9800',
    color: '#fff',
  },
  productPrice: {
    fontSize: 14,
    color: '#000',
    marginTop: 5,
  },
  Quantity: {
    fontSize: 12,
    color: '#777',
  },
  orderDate: {
    marginTop: 10,
    fontSize: 14,
  },
  deliveryDate: {
    fontSize: 14,
    color: '#333',
  },
  trackingID: {
    marginTop: 5,
    fontSize: 12,
    color: '#555',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  actionButton: {
    backgroundColor: '#3f51b5',
    padding: 8,
    borderRadius: 5,
    marginRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    color: '#fff',
    marginLeft: 5,
  },
  trackingIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    borderWidth: 2,
    borderColor: '#bbb',
    borderStyle: 'dotted',
    padding: 3,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
    justifyContent: 'space-between',
  },
  trackingIdText: {
    fontSize: 12,
    color: '#555',
  },
  copyIcon: {
    padding: 5,
    backgroundColor: '#ddd',
    borderRadius: 5,
  },
  copiedBubble: {
    position: "absolute",
    top: -20,
    right: 5,
    backgroundColor: "#4CAF50",
    color: "#fff",
    padding: 5,
    borderRadius: 4,
    fontSize: 12,
    zIndex: 1,
  },
  trackMessageContainer: {
    position: "absolute",
    top: 8,
    left: 65,
    backgroundColor: "#FF5722",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1,
  },
  trackMessage: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
  skeletonContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 16,
  },
  skeletonBase: {
    backgroundColor: "#e0e0e0",
    marginBottom: 10,
    borderRadius: 10,
  },
  skeletonCard: {
    height: 150,
    width: "100%",
    borderRadius: 10,
  },
});

export default OrderList;

//Activities.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Button,
  Dimensions,
  Alert,
} from "react-native";
import { TabView, SceneMap, TabBar } from "react-native-tab-view";
import axios from 'axios';
import { SERVER_URL } from '../../Constants/index';
import { storeData, getData } from '../../utils/storage';
import { useUserStore } from '../../src/store/userStore'; // Import the user store
import { useNavigation } from '@react-navigation/native';
import * as SecureStore from "expo-secure-store";
const { width } = Dimensions.get("window");

const Activities = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, checkSalesmanAuthentication } = useUserStore((state) => state);
  const [salesman, setSalesman] = useState([]);
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: "pending", title: "Pending" },
    { key: "processing", title: "Processing" },
    { key: "shipped", title: "Shipped" },
    { key: "arrived", title: "Arrived" },
    { key: "outForDelivery", title: "Out for Delivery" },
    { key: "delivered", title: "Delivered" },
  ]);

  // Order states
  const [pendingOrders, setPendingOrders] = useState([]);
  const [processingOrders, setProcessingOrders] = useState([]);
  const [shippedOrders, setShippedOrders] = useState([]);
  const [arrivedOrders, setArrivedOrders] = useState([]);
  const [outForDeliveryOrders, setOutForDeliveryOrders] = useState([]);
  const [deliveredOrders, setDeliveredOrders] = useState([]);
  const [assignOrders, setAssignOrders] = useState([]);

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

  // Fetch the order activities
  const fetchOrderActivities = async () => {
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
      const response = await axios.get(`${SERVER_URL}/salesman/acceptedOrders/${salesman._id}`, {
        headers: {
          'Authorization': `Bearer ${salesmanToken}`,
        }
      });

      console.log("Assigned orders response:", response.data);

      // Store complete orders with details
      const ordersWithDetails = response.data.map(order => ({
        orderId: order.orderId._id,
        title: `Order:${order.orderId._id} - ${order.orderId.orderStatus}`,
        orderStatus: order.orderId.orderStatus,
        area: order.area,
        assignedAt: order.assignedAt,
        trackingId: order.trackingId,
        cartItems: order.orderId.cartItems,
        total: order.orderId.total,
        paymentMethod: order.orderId.paymentMethod,
      }));

      console.log("Orders with details:", ordersWithDetails);

      // Update state with fetched orders
      setOrders(ordersWithDetails);

      // Separate orders into categories
      setPendingOrders(ordersWithDetails.filter(order => order.orderStatus === 'Pending'));
      setProcessingOrders(ordersWithDetails.filter(order => order.orderStatus === "Processing"));
      setShippedOrders(ordersWithDetails.filter(order => order.orderStatus === 'Shipped'));
      setArrivedOrders(ordersWithDetails.filter(order => order.orderStatus === "Arrived"));
      setOutForDeliveryOrders(ordersWithDetails.filter(order => order.orderStatus === 'Out for Delivery'));
      setDeliveredOrders(ordersWithDetails.filter(order => order.orderStatus === 'Delivered'));
    } catch (error) {
      console.error("Error fetching order activities:", error);
    }
  };

  useEffect(() => {
    if (salesman && salesman._id) {
      fetchOrderActivities();
    }
  }, [salesman]);




  // Updated Handlers for status updates

  const handleMoveToProcessing = async (order) => {
    try {
      const salesmanToken = await SecureStore.getItemAsync("salesmanToken");
      await axios.patch(
        `${SERVER_URL}/salesman/updateOrderStatus/${order.orderId}`,
        { orderStatus: "Processing" },
        {
          headers: {
            Authorization: `Bearer ${salesmanToken}`,
          },
        }
      );
  
      setPendingOrders(pendingOrders.filter((item) => item.orderId !== order.orderId));
      setProcessingOrders([...processingOrders, { ...order, orderStatus: "Processing" }]);
      Alert.alert("Success", "Order marked as Processing.");
    } catch (error) {
      console.error("Error updating order status to Processing:", error.response?.data || error.message);
      Alert.alert("Error", "Failed to update order status to Processing.");
    }
  };

  const handleMoveToShipped = async (order) => {
    try {
      const salesmanToken = await SecureStore.getItemAsync("salesmanToken");
      await axios.patch(
        `${SERVER_URL}/salesman/updateOrderStatus/${order.orderId}`,
        { orderStatus: "Shipped" },
        {
          headers: {
            Authorization: `Bearer ${salesmanToken}`,
          },
        }
      );

      setPendingOrders(pendingOrders.filter((item) => item.orderId !== order.orderId));
      setShippedOrders([...shippedOrders, { ...order, orderStatus: "Shipped" }]);
      Alert.alert("Success", "Order marked as Shipped.");
    } catch (error) {
      console.error("Error updating order status to Shipped:", error.response?.data || error.message);
      Alert.alert("Error", "Failed to update order status to Shipped.");
    }
  };

  const handleMoveToArrived = async (order) => {
    try {
      const salesmanToken = await SecureStore.getItemAsync("salesmanToken");
      await axios.patch(
        `${SERVER_URL}/salesman/updateOrderStatus/${order.orderId}`,
        { orderStatus: "Arrived" },
        {
          headers: {
            Authorization: `Bearer ${salesmanToken}`,
          },
        }
      );
  
      setShippedOrders(shippedOrders.filter((item) => item.orderId !== order.orderId));
      setArrivedOrders([...arrivedOrders, { ...order, orderStatus: "Arrived" }]);
      Alert.alert("Success", "Order marked as Arrived.");
    } catch (error) {
      console.error("Error updating order status to Arrived:", error.response?.data || error.message);
      Alert.alert("Error", "Failed to update order status to Arrived.");
    }
  };

  const handleMoveToOutForDelivery = async (order) => {
    try {
      const salesmanToken = await SecureStore.getItemAsync("salesmanToken");
      await axios.patch(
        `${SERVER_URL}/salesman/updateOrderStatus/${order.orderId}`,
        { orderStatus: "Out for Delivery" },
        {
          headers: {
            Authorization: `Bearer ${salesmanToken}`,
          },
        }
      );

      setShippedOrders(shippedOrders.filter((item) => item.orderId !== order.orderId));
      setOutForDeliveryOrders([...outForDeliveryOrders, { ...order, orderStatus: "Out for Delivery" }]);
      Alert.alert("Success", "Order marked as Out for Delivery.");
    } catch (error) {
      console.error("Error updating order status to Out for Delivery:", error.response?.data || error.message);
      Alert.alert("Error", "Failed to update order status to Out for Delivery.");
    }
  };

  const handleMoveToDelivered = async (order) => {
    try {
      const salesmanToken = await SecureStore.getItemAsync("salesmanToken");
      await axios.patch(
        `${SERVER_URL}/salesman/updateOrderStatus/${order.orderId}`,
        { orderStatus: "Delivered" },
        {
          headers: {
            Authorization: `Bearer ${salesmanToken}`,
          },
        }
      );

      setOutForDeliveryOrders(outForDeliveryOrders.filter((item) => item.orderId !== order.orderId));
      setDeliveredOrders([...deliveredOrders, { ...order, orderStatus: "Delivered" }]);
      Alert.alert("Success", "Order marked as Delivered.");
    } catch (error) {
      console.error("Error updating order status to Delivered:", error.response?.data || error.message);
      Alert.alert("Error", "Failed to update order status to Delivered.");
    }
  };



  const renderList = (order, onPressHandler, buttonText) => (
    <FlatList
      data={order}
      keyExtractor={(item) => item.orderId}
      renderItem={({ item }) => (
        <View style={styles.listItem}>
          <Text style={styles.listItemText}>{item.title}</Text>
          <Button title={buttonText} onPress={() => onPressHandler(item)} color="#007bff" />
        </View>
      )}
      contentContainerStyle={styles.listContainer}
      ListEmptyComponent={
        <Text style={styles.emptyText}>No orders in this category.</Text>
      }
    />
  );

  // Tab views
  const PendingRoute = () =>
    renderList(pendingOrders, handleMoveToProcessing, "Mark as Processing");
  const ProcessingRoute = () =>
    renderList(processingOrders, handleMoveToShipped, "Mark as Shipped");
  const ShippedRoute = () =>
    renderList(shippedOrders, handleMoveToArrived, "Mark as Arrived");
  const ArrivedRoute = () =>
    renderList(arrivedOrders, handleMoveToOutForDelivery, "Out for Delivery");
  const OutForDeliveryRoute = () =>

    renderList(outForDeliveryOrders, handleMoveToDelivered, "Mark as Delivered");
  const DeliveredRoute = () =>
    renderList(deliveredOrders, () => Alert.alert("Info", "Already Delivered"), "Delivered");



  const renderScene = SceneMap({
    pending: PendingRoute,
    processing: ProcessingRoute,
    shipped: ShippedRoute,
    arrived: ArrivedRoute,
    outForDelivery: OutForDeliveryRoute,
    delivered: DeliveredRoute,
  });

  const renderTabBar = (props) => (
    <TabBar
      {...props}
      indicatorStyle={styles.indicatorStyle}
      style={styles.tabBar}
      labelStyle={styles.tabLabel}
      activeColor="#007bff"
      inactiveColor="#8a8a8a"
    />
  );

  return (
    <TabView
      navigationState={{ index, routes }}
      renderScene={renderScene}
      onIndexChange={setIndex}
      initialLayout={{ width }}
      renderTabBar={renderTabBar}
    />
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#ffffff",
    elevation: 4,
  },
  indicatorStyle: {
    backgroundColor: "#007bff",
    height: 3,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  listContainer: {
    padding: 5,
  },
  listItem: {
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listItemText: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
    color: "#aaa",
  },
});

export default Activities;

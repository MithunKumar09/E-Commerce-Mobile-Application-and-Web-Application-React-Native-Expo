import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import axios from "axios";
import { SERVER_URL } from '../../Constants/index';
import { useUserStore } from "../../src/store/userStore";
import SkeletonComponent from "../../components/Loading/SkeletonComponent";
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

const OrderTracking = ({ route }) => {
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const [assignOrder, setAssignOrder] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const [orderStatus, setOrderStatus] = useState("");
  const [orderStatusHistory, setOrderStatusHistory] = useState([]);
  const [trackingId, setTrackingId] = useState("");
  const { user, isAuthenticated, checkAuthentication } = useUserStore();
  const [reachedLocation, setReachedLocation] = useState({
    area: "Location not available",
    time: "Time not available"
  });
  const [deliveryExpectedDate, setDeliveryExpectedDate] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const calculateDeliveryDate = (orderDate) => {
    const date = new Date(orderDate);
    date.setDate(date.getDate() + 7);
    return date.toLocaleDateString();
  };

  useEffect(() => {
    if (route?.params?.orderId) {
      setOrderId(route.params.orderId);
      console.log("Order ID received:", route.params.orderId);

      axios
        .get(`${SERVER_URL}/user/assignOrder/${route.params.orderId}`)
        .then((response) => {
          if (response.data) {
            setAssignOrder(response.data);
            setTrackingId(response.data.trackingId || "N/A");

            const latestLocation = response.data.locationHistory && response.data.locationHistory[response.data.locationHistory.length - 1];
            const reachedLocationArea = latestLocation ? latestLocation.area : "Location not available";
            const reachedLocationTime = latestLocation ? new Date(latestLocation.updatedAt).toLocaleTimeString() : "Time not available";

            setReachedLocation({
              area: reachedLocationArea,
              time: reachedLocationTime
            });

            axios
              .get(`${SERVER_URL}/user/orderDetails/${route.params.orderId}`)
              .then((orderResponse) => {
                if (orderResponse.data) {
                  setOrderDetails(orderResponse.data);
                  setOrderStatus(orderResponse.data.orderStatus);
                  setOrderStatusHistory(orderResponse.data.orderStatusHistory || []);
                  const orderDate = orderResponse.data.orderDate;
                  const deliveryExpectedDate = calculateDeliveryDate(orderDate);
                  setDeliveryExpectedDate(deliveryExpectedDate);
                  setLoading(false);
                } else {
                  console.log("No data found for the provided orderId in Order model.");
                }
              })
              .catch((orderError) => {
                console.error("Error fetching order details:", orderError);
                Alert.alert("Error", "Unable to retrieve complete order details. Please try again.");
                setLoading(false);
              });
          } else {
            console.log("No data found for the provided orderId in AssignOrder.");
            setLoading(false);
          }
        })
        .catch((error) => {
          console.error("Error fetching assignOrder data:", error);
          Alert.alert("Error", "Unable to retrieve assignOrder details. Please try again.");
          setLoading(false);
        });
    } else {
      console.log("Order ID not provided");
      Alert.alert("Error", "Order ID not provided. Please check and try again.");
      setLoading(false);
    }
  }, [route]);

  const toggleExpand = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const getIconColor = (status, index) => {
    const statusOrder = [
      "Pending",
      "Processing",
      "Shipped",
      "Arrived",
      "Out for Delivery",
      "Delivered"
    ];
    const currentIndex = statusOrder.indexOf(orderStatus);

    const statusPercentages = {
      "Pending": 0,
      "Processing": 25,
      "Shipped": 40,
      "Arrived": 60,
      "Out for Delivery": 85,
      "Delivered": 100,
    };

    const progressPercentage = statusPercentages[status] || 0;
    const isCompleted = index <= currentIndex;

    return {
      color: isCompleted ? "#28a745" : "#ccc",
      progress: progressPercentage,
    };
  };

  const getLocationHistoryBetweenStatuses = () => {
    if (!assignOrder || !orderStatusHistory) return [];
    let locationHistoryBetweenStatuses = [];
    let orderStatusIndex = 0;
    let locationAvailable = false;

    orderStatusHistory.forEach((statusItem, index) => {
      const currentStatusTime = new Date(statusItem.updatedAt).getTime();
      const nextStatusTime =
        index < orderStatusHistory.length - 1
          ? new Date(orderStatusHistory[index + 1].updatedAt).getTime()
          : currentStatusTime;

      const filteredLocations = assignOrder.locationHistory.filter(
        (location) => {
          const locationTime = new Date(location.updatedAt).getTime();
          return locationTime >= currentStatusTime && locationTime <= nextStatusTime;
        }
      );

      if (filteredLocations.length > 0) {
        locationAvailable = true;
        locationHistoryBetweenStatuses.push({
          status: statusItem.status,
          locations: filteredLocations.slice(0, 2),
          hasMoreLocations: filteredLocations.length > 2,
          statusUpdatedAt: statusItem.updatedAt,
        });
      }
    });

    if (locationAvailable) {
      return locationHistoryBetweenStatuses;
    } else {
      return [
        {
          status: "No Location Available",
          locations: [{ area: "Location not available" }],
          hasMoreLocations: false,
          statusUpdatedAt: "",
        },
      ];
    }
  };

  const locationHistoryData = getLocationHistoryBetweenStatuses();

  if (loading) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <SkeletonComponent width="100%" height={50} borderRadius={8} />
        <SkeletonComponent width="100%" height={30} borderRadius={8} style={{ marginTop: 10 }} />
        <SkeletonComponent width="90%" height={20} borderRadius={8} style={{ marginTop: 10, alignSelf: 'center' }} />
        <SkeletonComponent width="100%" height={150} borderRadius={12} style={{ marginTop: 10 }} />
      </ScrollView>
    );
  }


  return (
    <LinearGradient
      colors={['#FFDEE9', '#B5FFFC']}
      style={styles.gradientContainer}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Real Time Order Tracking</Text>
          <Text style={styles.status}>{orderStatus ? orderStatus.toUpperCase() : "LOADING..."}</Text>
        </View>
        {orderStatusHistory.map((statusItem, index) => {
          const { color, progress } = getIconColor(statusItem.status, index);

          return (
            <View key={index} style={styles.itemContainer}>
              <View style={styles.timeline}>
                <View style={styles.iconWrapper}>
                  <MaterialIcons
                    name={statusItem.status === "Pending"
                      ? "inventory"
                      : statusItem.status === "Processing"
                        ? "construction"
                        : statusItem.status === "Shipped"
                          ? "local-shipping"
                          : statusItem.status === "Arrived"
                            ? "location-on"
                            : statusItem.status === "Out for Delivery"
                              ? "delivery-dining"
                              : statusItem.status === "Delivered"
                                ? "check-circle"
                                : "check-circle"}
                    size={24}
                    color={color}
                  />
                </View>
                {index !== orderStatusHistory.length - 1 && (
                  <View
                    style={[
                      styles.timelineLine,
                      { height: expandedIndex === index ? 95 : 100 },
                      index <= orderStatusHistory.findIndex(item => item.status === orderStatus) &&
                      styles.timelineLineCompleted,
                    ]}
                  />
                )}
              </View>
              <View style={styles.content}>
                <Text style={styles.time}>{new Date(statusItem.updatedAt).toLocaleTimeString()}</Text>
                <Text style={styles.statusText}>{statusItem.status}</Text>
                <Text style={styles.location}>{statusItem.location || "Your Order Reached to"}</Text>
                {locationHistoryData[index] && (
                  <View style={styles.locationHistory}>
                    {locationHistoryData[index].locations.map((location, locIndex) => (
                      <Text key={locIndex} style={styles.locationDetail}>
                        - {location.area}
                      </Text>
                    ))}
                    {locationHistoryData[index].hasMoreLocations && (
                      <TouchableOpacity onPress={() => toggleExpand(index)}>
                        <View style={styles.expandContainer}>
                          <Text style={styles.expandText}>
                            {expandedIndex === index ? "View Less" : "View More"}
                          </Text>
                          <MaterialIcons
                            name={expandedIndex === index ? "expand-less" : "expand-more"}
                            size={24}
                            color="#333"
                          />
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            </View>
          );
        })}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Delivery Type: 2-8 Days</Text>
          <Text style={styles.footerText}>Ordered Date: {new Date(orderDetails?.orderDate).toLocaleDateString()}</Text>
          <Text style={styles.footerText}>Delivery Expected: {deliveryExpectedDate}</Text>
          <Text style={styles.footerText}>Reached location: {reachedLocation.area} at {reachedLocation.time}</Text>
          <Text style={styles.footerText}>Tracking Number: {trackingId}</Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  container: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  status: {
    fontSize: 14,
    color: "#28a745",
    fontWeight: "bold",
  },
  itemContainer: {
    flexDirection: "row",
    marginBottom: 24,
  },
  timeline: {
    alignItems: "center",
    marginRight: 16,
    position: "relative",
  },
  iconWrapper: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f4f4f4",
    borderRadius: 18,
  },
  timelineLine: {
    width: 5,
    backgroundColor: "#ccc",
    position: "absolute",
    top: 36,
    zIndex: 0,
  },
  timelineLineCompleted: {
    backgroundColor: "#28a745",
  },
  content: {
    flex: 1,
  },
  time: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  statusText: {
    fontSize: 16,
    color: "#000",
    fontWeight: "600",
    marginVertical: 4,
  },
  location: {
    fontSize: 14,
    color: "#666",
  },
  expandContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  expandText: {
    fontSize: 14,
    color: "#007bff",
    marginRight: 4,
  },
  locationDetail: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  footer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
  },
  footerText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
  },
});

export default OrderTracking;

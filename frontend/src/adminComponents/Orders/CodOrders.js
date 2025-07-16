import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    Modal,
    ScrollView,
    Dimensions,
    Button,
    Image, Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import { SERVER_URL } from '../../../Constants/index';
import * as SecureStore from 'expo-secure-store';
import { useUserStore } from '../../store/userStore';

const CodOrders = () => {
    const [orders, setOrders] = useState([]);
    const [productDetails, setProductDetails] = useState([]);
    const [processedOrdersData, setProcessedOrdersData] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [selectedSalesman, setSelectedSalesman] = useState(null);
    const [orderStatus, setOrderStatus] = useState("");
    const [expandedSections, setExpandedSections] = useState({});
    const slideAnim = useRef(new Animated.Value(0)).current;
    const [salesmen, setSalesmen] = useState([]);
    const [showSalesmanList, setShowSalesmanList] = useState(false);
    const [orderStatusText, setOrderStatusText] = useState("");
  const { admin, isAuthenticated, checkAdminAuthentication, signOutAdmin } = useUserStore(state => state);
  const assignButtonText = orderStatusText === 'Request Sent' ? 'Request Sent' : 'Send Request';

  useEffect(() => {
    checkAdminAuthentication();
  }, []);

    useEffect(() => {
        const fetchSalesmen = async () => {
            try {
                const token = await SecureStore.getItemAsync('salesmanToken');
                const response = await axios.get(`${SERVER_URL}/admin/salesman`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                console.log('Salesmen data retrieved:', response.data.salesmen);
                setSalesmen(response.data.salesmen);
            } catch (error) {
                console.error('Error fetching salesmen:', error.response?.data || error.message);
                Alert.alert(
                    'Error',
                    error.response?.data?.error || 'An error occurred while fetching the salesman accounts.'
                );
            }
        };

        fetchSalesmen();
    }, []);

    const handleAssignButtonClick = () => {
        setShowSalesmanList(!showSalesmanList);
    };
    
const assignOrderToSalesman = async (salesmanId, orderId) => {
    try {
        // Log the data being sent to the backend
        console.log('Sending data to backend:', { salesmanId, orderId });

        // Retrieve the admin token from SecureStore
        const adminToken = await SecureStore.getItemAsync('adminToken');  // Ensure you have stored the admin token

        // Make sure the token exists before proceeding
        if (!adminToken) {
            Alert.alert("Error", "Admin is not authenticated.");
            return;
        }

        // Send the admin token in the Authorization header
        const response = await axios.post(
            `${SERVER_URL}/admin/assign-order`, 
            { salesmanId, orderId },
            {
                headers: {
                    Authorization: `Bearer ${adminToken}`,  // Attach the admin token to the request
                }
            }
        );

        // Log the response data from the backend
        console.log('Response from backend:', response);

        if (response.status === 200) {
            Alert.alert("Success", "Order assigned to salesman successfully.");
            setShowSalesmanList(false);
        }
    } catch (error) {
        // Log the error details for debugging
        console.error("Error assigning order:", error);
        Alert.alert("Error", "Failed to assign order to salesman.");
    }
};


    // Function to fetch product details based on productId
    const fetchProductDetails = async (productId) => {
        try {
            console.log(`Fetching product details for productId: ${productId}`); // Log productId being fetched
            const response = await axios.get(`${SERVER_URL}/admin/products/${productId}`);
            console.log("Product details fetched:", response.data); // Log the fetched product details
            return response.data; // Return product data
        } catch (error) {
            console.error("Error fetching product details:", error);
            return null; // In case of error, return null
        }
    };

    // Fetch product details for each cart item when the modal is opened
    useEffect(() => {
        if (selectedOrder) {
            console.log("Selected order:", selectedOrder); // Log the selected order object
            const fetchAllProductDetails = async () => {
                const details = await Promise.all(
                    selectedOrder.cartItems.map(item => {
                        console.log(`Fetching details for productId: ${item.productId._id}`); // Log each productId being processed
                        return fetchProductDetails(item.productId._id); // Fetch product details by productId
                    })
                );
                console.log("All product details:", details); // Log the array of product details once all are fetched
                setProductDetails(details);
            };
            fetchAllProductDetails();
        }
    }, [selectedOrder]);


    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const response = await axios.get(`${SERVER_URL}/admin/orders`);
                console.log('Orders fetched:', response.data);

                // Filter orders with paymentMethod: 'COD'
                const codOrders = response.data.filter(order => order.paymentMethod === 'COD');
                console.log('Filtered COD Orders:', codOrders);

                setOrders(codOrders); // Set only COD orders in state
            } catch (error) {
                console.error('Error fetching orders:', error);
            }
        };

        fetchOrders();
    }, []);

    useEffect(() => {
        const today = new Date().toISOString().split("T")[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

        // Processing orders based on their date
        const updatedData = orders.reduce((acc, order) => {
            const orderDate = new Date(order.orderDate).toISOString().split("T")[0];
            let dateLabel = '';

            if (orderDate === today) dateLabel = "Today";
            else if (orderDate === yesterday) dateLabel = "Yesterday";
            else dateLabel = orderDate; // Keep the original date

            const sectionIndex = acc.findIndex(section => section.date === dateLabel);

            if (sectionIndex === -1) {
                acc.push({ date: dateLabel, orders: [order] });
            } else {
                acc[sectionIndex].orders.push(order);
            }

            return acc;
        }, []);

        // Sort sections by date (newest first)
        updatedData.sort((a, b) => {
            const dateA = new Date(a.date === "Today" ? today : a.date === "Yesterday" ? yesterday : a.date);
            const dateB = new Date(b.date === "Today" ? today : b.date === "Yesterday" ? yesterday : b.date);
            return dateB - dateA;
        });

        setProcessedOrdersData(updatedData);
    }, [orders]);

    const toggleSection = (date) => {
        setExpandedSections((prev) => ({
            ...prev,
            [date]: !prev[date],
        }));
    };

    const handleViewDetails = (order) => {
        setSelectedOrder(order);
        setModalVisible(true);
    };

    const closeModal = () => {
        setModalVisible(false);
        setSelectedOrder(null);
    };

    const handleDeleteOrder = (orderId) => {
        Alert.alert(
            "Delete Order",
            `Are you sure you want to delete order: ${orderId}?`,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", onPress: () => console.log(`Order ${orderId} deleted.`) },
            ]
        );
    };

    const renderOrder = ({ item }) => (
        <View style={styles.orderRow}>
            <Text style={styles.orderId}>{item._id}</Text>
            <Text style={styles.orderLocation}>{item.selectedAddressId?.pincode}</Text>
            <Text
                style={[
                    styles.orderStatus,
                    item.orderStatus === "Cancelled" && styles.cancelledStatus,
                ]}
            >
                {item.orderStatus}
            </Text>
            <View style={styles.actionsContainer}>
                <TouchableOpacity onPress={() => handleViewDetails(item)}>
                    <Ionicons name="eye" size={24} color="#007bff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteOrder(item._id)}>
                    <Ionicons name="trash" size={24} color="#dc3545" />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderSection = ({ item }) => (
        <View style={styles.sectionContainer}>
            <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => toggleSection(item.date)}
            >
                <Text style={styles.sectionTitle}>{item.date}</Text>
                <Ionicons
                    name={expandedSections[item.date] ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="black"
                />
            </TouchableOpacity>
            {expandedSections[item.date] && (
                <View>
                    {item.orders.length === 0 ? (
                        <Text style={styles.noOrdersText}>No orders available</Text>
                    ) : (
                        <>
                            <View style={styles.tableHeader}>
                                <Text style={[styles.headerText, { flex: 2 }]}>Order ID</Text>
                                <Text style={[styles.headerText, { flex: 1 }]}>Location</Text>
                                <Text style={[styles.headerText, { flex: 1 }]}>Order Status</Text>
                                <Text style={[styles.headerText, { flex: 1 }]}>Action</Text>
                            </View>
                            <FlatList
                                data={item.orders}
                                renderItem={renderOrder}
                                keyExtractor={(order) => order._id.toString()}
                            />
                        </>
                    )}
                </View>
            )}
        </View>
    );


    // Update to calculate total quantity for cartItems
    const getTotalQuantity = (cartItems) => {
        return cartItems.reduce((total, item) => total + item.quantity, 0);
    };

    // Slide animation for product images when multiple products are found
    const startSlideAnimation = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(slideAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    };

    useEffect(() => {
        if (selectedOrder && selectedOrder.cartItems.length > 1) {
            startSlideAnimation();
        }
    }, [selectedOrder]);

    useEffect(() => {
        if (selectedOrder) {
            // Synchronize the local state with the backend status
            setOrderStatus(selectedOrder.orderStatus); // Update orderStatus with the value from the backend
        }
    }, [selectedOrder]);

    const updateOrderStatus = async (orderId, status) => {
        try {
            // Prepare the order summary
            const orderSummary = selectedOrder.cartItems.map(item => ({
                productName: item.name,
                quantity: item.quantity,
                price: item.price,
            }));

            // Log the data being sent to the backend
            console.log("Data being sent to the backend:", {
                orderStatus: status,
                orderSummary: orderSummary, // Add orderSummary here
                cartItems: selectedOrder.cartItems.map(item => ({
                    ...item,
                    status: status,  // Update the status of each item in the cartItems array
                })),
            });

            // Send a request to the backend to update the status, including orderSummary
            const response = await axios.patch(`${SERVER_URL}/admin/orders/${orderId}`, {
                orderStatus: status,
                orderSummary: orderSummary, // Add orderSummary here
                cartItems: selectedOrder.cartItems.map(item => ({
                    ...item,
                    status: status,  // Update the status of each item in the cartItems array
                })),
            });

            // Handle success
            if (response.status === 200) {
                Alert.alert("Success", "Order status updated successfully.");
                // Update the local state with the new status
                setOrders(prevOrders =>
                    prevOrders.map(order =>
                        order._id === orderId ? { ...order, orderStatus: status, cartItems: response.data.cartItems } : order
                    )
                );
                setOrderStatus(status);
            }
        } catch (error) {
            console.error("Error updating order status:", error);
            Alert.alert("Error", "Failed to update order status.");
        }
    };


    const handleStatusChange = (status) => {
        setOrderStatus(status);
        // Update the order status locally
        if (selectedOrder) {
            updateOrderStatus(selectedOrder._id, status);
        }
    };


    return (
        <View style={styles.container}>
            <FlatList
                data={processedOrdersData}
                renderItem={renderSection}
                keyExtractor={(item) => item.date}
                showsVerticalScrollIndicator={false}
            />
            {modalVisible && selectedOrder && (
                <Modal
                    visible={modalVisible}
                    animationType="slide"
                    onRequestClose={closeModal}
                >
                    <View style={styles.modalContainer}>
                        <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                            <Ionicons name="close" size={30} color="black" />
                        </TouchableOpacity>
                        <ScrollView>
                            <Text style={styles.modalTitle}>Order Details</Text>

                            {/* Product Image Placeholder */}
                            <View style={styles.productImageContainer}>
                                {selectedOrder.cartItems.map((item, index) => (
                                    <Animated.View
                                        key={index}
                                        style={[
                                            styles.productImageWrapper,
                                            {
                                                transform: [
                                                    {
                                                        translateX: slideAnim.interpolate({
                                                            inputRange: [0, 1],
                                                            outputRange: [0, 200], // Adjust slide distance
                                                        }),
                                                    },
                                                ],
                                            },
                                        ]}
                                    >
                                        <Image
                                            source={{ uri: item.image || 'https://via.placeholder.com/150' }} // Display the image stored in cartItems
                                            style={styles.productImage}
                                            resizeMode="contain"
                                        />
                                    </Animated.View>
                                ))}
                            </View>

                            {/* Order Details */}
                            <View style={styles.fieldContainer}>
                                <Text style={styles.fieldLabel}>Order ID:</Text>
                                <Text style={styles.fieldValue}>{selectedOrder._id}</Text>
                            </View>
                            <View style={styles.fieldContainer}>
                                <Text style={styles.fieldLabel}>Price:</Text>
                                <Text style={styles.fieldValue}>₹{(selectedOrder.total / 100).toFixed(2)}</Text>
                            </View>
                            <View style={styles.fieldContainer}>
                                <Text style={styles.fieldLabel}>Quantity:</Text>
                                <Text style={styles.fieldValue}>{getTotalQuantity(selectedOrder.cartItems)}</Text>
                            </View>
                            <View style={styles.fieldContainer}>
                                <Text style={styles.fieldLabel}>Payment Method:</Text>
                                <Text style={styles.fieldValue}>{selectedOrder.paymentMethod}</Text>
                            </View>
                            <View style={styles.fieldContainer}>
                                <Text style={styles.fieldLabel}>Offer Added:</Text>
                                <Text style={styles.fieldValue}>No</Text>
                            </View>
                            <View style={styles.fieldContainer}>
                                <Text style={styles.fieldLabel}>Shipping Address:</Text>
                                <Text style={styles.fieldValue}>{selectedOrder.selectedAddressId.addressLine}, {selectedOrder.selectedAddressId.state}</Text>
                            </View>
                            {/* Display Cart Items */}
                            {selectedOrder.cartItems.map((item, index) => (
                                <View key={index} style={styles.fieldContainer}>
                                    <Text style={styles.fieldLabel}>Product {index + 1}:</Text>
                                    <Text style={styles.fieldValue}>Quantity: {item.quantity}</Text>
                                    <Text style={styles.fieldValue}>Price: ₹{item.price}</Text>
                                </View>
                            ))}
                            <Text style={styles.sectionTitle}>Product Details</Text>
                            {productDetails.length > 0 && productDetails.map((detail, index) => (
                                <View key={index} style={styles.productRow}>
                                    <Text style={styles.productText}>{detail?.name}</Text>
                                    <Text style={styles.productDetailText}>Category: {detail?.category}</Text>
                                    <Text style={styles.productDetailText}>Brand: {detail?.brand}</Text>
                                </View>
                            ))}

                            <View style={styles.fieldContainer}>
                                <Text style={styles.fieldLabel}>Tracking ID:</Text>
                                <Text style={styles.fieldValue}>TRK123456</Text>
                            </View>
                            <View style={styles.fieldContainer}>
                                <Text style={styles.fieldLabel}>Real-time Location:</Text>
                                <Text style={styles.fieldValue}>560001</Text>
                            </View>
                            <View style={styles.fieldContainer}>
                                <Text style={styles.fieldLabel}>Cancellation Reason:</Text>
                                <Text style={styles.fieldValue}>None</Text>
                            </View>
                            <View style={styles.fieldContainer}>
                                <Text style={styles.fieldLabel}>Return/Replace Reason:</Text>
                                <Text style={styles.fieldValue}>None</Text>
                            </View>

                            {/* Order Status Dropdown */}
                            <View style={styles.dropdownContainer}>
                                <Text style={styles.dropdownLabel}>Order Status:</Text>
                                <Picker
                                    selectedValue={orderStatus}
                                    onValueChange={handleStatusChange}  // Trigger updateOrderStatus when value changes
                                    style={styles.dropdownPicker}
                                >
                                    <Picker.Item label="Pending" value="Pending" />
                                    <Picker.Item label="Shipped" value="Shipped" />
                                    <Picker.Item label="Delivered" value="Delivered" />
                                    <Picker.Item label="Cancelled" value="Cancelled" />
                                    <Picker.Item label="Returned" value="Returned" />
                                </Picker>

                            </View>

 {/* Assign to Salesman Button */}
 <View style={styles.assignButtonContainer}>
                <TouchableOpacity onPress={handleAssignButtonClick} style={styles.assignButton}>
                    <Text style={styles.assignButtonText}>
                        {showSalesmanList ? "Close Salesman List" : "Assign"}
                    </Text>
                </TouchableOpacity>
            </View>

            {showSalesmanList && (
                <View style={styles.salesmanListContainer}>
                    <Text style={styles.salesmanListHeader}>Assign to Salesman</Text>
                    <ScrollView>
                        {salesmen.map((salesman) => (
                            <View key={salesman._id} style={styles.salesmanItem}>
                                <Text style={styles.salesmanName}>{salesman.name}</Text>
                                <Text style={styles.salesmanName}>{salesman.email}</Text>

                                <TouchableOpacity
                                    onPress={() => assignOrderToSalesman(salesman._id, selectedOrder?._id)}
                                    style={styles.assignButton}
                                >
                                    <Text style={styles.assignButtonText}>{assignButtonText}</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            )}

                        </ScrollView>
                    </View>

                </Modal>
            )}
        </View>
    );
};


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8f9fa",
        paddingHorizontal: 15,
    },
    sectionContainer: {
        marginBottom: 15,
        borderRadius: 8,
        overflow: "hidden",
        backgroundColor: "#ffffff",
        elevation: 3,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#e9ecef",
        paddingVertical: 10,
        paddingHorizontal: 15,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#495057",
    },
    tableHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        backgroundColor: "#f1f3f5",
        padding: 10,
    },
    headerText: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#495057",
    },
    noOrdersText: {
        textAlign: "center",
        padding: 20,
        color: "#6c757d",
        fontSize: 14,
    },
    orderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#ffffff",
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#dee2e6",
    },
    orderId: {
        flex: 2,
        fontSize: 14,
        fontWeight: "bold",
        color: "#212529",
    },
    orderLocation: {
        flex: 1,
        fontSize: 14,
        color: "#6c757d",
        textAlign: "center",
    },
    orderStatus: {
        flex: 1,
        fontSize: 14,
        color: "#28a745",
        textAlign: "center",
    },
    cancelledStatus: {
        color: "#dc3545",
    },
    actionsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        flex: 1,
    },
    // Modal container styling
    modalContainer: {
        flex: 1,
        backgroundColor: 'white',
        padding: 20,
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        borderTopLeftRadius: 15,
        borderTopRightRadius: 15,
        marginTop: 50, // Adjust top spacing
    },
    closeButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 1,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#333',
        textAlign: 'center',
    },
    productImageContainer: {
        flexDirection: "row",
        justifyContent: "center",
        marginVertical: 20,
    },
    productImageWrapper: {
        marginHorizontal: 10,
    },
    productImage: {
        width: 150,
        height: 150,
        borderRadius: 10,
        backgroundColor: '#f0f0f0',
        marginBottom: 10,
    },
    noImageText: {
        fontSize: 16,
        color: '#888',
        textAlign: 'center',
    },
    fieldContainer: {
        marginBottom: 15, // Adds space between fields
    },
    fieldLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#555',
        marginBottom: 5, // Space between label and input
    },
    fieldValue: {
        fontSize: 16,
        color: '#333',
        padding: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        backgroundColor: '#f9f9f9',
    },
    dropdownContainer: {
        marginBottom: 20,
    },
    dropdownLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#555',
        marginBottom: 5,
    },
    dropdownPicker: {
        height: 50,
        backgroundColor: '#f9f9f9',
        borderColor: '#ddd',
        borderWidth: 1,
        borderRadius: 5,
    },
    assignButtonContainer: {
        marginTop: 20,
    },
    productRow: {
        padding: 10,
        marginVertical: 5,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        backgroundColor: '#f2f2f2', // Light background for contrast
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3, // Adds shadow on Android
    },
    productText: {
        fontSize: 16,
        color: '#000',
        marginBottom: 3,
    },
    productDetailText: {
        fontSize: 14,
        color: '#666',
    },
    salesmanListContainer: {
        marginTop: 10,
        padding: 10,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    salesmanListHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    salesmanItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        padding: 8,
        backgroundColor: '#fff',
        borderRadius: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    salesmanName: {
        fontSize: 14,
        fontWeight: '500',
    },
    assignButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: '#007bff',
        borderRadius: 5,
    },
    assignButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    
});

export default CodOrders;

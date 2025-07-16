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

const PrepaidOrders = () => {
    const [orders, setOrders] = useState([]);
    const [processedOrdersData, setProcessedOrdersData] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderStatus, setOrderStatus] = useState("Pending");
    const [expandedSections, setExpandedSections] = useState({});
    const slideAnim = useRef(new Animated.Value(0)).current;

    const ordersData = [
        {
            date: "2024-12-22",
            orders: [
                { id: "ORD123456", location: "560001", status: "Out for Delivered" },
                { id: "ORD789012", location: "560002", status: "Delivered" },
            ],
        },
        {
            date: "2024-12-21",
            orders: [
                { id: "ORD345678", location: "560003", status: "Cancelled" },
                { id: "ORD901234", location: "560004", status: "In Transit" },
            ],
        },
        {
            date: "2024-11-27",
            orders: [
                { id: "ORD567890", location: "560005", status: "Pending" },
                { id: "ORD234567", location: "560006", status: "Delivered" },
            ],
        },
    ];

        useEffect(() => {
            const fetchOrders = async () => {
                try {
                    const response = await axios.get(`${SERVER_URL}/admin/orders`);
                    console.log('Orders fetched:', response.data);
    
                    // Filter orders with paymentMethod: 'Card'
                    const CardOrders = response.data.filter(order => order.paymentMethod === 'Card');
                    console.log('Filtered Card Orders:', CardOrders);
    
                    setOrders(CardOrders);
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
                                <Text style={styles.fieldLabel}>Product Name:</Text>
                                <Text style={styles.fieldValue}>{selectedOrder.ProductId?.name}</Text>
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
                                    <Text style={styles.fieldValue}>Name: {item.productId?.productName}</Text>
                                    <Text style={styles.fieldValue}>Quantity: {item.quantity}</Text>
                                    <Text style={styles.fieldValue}>Price: ₹{item.price}</Text>
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
                                    onValueChange={(itemValue) => setOrderStatus(itemValue)}
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
                                <Button title="Select Salesman" onPress={() => { }} />
                            </View>
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
});

export default PrepaidOrders;

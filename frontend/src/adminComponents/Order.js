import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Modal, TouchableOpacity, Image, TextInput, StyleSheet, Platform, ScrollView } from 'react-native';
import axios from 'axios';
import { SERVER_URL } from '../../../Constants/index';
import { useWindowDimensions } from 'react-native';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [imageUrls, setImageUrls] = useState({});
  const [newStatus, setNewStatus] = useState('');
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await axios.get(`${SERVER_URL}/admin/orders`);
        setOrders(response.data);

        console.log('Orders fetched:', response.data); // Debugging log

        const imageUrlsMap = {};
        for (const order of response.data) {
          for (const item of order.cartItems) {
            const imageId = item.productId.images[0];
            if (imageId) {
              const imageResponse = await axios.get(`${SERVER_URL}/user/images/${imageId}`);
              imageUrlsMap[imageId] = imageResponse.data.imageUrl;
            }
          }
        }
        setImageUrls(imageUrlsMap);
      } catch (error) {
        console.error('Error fetching orders:', error);
      }
    };

    fetchOrders();
  }, []);

  const openModal = (order, item) => {
    setSelectedOrder({ ...order, selectedItem: item });
  };

  useEffect(() => {
    if (selectedOrder) {
      setNewStatus(
        selectedOrder.orderStatus === 'Cancelled'
          ? 'Cancelled'
          : selectedOrder.orderStatus === 'Returned'
            ? 'Returned'
            : selectedOrder.selectedItem.status
      );
    }
  }, [selectedOrder]);

  const closeModal = () => {
    setSelectedOrder(null);
    setNewStatus('');
  };

  const statusColors = {
    Pending: '#FFEB3B', // Yellow
    Shipped: '#2196F3', // Blue
    'Out for Delivery': '#FF9800', // Orange
    Delivered: '#4CAF50', // Green
    'Pending Cancel': '#F44336', // Red
    Cancelled: '#F44336', // Red
    Returned: '#9C27B0', // Purple
  };

  const handleStatusChange = async () => {
    if (selectedOrder) {
      try {
        const updatedStatus = selectedOrder.orderStatus === 'Cancelled'
          ? 'Cancelled'
          : selectedOrder.orderStatus === 'Returned'
            ? 'Returned'
            : newStatus;

        await axios.put(`${SERVER_URL}/admin/orders/${selectedOrder._id}`, {
          orderStatus: updatedStatus,
          productId: selectedOrder.selectedItem.productId._id,
        });

        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order._id === selectedOrder._id
              ? {
                ...order,
                orderStatus: updatedStatus,
                cartItems: order.cartItems.map((item) =>
                  item.productId._id === selectedOrder.selectedItem.productId._id
                    ? { ...item, status: updatedStatus }
                    : item
                ),
              }
              : order
          )
        );
        closeModal();
      } catch (error) {
        console.error('Error updating status:', error);
      }
    }
  };

  return (
    <ScrollView style={{ flex: 1, paddingTop: 20 }}>
      <Text style={styles.title}>Order List</Text>
      <FlatList
        data={orders}
        keyExtractor={(item) => item._id}
        renderItem={({ item: order }) => (
          <View style={styles.orderCard}>
            {order.cartItems.map((item) => (
              <View key={item._id} style={styles.orderRow}>
                <Text style={styles.text}>{order._id}</Text>
                <Text style={styles.text}>{item.productId?.name}</Text>
                <Image
                  source={{ uri: imageUrls[item.productId.images[0]] || '/path/to/default/image.png' }}
                  style={styles.productImage}
                />
                <Text style={styles.text}>{item.quantity}</Text>
                <Text style={styles.text}>${item.price}</Text>
                <Text style={styles.text}>
                  {new Date(order.orderDate).toLocaleDateString()}
                </Text>
                <Text style={[styles.status, { backgroundColor: statusColors[item.status] }]}>
                  {item.status}
                </Text>
                <TouchableOpacity onPress={() => openModal(order, item)} style={styles.viewDetailsButton}>
                  <Text style={styles.buttonText}>View Details</Text>
                  <Text style={styles.buttonText}>Change Status</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      />

      {selectedOrder && (
        <Modal
          transparent={true}
          visible={true}
          onRequestClose={closeModal}
          animationType="slide"
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Order Details</Text>
              <Text><strong>Order ID:</strong> {selectedOrder._id}</Text>
              <Text><strong>Order Date:</strong> {new Date(selectedOrder.orderDate).toLocaleDateString()}</Text>
              <Text><strong>Total Amount:</strong> ${selectedOrder.total}</Text>
              <Text><strong>Shipping Address:</strong> {selectedOrder.selectedAddressId?.street}</Text>

              <Text style={styles.modalSubTitle}>Selected Product</Text>
              <Text><strong>Product Name:</strong> {selectedOrder.selectedItem.productId?.name}</Text>
              <Text><strong>Quantity:</strong> {selectedOrder.selectedItem.quantity}</Text>
              <Text><strong>Price:</strong> ${selectedOrder.selectedItem.price}</Text>
              <Text><strong>Description:</strong> {selectedOrder.selectedItem.productId?.description}</Text>
              {selectedOrder.orderStatus === 'Cancelled' && selectedOrder.cancellation && (
                <Text><strong>Cancellation Reason:</strong> {selectedOrder.cancellation.reason}</Text>
              )}

              <Text style={styles.modalSubTitle}>Change Status</Text>
              <TextInput
                style={styles.statusInput}
                value={newStatus}
                onChangeText={setNewStatus}
                placeholder="Update Status"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                  <Text style={styles.buttonText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleStatusChange} style={styles.updateButton}>
                  <Text style={styles.buttonText}>Update Status</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  orderCard: {
    marginBottom: 15,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  orderRow: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'center',
  },
  text: {
    flex: 1,
    fontSize: 14,
    color: '#555',
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 5,
    marginRight: 10,
  },
  status: {
    padding: 5,
    borderRadius: 5,
    textAlign: 'center',
    color: '#fff',
  },
  viewDetailsButton: {
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: width * 0.8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  modalSubTitle: {
    fontSize: 16,
    color: '#333',
    marginTop: 10,
  },
  statusInput: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  closeButton: {
    backgroundColor: '#f44336',
    padding: 10,
    borderRadius: 5,
    width: '45%',
  },
  updateButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
    width: '45%',
  },
});

export default Orders;

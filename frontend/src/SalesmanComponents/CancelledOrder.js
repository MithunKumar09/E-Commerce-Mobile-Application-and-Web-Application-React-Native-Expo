//CancelledOrder.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
} from 'react-native';

const CancelledOrder = () => {
  const [cancelledOrders, setCancelledOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmations, setConfirmations] = useState({});

  const fetchCancelledOrders = async () => {
    try {
      // Dummy order list with product image and orderId
      const dummyOrders = [
        {
          id: '1',
          orderId: 'ORD12345',
          customerName: 'John Doe',
          item: 'Laptop',
          amount: '$1200',
          status: 'Cancelled',
          productImage: 'https://via.placeholder.com/100',
        },
        {
          id: '2',
          orderId: 'ORD12346',
          customerName: 'Jane Smith',
          item: 'Smartphone',
          amount: '$800',
          status: 'Cancelled',
          productImage: 'https://via.placeholder.com/100',
        },
        {
          id: '3',
          orderId: 'ORD12347',
          customerName: 'Sam Wilson',
          item: 'Headphones',
          amount: '$150',
          status: 'Cancelled',
          productImage: 'https://via.placeholder.com/100',
        },
      ];
      setCancelledOrders(dummyOrders);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch cancelled orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = (orderId) => {
    setConfirmations((prev) => ({ ...prev, [orderId]: true }));
    Alert.alert('Confirmation', 'You have confirmed viewing this cancelled order.');
  };

  useEffect(() => {
    fetchCancelledOrders();
  }, []);

  const renderOrder = ({ item }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.productImage }} style={styles.productImage} />
      <Text style={styles.text}>Order ID: {item.orderId}</Text>
      <Text style={styles.text}>Customer: {item.customerName}</Text>
      <Text style={styles.text}>Item: {item.item}</Text>
      <Text style={styles.text}>Amount: {item.amount}</Text>
      <Text style={[styles.text, styles.cancelled]}>Status: {item.status}</Text>
      <TouchableOpacity
        style={[styles.button, confirmations[item.id] && styles.disabledButton]}
        onPress={() => handleConfirm(item.id)}
        disabled={confirmations[item.id]}
      >
        <Text style={styles.buttonText}>
          {confirmations[item.id] ? 'Confirmed' : 'Confirm Viewing'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Cancelled Orders</Text>
      <FlatList
        data={cancelledOrders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrder}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
    backgroundColor: '#f8f8f8',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  listContainer: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    marginVertical: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginBottom: 10,
  },
  text: {
    fontSize: 16,
    marginBottom: 5,
  },
  cancelled: {
    color: 'red',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CancelledOrder;

//frontend/ConfirmOrder.js  //new
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

const ConfirmOrder = () => {
  const orderDetails = {
    itemName: 'Sounce Earphone Case Cover',
    itemDescription: 'Soft Silicone Skin Case Cover Shock-Absorbing Protective Case with Keychain',
    itemPrice: 209.0,
    deliveryFee: 40.0,
    cashOnDeliveryFee: 7.0,
    totalPrice: 256.0,
    deliveryAddress: 'Krupa bekari, alankar, Alankar, PUTTUR, KARNATAKA, 574285, India',
    deliveryDate: 'Monday 16 Dec 2024',
    deliveryTime: 'Arriving in the next 19 hours and 23 minutes',
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Place your order</Text>
      <View style={styles.sectionContainer}>
        <Text style={styles.label}>Items:</Text>
        <Text style={styles.value}>₹{orderDetails.itemPrice.toFixed(2)}</Text>
      </View>
      <View style={styles.sectionContainer}>
        <Text style={styles.label}>Delivery:</Text>
        <Text style={styles.value}>₹{orderDetails.deliveryFee.toFixed(2)}</Text>
      </View>
      <View style={styles.sectionContainer}>
        <Text style={styles.label}>Cash/Pay on Delivery fee:</Text>
        <Text style={styles.value}>₹{orderDetails.cashOnDeliveryFee.toFixed(2)}</Text>
      </View>
      <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>Order Total:</Text>
        <Text style={styles.totalValue}>₹{orderDetails.totalPrice.toFixed(2)}</Text>
      </View>

      <Text style={styles.sectionHeader}>Paying with Pay on Delivery/Cash on Delivery</Text>
      <Text style={styles.infoText}>Scan and Pay at delivery with Amazon Pay UPI and win rewards up to ₹500</Text>
      <TouchableOpacity>
        <Text style={styles.link}>Change payment method</Text>
      </TouchableOpacity>
      <TouchableOpacity>
        <Text style={styles.link}>Use a gift card, voucher or promo code</Text>
      </TouchableOpacity>

      <View style={styles.sectionDivider} />

      <Text style={styles.sectionHeader}>Delivering to</Text>
      <Text style={styles.infoText}>{orderDetails.deliveryAddress}</Text>
      <TouchableOpacity>
        <Text style={styles.link}>Change delivery address</Text>
      </TouchableOpacity>
      <TouchableOpacity>
        <Text style={styles.link}>Add delivery instructions</Text>
      </TouchableOpacity>

      <View style={styles.sectionDivider} />

      <Text style={styles.sectionHeader}>Arriving</Text>
      <Text style={styles.infoText}>{orderDetails.deliveryDate}</Text>
      <Text style={styles.infoText}>{orderDetails.deliveryTime}</Text>

      <View style={styles.productContainer}>
        <Image
          style={styles.productImage}
          source={{ uri: 'https://via.placeholder.com/150' }} // Placeholder image URL
        />
        <View style={styles.productDetails}>
          <Text style={styles.productName}>{orderDetails.itemName}</Text>
          <Text style={styles.productDescription}>{orderDetails.itemDescription}</Text>
          <Text style={styles.productPrice}>₹{orderDetails.itemPrice.toFixed(2)}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.placeOrderButton}>
        <Text style={styles.placeOrderText}>Place your order</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: width > 768 ? 40 : 15,
    paddingVertical: 10,
  },
  header: {
    fontSize: width > 768 ? 28 : 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  sectionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
    borderTopWidth: 1,
    borderColor: '#ddd',
    paddingTop: 12,
  },
  label: {
    fontSize: width > 768 ? 18 : 16,
  },
  value: {
    fontSize: width > 768 ? 18 : 16,
    fontWeight: 'bold',
  },
  totalLabel: {
    fontSize: width > 768 ? 20 : 18,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: width > 768 ? 20 : 18,
    fontWeight: 'bold',
    color: '#ff8c00',
  },
  sectionHeader: {
    fontSize: width > 768 ? 20 : 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  infoText: {
    fontSize: width > 768 ? 18 : 16,
    marginTop: 8,
  },
  link: {
    fontSize: width > 768 ? 18 : 16,
    color: '#007bff',
    marginTop: 8,
  },
  sectionDivider: {
    borderTopWidth: 1,
    borderColor: '#ddd',
    marginVertical: 16,
  },
  productContainer: {
    flexDirection: width > 768 ? 'row' : 'column',
    alignItems: width > 768 ? 'flex-start' : 'center',
    marginVertical: 16,
    padding: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  productImage: {
    width: width > 768 ? 120 : 100,
    height: width > 768 ? 120 : 100,
    borderRadius: 8,
  },
  productDetails: {
    flex: 1,
    marginLeft: width > 768 ? 20 : 16,
    marginTop: width > 768 ? 0 : 16,
  },
  productName: {
    fontSize: width > 768 ? 18 : 16,
    fontWeight: 'bold',
  },
  productDescription: {
    fontSize: width > 768 ? 16 : 14,
    color: '#555',
    marginVertical: 4,
  },
  productPrice: {
    fontSize: width > 768 ? 18 : 16,
    fontWeight: 'bold',
    color: '#000',
  },
  placeOrderButton: {
    backgroundColor: '#ff8c00',
    padding: width > 768 ? 20 : 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 30,
  },
  placeOrderText: {
    color: '#fff',
    fontSize: width > 768 ? 20 : 18,
    fontWeight: 'bold',
  },
});

export default ConfirmOrder;

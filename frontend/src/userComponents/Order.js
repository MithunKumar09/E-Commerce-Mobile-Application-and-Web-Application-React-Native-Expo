//frontend/Order.js   //new
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet, Button,
  Dimensions,
  Alert, Modal
} from 'react-native';
import { RadioButton } from 'react-native-paper';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { StripeProvider, useStripe } from '@stripe/stripe-react-native';
import axios from "axios";
import { SERVER_URL } from '../../Constants/index';
import { useUserStore } from "../../src/store/userStore";
import { getData, storeData } from "../../utils/storage";
import * as SecureStore from "expo-secure-store";
import SkeletonComponent from "../../components/Loading/SkeletonComponent";
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const Order = ({ route, navigation }) => {
  // Fetch selectedItems and subTotalAmount from navigation parameters
  const { selectedItems, subTotalAmount } = route.params;
  const [isloading, setIsLoading] = useState(true);
  const [deliveryAddress, setDeliveryAddress] = useState({});
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [showNewCardInput, setShowNewCardInput] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');
  const [receiptDetails, setReceiptDetails] = useState(null);
  const [showReceiptCard, setShowReceiptCard] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [codDetails, setCodDetails] = useState([]);
  const stripe = useStripe();
  const { user, isAuthenticated, checkAuthentication } = useUserStore();
  const userId = user?.id;
  const [noteText, setNoteText] = useState('');
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletTransactions, setWalletTransactions] = useState([]);

  // Ensure `user` is valid before using it
  useEffect(() => {
    if (!user) {
      Alert.alert('Error', 'User data is missing. Please log in again.');
      navigation.navigate('Login');
    } else {
      setIsLoading(false);
    }
  }, [user]);

  // Update noteText when COD details are fetched
  useEffect(() => {
    if (codStatus) {
      setNoteText("Cash on delivery is available for these products, but get a 5% discount for pre-paid delivery, don't miss it!");
    } else {
      setNoteText("Your last used payment instrument - Cash on Delivery/Pay on Delivery is not available for this order. Please use another payment method.");
    }
  }, [codDetails, codStatus]);

  // Calculate COD-related values
  const codStatus = codDetails.every(product => product.cashOnDelivery === "Available");
  const codTotalAmount = codDetails.reduce((sum, product) => sum + product.codAmount, 0);


  // Order summary values (These can be dynamic based on your data)
  const postagePackingPrice = 10.00;
  const cashOnDeliveryPrice = codTotalAmount;
  const totalBeforeTax = subTotalAmount + postagePackingPrice + cashOnDeliveryPrice;
  const taxPrice = totalBeforeTax * 0.10;
  const totalPrice = totalBeforeTax + taxPrice;

  useEffect(() => {
    checkAuthentication();
  }, []);

  // Check if selectedItems is being received correctly
  useEffect(() => {
    if (selectedItems) {
      console.log("Selected items received:", selectedItems); // Log selected items to ensure they are passed correctly
    } else {
      console.log("No selected items found.");
    }

    // Log subTotalAmount for debugging
    console.log("SubTotal Amount:", subTotalAmount);
  }, [selectedItems, subTotalAmount]);

  const fetchAddresses = async () => {
    try {
      const response = await axios.get(`${SERVER_URL}/user/addresses/${user.id}`);

      if (response.status === 200) {
        console.log('Retrieved delivery addresses:', response.data);

        // Find the default address or set a default if none exists
        const defaultAddress = response.data.find(address => address.default);

        if (defaultAddress) {
          console.log('Default address found:', defaultAddress);
          setDeliveryAddress(defaultAddress); // Set the default address directly
          setSelectedAddress(defaultAddress); // Set selectedAddress as default address
        } else {
          console.log('No default address found.');
        }
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
      Alert.alert('Error', 'Failed to load addresses.');
    }
  };

  const fetchWalletBalance = async () => {
    try {
      // Send GET request with email and userId
      const response = await axios.get(
        `${SERVER_URL}/wallet-balance/${user.email}/${user.id}`
      );

      console.log("Complete Wallet Data:", response.data);
      setWalletBalance(response.data.balance);
      setWalletTransactions(response.data.transactions);
      console.log("Wallet Balance Retrieved:", response.data.balance);
      console.log("Wallet Transactions Retrieved:", response.data.transactions);
    } catch (error) {
      console.error("Error fetching wallet balance:", error.message);
      Alert.alert("Error", "Failed to fetch wallet balance.");
    }
  };


  useEffect(() => {
    fetchAddresses();
    fetchWalletBalance();
  }, []);

  // Fetch COD details for selected products
  const fetchCODDetails = async () => {
    try {
      const productIds = selectedItems.map(item => item.productId); // Assuming productId is part of selectedItems
      const response = await axios.post(`${SERVER_URL}/user/fetch-cod-details`, { productIds });

      if (response.data.success) {
        console.log('COD Details:', response.data.data);
        setCodDetails(response.data.data);
      } else {
        console.error('Failed to fetch COD details:', response.data.message);
      }
    } catch (error) {
      console.error('Error fetching COD details:', error);
      Alert.alert('Error', 'Failed to load COD details.');
    }
  };

  // Fetch COD details when selectedItems change
  useEffect(() => {
    if (selectedItems && selectedItems.length > 0) {
      fetchCODDetails();
    }
  }, [selectedItems]);

  const handleChangeAddress = () => {
    navigation.navigate('Profile', { screen: 'address' }); // Navigating to the "Manage Address" tab
  };

  const handleContinue = async () => {
    if (!deliveryAddress.addressLine || !deliveryAddress.street || !deliveryAddress.state) {
        Alert.alert('Error', 'Delivery address is required.');
        return;
    }
    if (!paymentMethod) {
        Alert.alert('Error', 'Please select a payment method.');
        return;
    }

    const orderSummary = [
        { name: 'Subtotal Amount', value: subTotalAmount },
        { name: 'Packing Price', value: postagePackingPrice },
        { name: 'Cash on Delivery Price', value: cashOnDeliveryPrice },
        { name: 'Total Before Tax', value: totalBeforeTax },
        { name: 'Tax Price', value: taxPrice },
        { name: 'Total Price', value: totalPrice },
    ];

    console.log('Order Summary:', orderSummary);

    const orderId = generateOrderId();

    try {
        const orderData = {
            total: Math.round(parseFloat(totalPrice) * 100),
            userEmail: user.email,
            userId: user.id,
            orderId: orderId,
            selectedAddressId: selectedAddress._id,
            paymentMethod: paymentMethod,
            cartItems: selectedItems,
            paymentDetails: paymentMethod === 'COD' ? null : {},
            paid: paymentMethod !== 'COD',
            orderSummary: orderSummary,
        };

        console.log('Order Data for COD:', orderData);

        const response = await axios.post(`${SERVER_URL}/user/place-order`, orderData);

        console.log('Order placed successfully:', response.data);

        // Remove selected items from cart after successful order placement
        const cartUpdateResponse = await axios.post(`${SERVER_URL}/user/cart/remove-items`, {
            userId: user.id,
            productIds: selectedItems.map(item => item.productId),
        });

        if (cartUpdateResponse.data.success) {
            console.log('Cart updated successfully:', cartUpdateResponse.data.message);
        } else {
            console.error('Failed to update cart:', cartUpdateResponse.data.message);
        }

        Alert.alert('Success', 'Order placed successfully!', [
            { text: 'OK', onPress: () => navigation.navigate('OrdersList') }
        ]);
    } catch (error) {
        console.error('Error placing order:', error);
        Alert.alert('Error', 'Failed to place order.');
    }
};



  // Frontend
  const handleRedeemFromWallet = async () => {
    try {
      if (!deliveryAddress.addressLine || !deliveryAddress.street || !deliveryAddress.state) {
        Alert.alert('Error', 'Delivery address is required.');
        return;
      }
  
      if (!paymentMethod) {
        Alert.alert('Error', 'Please select a payment method.');
        return;
      }
  
      const orderSummary = [
        { name: 'Subtotal Amount', value: subTotalAmount },
        { name: 'Packing Price', value: postagePackingPrice },
        { name: 'Cash on Delivery Price', value: cashOnDeliveryPrice },
        { name: 'Total Before Tax', value: totalBeforeTax },
        { name: 'Tax Price', value: taxPrice },
        { name: 'Total Price', value: totalPrice },
      ];
  
      console.log('Order Summary:', orderSummary);
  
      if (paymentMethod === "wallet") {
        if (walletBalance < totalPrice) {
          Alert.alert('Insufficient Balance', 'Your wallet balance is insufficient to complete the purchase.');
          return;
        }
  
        const discountedPrice = parseFloat((totalPrice * 0.95).toFixed(2)); // Apply 5% discount
        Alert.alert(
          "Redeem Funds",
          `Do you want to redeem ₹${discountedPrice} (including 5% wallet discount) from your wallet for this purchase?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Redeem",
              onPress: async () => {
                try {
                  const intentIds = [];
                  let remainingAmount = discountedPrice;
  
                  for (const transaction of walletTransactions) {
                    if (remainingAmount <= 0) break;
  
                    const deductionAmount = Math.min(transaction.amount, remainingAmount);
                    remainingAmount -= deductionAmount;
                    intentIds.push({ stripePaymentIntentId: transaction.stripePaymentIntentId, amount: deductionAmount });
                  }
  
                  if (remainingAmount > 0) {
                    Alert.alert('Error', 'Insufficient wallet funds to complete the purchase.');
                    return;
                  }
  
                  const response = await axios.post(`${SERVER_URL}/redeem-funds`, {
                    amount: discountedPrice,
                    userEmail: user.email,
                    userId: user.id,
                    intentIds,
                  });
  
                  if (response.data.success) {
                    const orderId = generateOrderId();
                    const orderData = {
                      total: discountedPrice,
                      userEmail: user.email,
                      userId: user.id,
                      orderId: orderId,
                      selectedAddressId: selectedAddress._id,
                      paymentMethod: 'wallet',
                      cartItems: selectedItems,
                      paymentDetails: { method: 'wallet', amount: discountedPrice, stripePaymentIntentIds: intentIds },
                      paid: true,
                      orderSummary,
                    };
  
                    const orderResponse = await axios.post(`${SERVER_URL}/confirm-order`, orderData);
  
                    const cartUpdateResponse = await axios.post(`${SERVER_URL}/user/cart/remove-items`, {
                      userId: user.id,
                      productIds: selectedItems.map(item => item.productId),
                    });
  
                    if (cartUpdateResponse.data.success) {
                      console.log('Cart updated successfully:', cartUpdateResponse.data.message);
                    } else {
                      console.error('Failed to update cart:', cartUpdateResponse.data.message);
                    }
  
                    setWalletBalance(walletBalance - discountedPrice);
                    Alert.alert('Success', 'Payment successful! Order placed.', [
                      { text: 'OK', onPress: () => navigation.navigate('OrdersList') }
                    ]);
                    setShowWalletModal(false);
                  } else {
                    Alert.alert('Error', response.data.message || 'Failed to redeem wallet funds.');
                  }
                } catch (error) {
                  console.error('Error with wallet payment:', error);
                  Alert.alert('Error', error.response?.data?.error || 'An error occurred while processing your wallet payment.');
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error in handleRedeemFromWallet:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };
  

  // Function to generate a unique order ID
  const generateOrderId = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let orderId = 'ORD';

    for (let i = 0; i < 6; i++) {
      orderId += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return orderId;
  };


//frontend
const handlePayment = async () => {
  try {
    // Log user data to verify if the email and ID are present
    console.log('User Data:', { userEmail: user?.email, userId: user?.id });

    if (!user?.email || !user?.id) {
      Alert.alert("User Information Missing", "Email or UserID is not defined.");
      return;
    }

    // Ensure an address is selected
    if (!selectedAddress) {
      Alert.alert("Address Missing", "Please select a delivery address.");
      return;
    }

    // Log selected address to ensure it's correctly being passed
    console.log('Selected Address:', selectedAddress);

    let discountedTotalPrice = totalPrice;

    // Apply 5% discount for wallet payment method
    if (paymentMethod === "wallet") {
      discountedTotalPrice = (totalPrice * 0.95).toFixed(2);
    }

    // Create order summary array
    const orderSummary = [
      { name: 'Subtotal Amount', value: subTotalAmount },
      { name: 'Packing Price', value: postagePackingPrice },
      { name: 'Cash on Delivery Price', value: cashOnDeliveryPrice },
      { name: 'Total Before Tax', value: totalBeforeTax },
      { name: 'Tax Price', value: taxPrice },
      { name: 'Total Price', value: discountedTotalPrice },
    ];

    // Log the order summary for debugging
    console.log('Order Summary:', orderSummary);

    const orderId = generateOrderId();

    // Log the data being sent to the backend for payment intent creation
    console.log('Payment Request Data:', {
      total: Math.round(parseFloat(discountedTotalPrice) * 100),
      userEmail: user.email,
      userId: user.id,
      orderId: orderId,
      selectedAddressId: selectedAddress._id,
      paymentMethod: paymentMethod,
      selectedItems: selectedItems,
      orderSummary: orderSummary,
    });

    const response = await axios.post(`${SERVER_URL}/prepaid`, {
      total: Math.round(parseFloat(discountedTotalPrice) * 100),
      userEmail: user.email,
      userId: user.id,
      orderId: orderId,
      selectedAddressId: selectedAddress._id,
      paymentMethod: paymentMethod,
      selectedItems: selectedItems,
      orderSummary: orderSummary,
    });

    // Log the response from the backend
    console.log('Payment Intent Response:', response.data);

    const { clientSecret, paymentIntentId } = response.data;

    // Log Stripe initialization details
    const { error } = await stripe.initPaymentSheet({
      paymentIntentClientSecret: clientSecret,
      merchantDisplayName: 'Test Merchant',
      googlePay: true,
      style: 'automatic',
    });

    if (!error) {
      const presentError = await stripe.presentPaymentSheet();

      if (!presentError.error) {
        const cartUpdateResponse = await axios.post(`${SERVER_URL}/user/cart/remove-items`, {
          userId: user.id,
          productIds: selectedItems.map(item => item.productId),
        });

        if (cartUpdateResponse.data.success) {
          console.log('Cart updated successfully:', cartUpdateResponse.data.message);
        } else {
          console.error('Failed to update cart:', cartUpdateResponse.data.message);
        }

        setPaymentStatus('paid');
        Alert.alert('Success', 'Payment completed successfully!', [
          { text: 'OK', onPress: () => navigation.navigate('OrdersList') },
        ]);
      } else {
        console.error('Stripe Payment Error:', presentError.error.message);
        Alert.alert('Error', presentError.error.message);
      }
    } else {
      console.error('Stripe Init Error:', error.message);
      Alert.alert('Error', error.message);
    }
  } catch (error) {
    console.error('Payment Error:', error);
    Alert.alert('Payment Error', error.message);
  }
};

  


  // Render the button dynamically based on the payment method
  const renderButton = () => {
    if (paymentMethod === 'COD') {
      return (
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueButtonText}>Place Order</Text>
        </TouchableOpacity>
      );
    } else if (paymentMethod === 'wallet') {
      return null;
    } else {
      return (
        <TouchableOpacity style={styles.continueButton} onPress={handlePayment}>
          <Text style={styles.continueButtonText}>Proceed to Payment</Text>
        </TouchableOpacity>
      );
    }
  };

  return (
    <StripeProvider publishableKey="pk_test_51QTdT6FhJaBxhyXRlua1KHhtsSqVAhKqKK1WO4KPXd3xd9fnwg8zlvT3mTTDgHyVenpeuFEjIi9gUhhcWcaQ35wG008awv9Ogm">
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery to {user.username}</Text>
          {/* Displaying address details as separate text */}
          {deliveryAddress && deliveryAddress.addressLine && (
            <Text style={styles.addressText}>
              {deliveryAddress.addressLine}, {deliveryAddress.street}, {deliveryAddress.state}, {deliveryAddress.pincode}, {deliveryAddress.flatNumber}, {deliveryAddress.addressType}, {deliveryAddress.phoneNumber}
            </Text>
          )}
          <TouchableOpacity style={styles.changeAddressButton} onPress={handleChangeAddress}>
            <Text style={styles.changeAddressText}>Change Delivery Address</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Payment Method</Text>
          <View style={[styles.noteContainer, { backgroundColor: codStatus ? '#9fd09f' : '#FFF4E3' }]}>
            <Text style={[styles.noteText, { color: codStatus ? '#fff' : '#000' }]}>
              {noteText}
            </Text>
          </View>

          <RadioButton.Group onValueChange={(value) => setPaymentMethod(value)} value={paymentMethod}>
            <View style={styles.radioContainerWrapper}>
              <View style={styles.radioContainer}>
                <RadioButton value="Card" color="#007BFF" />
                <FontAwesome name="credit-card" size={20} color="orange" style={styles.icon} />
                <Text style={styles.radioText}>Credit & Debit Card</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.additionalInfo,
                  { opacity: paymentMethod === 'card' ? 1 : 0.5 },
                ]}
                onPress={() => setShowNewCardInput(!showNewCardInput)}>
                <Text style={styles.additionalInfoText}>Add New Card</Text>
              </TouchableOpacity>
            </View>

            {/* Wallet Section */}
            <View style={styles.radioContainerWrapper}>
              <View style={styles.radioContainer}>
                <RadioButton value="wallet" color="#007BFF" />
                <Ionicons name="wallet" size={20} color="black" style={styles.icon} />
                <Text style={styles.radioText}>Wallet</Text>
              </View>
              <Text style={styles.walletInfoText}>Available Balance: ₹{walletBalance.toFixed(2)}</Text>
              {/* Trigger Wallet Modal */}
              <TouchableOpacity
                style={[styles.redeemButton, { backgroundColor: paymentMethod === 'wallet' ? '#4CAF50' : '#d3d3d3' }]}
                onPress={() => {
                  if (paymentMethod === 'wallet') {
                    setShowWalletModal(true);
                  }
                }}
                disabled={paymentMethod !== 'wallet'} // Disable button if wallet is not selected
              >
                <Text style={styles.redeemButtonText}>Redeem from Wallet</Text>
              </TouchableOpacity>
            </View>

            {/* Wallet Modal */}
            <Modal
              visible={showWalletModal}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowWalletModal(false)}
            >
              <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Pay from Wallet Save 5%</Text>
                  <Text style={styles.modalText}>Total Price: ₹{totalPrice.toFixed(2)}</Text>
                  <Text style={styles.modalText}>Available Balance: ₹{walletBalance.toFixed(2)}</Text>
                  <TouchableOpacity style={styles.redeemButton} onPress={handleRedeemFromWallet}>
                    <Text style={styles.redeemButtonText}>Redeem</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => setShowWalletModal(false)}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>


            <View style={styles.radioContainerWrapper}>
              <View style={[styles.radioContainer, !codStatus && styles.disabledContainer]}>
                <RadioButton
                  value="COD"
                  color="#007BFF"
                  disabled={!codStatus}
                  uncheckedColor={!codStatus ? '#A9A9A9' : '#007BFF'}
                />
                <Ionicons
                  name="cash-outline"
                  size={20}
                  color={codStatus ? "#FF6347" : "#A9A9A9"}
                  style={styles.icon}
                />
                <Text style={[styles.radioText, !codStatus && { color: '#A9A9A9' }]}>
                  Cash on Delivery / Pay on Delivery
                </Text>
              </View>
              <Text
                style={[
                  styles.availabilityText,
                  { color: codStatus ? 'green' : 'grey' },
                ]}
              >
                {codStatus ? 'Available' : 'Not Available'}
              </Text>
            </View>

          </RadioButton.Group>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gift Card / Voucher / Wallet Discount</Text>
          <TextInput
            placeholder="Enter code or discount"
            value={voucherCode}
            onChangeText={setVoucherCode}
            style={styles.input}
          />
        </View>

        {/* Order Summary Section */}
        <View style={styles.orderSummaryContainer}>
          <Text style={styles.orderSummaryTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>Items :</Text>
            <Text style={styles.summaryPrice}>${subTotalAmount.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>Postage & Packing:</Text>
            <Text style={styles.summaryPrice}>${postagePackingPrice.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>Cash/Pay on Delivery:</Text>
            <Text style={styles.summaryPrice}>${cashOnDeliveryPrice.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>Total Before Tax:</Text>
            <Text style={styles.summaryPrice}>${totalBeforeTax.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>Tax :</Text>
            <Text style={styles.summaryPrice}>${taxPrice.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>Total Price:</Text>
            <Text style={styles.summaryPrice}>${totalPrice.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.orderTotalText}>Order Total:</Text>
            <Text style={styles.orderTotalPrice}>${totalPrice.toFixed(2)}</Text>
          </View>
        </View>

        {/* Confirm Button */}
        <View>{renderButton()}</View>
        {receiptDetails && showReceiptCard && (
          <Modal
            transparent={true}
            visible={showReceiptCard}
            animationType="fade"
            onRequestClose={() => setShowReceiptCard(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.receiptCard}>
                <Text style={styles.receiptHeader}>Receipt from Mithun</Text>
                <Text>Paid Amount: ${receiptDetails.amount / 100}</Text>
                <Text>Payment Date: {new Date(receiptDetails.created * 1000).toLocaleString()}</Text>
                <Text>Receipt Number: {receiptDetails.receiptNumber}</Text>
                <Text>Invoice Number: {receiptDetails.invoiceNumber}</Text>
                <Text>Payment Method: {receiptDetails.paymentMethod}</Text>
                <View style={styles.buttonGroup}>
                  <Button title="Download Invoice" onPress={() => console.log('Download Invoice')} />
                  <Button title="Close" onPress={() => setShowReceiptCard(false)} />
                </View>
              </View>
            </View>
          </Modal>
        )}
      </ScrollView>
    </StripeProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  addressText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 12,
    lineHeight: 22,
  },
  changeAddressButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  changeAddressText: {
    color: '#007BFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginTop: 8,
    backgroundColor: '#f8f8f8',
  },
  noteContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFC107',
  },

  noteText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  radioContainerWrapper: {
    marginVertical: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  radioContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  radioText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    fontWeight: "500",
  },
  additionalInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    backgroundColor: "#e6f7ff",
    padding: 10,
    borderRadius: 8,
    shadowColor: "#007BFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addIcon: {
    marginRight: 8,
  },
  additionalInfoText: {
    fontSize: 14,
    color: "#007BFF",
  },
  input: {
    marginTop: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#fff",
    fontSize: 14,
    color: "#333",
  },
  walletInfoText: {
    fontSize: 14,
    color: '#007BFF',
    marginTop: 2,
    marginLeft: 32,
  },
  availabilityText: {
    fontSize: 14,
    color: '#FF6347',
    marginTop: 2,
    marginLeft: 32,
  },
  divider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 16,
  },
  continueButton: {
    backgroundColor: 'orange',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 20,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  icon: {
    marginLeft: 10,
  },
  orderSummaryContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  orderSummaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 16,
    color: '#333',
  },
  summaryPrice: {
    fontSize: 16,
    color: '#555',
  },
  orderTotalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  orderTotalPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'red',
  },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  receiptCard: { backgroundColor: 'white', padding: 20, borderRadius: 10, width: width - 40 },
  receiptHeader: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  buttonGroup: { marginTop: 20, flexDirection: 'row', justifyContent: 'space-between' },
  paidTagContainer: { backgroundColor: 'green', padding: 5, borderRadius: 5, marginTop: 10 },
  paidTag: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  paidButton: { backgroundColor: 'green', padding: 10, marginTop: 15, borderRadius: 5 },
  paidButtonText: { color: 'white', fontSize: 16, textAlign: 'center' },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
  },
  modalContent: {
    width: '80%',
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5, // Shadow for Android
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  modalText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 10,
  },
  redeemButton: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#4CAF50',
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
  },
  redeemButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f44336',
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default Order;
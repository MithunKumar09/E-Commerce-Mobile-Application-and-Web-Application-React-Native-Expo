//frontend/Wallet.js    //new
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
  Dimensions,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useUserStore } from "../../src/store/userStore";
import * as SecureStore from "expo-secure-store";
import { StripeProvider, useStripe } from '@stripe/stripe-react-native';
import axios from 'axios';
import { SERVER_URL } from '../../Constants/index';

const { width } = Dimensions.get("window");

const Wallet = () => {
  const [walletBalance, setWalletBalance] = useState(0);
  const [amountToAdd, setAmountToAdd] = useState("");
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [page, setPage] = useState(1);
  const [paginatedData, setPaginatedData] = useState(transactionHistory.slice(0, 10));
  const [loading, setLoading] = useState(false);
  const { user, isAuthenticated, checkAuthentication } = useUserStore();
  const navigation = useNavigation();
  const [receiptDetails, setReceiptDetails] = useState(null);
  const stripe = useStripe();

  useEffect(() => {
    checkAuthentication();
  }, []);

  const fetchWalletBalance = async () => {
    try {
      // Send GET request with email and userId
      const response = await axios.get(
        `${SERVER_URL}/wallet-balance/${user.email}/${user.id}`
      );

      // console.log("Wallet Balance Response:", response.data);
      setWalletBalance(response.data.balance);
      // console.log("Wallet Balance Retrieved:", response.data.balance);
    } catch (error) {
      console.error("Error fetching wallet balance:", error.message);
      Alert.alert("Error", "Failed to fetch wallet balance.");
    }
  };

  const fetchTransactionHistory = async () => {
    try {
      const response = await axios.get(
        `${SERVER_URL}/transaction-history/${user.email}`
      );
      const transactions = response.data.transactions;

      // Sort transactions by timestamp (newest first)
      const sortedTransactions = transactions.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );

      setTransactionHistory(sortedTransactions);
      setPage(1); // Reset pagination
      setPaginatedData(sortedTransactions.slice(0, 10)); // Initialize paginated data
    } catch (error) {
      console.error("Error fetching transaction history:", error.message);
      Alert.alert("Error", "Failed to fetch transaction history.");
    }
  };

    // New validation function
    const validateAmount = (amount) => {
      const numAmount = Number(amount);
      if (numAmount < 100) {
        return "Minimum amount is ₹100.";
      }
      if (numAmount % 100 !== 0) {
        return "Amount must be in multiples of 100.";
      }
      return null;
    };

  const handleAddFundsViaStripe = async () => {
    const validationError = validateAmount(amountToAdd);
    if (validationError) {
      Alert.alert("Invalid Amount", validationError);
      return;
    }

    if (!amountToAdd || isNaN(amountToAdd) || Number(amountToAdd) <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount to add.");
      return;
    }

    try {
      if (!user?.email || !user?.id) {
        Alert.alert("User Information Missing", "Email or UserID is not defined.");
        return;
      }

      const response = await axios.post(`${SERVER_URL}/create-walletpayment-intent`, {
        amount: Math.round(parseFloat(amountToAdd) * 100),
        userEmail: user.email,
        userId: user.id,
      });

      const { clientSecret, paymentIntentId } = response.data;

      const { error } = await stripe.initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: "Test Merchant",
        googlePay: true,
        style: "automatic",
      });

      if (error) {
        Alert.alert("Error", error.message);
        return;
      }

      const presentError = await stripe.presentPaymentSheet();

      if (!presentError.error) {
        const receiptResponse = await axios.get(`${SERVER_URL}/receipt?paymentIntentId=${paymentIntentId}`);
        const receipt = receiptResponse.data;

        const amount = Number(amountToAdd);
        setWalletBalance(prevBalance => prevBalance + amount);

        const newTransaction = {
          id: Date.now().toString(),
          type: "credit",
          amount,
          date: new Date().toISOString().split("T")[0],
        };

        setTransactionHistory([newTransaction, ...transactionHistory]);
        setPaginatedData([newTransaction, ...transactionHistory].slice(0, page * 10));
        fetchWalletBalance();
        fetchTransactionHistory();

        Alert.alert("Success", "Payment completed successfully!");
      } else {
        Alert.alert("Error", presentError.error.message);
      }
    } catch (error) {
      Alert.alert("Payment Error", error.message);
    }
  };

  useEffect(() => {
    if (user?.email) {
      fetchWalletBalance();
      fetchTransactionHistory();
    }
  }, [user]);


  useEffect(() => {
    // Update paginated data when transaction history changes
    setPaginatedData(transactionHistory.slice(0, page * 10));
  }, [transactionHistory, page]);

  const loadMoreTransactions = async () => {
    setLoading(true); // Show loading indicator

    // Simulate a delay (3 seconds)
    setTimeout(() => {
      const nextPage = page + 1;
      const nextData = transactionHistory.slice(0, nextPage * 10);
      setPaginatedData(nextData);
      setPage(nextPage);
      setLoading(false); // Hide loading indicator
    }, 3000);
  };

  return (
    <StripeProvider publishableKey="pk_test_51QTdT6FhJaBxhyXRlua1KHhtsSqVAhKqKK1WO4KPXd3xd9fnwg8zlvT3mTTDgHyVenpeuFEjIi9gUhhcWcaQ35wG008awv9Ogm">
      <FlatList
        ListHeaderComponent={
          <>
            {/* Wallet Header */}
            <View style={styles.header}>
              <Text style={styles.headerText}>My Wallet</Text>
              <Feather name="credit-card" size={28} color="#fff" />
            </View>

            {/* Wallet Balance */}
            <View style={styles.balanceContainer}>
              <Text style={styles.balanceLabel}>Wallet Balance</Text>
              <Text style={styles.balanceValue}>₹{walletBalance.toFixed(2)}</Text>
            </View>

            {/* Add Funds Section */}
            <View style={styles.addFundsContainer}>
              <Text style={styles.addFundsLabel}>Add Funds</Text>
              <View style={styles.addFundsInputContainer}>
                <TextInput
                  style={styles.addFundsInput}
                  placeholder="Enter amount to add"
                  keyboardType="numeric"
                  value={amountToAdd}
                  onChangeText={setAmountToAdd}
                />
                <TouchableOpacity style={styles.addButton} onPress={handleAddFundsViaStripe}>
                  <Text style={styles.addButtonText}>Add Now</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Transaction History Header */}
            <View style={styles.transactionHistoryContainer}>
              <Text style={styles.transactionHistoryLabel}>Transaction History</Text>
            </View>
          </>
        }
        data={paginatedData}
        keyExtractor={(item, index) => item._id || item.id || index.toString()}
        renderItem={({ item }) => {
          // Set background color based on status
          const getStatusColor = (status) => {
            switch (status) {
              case "succeeded":
                return "#d4edda"; // Light green
              case "pending":
                return "#f8f7ef"; // Light yellow
              case "failed":
                return "#f8d7da"; // Light red
              default:
                return "#f0f0f0"; // Default gray
            }
          };

          // Set text color based on status
          const getTextColor = (status) => {
            switch (status) {
              case "succeeded":
                return "#155724"; // Dark green
              case "pending":
                return "#856404"; // Dark yellow (brownish)
              case "failed":
                return "#721c24"; // Dark red
              default:
                return "#000000"; // Default black
            }
          };

          return (
            <View style={[styles.transactionItem, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={[styles.transactionType, { color: getTextColor(item.status) }]}>
                {item.transactionType}
              </Text>
              <Text style={{ color: getTextColor(item.status) }}>
                {item.transactionType === "credit" ? "+" : "-"}₹{item.amount}
              </Text>
              <Text style={[styles.transactionDate, { color: getTextColor(item.status) }]}>
                {new Date(item.timestamp).toLocaleDateString()}
              </Text>
              <Text style={[styles.transactionStatus, { color: getTextColor(item.status) }]}>
                {item.status}
              </Text>
            </View>
          );
        }}


        onEndReached={loadMoreTransactions}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading && <ActivityIndicator size="large" color="#0000ff" />}
      />
    </StripeProvider>
  );
};

const styles = StyleSheet.create({
  header: { backgroundColor: "#4caf50", padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerText: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  balanceContainer: { padding: 20, alignItems: "center", backgroundColor: "#f5f5f5" },
  balanceLabel: { fontSize: 16, color: "#555" },
  balanceValue: { fontSize: 32, fontWeight: "bold", color: "#4caf50" },
  addFundsContainer: { padding: 20 },
  addFundsLabel: { fontSize: 18, marginBottom: 10 },
  addFundsInputContainer: { flexDirection: "row", alignItems: "center" },
  addFundsInput: { flex: 1, borderWidth: 1, borderColor: "#ddd", padding: 10, borderRadius: 5, marginRight: 10 },
  addButton: { backgroundColor: "#4caf50", padding: 10, borderRadius: 5 },
  addButtonText: { color: "#fff", fontWeight: "bold" },
  transactionHistoryContainer: { padding: 20, borderTopWidth: 1, borderColor: "#ddd" },
  transactionHistoryLabel: { fontSize: 18, fontWeight: "bold" },
  transactionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  transactionType: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  transactionAmount: {
    fontSize: 16,
    color: "#4CAF50",
  },
  transactionDate: {
    fontSize: 14,
    color: "#666",
  },
  transactionStatus: {
    fontSize: 14,
    fontWeight: "bold",
    color: "grey",
  },
  emptyText: {
    textAlign: "center",
    marginVertical: 20,
    fontSize: 16,
    color: "#666",
  },

  redeemButton: {
    marginBottom: 16,
    backgroundColor: "#28a745",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  redeemButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default Wallet;

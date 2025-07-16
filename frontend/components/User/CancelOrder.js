//frontend/components/CancelOrder.js
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, Button, TouchableOpacity, TextInput, Alert } from 'react-native';
import { RadioButton } from 'react-native-paper'; // Make sure you have react-native-paper installed for RadioButton
import axios from 'axios';
import { SERVER_URL } from '../../Constants/index';
import { useUserStore } from "../../src/store/userStore";
import * as SecureStore from "expo-secure-store";
import * as ImagePicker from "expo-image-picker";
import { uploadImagesToCloudinary } from '../../API/uploadImage';  // Import the image upload function

const CancelOrder = ({ orderId, userId }) => {
      const { user, isAuthenticated, checkAuthentication } = useUserStore();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedReason, setSelectedReason] = useState('');
    const [otherReason, setOtherReason] = useState('');
    const [imageUri, setImageUri] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
    const [walletTransactions, setWalletTransactions] = useState([]);
  
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
        fetchWalletBalance();
      }, []);

    const reasons = [
        'Damaged Product',
        'Wrong Item Delivered',
        'Item Not Needed Anymore',
        'Product Quality Not As Expected',
        'Shipping Delayed',
        'Found Better Price Elsewhere',
        'Order Placed by Mistake',
        'Changed Mind',
        'Other'
    ];

    const handleCancelOrder = async () => {
        if (!isAuthenticated) {
            Alert.alert("Authentication Required", "Please log in to cancel the order.");
            return;
        }
    
        setIsModalVisible(true);
    };
    
    const handleSubmitCancel = async () => {
        if (!selectedReason && !otherReason) {
            Alert.alert("Validation Error", "Please select a reason for cancellation.");
            return;
        }
    
        if (selectedReason === 'Other' && otherReason.length > 50) {
            Alert.alert("Validation Error", "Other reason cannot exceed 50 characters.");
            return;
        }
    
        const token = await SecureStore.getItemAsync("authToken");
        if (!token) {
            Alert.alert("Token Missing", "You are not authenticated.");
            return;
        }
    
        let imageUrl = null;
    
        // If the reason is "Damaged Product" and an image is selected, upload it
        if (selectedReason === 'Damaged Product' && imageUri) {
            imageUrl = await uploadImagesToCloudinary(imageUri);
            if (!imageUrl) {
                Alert.alert("Upload Error", "Failed to upload image. Please try again.");
                return;
            }
        }
    
        const payload = {
            orderId,
            userId,
            reason: selectedReason === 'Other' ? otherReason : selectedReason,
            imageUri: imageUrl || null,  // Ensure null is sent if no image URL
        };
    
        try {
            const response = await axios.post(`${SERVER_URL}/user/order/cancel`, payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                }
            });
    
            if (response.status === 200 && response.data.success) {
                Alert.alert("Success", "Your order has been successfully canceled.");
            } else {
                Alert.alert("Error", response.data.message || "Failed to cancel the order. Please try again later.");
            }
        } catch (error) {
            console.error("Error canceling order:", error);
            if (error.response) {
                // Log the error details for debugging
                console.error("Backend error response:", error.response.data);
    
                Alert.alert("Error", error.response.data.message || "Something went wrong. Please try again later.");
            } else {
                Alert.alert("Error", "Something went wrong. Please try again later.");
            }
        }
        setIsModalVisible(false);
    };
    

    const handleCloseModal = () => {
        setIsModalVisible(false);
    };

    const handleImageUpload = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("Permission Denied", "Permission to access gallery is required.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri); // Update image URI with selected image
        }
    };

    return (
        <>
            <TouchableOpacity onPress={handleCancelOrder} style={{ padding: 10, backgroundColor: 'red', borderRadius: 5 }}>
                <Text style={{ color: 'white' }}>Cancel Order</Text>
            </TouchableOpacity>

            <Modal visible={isModalVisible} animationType="slide" transparent={true}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <View style={{ width: '80%', backgroundColor: 'white', padding: 20, borderRadius: 10 }}>
                        <Text style={{ fontSize: 18, marginBottom: 10 }}>Select a reason for cancellation</Text>

                        {reasons.map((reason, index) => (
                            <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 5 }}>
                                <RadioButton
                                    value={reason}
                                    status={selectedReason === reason ? 'checked' : 'unchecked'}
                                    onPress={() => setSelectedReason(reason)}
                                />
                                <Text>{reason}</Text>
                            </View>
                        ))}

                        {selectedReason === 'Other' && (
                            <View style={{ marginVertical: 10 }}>
                                <TextInput
                                    value={otherReason}
                                    onChangeText={setOtherReason}
                                    placeholder="Please specify..."
                                    maxLength={50}
                                    style={{
                                        borderWidth: 1,
                                        borderColor: '#ccc',
                                        borderRadius: 5,
                                        padding: 10,
                                        height: 40,
                                    }}
                                />
                                <Text style={{ color: 'gray', fontSize: 12 }}>Max 50 characters</Text>
                            </View>
                        )}

                        {selectedReason === 'Damaged Product' && (
                            <View style={{ marginTop: 10 }}>
                                <Button title="Upload Image" onPress={handleImageUpload} />
                                {imageUri && <Text>Image uploaded: {imageUri}</Text>}
                            </View>
                        )}

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
                            <TouchableOpacity onPress={handleCloseModal}>
                                <Text style={{ color: 'blue' }}>Close</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleSubmitCancel}>
                                <Text style={{ color: 'blue' }}>Submit</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
};

export default CancelOrder;

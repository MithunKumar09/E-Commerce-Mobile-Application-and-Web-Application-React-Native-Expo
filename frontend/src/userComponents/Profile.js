import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import RadioButtonRN from 'radio-buttons-react-native';
import axios from 'axios';
import { SERVER_URL } from '../../Constants/index';
import { storeData, getData } from '../../utils/storage';
import { useUserStore } from '../../src/store/userStore';
import * as SecureStore from "expo-secure-store";
import SkeletonComponent from "../../components/Loading/SkeletonComponent";

const Profile = () => {
  const [selectedTab, setSelectedTab] = useState('personal');
  const [addresses, setAddresses] = useState([]);
  const [form, setForm] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null); // Track selected address
  const [userInfo, setUserInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const { user, isAuthenticated, checkAuthentication } = useUserStore();
  

  useEffect(() => {
    // Check authentication and load data
    checkAuthentication();
    
    if (isAuthenticated) {
      loadData();
    } else {
      navigation.navigate('UserLogin');
    }
  }, [isAuthenticated]);

  const loadData = async () => {
    try {
      // Check cached user info
      const cachedUserInfo = await getData('userInfo');
      const cachedAddresses = await getData('addresses');
      const cachedTimestamp = await getData('dataTimestamp');
      
      const currentTimestamp = Date.now();

      // If data is cached and not expired, use cached data
      if (cachedUserInfo && cachedAddresses && cachedTimestamp && (currentTimestamp - cachedTimestamp < 3600000)) { // 1 hour cache
        setUserInfo(cachedUserInfo);
        setAddresses(cachedAddresses);
        setLoading(false);
      } else {
        // Fetch data from server if no cached data or cache expired
        await fetchUserInfo();
        await fetchAddresses();
      }
    } catch (error) {
      console.error('Error loading data from cache:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTab === 'manageAddress') {
      fetchAddresses();
    }
  }, [selectedTab]);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${SERVER_URL}/user/addresses/${user.id}`);
      if (response.status === 200) {
        setAddresses(response.data);
        storeData('addresses', response.data); // Cache data
        storeData('dataTimestamp', Date.now()); 
        // Find the default address or set a default if none exists
        const defaultAddress = response.data.find(address => address.default);
        if (defaultAddress) {
          setSelectedAddress(defaultAddress._id);
        }
      }
      // Delay to simulate loading time
      setTimeout(() => {
        setLoading(false); // Stop loading after 2 seconds
      }, 2000);
    } catch (error) {
      console.error('Error fetching addresses:', error);
      Alert.alert('Error', 'Failed to load addresses.');
      setLoading(false); // Stop loading in case of error
    }
  };
  
  const fetchUserInfo = async () => {
    try {
      setLoading(true);
  
      // Retrieve the auth token from SecureStore
      const token = await SecureStore.getItemAsync("authToken");
  
      // Log the token to check if it's defined
      if (!token) {
        console.error("Token not found. Please login again.");
        return; // Exit early if token is not found
      }
  
      console.log("Retrieved token:", token);
  
      const userId = user?.id;
  
      // Validate if userId exists
      if (!userId) {
        console.error("User ID is missing. Please check user data.");
        return; // Exit early if userId is not available
      }
  
      const response = await axios.get(`${SERVER_URL}/user/info/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
  
      if (response.status === 200) {
        setUserInfo(response.data);
        storeData('userInfo', response.data); // Cache data
        storeData('dataTimestamp', Date.now());
      } else {
        console.error('Failed to fetch user info:', response.statusText);
      }
  
      // Delay to simulate loading time
      setTimeout(() => {
        setLoading(false); // Stop loading after 2 seconds
      }, 2000);
    } catch (error) {
      console.error('Error fetching user info:', error);
      setLoading(false); // Stop loading in case of error
    }
  };

  const handleAddAddress = async () => {
    if (validateForm()) {
      try {
        // Check if form.addressType is defined and not empty before normalization
        if (form.addressType) {
          // Normalize addressType to ensure it is one of the valid enum values
          const normalizedAddressType = form.addressType.charAt(0).toUpperCase() + form.addressType.slice(1).toLowerCase();

          // Ensure that userName and addressType are correctly passed in the form
          console.log('Sending data to backend:', {
            ...form,
            userId: user.id, // Ensure userId is passed correctly
            username: user.username, // Ensure userName is part of the form
            addressType: normalizedAddressType, // Ensure addressType is passed
            default: false,
          });

          const response = await axios.post(`${SERVER_URL}/user/addAddress`, {
            ...form,
            addressType: normalizedAddressType,
            username: user.username,
            userId: user.id,
            default: false,
          });

          console.log('Backend response:', response);
          if (response.status === 200) {
            const newAddresses = [...addresses, response.data.address];
            // Mark the first added address as default if none are selected
            if (newAddresses.length === 1) {
              newAddresses[0].default = true;
              setSelectedAddress(newAddresses[0]._id);
            }
            setAddresses(newAddresses);
            setForm({});
            Alert.alert('Success', 'Address added successfully!');
          }
        } else {
          // If addressType is missing, alert the user
          Alert.alert('Error', 'Address type is required');
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to add address');
        console.error('Error adding address:', error);
      }
    }
  };


  // Updated handleUpdateAddress
  const handleUpdateAddress = async () => {
    if (validateForm()) {
      try {
        // Normalize addressType to ensure it is one of the valid enum values
        const normalizedAddressType = form.addressType.charAt(0).toUpperCase() + form.addressType.slice(1).toLowerCase();

        // Ensure that userName and addressType are correctly passed in the form
        console.log('Sending data to backend:', {
          ...form,
          userId: user.id, // Ensure userId is passed correctly
          username: user.username, // Ensure userName is part of the form
          addressType: normalizedAddressType, // Ensure addressType is passed
        });

        // Assuming the token is stored in SecureStore or AsyncStorage
        const token = await SecureStore.getItemAsync('authToken'); // Adjust based on your token storage method

        if (!form._id) {
          throw new Error('Address ID is missing or undefined');
        }

        const response = await axios.put(
          `${SERVER_URL}/user/editAddress/${form._id}`,
          {
            ...form,
            addressType: normalizedAddressType,
            username: user.username,
            userId: user.id,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`, // Include token in Authorization header
            }
          }
        );

        console.log('Backend response:', response);
        if (response.status === 200) {
          setAddresses(
            addresses.map((addr) => (addr.id === form.id ? { ...form } : addr))
          );
          setForm({});
          setIsEditing(false);
          Alert.alert('Success', 'Address updated successfully!');
        }
      } catch (error) {
        Alert.alert('Error', `Failed to update address: ${error.message}`);
        console.error('Error updating address:', error);
      }
    }
  };


  // Updated handleDeleteAddress
  const handleDeleteAddress = (id) => {
    Alert.alert('Confirm', 'Are you sure you want to delete this address?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            // Ensure the token is retrieved correctly from SecureStore
            const token = await SecureStore.getItemAsync('authToken');

            // Validate that the ID exists
            if (!id) {
              throw new Error('Address ID is missing or undefined');
            }

            // Ensure userId is passed correctly
            const userId = user.id; // Assuming userId is part of the user object

            console.log('Deleting address with ID:', id, 'and userId:', userId);

            // Send the delete request with proper headers and userId
            const response = await axios.delete(`${SERVER_URL}/user/deleteAddress/${id}`, {
              headers: {
                Authorization: `Bearer ${token}`, // Include token for authorization
                'Content-Type': 'application/json', // Ensure content type is specified
              },
              data: {
                userId: userId, // Pass userId in the request body
              },
            });

            console.log('Backend response:', response);
            if (response.status === 200) {
              // Remove the deleted address from the local state
              setAddresses(addresses.filter((addr) => addr._id !== id)); // Use `_id` for matching
              Alert.alert('Success', 'Address deleted successfully!');
            }
          } catch (error) {
            console.error('Error deleting address:', error);
            const errorMessage =
              error.response?.data?.message || 'Failed to delete address. Please try again.';
            Alert.alert('Error', errorMessage);
          }
        },
      },
    ]);
  };

  const handleAddressSelection = async (addressId) => {
    try {
      console.log('Selected addressId:', addressId); // Log to check if addressId is defined

      if (!addressId) {
        Alert.alert('Error', 'Address ID is not defined.');
        return;
      }

      // Find the address to be updated
      const updatedAddress = addresses.find(address => address._id === addressId);
      if (!updatedAddress) throw new Error('Address not found');

      // Only update if the selected address isn't already the default
      if (updatedAddress.default) {
        Alert.alert('Info', 'This address is already the default');
        return;
      }

      // Set the selected address as default
      updatedAddress.default = true;

      // Set all other addresses to default: false
      const updatedAddresses = addresses.map((address) =>
        address._id === addressId ? { ...address, default: true } : { ...address, default: false }
      );

      // Update on the server
      const token = await SecureStore.getItemAsync('authToken');
      const response = await axios.put(
        `${SERVER_URL}/user/updateAddress/${user.id}`,
        { selectedAddressId: addressId }, // Payload with only selected address ID
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.status === 200) {
        // Update local state to reflect the changes
        setAddresses(updatedAddresses);
        setSelectedAddress(addressId); // Set the selected address as default in the state
        Alert.alert('Success', 'Address marked as default!');
      }
    } catch (error) {
      console.error('Error updating address selection:', error.response || error);
      Alert.alert('Error', 'Failed to update default address.');
    }
  };




  const validateForm = () => {
    const { addressLine, pincode, street, state, flatNumber, phoneNumber } = form;

    if (!addressLine || addressLine.length > 30) {
      Alert.alert('Error', 'Address line is required and must not exceed 30 characters.');
      return false;
    }
    if (!pincode || !/^[0-9]{6,7}$/.test(pincode)) {
      Alert.alert('Error', 'Pincode is required and must be 6-7 digits.');
      return false;
    }
    if (!street || street.length > 30) {
      Alert.alert('Error', 'Street is required and must not exceed 30 characters.');
      return false;
    }
    if (!state || state.length > 20 || /\d/.test(state)) {
      Alert.alert('Error', 'State is required, must not exceed 20 characters, and cannot contain numbers.');
      return false;
    }
    if (!flatNumber || !/^[0-9]+$/.test(flatNumber) || flatNumber.length > 20) {
      Alert.alert('Error', 'Flat number is required and must be numeric with no more than 20 digits.');
      return false;
    }
    if (!phoneNumber || !/^[0-9]{10}$/.test(phoneNumber)) {
      Alert.alert('Error', 'Phone number is required and must be 10 digits.');
      return false;
    }
    return true;
  };

  const renderPersonalInfo = () => (
    <View style={styles.tabContainer}>
      {loading ? (
        <SkeletonComponent width={100} height={100} borderRadius={50} />
      ) : (
        <FontAwesome name="user-circle" size={100} color="blue" style={styles.profileIcon} />
      )}
      <Text style={styles.header}>Hello, {userInfo.username}</Text>
      <View style={styles.infoContainer}>
        {loading ? (
          <>
            <SkeletonComponent width={200} height={20} borderRadius={5} />
            <SkeletonComponent width={200} height={20} borderRadius={5} />
            <SkeletonComponent width={200} height={20} borderRadius={5} />
          </>
        ) : (
          <>
            <Text style={styles.infoLabel}>Name: {userInfo.username}</Text>
            <Text style={styles.infoLabel}>Email: {userInfo.email}</Text>
            <Text style={styles.infoLabel}>Phone: {userInfo.phone}</Text>
          </>
        )}
      </View>
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Edit / Update Info</Text>
      </TouchableOpacity>
    </View>
  );

  const renderManageAddress = () => (
    <View style={styles.tabContainer}>
      {loading ? (
        <SkeletonComponent width={300} height={20} borderRadius={5} />
      ) : addresses.length === 0 ? (
        <Text>No addresses available. Please add a new address.</Text>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <View style={styles.addressCard}>
              <TouchableOpacity
                onPress={() => handleAddressSelection(item._id)}
                style={[styles.button, { backgroundColor: item.default ? 'green' : 'gray' }]}
              >
                <Text style={styles.buttonText}>
                  {item.default ? 'Default' : 'Set as Default'}
                </Text>
              </TouchableOpacity>
              <Text>{item.addressLine}, {item.street}</Text>
              <Text>{item.state} - {item.pincode}</Text>
              <Text>Flat No: {item.flatNumber}</Text>
              <Text>Phone: {item.phoneNumber}</Text>
              {item.additionalPhoneNumber && <Text>Alt Phone: {item.additionalPhoneNumber}</Text>}
              <TouchableOpacity onPress={() => setForm(item) || setIsEditing(true)}>
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteAddress(item._id)}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
      <Text style={styles.formHeader}>Add / Update Address</Text>
      <ScrollView>
        {loading ? (
          <>
            <SkeletonComponent width="100%" height={40} borderRadius={5} />
            <SkeletonComponent width="100%" height={40} borderRadius={5} />
            <SkeletonComponent width="100%" height={40} borderRadius={5} />
            <SkeletonComponent width="100%" height={40} borderRadius={5} />
          </>
        ) : (
          <>
            <TextInput
              placeholder="Address Line"
              value={form.addressLine || ''}
              onChangeText={(text) => setForm({ ...form, addressLine: text })}
              style={styles.input}
            />
            <TextInput
              placeholder="Pincode"
              value={form.pincode || ''}
              onChangeText={(text) => setForm({ ...form, pincode: text })}
              style={styles.input}
              keyboardType="numeric"
            />
            <TextInput
              placeholder="Street"
              value={form.street || ''}
              onChangeText={(text) => setForm({ ...form, street: text })}
              style={styles.input}
            />
            <TextInput
              placeholder="State"
              value={form.state || ''}
              onChangeText={(text) => setForm({ ...form, state: text })}
              style={styles.input}
            />
            <TextInput
              placeholder="Flat Number"
              value={form.flatNumber || ''}
              onChangeText={(text) => setForm({ ...form, flatNumber: text })}
              style={styles.input}
              keyboardType="numeric"
            />
            <TextInput
              placeholder="Phone Number"
              value={form.phoneNumber || ''}
              onChangeText={(text) => setForm({ ...form, phoneNumber: text })}
              style={styles.input}
              keyboardType="numeric"
            />
            <TextInput
              placeholder="Additional Phone Number (Optional)"
              value={form.additionalPhoneNumber || ''}
              onChangeText={(text) => setForm({ ...form, additionalPhoneNumber: text })}
              style={styles.input}
              keyboardType="numeric"
            />
            <Picker
              selectedValue={form.addressType || 'home'}
              onValueChange={(itemValue) => setForm({ ...form, addressType: itemValue })}
            >
              <Picker.Item label="Home" value="home" />
              <Picker.Item label="Work" value="work" />
            </Picker>
            <TouchableOpacity
              style={styles.button}
              onPress={isEditing ? handleUpdateAddress : handleAddAddress}
            >
              <Text style={styles.buttonText}>{isEditing ? 'Update Address' : 'Add Address'}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );


  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'personal' && styles.activeTab]}
          onPress={() => setSelectedTab('personal')}
        >
          <Text style={styles.tabText}>Personal Information</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'address' && styles.activeTab]}
          onPress={() => setSelectedTab('address')}
        >
          <Text style={styles.tabText}>Manage Address</Text>
        </TouchableOpacity>
      </View>
      {selectedTab === 'personal' ? renderPersonalInfo() : renderManageAddress()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  tab: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: 'blue',
  },
  tabText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  tabContainer: {
    flex: 1,
    padding: 20,
  },
  profileIcon: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  infoContainer: {
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 16,
    marginBottom: 5,
  },
  button: {
    backgroundColor: 'blue',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  formHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  addressCard: {
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 15,
    borderRadius: 10,
  },
  editText: {
    color: 'blue',
    marginTop: 10,
    textDecorationLine: 'underline',
  },
  deleteText: {
    color: 'red',
    marginTop: 10,
    textDecorationLine: 'underline',
  },
});

export default Profile;

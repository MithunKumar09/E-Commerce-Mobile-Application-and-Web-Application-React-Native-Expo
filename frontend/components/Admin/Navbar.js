//AdminNavbar.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, FlatList, StyleSheet, Image, Dimensions, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../../src/store/userStore'; // Zustand store
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import Dashboard from '../../src/adminComponents/Dashboard';
import CarouselImage from '../../src/adminComponents/CarouselImage';
import Category from '../../src/adminComponents/Category';
import UpdateProducts from '../../src/adminComponents/UpdateProducts';
import Brand from '../../src/adminComponents/brand';
import SalesMan from '../../src/adminComponents/SalesMan';
import TodayDeals from '../../src/adminComponents/TodayDeals';
import Voucher from '../../src/adminComponents/Vocher';
import OrderTabs from './OrderTabs';
import { SERVER_URL } from '../../Constants/index';
import { useNavigation } from '@react-navigation/native';
import { getData, storeData, removeData } from "../../utils/storage";
import AsyncStorage from '@react-native-async-storage/async-storage';
const { width } = Dimensions.get('window');

const AdminNavbar = () => {
  const [username, setUsername] = useState('AdminUser');
  const [email, setEmail] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [selectedMenu, setSelectedMenu] = useState('Home');
  const [loading, setLoading] = useState(true);
  const { admin, isAuthenticated, checkAdminAuthentication, signOutAdmin, resetAdmin } = useUserStore(state => state);
  const navigation = useNavigation();

  const menuItems = [
    { label: 'Home', icon: 'home-outline' },
    { label: 'Users', icon: 'people-outline' },
    { label: 'Products', icon: 'cube-outline' },
    { label: 'Today\'s Deals', icon: 'gift-outline' },
    { label: 'Orders', icon: 'receipt-outline' },
    { label: 'Vouchers', icon: 'pricetag-outline' },
    { label: 'Category', icon: 'list-outline' },
    { label: 'Brands', icon: 'briefcase-outline' },
    { label: 'Carousel Image', icon: 'images-outline' },
    { label: 'SalesMan', icon: 'notifications-outline' },
    { label: 'Profile', icon: 'person-outline' },
  ];

  // Check admin authentication and fetch data when the component mounts
  useEffect(() => {
    const fetchAdminData = async () => {
      await checkAdminAuthentication();
      if (admin) {
        setUsername(admin.email);
        setEmail(admin.email);
      } else if (isAuthenticated) {
        Alert.alert('Not Authenticated', 'Please log in to access the dashboard.');
      }
      setLoading(false);
    };

    // Only fetch data if admin is not set or check admin authentication
    if (!admin && isAuthenticated) {
      fetchAdminData();
    } else {
      setUsername(admin?.email || 'Admin');
      setLoading(false);
    }
  }, [admin, checkAdminAuthentication, isAuthenticated]);

  const handleSaveChanges = async () => {
    if (newPassword && oldPassword) {
      if (email.startsWith("admin")) {
        try {
          const token = await SecureStore.getItemAsync('adminToken'); // Get the JWT token from SecureStore

          // Check if the new email is already in use (to avoid the duplicate key error)
          const emailCheckResponse = await axios.get(`${SERVER_URL}/admin/check-email`, {
            params: { email: email }
          });

          if (emailCheckResponse.data.exists) {
            Alert.alert('Error', 'The email address is already in use. Please choose a different email.');
            return;
          }

          const response = await axios.put(`${SERVER_URL}/admin/update`, {
            email,
            oldPassword,
            newPassword
          }, {
            headers: {
              'Authorization': `Bearer ${token}`  // Include the JWT token in the request header
            }
          });

          if (response.data.message === 'Profile updated successfully') {
            Alert.alert('Success', 'Profile updated successfully!');

            // Update the admin data in Zustand
            const updatedAdminData = {
              email,
              token: response.data.token,
            };

            // console.log('Updating admin data in Zustand:', updatedAdminData);

            // Serialize and store updated admin credentials in Zustand, SecureStore, and AsyncStorage
            useUserStore.setState({ admin: updatedAdminData, isAuthenticated: true });

            await SecureStore.setItemAsync('adminToken', updatedAdminData.token); // Store updated token in SecureStore
            await SecureStore.setItemAsync('adminData', JSON.stringify(updatedAdminData)); // Store updated admin data as a string in SecureStore
            await AsyncStorage.setItem('adminData', JSON.stringify(updatedAdminData)); // Store updated admin data in AsyncStorage

          } else {
            Alert.alert('Error', 'Profile update failed');
          }
        } catch (error) {
          console.error('Error during profile update:', error);
          Alert.alert('Error', 'There was an issue updating your profile');
        }
      } else {
        Alert.alert('Error', 'Email must start with "admin"');
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutAdmin();
      resetAdmin();
      Alert.alert('Logged out', 'You have successfully logged out');
      navigation.navigate('HomePage');
    } catch (error) {
      console.error('Error during sign-out:', error);
      Alert.alert('Error', 'There was an issue signing you out');
    }
  };


  const renderMenuItems = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navbarScroll}>
      {menuItems.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={[styles.navbarItem, selectedMenu === item.label && styles.activeNavbarItem]}
          onPress={() => setSelectedMenu(item.label)}
        >
          <Ionicons
            name={item.icon}
            size={22}
            color={selectedMenu === item.label ? '#fff' : '#333'}
          />
          <Text style={[styles.navbarText, selectedMenu === item.label && styles.activeNavbarText]}>
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderProfile = () => (
    <View style={styles.profileContainer}>
      <View style={styles.profileHeader}>
        <Image
          source={{ uri: 'https://via.placeholder.com/100' }}
          style={styles.profileImage}
        />
        <Text style={styles.profileName}>{username}</Text>
      </View>
      <Text style={styles.sectionTitle}>Edit Profile</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Change Email"
        placeholderTextColor="#888"
      />
      <TextInput
        style={styles.input}
        value={oldPassword}
        onChangeText={setOldPassword}
        secureTextEntry
        placeholder="Enter Old Password"
        placeholderTextColor="#888"
      />
      <TextInput
        style={styles.input}
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        placeholder="Enter New Password"
        placeholderTextColor="#888"
      />
      <TouchableOpacity style={styles.saveButton} onPress={handleSaveChanges}>
        <Text style={styles.saveButtonText}>Save Changes</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutButtonText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    if (!isAuthenticated) {
      return <Text style={styles.dashboardText}>You are not authenticated. Please log in to access the dashboard.</Text>;
    }
    switch (selectedMenu) {
      case 'Home':
        return <Dashboard />;
      case 'Carousel Image':
        return <CarouselImage />;
        case 'Vouchers':
          return <Voucher />;
      case 'Category':
        return <Category />;
      case 'Products':
        return <UpdateProducts />;
        case 'Today\'s Deals':
          return <TodayDeals />;
      case 'Orders':
        return <OrderTabs />;
      case 'Brands':
        return <Brand />;
      case 'SalesMan':
        return <SalesMan />;
      case 'Profile':
        return renderProfile();
      default:
        return <Text style={styles.dashboardText}>{`${selectedMenu} Content`}</Text>;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin</Text>
      </View>
      <View style={styles.navbar}>{renderMenuItems()}</View>
      <FlatList
        data={[renderContent()]}
        keyExtractor={() => 'content'}
        renderItem={({ item }) => <View style={styles.mainContent}>{item}</View>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    backgroundColor: '#0077b6',
    paddingVertical: 15,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  navbar: {
    flexDirection: 'row',
    backgroundColor: '#0077b6',
    paddingVertical: 10,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  navbarScroll: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navbarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginHorizontal: 5,
    elevation: 2,
  },
  activeNavbarItem: {
    backgroundColor: '#005f99',
  },
  navbarText: {
    marginLeft: 10,
    color: '#333',
    fontWeight: '500',
  },
  activeNavbarText: {
    color: '#fff',
  },
  mainContent: {
    flex: 1,
    padding: 15,
  },
  dashboardText: {
    fontSize: 18,
    color: '#555',
    textAlign: 'center',
    marginTop: 20,
  },
  profileContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 2,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 15,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#444',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#444',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fff',
    marginBottom: 15,
  },
  saveButton: {
    backgroundColor: '#0077b6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  signOutButton: {
    backgroundColor: '#FF6347',
    padding: 10,
    marginTop: 20,
    borderRadius: 5,
  },
  signOutButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export default AdminNavbar;

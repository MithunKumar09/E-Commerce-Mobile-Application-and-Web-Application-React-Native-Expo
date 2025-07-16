//frontend/Pages/User/Login.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { SERVER_URL } from '../../Constants/index';
import logo from '../../assets/logo.png';
import { useUserStore } from '../store/userStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { storeData, storeSecureData } from '../../utils/storage';
import * as SecureStore from 'expo-secure-store';

const UserLogin = () => {
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [isSalesmanLogin, setIsSalesmanLogin] = useState(false);
  const [otpSentTime, setOtpSentTime] = useState(null);
  const [loginDisabled, setLoginDisabled] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loadingOtp, setLoadingOtp] = useState(false);
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [timer, setTimer] = useState(30);
  const [resendEnabled, setResendEnabled] = useState(false);
  const navigation = useNavigation();
  const setUser = useUserStore((state) => state.setUser);
  const setAdmin = useUserStore((state) => state.setAdmin);
  const setSalesman = useUserStore((state) => state.setSalesman);

  const handleOtpRequest = async () => {
    if (!identifier) {
      Alert.alert('Error', 'Please enter a phone number or email.');
      return;
    }
    setLoadingOtp(true);
    setResendEnabled(false);
    setTimer(30);
    try {
      const response = await axios.post(`${SERVER_URL}/user/sendOtp`, { identifier });
      if (response.data.message === 'OTP sent successfully') {
        Alert.alert('Success', 'OTP sent to your phone or email.');
        setIsOtpSent(true);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send OTP. Please try again.');
    } finally {
      setLoadingOtp(false);
    }
  };

  //UserLogin.js
  const handleOtpVerification = async () => {
    if (!identifier || !otp) {
      Alert.alert('Error', 'Both fields are required.');
      return;
    }
    setLoadingLogin(true);

    // Log the data being sent to the backend
    console.log('Sending data to backend:', { identifier, otp });

    try {
      const response = await axios.post(`${SERVER_URL}/user/verify-otp`, { identifier, otp });

      // Log the response from the backend
      console.log('Response from backend:', response.data);

      if (response.data && response.data.message === 'OTP verified, login successful') {
        Alert.alert('Success', 'Login successful!');

        // Construct user data from the response
        const userData = {
          id: response.data.id,
          username: response.data.username,
          email: identifier,
          token: response.data.token,
        };

        // Log the user data being stored
        console.log('User data being stored:', userData);

        // Store user data securely in AsyncStorage and SecureStore
        await storeData('userProfile', userData);
        await storeSecureData('authToken', userData.token);

        // Set user state and navigate to the next screen
        await setUser(userData);
        useUserStore.setState({ isAuthenticated: true });
        navigation.navigate('HomePage');
      } else {
        Alert.alert('Error', response.data.message || 'Invalid OTP. Please try again.');
      }
    } catch (error) {
      // Log the error details
      console.error('Error verifying OTP:', error);

      const errorResponse = error.response?.data?.message || 'Failed to verify OTP. Please try again.';
      Alert.alert('Error', errorResponse);
    } finally {
      setLoadingLogin(false);
    }
  };



// Handle Admin Login (with email and password)
const handleAdminLogin = async () => {
  if (!identifier || !password) {
    Alert.alert('Error', 'Both email and password are required.');
    return;
  }
  setLoadingLogin(true);

  try {
    console.log('Credentials being sent to backend:', { email: identifier, password });
    const response = await axios.post(`${SERVER_URL}/admin/login`, {
      email: identifier,
      password,
    });

    console.log('Admin login successful! Response:', response.data);

    if (response.data && response.data.token) {
      // Store admin data securely
      const adminData = {
        token: response.data.token,
        email: identifier,
      };
      await storeData('adminProfile', adminData); // Store admin profile

      // Update Zustand store
      setAdmin(adminData);
      await storeSecureData('adminToken', adminData.token);
      // Explicitly call checkAdminAuthentication to update the status
      await useUserStore.getState().checkAdminAuthentication();

      Alert.alert('Success', 'Admin login successful!');
      navigation.navigate('AdminNavbar'); // Navigate to the admin dashboard
    } else {
      Alert.alert('Error', 'Login failed. Please check your credentials.');
    }
  } catch (error) {
    console.error('Admin login error:', error);
    Alert.alert('Error', 'An error occurred while logging in. Please try again.');
  } finally {
    setLoadingLogin(false);
  }
};




  const handleSalesmanLogin = async () => {
    if (!identifier || !password) {
      Alert.alert('Error', 'Both email and password are required.');
      return;
    }
    setLoadingLogin(true);

    try {
      console.log('Salesman credentials being sent to backend:', { email: identifier, password });
      const response = await axios.post(`${SERVER_URL}/salesman/login`, {
        email: identifier,
        password,
      });

      console.log('Salesman login successful! Response:', response.data);

      if (response.data && response.data.token) {
        // Store salesman data securely
        const salesmanData = {
          token: response.data.token,
          email: identifier,
        };
        await storeData('salesmanProfile', salesmanData);

        // Update Zustand store
        setAdmin(null); // Ensure admin state is cleared
        setUser(null);  // Ensure user state is cleared
        setSalesman(salesmanData); // Set salesman state
        await storeSecureData('salesmanToken', salesmanData.token);
        useUserStore.setState({ isAuthenticated: true });

        Alert.alert('Success', 'Salesman login successful!');
        navigation.navigate('SalesManNavbars'); // Navigate to the salesman dashboard
      } else {
        Alert.alert('Error', 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('Salesman login error:', error);
      Alert.alert('Error', 'An error occurred while logging in. Please try again.');
    } finally {
      setLoadingLogin(false);
    }
  };

  const handleIdentifierChange = (text) => {
    setIdentifier(text);
    if (text.substring(0, 5).toLowerCase() === 'admin') {
      setIsAdminLogin(true);
      setIsSalesmanLogin(false);
    } else if (text.substring(0, 5).toLowerCase() === 'sales') {
      setIsAdminLogin(false);
      setIsSalesmanLogin(true);
    } else {
      setIsAdminLogin(false);
      setIsSalesmanLogin(false);
    }
  };



  // Countdown timer for OTP resend
  useEffect(() => {
    let interval;
    if (isOtpSent && timer > 0) {
      interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);
    }
    if (timer === 0) {
      setResendEnabled(true);
    }
    return () => clearInterval(interval);
  }, [isOtpSent, timer]);

  const handleResendOtp = () => {
    setResendEnabled(false);
    setTimer(30);
    setOtpSentTime(new Date());
    handleOtpRequest();
  };

  // Refresh token logic (simple implementation)
  const refreshTokenAndLogin = async () => {
    try {
      // Remove old tokens from AsyncStorage and SecureStore
      await AsyncStorage.removeItem('userData');
      await SecureStore.deleteItemAsync('userToken');

      // Trigger login after refreshing the token
      Alert.alert('Info', 'You are logged out. Refreshing token...');
      // Perform the login again (just a simple demonstration of the flow)
      navigation.navigate('Login');  // Redirect to the login page or home after refreshing
    } catch (error) {
      console.error("Error refreshing token", error);
    }
  };

  const isMobilePlatform = Platform.OS === 'ios' || Platform.OS === 'android';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={isMobilePlatform ? styles.mobileLayout : styles.webLayout}>
          <View style={styles.logoContainer}>
            <Image source={logo} style={styles.logo} />
            <Text style={styles.welcomeMessage}>Welcome! Create an account to start exploring our services. We are excited to have you on board!</Text>
          </View>
          <View
            style={[
              styles.divider,
              isMobilePlatform ? styles.horizontalDivider : styles.verticalDivider,
            ]}
          />
          <View style={styles.form}>
            <Text style={styles.title}>Login</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter phone or email"
              value={identifier}
              onChangeText={handleIdentifierChange} // Updated function here
            />
            
            {/* Salesman login logic */}
            {isSalesmanLogin && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Enter password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleSalesmanLogin}
                  disabled={loadingLogin}
                >
                  {loadingLogin ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Salesman Login</Text>}
                </TouchableOpacity>
              </>
            )}
  
            {/* Admin login logic */}
            {isAdminLogin && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Enter password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleAdminLogin}
                  disabled={loadingLogin}
                >
                  {loadingLogin ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login as Admin</Text>}
                </TouchableOpacity>
              </>
            )}
  
            {/* OTP login logic */}
            {!isAdminLogin && !isSalesmanLogin && (
              !isOtpSent ? (
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleOtpRequest}
                  disabled={loadingOtp}
                >
                  {loadingOtp ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Get OTP</Text>}
                </TouchableOpacity>
              ) : (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter OTP"
                    value={otp}
                    onChangeText={setOtp}
                  />
                  <TouchableOpacity
                    style={styles.button}
                    onPress={handleOtpVerification}
                    disabled={loadingLogin || loginDisabled}
                  >
                    {loadingLogin ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.resendButton, resendEnabled ? styles.resendActive : styles.resendDisabled]}
                    onPress={handleResendOtp}
                    disabled={!resendEnabled}
                  >
                    <Text style={styles.buttonText}>
                      {resendEnabled ? 'Resend OTP' : `Resend OTP (${timer}s)`}
                    </Text>
                  </TouchableOpacity>
                </>
              )
            )}
  
            <TouchableOpacity onPress={() => navigation.navigate('register')}>
              <Text style={styles.linkText}>Don't have an account? Sign up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
  
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  mobileLayout: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  webLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: width * 0.5,
    height: width * 0.2,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  welcomeMessage: {
    fontSize: 16,
    color: '#00796b',
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  divider: {
    backgroundColor: '#ddd',
    marginVertical: 20,
  },
  horizontalDivider: {
    width: '80%',
    height: 1,
    alignSelf: 'center',
  },
  verticalDivider: {
    height: '80%',
    width: 1,
    alignSelf: 'center',
  },
  form: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  title: {
    fontSize: width < 600 ? 20 : 24,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 48,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
    fontSize: width < 600 ? 14 : 16,
  },
  button: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  resendButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  resendActive: {
    backgroundColor: '#1E3A8A',
  },
  resendDisabled: {
    backgroundColor: '#ddd',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  linkText: {
    color: '#1E3A8A',
    textAlign: 'center',
    marginTop: 12,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
});

export default UserLogin;

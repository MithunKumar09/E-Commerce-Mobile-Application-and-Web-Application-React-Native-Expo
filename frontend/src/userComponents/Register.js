//frontend/src/userComponents/Register.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  ScrollView,
  Alert,
  useWindowDimensions,
  Animated,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useUserStore } from '../store/userStore';
import { FontAwesome } from '@expo/vector-icons';
import { storeData, storeSecureData } from '../../utils/storage';
import axios from 'axios';
import { SERVER_URL } from '../../Constants/index';
import { LinearGradient } from 'expo-linear-gradient';

const Register = () => {
  const navigation = useNavigation();
  const { setUser, resetUser } = useUserStore();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
  });

  const [validationErrors, setValidationErrors] = useState({
    username: '',
    email: '',
    phone: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;

  const logoAnimation = new Animated.Value(1);

  useEffect(() => {
    resetUser();
    // Logo Animation for UI enhancement
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoAnimation, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(logoAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [resetUser]);

  const validateInput = (id, value) => {
    let error = '';
    if (!value) {
      error = `${id.charAt(0).toUpperCase() + id.slice(1)} is required.`;
    } else {
      switch (id) {
        case 'username':
          if (!/^[A-Za-z\s]+$/.test(value)) {
            error = 'Username can only contain letters and spaces.';
          } else if (value.length > 20) {
            error = 'Username cannot exceed 20 characters.';
          }
          break;
        case 'email':
          if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/.test(value)) {
            error = 'Enter a valid email address.';
          } else if (value.toLowerCase().includes('@gmail') === false) {
            error = 'Only Gmail addresses are allowed.';
          }
          break;
        case 'phone':
          if (!/^(\+\d{1,3}\s)?\d{10}$/.test(value)) {
            error = 'Phone number must be a 10-digit number.';
          }
          break;
        default:
          break;
      }
    }

    setValidationErrors((prevErrors) => ({
      ...prevErrors,
      [id]: error,
    }));
  };

  const handleInputChange = (id, value) => {
    setFormData((prevData) => ({
      ...prevData,
      [id]: value,
    }));
    validateInput(id, value);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    const newErrors = {};
    Object.keys(formData).forEach((field) => {
      if (!formData[field]) {
        newErrors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required.`;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setValidationErrors((prevErrors) => ({
        ...prevErrors,
        ...newErrors,
      }));
      return;
    }

    if (!Object.values(validationErrors).every((err) => err === '')) {
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('Sending data to backend:', formData);
      const response = await axios.post(`${SERVER_URL}/user/register`, formData);
      console.log('Backend response:', response.data);
      const { id, token } = response.data;

      const userData = {
        username: formData.username,
        email: formData.email,
        isAuthenticated: true,
        id,
        token,
      };
      setUser(userData);

      await storeData('userProfile', userData);
      await storeSecureData('authToken', token);

      Alert.alert('Success', 'Registration successful! Redirecting to login...');
      navigation.navigate('UserLogin');
    } catch (error) {
      console.log('Error during registration:', error);
      if (error.response?.status === 409) {
        setValidationErrors((prevErrors) => ({
          ...prevErrors,
          email: 'Email already in use. Please try another.',
        }));
      } else {
        Alert.alert('Error', 'Registration failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isMobilePlatform = Platform.OS === 'ios' || Platform.OS === 'android';

  return (
    <LinearGradient
    colors={["rgba(135, 206, 250, 0.8)", "rgba(255, 255, 255, 1)"]}
      style={styles.mainContainer}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={isMobilePlatform ? styles.mobileLayout : styles.webLayout}>
        <View style={styles.logoContainer}>
            <Animated.Image
              source={require('../../assets/logo.png')}
              style={[styles.logo, {
                transform: [{ scale: logoAnimation }],
                width: isLargeScreen ? 700 : 250,
                height: isLargeScreen ? 200 : 100,
              }]}
              resizeMode="contain"
            />
            <Text style={styles.welcomeMessage}>Welcome! Create an account to start exploring our services. We are excited to have you on board!</Text>
          </View>
          <View
            style={[
              styles.divider,
              isLargeScreen ? styles.verticalDivider : styles.horizontalDivider,
            ]}
          />
          <View style={[styles.card, isLargeScreen && styles.largeScreenCard]}>
            <Text style={styles.title}>Create an Account</Text>

            <View style={styles.inputContainer}>
              <FontAwesome name="user" size={20} color="#888" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Username"
                value={formData.username}
                onChangeText={(value) => handleInputChange('username', value)}
              />
            </View>
            {validationErrors.username && <Text style={styles.errorText}>{validationErrors.username}</Text>}

            <View style={styles.inputContainer}>
              <FontAwesome name="envelope" size={20} color="#888" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
              />
            </View>
            {validationErrors.email && <Text style={styles.errorText}>{validationErrors.email}</Text>}

            <View style={styles.inputContainer}>
              <FontAwesome name="phone" size={20} color="#888" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                keyboardType="phone-pad"
                value={formData.phone}
                onChangeText={(value) => handleInputChange('phone', value)}
              />
            </View>
            {validationErrors.phone && <Text style={styles.errorText}>{validationErrors.phone}</Text>}

            <TouchableOpacity
              style={[styles.button, isSubmitting && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign Up</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('UserLogin')}>
              <Text style={styles.loginText}>Already have an account? Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      </LinearGradient>
  );
};

export default Register;

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#f0f8ff',
  },
  headerContainer: {
    zIndex: 1,
    backgroundColor: "#fff",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  wrapper: {
    width: '100%',
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
  welcomeMessage: {
    fontSize: 16,
    color: '#00796b',
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  divider: {
    marginVertical: 20,
    backgroundColor: '#fff',
  },
  horizontalDivider: {
    height: 1,
    width: '80%',
  },
  verticalDivider: {
    width: 1,
    height: '80%',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 10,
    width: '90%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
    alignSelf:'center',
  },
  largeScreenCard: {
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
  logo: {
    marginBottom: 10,
    zIndex: 1,
    alignSelf:'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#00796b',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: '100%',
    maxWidth: 600,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 48,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    backgroundColor: '#f9f9f9',
  },
  button: {
    backgroundColor: '#00796b',
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 15,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#b2dfdb',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  loginText: {
    marginTop: 15,
    color: '#00796b',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  errorText: {
    color: '#f44336',
    fontSize: 12,
    marginBottom: 10,
  },
});
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { SERVER_URL } from '../../Constants/index';
import AnimatedOfferCard from '../../components/User/AnimatedOfferCard';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.45;
const HEADER_HEIGHT = 200;

const VoucherCards = () => {
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [translateY] = useState(new Animated.Value(-HEADER_HEIGHT));
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
      const navigation = useNavigation();

      useEffect(() => {
        const fetchVouchers = async () => {
          try {
            console.log('Fetching vouchers from API...'); // Log before fetching
            const response = await axios.get(`${SERVER_URL}/user/vouchers`);
            console.log('Vouchers fetched successfully:', response.data); // Log the fetched vouchers data
            setVouchers(response.data);
            setLoading(false);
          } catch (err) {
            console.error('Error fetching vouchers:', err.message); // Log any errors that occur
            setError(err.message);
            setLoading(false);
          }
        };
      
        fetchVouchers();
      }, []);
      

  const calculateDaysLeft = (startDate, endDate) => {
    const today = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (today >= start && today <= end) {
      const timeDifference = end - today;
      return Math.floor(timeDifference / (1000 * 3600 * 24));
    }
    return -1;
  };

  const animateHeader = () => {
    translateY.setValue(-HEADER_HEIGHT);
    Animated.timing(translateY, {
      toValue: 0,
      duration: 800,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    animateHeader();
  }, []);

  const handleCloseDetailCard = () => {
    setSelectedVoucher(null);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200EE" />
        <Text>Loading vouchers...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <Animated.View style={[styles.headerContainer, { transform: [{ translateY }] }]}>
        <Image
          source={require('../../assets/header/VoucharHeader.png')}
          style={styles.headerImage}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0, 0, 0, 0.7)']}
          style={styles.gradientOverlay}
        >
          <Text style={styles.headerText}>Exclusive Vouchers</Text>
        </LinearGradient>
      </Animated.View>

      {/* Voucher Cards Grid */}
      <ScrollView contentContainerStyle={styles.grid}>
        {vouchers.map((voucher) => {
          const daysLeft = calculateDaysLeft(voucher.start_time, voucher.end_time);
          const expired = daysLeft === -1;

          return (
            <TouchableOpacity
              key={voucher._id}
              style={[styles.card, expired && styles.expiredCard]}
              onPress={() => {
                console.log(`Navigating to BiddingCard with voucherId: ${voucher._id}`);
                // Navigate to BiddingCard screen and pass voucherId as parameter
                navigation.navigate('BiddingCard', { voucherId: voucher?._id });
              }}
            >
              <View style={styles.cardImageContainer}>
                {daysLeft > 0 ? (
                  <Text style={styles.daysLeft}>{daysLeft} days left</Text>
                ) : expired ? (
                  <Text style={styles.expiredText}>Expired</Text>
                ) : (
                  <Text style={styles.daysLeft}>Starting Soon</Text>
                )}
                <Image source={{ uri: voucher.imageUrl }} style={styles.cardImage} />
              </View>
              <LinearGradient
                colors={expired ? ['#e0e0e0', '#d1d1d1'] : ['#ffffff', '#f9f9f9']}
                style={styles.cardContent}
              >
                <Text style={[styles.cardTitle, expired && styles.expiredTitle]}>
                  {voucher.voucher_name}
                </Text>
                <Text style={styles.cardDescription}>{voucher.details}</Text>
                <View style={styles.cardFooter}>
                  <Text style={[styles.priceTag, expired && styles.expiredText]}>
                    ₹{voucher.price}
                  </Text>
                  <Text style={[styles.productPrice, expired && styles.expiredText]}>
                    Product: ₹{voucher.productPrice}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerContainer: {
    height: HEADER_HEIGHT,
    overflow: 'hidden',
  },
  headerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 20,
  },
  headerText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    padding: 10,
  },
  card: {
    width: CARD_WIDTH,
    marginVertical: 10,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  cardImageContainer: {
    position: 'relative',
    height: 120,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  cardDescription: {
    fontSize: 12,
    color: '#666',
    marginVertical: 5,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceTag: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6a0572',
  },
  productPrice: {
    fontSize: 12,
    color: '#888',
    textDecorationLine: 'line-through',
  },
  cardContent: {
    padding: 10,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center', // Center vertically
    alignItems: 'center', // Center horizontally
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Dim background
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    width: '90%', // Adjust modal width as needed
    maxHeight: '80%', // Ensure it doesn't occupy the full screen
    backgroundColor: '#fff',
    borderRadius: 20, // Rounded corners for a polished look
    padding: 20, // Added padding for inner content
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    justifyContent: 'center', // Center content vertically within the modal
  },

  expiredCard: { backgroundColor: '#f5f5f5', borderColor: '#d9534f', borderWidth: 1, opacity: 0.6 },
  expiredText: { position: 'absolute', top: 10, left: 10, color: '#d9534f', fontWeight: 'bold' },
  expiredTitle: { color: '#d9534f' },
});

export default VoucherCards;

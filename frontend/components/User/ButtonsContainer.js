// frontend/src/components/User/ButtonsContainer.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const ButtonsContainer = () => {
  const navigation = useNavigation();  // Initialize useNavigation hook

    // Function to navigate to TodayDeals screen
    const handleTodayDealsPress = () => {
      navigation.navigate('TodaysDeals');  // Navigate to TodayDeals screen
    };

    const handleTodayEventsPress = () => { 
      navigation.navigate('Events');
    };

  // Function to navigate to VoucherCards screen
  const handleVoucherPress = () => {
    navigation.navigate('VoucherCards');  // Navigate to VoucherCards screen
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={handleTodayDealsPress}>
        <Text style={styles.buttonText}>Today's Deals</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={handleTodayEventsPress}>
        <Text style={styles.buttonText}>Events</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={handleVoucherPress}>
          <FontAwesome name="gift" size={28} color="#007bff" />
            <Text style={styles.voucherTagText}>Voucher</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 10,
    backgroundColor: '#fff',
    width: '100%',
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 0,
    elevation: 5,
  },
  button: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    width: '30%',
    elevation: 5,
    justifyContent: 'center',
    alignItems: 'center',
    transition: 'all 0.2s ease-in-out',
  },
  buttonText: {
    color: '#000',
    fontSize: 12,
    textAlign: 'center',
  },
  voucherTagText: {
    color: '#007bff',
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});

export default ButtonsContainer;

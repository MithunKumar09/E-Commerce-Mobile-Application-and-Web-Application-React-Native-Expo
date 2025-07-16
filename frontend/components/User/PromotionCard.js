// PromotionCard.js
// PromotionCard.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { BlurView } from 'expo-blur'; // Use this to add the blur effect

const PromotionCard = ({ onClose }) => {
  return (
    <ImageBackground
      source={{ uri: 'https://via.placeholder.com/150' }} // Change to your background image if needed
      style={styles.cardBackground}
    >
      <BlurView intensity={50} style={styles.blurContainer}>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>Limited Time Offer!</Text>
          <Text style={styles.cardDescription}>Get amazing discounts on today's deals.</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <FontAwesome name="times" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </BlurView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  cardBackground: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
  },
  blurContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  cardTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardDescription: {
    color: 'white',
    fontSize: 14,
    marginVertical: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 5,
  },
});

export default PromotionCard;

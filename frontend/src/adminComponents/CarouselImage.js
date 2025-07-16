// CarouselImage.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, Dimensions, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from 'react-native-vector-icons';
import { uploadImagesToCloudinary } from '../../API/uploadImage';
import axios from 'axios';
import { SERVER_URL } from '../../Constants/index';

const { width } = Dimensions.get('window');

const CarouselImage = () => {
  const [carouselImages, setCarouselImages] = useState([]);
  const [imageLimitReached, setImageLimitReached] = useState(false);
  const [galleryPermission, setGalleryPermission] = useState(null);

  useEffect(() => {
    const getPermissions = async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      setGalleryPermission(status);
    };

    const fetchCarouselImages = async () => {
      try {
        const response = await axios.get(`${SERVER_URL}/admin/carousel`);
        // Ensure state is set correctly
        setCarouselImages(response.data.images || []);
      } catch (error) {
        console.error('Error fetching carousel images:', error);
        Alert.alert('Error', 'Failed to fetch carousel images.');
      }
    };

    getPermissions();
    fetchCarouselImages();
  }, []); // Only run once on mount

  const handleImagePick = async (index) => {
    if (galleryPermission !== 'granted') {
      Alert.alert('Permission Denied', 'Please allow gallery access to upload images.', [{ text: 'OK' }]);
      return;
    }

    if (carouselImages.length >= 5 && index === -1) {
      setImageLimitReached(true);
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      console.log('ImagePicker Result:', result);

      if (!result.canceled) {
        console.log('Uploading image with URI:', result.assets[0].uri);

        const uploadedUrl = await uploadImagesToCloudinary(result.assets[0].uri);

        if (!uploadedUrl) {
          console.log('Upload failed: No URL returned');
          return;
        }

        console.log('Uploaded image URL:', uploadedUrl);

        const newImage = { uri: uploadedUrl };

        if (index === -1) {
          setCarouselImages([...carouselImages, newImage]);
        } else {
          // Delete the old image before updating it
          await axios.delete(`${SERVER_URL}/admin/carousel/${carouselImages[index]._id}`);

          const updatedImages = [...carouselImages];
          updatedImages[index] = newImage;
          setCarouselImages(updatedImages);
        }

        console.log('Saving to backend with payload:', { image: newImage });
        await axios.post(`${SERVER_URL}/admin/carousel`, { image: newImage });
        console.log('Image saved successfully to backend');
        
        // Re-fetch carousel images after saving
        fetchCarouselImages();
      }
    } catch (error) {
      console.error('Error during image upload:', error);
      Alert.alert('Error', 'Failed to pick or upload the image.');
    }
  };

  const handleImageDelete = async (index) => {
    try {
      const imageId = carouselImages[index]._id;
      await axios.delete(`${SERVER_URL}/admin/carousel/${imageId}`);
      const updatedImages = carouselImages.filter((_, i) => i !== index);
      setCarouselImages(updatedImages);
    } catch (error) {
      console.error('Error during image delete:', error);
      Alert.alert('Error', 'Failed to delete the image.');
    }
  };

  const renderCarouselImages = () => {
    return carouselImages.map((image, index) => (
      <View key={index} style={styles.imageWrapper}>
        <Image source={{ uri: image.uri }} style={styles.carouselImage} />
        <TouchableOpacity
          style={styles.replaceButton}
          onPress={() => handleImagePick(index)}
        >
          <Ionicons name="reload-outline" size={22} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleImageDelete(index)}
        >
          <Ionicons name="trash-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Carousel Images</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.carouselContainer}>
          {renderCarouselImages()}
          {carouselImages.length < 5 && (
            <TouchableOpacity
              style={styles.addImageButton}
              onPress={() => handleImagePick(-1)}
            >
              <Ionicons name="add-circle-outline" size={40} color="#4F46E5" />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
      {imageLimitReached && (
        Alert.alert(
          'Image Limit Reached',
          'You can upload a maximum of 5 images for the carousel.'
        )
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#444',
  },
  carouselContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageWrapper: {
    marginRight: 10,
    position: 'relative',
  },
  carouselImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  replaceButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 5,
    borderRadius: 20,
  },
  deleteButton: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'rgba(255, 0, 0, 0.5)',
    padding: 5,
    borderRadius: 20,
  },
  addImageButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 120,
    height: 120,
    backgroundColor: '#f1f1f1',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CarouselImage;

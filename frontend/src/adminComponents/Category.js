//Category.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from 'react-native-vector-icons';
import { uploadImagesToCloudinary } from '../../API/uploadImage';
import axios from 'axios';
import { SERVER_URL } from '../../Constants/index';

const { width } = Dimensions.get('window');

const Category = () => {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [image, setImage] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [galleryPermission, setGalleryPermission] = useState(null);

  // Fetch category data
  const fetchCategories = async () => {
    try {
      const { data } = await axios.get(`${SERVER_URL}/admin/categories`);
      setCategories(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch categories.');
    }
  };

  // Image picker logic
  const handleImagePick = async () => {
    if (galleryPermission !== 'granted') {
      Alert.alert('Permission Denied', 'Please allow gallery access to upload images.', [{ text: 'OK' }]);
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        console.log('Picked image URI:', result.assets[0].uri);
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick an image.');
    }
  };

  // Handle category add or update
  const handleAddCategory = async () => {
    if (!name || !image) {
      Alert.alert('Validation Error', 'All fields are required.');
      return;
    }

    try {
      setLoading(true);
      const imageUrl = await uploadImagesToCloudinary(image);
      if (!imageUrl) throw new Error('Image upload failed.');

      if (editingCategory) {
        // Edit category
        const { data } = await axios.put(`${SERVER_URL}/admin/updateCategory/${editingCategory._id}`, {
          name,
          image: imageUrl,
        });
        setCategories((prev) =>
          prev.map((cat) => (cat._id === editingCategory._id ? data : cat))
        );
        setEditingCategory(null);
      } else {
        // Add category
        const { data } = await axios.post(`${SERVER_URL}/admin/addcategory`, { name, image: imageUrl });
        setCategories([...categories, data]);
      }

      setName('');
      setImage(null);
      Alert.alert('Success', 'Category saved successfully!');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save category.');
    } finally {
      setLoading(false);
    }
  };

  // Handle editing category
  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setName(category.name);
    setImage(category.image);
  };

  // Handle deleting category
  const handleDeleteCategory = async (id) => {
    try {
      await axios.delete(`${SERVER_URL}/admin/categories/${id}`);
      setCategories(categories.filter((cat) => cat._id !== id));
      Alert.alert('Success', 'Category deleted successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to delete category.');
    }
  };

  // Request gallery permission on load
  useEffect(() => {
    const getPermissions = async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      setGalleryPermission(status);
    };

    fetchCategories();
    getPermissions();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Category Management</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Category Name"
          value={name}
          onChangeText={setName}
        />
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={handleImagePick}
        >
          <Text style={styles.uploadButtonText}>{image ? 'Change Image' : 'Upload Image'}</Text>
        </TouchableOpacity>

        {image && <Image source={{ uri: image }} style={styles.previewImage} />}

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleAddCategory}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {editingCategory ? 'Update Category' : 'Add Category'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>Existing Categories</Text>
      <View style={styles.categoryList}>
        {categories.map((cat) => (
          <View key={cat._id} style={styles.categoryItem}>
            <Image source={{ uri: cat.image }} style={styles.categoryImage} />
            <Text style={styles.categoryName}>{cat.name}</Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => handleEditCategory(cat)}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteCategory(cat._id)}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f9f9f9',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  form: {
    marginBottom: 30,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    elevation: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  uploadButton: {
    backgroundColor: '#0077b6',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  previewImage: {
    width: 100,
    height: 100,
    marginBottom: 15,
    borderRadius: 8,
  },
  submitButton: {
    backgroundColor: '#0077b6',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  categoryList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  categoryItem: {
    width: (width - 60) / 2, // Adjusted width to fit the screen
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150, // Ensures uniform height for items
  },
  categoryImage: {
    width: 90, // Adjusted size for better visual impact
    height: 90,
    borderRadius: 8,
    marginBottom: 10,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  editButton: {
    backgroundColor: '#ffcc00',
    padding: 5,
    borderRadius: 5,
    marginTop: 10,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
    padding: 5,
    borderRadius: 5,
    marginTop: 5,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default Category;

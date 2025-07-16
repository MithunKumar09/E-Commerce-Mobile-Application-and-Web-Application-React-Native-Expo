//frontend/AddBrands.js  //new
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
} from 'react-native';
import { AntDesign, MaterialIcons } from '@expo/vector-icons';

const AddBrands = () => {
  const [brands, setBrands] = useState([
    { id: '1', name: 'Brand A', description: 'Description of Brand A' },
    { id: '2', name: 'Brand B', description: 'Description of Brand B' },
  ]);
  const [brandName, setBrandName] = useState('');
  const [brandDescription, setBrandDescription] = useState('');
  const [editingBrand, setEditingBrand] = useState(null);

  const handleAddOrUpdateBrand = () => {
    if (!brandName.trim() || !brandDescription.trim()) {
      Alert.alert('Validation Error', 'Please enter both brand name and description.');
      return;
    }

    if (editingBrand) {
      setBrands((prevBrands) =>
        prevBrands.map((brand) =>
          brand.id === editingBrand.id
            ? { ...brand, name: brandName, description: brandDescription }
            : brand
        )
      );
      setEditingBrand(null);
    } else {
      const newBrand = {
        id: Math.random().toString(),
        name: brandName,
        description: brandDescription,
      };
      setBrands((prevBrands) => [...prevBrands, newBrand]);
    }

    setBrandName('');
    setBrandDescription('');
  };

  const handleEditBrand = (brand) => {
    setEditingBrand(brand);
    setBrandName(brand.name);
    setBrandDescription(brand.description);
  };

  const handleDeleteBrand = (id) => {
    Alert.alert('Delete Confirmation', 'Are you sure you want to delete this brand?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => setBrands((prevBrands) => prevBrands.filter((brand) => brand.id !== id)),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Brands</Text>

      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Brand Name"
          value={brandName}
          onChangeText={setBrandName}
        />
        <TextInput
          style={styles.input}
          placeholder="Brand Description"
          value={brandDescription}
          onChangeText={setBrandDescription}
        />
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.saveButton} onPress={handleAddOrUpdateBrand}>
            <Text style={styles.buttonText}>{editingBrand ? 'Update' : 'Save'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              setBrandName('');
              setBrandDescription('');
              setEditingBrand(null);
            }}
          >
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={brands}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.brandItem}>
            <View style={styles.brandDetails}>
              <Text style={styles.brandName}>{item.name}</Text>
              <Text style={styles.brandDescription}>{item.description}</Text>
            </View>
            <View style={styles.actionIcons}>
              <TouchableOpacity onPress={() => handleEditBrand(item)}>
                <AntDesign name="edit" size={24} color="blue" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteBrand(item.id)}>
                <MaterialIcons name="delete" size={24} color="red" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f9f9f9',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  formContainer: {
    marginBottom: 20,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  saveButton: {
    backgroundColor: 'blue',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginRight: 5,
  },
  cancelButton: {
    backgroundColor: 'grey',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginLeft: 5,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
  },
  brandItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  brandDetails: {
    flex: 1,
  },
  brandName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  brandDescription: {
    fontSize: 14,
    color: '#666',
  },
  actionIcons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 60,
  },
});

export default AddBrands;

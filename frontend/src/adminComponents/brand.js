import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, Modal, StyleSheet, Alert } from 'react-native';
import axios from 'axios';
import Icon from 'react-native-vector-icons/FontAwesome';
import { SERVER_URL } from '../../Constants/index';

const Brand = () => {
  const [brands, setBrands] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editBrandId, setEditBrandId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const response = await axios.get(`${SERVER_URL}/admin/brands`);
      setBrands(response.data);
    } catch (error) {
      console.error('Error fetching brands:', error);
    }
  };

  const validateBrand = (name, description) => {
    if (!name || !description) return 'Name and description are required.';
    if (name.length > 50) return 'Name cannot exceed 50 characters.';
    if (/\d/.test(name) && name.replace(/\D/g, '').length > 10) return 'Name cannot contain more than 10 digits.';
    if (description.length > 150) return 'Description cannot exceed 150 characters.';
    if (!/^[a-zA-Z0-9\s]+$/.test(name)) return 'Name can only contain alphanumeric characters and spaces.';
    return null;
  };

  const addBrand = async () => {
    setError('');
    const validationError = validateBrand(name, description);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const newBrand = { name, description };
      const response = await axios.post(`${SERVER_URL}/admin/addBrand`, newBrand);
      setBrands([...brands, response.data]);
      clearFormFields();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error adding brand:', error);
      Alert.alert('Error', 'Failed to add brand. Please try again.');
    }
  };

  const updateBrand = async () => {
    setError('');
    const validationError = validateBrand(name, description);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const updatedBrand = { name, description };
      const response = await axios.put(`${SERVER_URL}/admin/updateBrand/${editBrandId}`, updatedBrand);
      setBrands(brands.map((brand) => (brand._id === editBrandId ? response.data : brand)));
      clearFormFields();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error updating brand:', error);
      Alert.alert('Error', 'Failed to update brand. Please try again.');
    }
  };

  const deleteBrand = async (id) => {
    try {
      await axios.delete(`${SERVER_URL}/admin/deleteBrand/${id}`);
      setBrands(brands.filter((brand) => brand._id !== id));
    } catch (error) {
      console.error('Error deleting brand:', error);
      Alert.alert('Error', 'Failed to delete brand. Please try again.');
    }
  };

  const openEditModal = (brand) => {
    setEditBrandId(brand._id);
    setName(brand.name);
    setDescription(brand.description);
    setIsModalOpen(true);
  };

  const clearFormFields = () => {
    setName('');
    setDescription('');
    setError('');
  };

  const renderBrandItem = ({ item }) => (
    <View style={styles.brandItem}>
      <Text style={styles.brandText}>{item.name}</Text>
      <Text style={styles.brandText}>{item.description}</Text>
      <View style={styles.actionIcons}>
        <TouchableOpacity onPress={() => openEditModal(item)}>
          <Icon name="edit" size={20} color="blue" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => deleteBrand(item._id)}>
          <Icon name="trash" size={20} color="red" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Brands</Text>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          clearFormFields();
          setIsModalOpen(true);
        }}
      >
        <Text style={styles.addButtonText}>Add Brand</Text>
      </TouchableOpacity>

      {/* Use FlatList directly for scrolling */}
      <FlatList
        data={brands}
        keyExtractor={(item) => item._id}
        renderItem={renderBrandItem}
        ListHeaderComponent={<View />}
        contentContainerStyle={styles.flatListContainer} // Container style to ensure proper scroll behavior
      />

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <Modal transparent visible animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalHeader}>{editBrandId ? 'Edit Brand' : 'Add Brand'}</Text>
              <TextInput
                style={styles.input}
                placeholder="Name"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  setError(validateBrand(text, description));
                }}
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description"
                value={description}
                multiline
                onChangeText={(text) => {
                  setDescription(text);
                  setError(validateBrand(name, text));
                }}
              />
              {error && <Text style={styles.errorText}>{error}</Text>}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setIsModalOpen(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={editBrandId ? updateBrand : addBrand}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: '#28a745',
    padding: 10,
    borderRadius: 5,
    marginBottom: 16,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  brandItem: {
    padding: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
  },
  brandText: {
    fontSize: 16,
  },
  actionIcons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  flatListContainer: {
    paddingBottom: 20, // Ensuring there's padding at the bottom of the list
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
  },
  modalHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  input: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 12,
    paddingLeft: 10,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    backgroundColor: '#ccc',
    padding: 10,
    borderRadius: 5,
  },
  cancelButtonText: {
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#28a745',
    padding: 10,
    borderRadius: 5,
  },
  saveButtonText: {
    color: '#fff',
  },
});

export default Brand;

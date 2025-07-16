import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Modal, TouchableWithoutFeedback } from 'react-native';
import { DataTable } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { SERVER_URL } from '../../Constants/index';
import { BlurView } from 'expo-blur';
import { useUserStore } from "../store/userStore";

const SalesMan = () => {
  const [salesmen, setSalesmen] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', role: '' });
  const [password, setPassword] = useState('');
  const [newSalesman, setNewSalesman] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const { setSalesman } = useUserStore();

  useEffect(() => {
    const fetchSalesmen = async () => {
      try {
        console.log("Fetching token from SecureStore...");
        const token = await SecureStore.getItemAsync('adminToken');
        console.log("Retrieved token:", token);
  
        if (!token) {
          console.error("Token is missing or invalid.");
          Alert.alert("Error", "Failed to fetch token. Please login again.");
          return;
        }
  
        console.log("Fetching salesman data from server...");
        const response = await axios.get(`${SERVER_URL}/admin/salesman`, {
          headers: { Authorization: `Bearer ${token}` },
        });
  
        console.log("Salesman data retrieved from server:", response.data);
        if (!response.data.salesmen || response.data.salesmen.length === 0) {
          console.log("No salesman data found in the response.");
        } else {
          console.log(`Number of salesmen retrieved: ${response.data.salesmen.length}`);
        }
  
        setSalesmen(response.data.salesmen);
      } catch (error) {
        console.error("Error fetching salesmen:", error.response?.data || error.message);
        if (error.response) {
          console.error("Server response:", error.response.data);
        } else {
          console.error("No response received from server.");
        }
  
        Alert.alert(
          "Error",
          error.response?.data?.error || "An error occurred while fetching the salesman accounts."
        );
      }
    };
  
    fetchSalesmen();
  }, []);
  

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const tempPassword = Array.from({ length: 8 }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join('');
    setPassword(tempPassword);
    return tempPassword;
  };

  const handleCreateAccount = async () => {
    if (!form.name || !form.email || !form.role) {
      Alert.alert('Validation Error', 'All fields are required.');
      return;
    }

    const tempPassword = generatePassword();

    try {
      const token = await SecureStore.getItemAsync('adminToken');
      const response = await axios.post(
        `${SERVER_URL}/admin/create-salesman`,
        { name: form.name, email: form.email, role: form.role, password: tempPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { message, salesman } = response.data;
      Alert.alert('Success', message);

      setSalesmen([...salesmen, salesman]);
      setForm({ name: '', email: '', role: '' });
      setPassword('');
      setNewSalesman({ ...salesman, password: tempPassword });
      setModalVisible(true);
      setSalesman(salesman);
    } catch (error) {
      console.error('Error creating salesman:', error.response?.data || error.message);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'An error occurred while creating the salesman account.'
      );
    }
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setNewSalesman(null);
  };

  //frontend
  const handleDeleteSalesman = async (id) => {
    if (!id) {
      Alert.alert('Error', 'Invalid salesman ID');
      return;
    }
  
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await axios.delete(`${SERVER_URL}/admin/delete-salesman/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
  
      if (response.status === 200) {
        setSalesmen(salesmen.filter((salesman) => salesman._id !== id));
        Alert.alert('Success', 'Salesman account deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting salesman:', error.response?.data || error.message);
      Alert.alert('Error', 'An error occurred while deleting the salesman account.');
    }
  };
  

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Salesman Account Management</Text>

      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Salesman Name"
          value={form.name}
          onChangeText={(text) => setForm({ ...form, name: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Email Address"
          keyboardType="email-address"
          value={form.email}
          onChangeText={(text) => setForm({ ...form, email: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Role (e.g., Sales Executive)"
          value={form.role}
          onChangeText={(text) => setForm({ ...form, role: text })}
        />

        <TouchableOpacity style={styles.button} onPress={handleCreateAccount}>
          <Text style={styles.buttonText}>Create Salesman Account</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subHeading}>Existing Salesmen</Text>
      <View style={styles.salesmenContainer}>
        <DataTable>
          <DataTable.Header>
            <DataTable.Title style={styles.tableHeader}>Name</DataTable.Title>
            <DataTable.Title style={styles.tableHeader}>Email</DataTable.Title>
            <DataTable.Title style={styles.tableHeader}>Role</DataTable.Title>
            <DataTable.Title style={styles.tableHeader}>Actions</DataTable.Title>
          </DataTable.Header>

          {salesmen.map((salesman) => (
            <DataTable.Row key={salesman._id}>
              <DataTable.Cell>{salesman.name}</DataTable.Cell>
              <DataTable.Cell>{salesman.email}</DataTable.Cell>
              <DataTable.Cell>{salesman.role}</DataTable.Cell>
              <DataTable.Cell style={styles.actionCell}>
                <TouchableOpacity onPress={() => handleDeleteSalesman(salesman._id)}>
                  <Icon name="delete" size={24} color="#ff6347" />
                </TouchableOpacity>
              </DataTable.Cell>
            </DataTable.Row>
          ))}
        </DataTable>
      </View>

      {modalVisible && newSalesman && (
        <Modal
          transparent={true}
          visible={modalVisible}
          animationType="fade"
          onRequestClose={handleCloseModal}
        >
          <TouchableWithoutFeedback onPress={handleCloseModal}>
            <View style={styles.overlay}>
              <BlurView intensity={50} style={styles.blurContainer}>
                <View style={styles.modalCard}>
                  <Text style={styles.modalTitle}>New Salesman Created</Text>
                  <Text style={styles.modalText}>Username: {newSalesman.name}</Text>
                  <Text style={styles.modalText}>Email: {newSalesman.email}</Text>
                  <Text style={styles.modalText}>Password: {newSalesman.password}</Text>

                  <View style={styles.modalButtons}>
                    <TouchableOpacity onPress={handleCloseModal} style={styles.closeButton}>
                      <Icon name="close" size={24} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {}}
                      style={styles.mailButton}
                    >
                      <Icon name="mail" size={24} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>
              </BlurView>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f9f9f9',
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  formContainer: {
    marginBottom: 20,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 10,
    paddingLeft: 10,
    backgroundColor: '#f5f5f5',
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
  subHeading: {
    fontSize: 18,
    marginVertical: 10,
    fontWeight: 'bold',
    color: '#555',
  },
  salesmenContainer: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  tableHeader: {
    fontWeight: 'bold',
    color: '#444',
  },
  actionCell: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignSelf: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 10,
  },
  closeButton: {
    marginRight: 20,
    padding: 10,
    backgroundColor: '#ff6347',
    borderRadius: 50,
  },
  mailButton: {
    padding: 10,
    backgroundColor: '#1e90ff',
    borderRadius: 50,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  blurContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    borderRadius: 10,
  },
});

export default SalesMan;

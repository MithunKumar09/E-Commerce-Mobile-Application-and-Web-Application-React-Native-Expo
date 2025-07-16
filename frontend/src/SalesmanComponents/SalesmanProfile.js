import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { SERVER_URL } from "../../Constants/index";
import { useUserStore } from "../store/userStore";
import { useNavigation } from '@react-navigation/native';

const SalesmanProfile = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState({
    name: "",
    state: "",
    nationality: "",
  });
  const { salesman, isAuthenticated, checkSalesmanAuthentication, signOutSalesman } = useUserStore((state) => state);
  const navigation = useNavigation();
  const [isSalesman, setSalesman] = useState(false); 
  const [isAdmin, setAdmin] = useState(false);

const salesmanId=salesman?._id;

  // Fetch real data for the authenticated salesman
// Fetch real data for the authenticated salesman
useEffect(() => {
  const fetchSalesmanData = async () => {
    try {
      console.log("Starting authentication check...");
      await checkSalesmanAuthentication();
      console.log("Authentication check completed. Authenticated:", isAuthenticated);

      if (!isAuthenticated) {
        Alert.alert("Not Authenticated", "Please login to access this page.");
        setLoading(false);
        return;
      }

      console.log("Fetching token from SecureStore...");
      const token = await SecureStore.getItemAsync("salesmanToken");
      console.log("Retrieved token:", token);

      if (!token) {
        console.log("Token is missing or invalid.");
        Alert.alert("Error", "Failed to fetch token. Please login again.");
        setLoading(false);
        return;
      }

      console.log("Fetching salesman profile data...");
      const response = await axios.get(`${SERVER_URL}/salesman/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("Salesman profile data retrieved:", response.data);

      const { _id, email, name, state, nationality } = response.data;
      setEmail(email);
      setName(name);
      setFormState({ name, state, nationality });

      if (_id) {
        console.log("Salesman ID retrieved:", _id);
      } else {
        console.error("Salesman ID is missing in response.");
      }

      console.log("Profile data set in state:", { _id, email, name, state, nationality });
    } catch (error) {
      console.error("Error fetching salesman data:", error.message);
      Alert.alert(
        "Error",
        "An error occurred while fetching your profile data. Please try again later."
      );
    } finally {
      console.log("Setting loading to false.");
      setLoading(false);
    }
  };

  fetchSalesmanData();
}, [isAuthenticated, checkSalesmanAuthentication]);


  const handleInputChange = (field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdateProfile = async () => {
    try {
      const token = await SecureStore.getItemAsync("salesmanToken");
      await axios.put(
        `${SERVER_URL}/salesman/profile`,
        { ...formState },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      Alert.alert("Profile Updated", "Your profile has been updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error.message);
      Alert.alert(
        "Error",
        "An error occurred while updating your profile. Please try again later."
      );
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutSalesman();
      useUserStore.getState().resetSalesman();
      Alert.alert("Logged out", "You have successfully logged out");
      navigation.navigate("HomePage");
    } catch (error) {
      console.error("Error during sign-out:", error);
      Alert.alert("Error", "There was an issue signing you out");
    }
  };
  

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Salesman Profile</Text>

      {/* Display Salesman Details */}
      <View style={styles.infoSection}>
        <Text style={styles.label}>Email:</Text>
        <Text style={styles.value}>{email}</Text>
        <Text style={styles.label}>Name:</Text>
        <Text style={styles.value}>{name}</Text>
      </View>

      {/* Current Profile Information */}
      <View style={styles.infoSection}>
        <Text style={styles.label}>State:</Text>
        <Text style={styles.value}>{formState.state}</Text>
        <Text style={styles.label}>Nationality:</Text>
        <Text style={styles.value}>{formState.nationality}</Text>
      </View>

      {/* Update Profile Form */}
      <View style={styles.form}>
        <Text style={styles.subHeading}>Update Profile Information</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter Name"
          value={formState.name}
          onChangeText={(value) => handleInputChange("name", value)}
        />
        <TextInput
          style={styles.input}
          placeholder="Enter State"
          value={formState.state}
          onChangeText={(value) => handleInputChange("state", value)}
        />
        <TextInput
          style={styles.input}
          placeholder="Enter Nationality"
          value={formState.nationality}
          onChangeText={(value) => handleInputChange("nationality", value)}
        />
        <Button title="Update Profile" onPress={handleUpdateProfile} color="#007bff" />
      </View>

      {/* Sign Out Button */}
      <View style={styles.signOutButton}>
        <Button title="Sign Out" onPress={handleSignOut} color="#d9534f" />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 5,
    backgroundColor: "#f5f5f5",
  },
  heading: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  subHeading: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 15,
    color: "#333",
  },
  infoSection: {
    marginBottom: 20,
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 8,
    elevation: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#007bff",
  },
  value: {
    fontSize: 16,
    marginBottom: 10,
    color: "#333",
  },
  form: {
    marginBottom: 20,
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 8,
    elevation: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    backgroundColor: "#f9f9f9",
    fontSize: 16,
  },
  signOutButton: {
    marginTop: 20,
  },
});

export default SalesmanProfile;

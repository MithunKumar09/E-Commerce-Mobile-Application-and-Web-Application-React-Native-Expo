import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  Dimensions,
} from "react-native";
import { FontAwesome, Feather, MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import axios from 'axios';
import { SERVER_URL } from '../../Constants/index';
const { width } = Dimensions.get("window");
import io from "socket.io-client";

const Voucher = () => {
  const [vouchers, setVouchers] = useState([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    productName: "",
    voucherPrice: "",
    productPrice: "",
    image: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formVisible, setFormVisible] = useState(false);
  // State for DateTimePicker visibility
  const [datePicker, setDatePicker] = useState({
    field: null,
    show: false,
    mode: "date",
  });
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const socketConnection = io(SERVER_URL); // Establish WebSocket connection
    setSocket(socketConnection);

    socketConnection.on("voucherUpdated", (updatedVouchers) => {
      setVouchers(updatedVouchers); // Update vouchers in real-time
    });

    return () => {
      socketConnection.disconnect(); // Cleanup WebSocket connection on unmount
    };
  }, []);

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const showDateTimePicker = (field, mode) => {
    setDatePicker({ field, show: true, mode });
  };

  const handleDateTimeChange = (event, selectedDate) => {
    if (selectedDate) {
      const field = datePicker.field;
      const value =
        datePicker.mode === "date"
          ? selectedDate.toISOString().split("T")[0]
          : selectedDate.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });

      handleInputChange(field, value);
    }
    setDatePicker({ ...datePicker, show: false });
  };



  const handleSaveVoucher = async () => {
    if (!formData.name || !formData.productName || !formData.voucherPrice) {
      Alert.alert("Missing Fields", "Please fill out all required fields.");
      return;
    }
    const newVoucher = {
      id: isEditing ? editingId : Date.now().toString(),
      ...formData,
    };

    try {
      const response = await fetch(`${SERVER_URL}/admin/voucher`, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newVoucher),
      });

      if (response.ok) {
        if (isEditing) {
          setVouchers((prev) =>
            prev.map((v) => (v.id === editingId ? newVoucher : v))
          );
          Alert.alert("Success", "Voucher updated successfully.");
        } else {
          setVouchers([newVoucher, ...vouchers]);
          Alert.alert("Success", "Voucher added successfully.");
        }
        resetForm();
        setFormVisible(false);
      } else {
        const error = await response.json();
        Alert.alert("Error", error.message || "Something went wrong.");
      }
    } catch (error) {
      Alert.alert("Error", "Network error. Please try again.");
    }
  };


  useEffect(() => {
    // Fetch vouchers when the component mounts
    const fetchVouchers = async () => {
      try {
        console.log("Fetching vouchers from the server...");
        const response = await fetch(`${SERVER_URL}/admin/vouchers`); // Endpoint for fetching vouchers

        if (response.ok) {
          const data = await response.json();
          console.log("Vouchers fetched successfully:", data); // Log the fetched data
          // Ensure data is an array before setting the vouchers state
          setVouchers(Array.isArray(data.vouchers) ? data.vouchers : []); // Safely set vouchers to an array
        } else {
          const error = await response.json();
          console.log("Error fetching vouchers:", error.message || "Failed to fetch vouchers");
          Alert.alert("Error", error.message || "Failed to fetch vouchers.");
        }
      } catch (error) {
        console.log("Network error while fetching vouchers:", error);
        Alert.alert("Error", "Network error. Please try again.");
      }
    };

    fetchVouchers();
  }, []);


  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      productName: "",
      voucherPrice: "",
      productPrice: "",
      image: "",
      startDate: "",
      startTime: "",
      endDate: "",
      endTime: "",
    });
    setIsEditing(false);
    setEditingId(null);
  };

  const handleEditVoucher = (voucher) => {
    setFormData(voucher);
    setIsEditing(true);
    setEditingId(voucher.id);
    setFormVisible(true);
  };

  const handleDeleteVoucher = (id) => {
    setVouchers((prev) => prev.filter((v) => v.id !== id));
    Alert.alert("Success", "Voucher deleted successfully.");
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Permission to access gallery is required.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setFormData({ ...formData, image: result.assets[0].uri });
    }
  };

  const filteredVouchers = vouchers.filter((voucher) => {
    // Added a check to avoid errors if voucher.product_name is undefined
    return (voucher.product_name && voucher.product_name.toLowerCase().includes(searchQuery.toLowerCase())) || false;
  });

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Manage Vouchers</Text>

      {/* Add Voucher Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setFormVisible(!formVisible)} // Toggle form visibility
      >
        <Text style={styles.addButtonText}>
          {formVisible ? "Cancel" : "Add New Voucher"}
        </Text>
      </TouchableOpacity>

      {/* Form */}
      {formVisible && (
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>
            {isEditing ? "Edit Voucher" : "Add New Voucher"}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Name"
            value={formData.name}
            onChangeText={(value) => handleInputChange("name", value)}
          />
          <TextInput
            style={styles.input}
            placeholder="Description"
            value={formData.description}
            onChangeText={(value) => handleInputChange("description", value)}
          />
          <TextInput
            style={styles.input}
            placeholder="Product Name"
            value={formData.productName}
            onChangeText={(value) => handleInputChange("productName", value)}
          />
          <TextInput
            style={styles.input}
            placeholder="Minimum bid Amount"
            keyboardType="numeric"
            value={formData.voucherPrice}
            onChangeText={(value) => handleInputChange("voucherPrice", value)}
          />
          <TextInput
            style={styles.input}
            placeholder="Product Price"
            keyboardType="numeric"
            value={formData.productPrice}
            onChangeText={(value) => handleInputChange("productPrice", value)}
          />
          <TouchableOpacity
            style={styles.imageButton}
            onPress={handlePickImage}
          >
            <Text style={styles.imageButtonText}>Pick Image</Text>
          </TouchableOpacity>
          {formData.image ? (
            <Image source={{ uri: formData.image }} style={styles.previewImage} />
          ) : null}
          {/* Start Date */}
          <TouchableOpacity
            style={styles.inputRow}
            onPress={() => showDateTimePicker("startDate", "date")}
          >
            <TextInput
              style={styles.input}
              placeholder="Start Date"
              value={formData.startDate}
              editable={false}
            />
            <FontAwesome name="calendar" size={20} color="#007bff" />
          </TouchableOpacity>

          {/* Start Time */}
          <TouchableOpacity
            style={styles.inputRow}
            onPress={() => showDateTimePicker("startTime", "time")}
          >
            <TextInput
              style={styles.input}
              placeholder="Start Time"
              value={formData.startTime}
              editable={false}
            />
            <Feather name="clock" size={20} color="#007bff" />
          </TouchableOpacity>

          {/* End Date */}
          <TouchableOpacity
            style={styles.inputRow}
            onPress={() => showDateTimePicker("endDate", "date")}
          >
            <TextInput
              style={styles.input}
              placeholder="End Date"
              value={formData.endDate}
              editable={false}
            />
            <FontAwesome name="calendar" size={20} color="#007bff" />
          </TouchableOpacity>

          {/* End Time */}
          <TouchableOpacity
            style={styles.inputRow}
            onPress={() => showDateTimePicker("endTime", "time")}
          >
            <TextInput
              style={styles.input}
              placeholder="End Time"
              value={formData.endTime}
              editable={false}
            />
            <Feather name="clock" size={20} color="#007bff" />
          </TouchableOpacity>

          {/* DateTimePicker */}
          {datePicker.show && (
            <DateTimePicker
              value={new Date()}
              mode={datePicker.mode}
              display="default"
              onChange={handleDateTimeChange}
            />
          )}
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveVoucher}
          >
            <Text style={styles.saveButtonText}>
              {isEditing ? "Update Voucher" : "Add Voucher"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <TextInput
        style={styles.searchBar}
        placeholder="Search by Product Name"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

<FlatList
  data={filteredVouchers}
  renderItem={({ item }) => (
    <View style={styles.voucherContainer}>
      <View style={styles.voucherInfo}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.voucherImage} />
        ) : null}
        <View style={styles.voucherText}>
          <Text style={styles.voucherName}>{item.product_name}</Text>
          <Text style={styles.voucherVoucherName}>{item.voucher_name}</Text>
          <Text style={styles.voucherPrice}>₹ {item.price}</Text>
          <Text style={styles.productPrice}>Product Price: ₹ {item.productPrice}</Text>
          <Text style={styles.voucherDetails}>Details: {item.details}</Text>
          <Text style={styles.voucherTime}>
            Start Time: {new Date(item.start_time).toLocaleString()}
          </Text>
          <Text style={styles.voucherTime}>
            End Time: {new Date(item.end_time).toLocaleString()}
          </Text>
          <Text style={styles.voucherStatus}>
  Status: {item.is_expired ? 'Expired' : item.is_scheduled ? 'Scheduled' : 'Active'}
</Text>

          <Text style={styles.rebidStatus}>
            Rebidding: {item.rebid_active ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>
      <View style={styles.voucherActions}>
        <TouchableOpacity onPress={() => handleEditVoucher(item)}>
          <MaterialIcons name="edit" size={24} color="#007bff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDeleteVoucher(item._id)}>
          <MaterialIcons name="delete" size={24} color="red" />
        </TouchableOpacity>
      </View>
    </View>
  )}
  keyExtractor={(item) => item._id.toString()}
/>



    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  formContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#f1f1f1",
    padding: 10,
    marginBottom: 12,
    borderRadius: 8,
    fontSize: 16,
    color: "#333",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    marginBottom: 15,
  },
  saveButton: {
    backgroundColor: "#007bff",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    marginTop: 10,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },
  searchBar: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  addButton: {
    backgroundColor: "#28a745",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },
  actionButton: {
    padding: 8,
    borderRadius: 5,
    backgroundColor: '#f1f1f1',
    margin: 4,
  },
  voucherContainer: {
    padding: 20,
    marginBottom: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    elevation: 2, // Shadow effect for Android
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  voucherInfo: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  voucherImage: {
    width: 120,
    height: 120,
    borderRadius: 10,
    marginBottom: 16,
    resizeMode: 'cover',
  },
  voucherText: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  voucherName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  voucherVoucherName: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  voucherPrice: {
    fontSize: 16,
    color: '#007bff',
    marginTop: 4,
  },
  productPrice: {
    fontSize: 16,
    color: '#555',
    marginTop: 4,
  },
  voucherDetails: {
    fontSize: 14,
    color: '#444',
    marginTop: 4,
  },
  voucherTime: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  rebidStatus: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  voucherActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    alignItems: 'center',
  },
});


export default Voucher;

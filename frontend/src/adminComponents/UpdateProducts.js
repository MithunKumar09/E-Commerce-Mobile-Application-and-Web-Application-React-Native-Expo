// Updated frontend/UpdateProducts.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  Modal, ScrollView
} from "react-native";
import { BlurView } from "expo-blur";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import axios from 'axios';
import { SERVER_URL } from '../../Constants/index';
import { uploadImagesToCloudinary, uploadVideoToCloudinary } from '../../API/uploadImage';
const placeholderImage = "https://via.placeholder.com/150";

const UpdateProducts = () => {
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [formVisible, setFormVisible] = useState(false);
  const [viewDetail, setViewDetail] = useState(null);
  const [formData, setFormData] = useState({
    id: null,
    name: "",
    description: "",
    category: "",
    brand: "",
    productPrice: "",
    salesPrice: "",
    discount: "",
    color: "",
    quantity: "",
    mainImage: null,
    thumbnails: [],
    demoVideo: null,
    cashOnDelivery: "Not available",
    codAmount: "",
  });
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchBrands();
    fetchCategories();
    fetchProducts();
  }, []);

  const fetchBrands = async () => {
    try {
      const response = await axios.get(`${SERVER_URL}/admin/brands`);
      console.log('Brands fetched:', response.data);  // Log the retrieved brands
      setBrands(response.data);
    } catch (error) {
      console.error('Error fetching brands:', error);
    }
  };

  // Fetch category data
  const fetchCategories = async () => {
    try {
      const { data } = await axios.get(`${SERVER_URL}/admin/categories`);
      console.log('Categories Retrieved:', data);  // Log the categories data
      // Extract only the 'name' from each category for the dropdown
      const categoryNames = data.map(category => category.name);
      setCategories(categoryNames);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch categories.');
    }
  };

  // Fetch products from the database
  const fetchProducts = async () => {
    try {
      console.log("Fetching products from the database...");
      const response = await axios.get(`${SERVER_URL}/admin/products`);
      console.log("Initial products fetched:", response.data);

      const populatedProducts = await Promise.all(
        response.data.map(async (product) => {
          console.log(`Fetching details for product ID: ${product._id}`);
          const populatedProduct = await axios.get(
            `${SERVER_URL}/admin/products/${product._id}?populate=images`
          );
          console.log(`Populated product details for ID ${product._id}:`, populatedProduct.data);

          // Log the images array from the populated product
          if (populatedProduct.data.images) {
            console.log(`Images for product ID ${product._id}:`, populatedProduct.data.images);
          } else {
            console.log(`No images found for product ID ${product._id}.`);
          }

          return populatedProduct.data;
        })
      );

      console.log("All populated products:", populatedProducts);
      setProducts(populatedProducts); // Set fetched products with populated images
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]); // Set to empty array on error
    }
  };




  const handleInputChange = (field, value) => {
    setFormData((prev) => {
      let updatedData = { ...prev, [field]: value };

      // Automatically calculate salesPrice when productPrice or discount changes
      if ((field === "productPrice" || field === "discount") && updatedData.productPrice && updatedData.discount) {
        const productPrice = parseFloat(updatedData.productPrice);
        const discount = parseFloat(updatedData.discount);

        if (!isNaN(productPrice) && !isNaN(discount)) {
          const salesPrice = productPrice - (productPrice * discount) / 100;
          updatedData.salesPrice = salesPrice.toFixed(2); // Keep 2 decimal places for salesPrice
        }
      }

      return updatedData;
    });
  };


  const handleAddNewProduct = () => {
    setFormData({
      id: null,
      name: "",
      description: "",
      category: "",
      brand: "",
      productPrice: "",
      salesPrice: "",
      discount: "",
      color: "",
      quantity: "",
      mainImage: null,
      thumbnails: [],
      cashOnDelivery: "Not available",
      codAmount: "",
    });
    setFormVisible(true);
  };

  const handleUpdateProduct = (product) => {
    setFormData(product);
    setFormVisible(true);
  };

  const handleDeleteProduct = (id) => {
    setProducts((prev) => prev.filter((item) => item.id !== id));
  };

  const validateForm = () => {
    if (!formData.name || !formData.description || !formData.category || !formData.productPrice || !formData.salesPrice) {
      alert("Please fill out all required fields.");
      return false;
    }
    return true;
  };


  const handleSaveProduct = async () => {
    // Validate form before saving
    if (!validateForm()) return;

    // Ensure sales price is valid
    if (parseFloat(formData.salesPrice) >= parseFloat(formData.productPrice)) {
      alert("Sales price should be less than productPrice");
      return;
    }

    try {
      // Upload main image to Cloudinary with check for valid URI
      let mainImageUrl = null;
      if (formData.mainImage) {
        mainImageUrl = await uploadImagesToCloudinary(formData.mainImage);
        if (!mainImageUrl) {
          alert("Failed to upload main image. Please try again.");
          return; // Return to stop further execution if main image upload fails
        }
      } else {
        alert("Main image is required.");
        return; // Stop execution if main image is not provided
      }
    
      // If main image is uploaded successfully, proceed with demo video upload
      let demoVideoUrl = null;
      if (formData.demoVideo) {
        demoVideoUrl = await uploadVideoToCloudinary(formData.demoVideo);
        if (!demoVideoUrl) {
          alert("Failed to upload demo video. Please try again.");
          return; // Return to stop further execution if demo video upload fails
        }
      }

      // Validate and upload thumbnails
      const validThumbnailUrls = [];
      for (const imageUri of formData.thumbnails) {
        if (imageUri) {
          const thumbnailUrl = await uploadImagesToCloudinary(imageUri);
          if (thumbnailUrl) {
            validThumbnailUrls.push(thumbnailUrl);
          } else {
            console.log("Skipping invalid thumbnail:", imageUri);  // Log the invalid thumbnail URI
          }
        } else {
          console.log("Skipping invalid thumbnail: missing URI"); // Additional check
        }
      }

      // Prepare product data to send to the backend
      const productWithImages = {
        name: formData.name,
        description: formData.description,
        productPrice: formData.productPrice,
        salePrice: formData.salesPrice,
        category: formData.category,
        brand: formData.brand,
        quantity: formData.quantity,
        color: formData.color,
        discount: formData.discount,
        demoVideoUrl,
        cashOnDelivery: formData.cashOnDelivery, // Include cashOnDelivery field
        codAmount: formData.codAmount,
        images: {
          imageUrl: mainImageUrl, // Main image URL
          thumbnailUrl: validThumbnailUrls.length > 0 ? validThumbnailUrls : [], // Filtered valid thumbnails
        },
      };

      // Log product data for debugging
      console.log("Product data being sent to backend:", productWithImages);

      // Send product data to the backend
      const response = await axios.post(
        `${SERVER_URL}/admin/addProducts`,
        productWithImages
      );

      if (response.status === 201) {
        // Update the product list after successful save
        setProducts((prev) => [...prev, response.data]);

        // Reset the form and close the modal
        setFormData({
          id: null,
          name: "",
          description: "",
          category: "",
          brand: "",
          productPrice: "",
          salesPrice: "",
          discount: "",
          color: "",
          quantity: "",
          mainImage: null,
          thumbnails: [],
          cashOnDelivery: "Not available",
          codAmount: "",
        });

        setFormVisible(false);
      } else {
        alert("Failed to add product");
      }
    } catch (error) {
      console.error("Error saving product:", error);
      alert("Error saving product");
    }

    // Update the local product data (for local updates)
    if (!formData.id) {
      setProducts((prev) => [...prev, { ...formData, id: Date.now().toString() }]);
    } else {
      setProducts((prev) =>
        prev.map((item) => (item.id === formData.id ? { ...formData } : item))
      );
    }
    setFormVisible(false);
  };



  const handleImagePicker = async (field) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: field === "thumbnails",
    });
    if (!result.canceled) {
      if (field === "mainImage") {
        handleInputChange(field, result.assets[0].uri);
      } else if (field === "thumbnails") {
        handleInputChange(field, [
          ...formData.thumbnails,
          ...result.assets.filter((asset) => asset.uri).map((asset) => asset.uri), // Ensure only valid URIs
        ]);
      }
    }
  };

    // New function to handle demo video picking using MediaLibrary
    const handleVideoPicker = async () => {
      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos, // Specify to only pick videos
          quality: 1,  // Optional: set video quality
        });
  
        if (!result.canceled) {
          handleInputChange("demoVideo", result.assets[0].uri); // Save video URI to state
        } else {
          alert('No video selected.');
        }
      } catch (error) {
        console.error('Error picking video:', error);
        alert('Error selecting video');
      }
    };


  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Update Products</Text>
      <TextInput
        style={styles.searchInput}
        placeholder="Search by product name"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      <TouchableOpacity style={styles.addButton} onPress={handleAddNewProduct}>
        <Text style={styles.addButtonText}>Add New Product</Text>
      </TouchableOpacity>
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => (item._id ? item._id.toString() : Date.now().toString())}
        renderItem={({ item }) => (
          <View style={styles.productCard}>
            <View style={styles.productRow}>
              <Image
                source={{
                  uri: item.images?.imageUrl || placeholderImage,
                }}
                style={styles.productImage}
              />
              <View style={styles.productDetails}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text>Price: ${item.productPrice}</Text>
                <Text>Sales Price: ${item.salePrice}</Text>
                <TouchableOpacity
                  style={styles.viewMoreButton}
                  onPress={() => setViewDetail(item)}
                >
                  <Text style={styles.viewMoreText}>View More</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleUpdateProduct(item)}
              >
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteProduct(item.id)}
              >
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
      <Modal visible={formVisible} transparent animationType="slide">
        <BlurView intensity={50} style={styles.blurContainer}>
          <ScrollView contentContainerStyle={styles.formContainer}>
            <TextInput
              style={styles.input}
              placeholder="Product Name"
              value={formData.name}
              onChangeText={(text) => handleInputChange("name", text)}
            />
            <TextInput
              style={styles.input}
              placeholder="Description"
              value={formData.description}
              onChangeText={(text) => handleInputChange("description", text)}
              maxLength={50}
            />
            <Text style={styles.label}>Select Category:</Text>
            <FlatList
              data={categories}
              horizontal
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    formData.category === item && styles.selectedItem
                  ]}
                  onPress={() => handleInputChange("category", item)}
                >
                  <Text>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <Text style={styles.label}>Select Brand:</Text>
            <FlatList
              data={brands}
              horizontal
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.dropdownItem, formData.brand === item.name && styles.selectedItem]}
                  onPress={() => handleInputChange("brand", item.name)}
                >
                  <Text>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <TextInput
              style={styles.input}
              placeholder="Price"
              value={formData.productPrice}
              onChangeText={(text) => handleInputChange("productPrice", text)}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Discount (%)"
              value={formData.discount}
              onChangeText={(text) => handleInputChange("discount", text)}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Sales Price"
              value={formData.salesPrice}
              editable={false} // Prevent manual editing of salesPrice
              keyboardType="decimal-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Color"
              value={formData.color}
              onChangeText={(text) => handleInputChange("color", text)}
            />
            <TextInput
              style={styles.input}
              placeholder="Quantity"
              value={formData.quantity}
              onChangeText={(text) => handleInputChange("quantity", text)}
              keyboardType="decimal-pad"
            />
            <Text style={styles.label}>Cash on Delivery:</Text>
            <FlatList
              data={["Available", "Not available"]}
              horizontal
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.dropdownItem, formData.cashOnDelivery === item && styles.selectedItem]}
                  onPress={() => handleInputChange("cashOnDelivery", item)}
                >
                  <Text>{item}</Text>
                </TouchableOpacity>
              )}
            />
            {formData.cashOnDelivery === "Available" && (
              <TextInput
                style={styles.input}
                placeholder="Cash on Delivery Amount"
                value={formData.codAmount}
                onChangeText={(text) => handleInputChange("codAmount", text)}
                keyboardType="decimal-pad"
              />
            )}
            <TouchableOpacity
              style={styles.imagePickerButton}
              onPress={() => handleImagePicker("mainImage")}
            >
              <Text>Select Main Image</Text>
            </TouchableOpacity>
            {formData.mainImage && (
              <Image
                source={{ uri: formData.mainImage }}
                style={styles.previewImage}
              />
            )}
            <Text style={styles.label}>Thumbnails:</Text>
            <TouchableOpacity
              style={styles.imageButton}
              onPress={() => handleImagePicker("thumbnails")}
            >
              <Text>Pick Thumbnails</Text>
            </TouchableOpacity>
            {formData.thumbnails.length > 0 && (
              <FlatList
                data={formData.thumbnails}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <Image source={{ uri: item }} style={styles.thumbnail} />
                )}
                horizontal
              />
            )}

<TouchableOpacity
              style={styles.imagePickerButton}
              onPress={handleVideoPicker}
            >
              <Text>Select Demo Video (20 seconds max)</Text>
            </TouchableOpacity>
            {formData.demoVideo && (
              <Text>Demo Video Selected</Text> // Show selected video
            )}
            <View style={styles.formActions}>
              <Button title="Cancel" onPress={() => setFormVisible(false)} />
              <Button
                title={formData.id ? "Update Product" : "Save Product"}
                onPress={handleSaveProduct}
              />
            </View>
          </ScrollView>
        </BlurView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  searchInput: {
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    marginBottom: 20,
    paddingLeft: 10,
  },
  addButton: {
    backgroundColor: "#008CBA",
    padding: 10,
    marginBottom: 20,
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  productCard: {
    marginBottom: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
  },
  productRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  productImage: {
    width: 100,
    height: 100,
    marginRight: 10,
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: "bold",
  },
  viewMoreButton: {
    backgroundColor: "#eee",
    padding: 5,
    marginTop: 10,
  },
  viewMoreText: {
    color: "#008CBA",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  editButton: {
    backgroundColor: "#4CAF50",
    padding: 5,
    marginTop: 10,
  },
  editText: {
    color: "#fff",
  },
  deleteButton: {
    backgroundColor: "#f44336",
    padding: 5,
    marginTop: 10,
  },
  deleteText: {
    color: "#fff",
  },
  formContainer: {
    backgroundColor: "#fff",
    padding: 20,
    marginTop: 20,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  input: {
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    marginBottom: 10,
    paddingLeft: 10,
  },
  label: {
    marginTop: 10,
    fontSize: 16,
  },
  dropdownItem: {
    padding: 10,
    backgroundColor: "#f1f1f1",
    marginRight: 10,
    borderRadius: 5,
  },
  selectedItem: {
    backgroundColor: "#008CBA",
  },
  imagePickerButton: {
    backgroundColor: "#008CBA",
    padding: 10,
    marginVertical: 10,
    alignItems: "center",
  },
  formActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 50,
  },
  detailCard: {
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  detailImage: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  previewImage: { width: 150, height: 150, marginVertical: 16 },
  thumbnailContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  thumbnail: { width: 60, height: 60, marginRight: 8, marginBottom: 8 },
  blurContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
});

export default UpdateProducts;

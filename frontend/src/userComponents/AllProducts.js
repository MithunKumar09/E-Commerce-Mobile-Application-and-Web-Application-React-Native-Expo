// AllProducts.js
import React, { useState, useEffect } from 'react';
import { View, Text, Image, FlatList, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { SERVER_URL } from '../../Constants/index';
import { storeData, getData } from '../../utils/storage';
import { useUserStore } from '../../src/store/userStore'; // Import the user store
import { useNavigation } from '@react-navigation/native';
import * as SecureStore from "expo-secure-store";

const AllProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const productsPerPage = 5;

  const navigation = useNavigation();

    // Shuffle array utility function
    const shuffleArray = (array) => {
      return array.sort(() => Math.random() - 0.5);
    };

  // Fetch unique products from the database
  const fetchProducts = async () => {
    if (!hasMoreProducts || loading) return;

    setLoading(true);
    try {
      console.log(`Fetching products from page ${page}...`);
      const response = await axios.get(`${SERVER_URL}/user/products`, {
        params: { page, limit: productsPerPage },
      });

      const newProducts = response.data || [];
      console.log(`Products fetched for page ${page}:`, newProducts);

      // Check if there are more products to load
      if (newProducts.length < productsPerPage) {
        setHasMoreProducts(false);
      }

      // Shuffle and update the products list
      const updatedProducts = shuffleArray([...products, ...newProducts]);
      setProducts(updatedProducts);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load more products when reaching the end of the list
  const loadMoreProducts = () => {
    if (!hasMoreProducts || loading) return;
    setPage((prevPage) => prevPage + 1);
  };

  // Render each product item
  const renderItem = ({ item }) => (
    <TouchableOpacity 
    style={styles.productCard}
    onPress={() => navigation.navigate("SingleProduct", { productId: item._id })} // Navigate to SingleProduct page with productId
  >
      <Image source={{ uri: item.images?.imageUrl }} style={styles.productImage} />
      <View style={styles.productDetails}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productPrice}>
          {item.price} <Text style={styles.productOldPrice}>${item.productPrice}</Text>
          <Text style={styles.price}>{`$${item.salePrice}`}</Text>
        </Text>
        <Text style={styles.category}>{item.category}</Text>
        <Text style={styles.productDescription} numberOfLines={2}>{item.description}</Text>
        {item.discount && (
          <View style={styles.discountContainer}>
            <Text style={styles.discountText}>-{item.discount}%</Text>
          </View>
        )}
      </View>
      </TouchableOpacity>
  );

  // Fetch products on initial load
  useEffect(() => {
    fetchProducts();
  }, [page]);

    // Shuffle products on mount or refresh
    useEffect(() => {
      setProducts((prevProducts) => shuffleArray([...prevProducts]));
    }, []);

  return (
    <LinearGradient
      colors={['#FF7E5F', '#FEB47B']} // Gradient colors
      style={styles.container}
    >
      <Text style={styles.title}>Our Products</Text>
      <FlatList
        data={products}
        renderItem={renderItem}
        keyExtractor={(item) => item.id ? item.id.toString() : Math.random().toString()} // Handle undefined id
        numColumns={Platform.OS === 'web' ? 5 : 2}
        contentContainerStyle={styles.productList}
        onEndReached={loadMoreProducts}
        onEndReachedThreshold={0.1}
        initialNumToRender={10}
        ListFooterComponent={loading ? <Text style={styles.loadingText}>Loading...</Text> : null}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  productList: {
    justifyContent: 'center',
  },
  productCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
    padding: 15,
    elevation: 5, // For Android shadow effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    marginHorizontal: 10,
  },
  productImage: {
    width: '100%',
    height: Platform.OS === 'web' ? 250 : 180,
    borderRadius: 8,
  },
  productDetails: {
    marginTop: 10,
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  productPrice: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  productOldPrice: {
    fontSize: 14,
    fontWeight: "500",
    textDecorationLine: "line-through",
    color: "#888",
    marginRight: 10,
  },
price: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007BFF",
    marginRight: 5,
},
  productDescription: {
    color: '#555',
    fontSize: 12,
    marginVertical: 5,
  },
  discountContainer: {
    backgroundColor: '#FF5733',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 5,
    width: '50%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  discountText: {
    color: '#fff',
    fontSize: 14,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#888',
  },
});

export default AllProducts;

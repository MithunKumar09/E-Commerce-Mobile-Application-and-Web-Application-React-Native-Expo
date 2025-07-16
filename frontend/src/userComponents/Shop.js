// KeepShopping.js
import React, { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, ScrollView, Image, StyleSheet, TouchableOpacity, Dimensions, Animated, RefreshControl } from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { SERVER_URL } from '../../Constants/index';
import { getData, storeData } from "../../utils/storage";
import * as SecureStore from "expo-secure-store";
import { useUserStore } from '../../src/store/userStore';
import SkeletonComponent from '../../components/Loading/SkeletonComponent';
import sendEventToBackend from '../../API/segmentCode';

const KeepShopping = () => {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [loadedProductIds, setLoadedProductIds] = useState(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const { isAuthenticated, user } = useUserStore();
  const navigation = useNavigation();

  // Add Animated value for Skeleton
  const skeletonPulse = useRef(new Animated.Value(0)).current;

  // Skeleton animation for a "pumping" effect
  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonPulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(skeletonPulse, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  useEffect(() => {
    startPulse(); // Start the pulse effect
  }, []);

  const renderSkeletonCategory = () => (
    <View style={styles.SkeletonCarouselItem}>
      <Animated.View
        style={[
          styles.skeletonBox,
          {
            opacity: skeletonPulse.interpolate({
              inputRange: [0, 1],
              outputRange: [0.5, 1],
            }),
            transform: [
              {
                scale: skeletonPulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                }),
              },
            ],
          },
        ]}
      >
        <SkeletonComponent width={120} height={120} borderRadius={10} />
      </Animated.View>
      <SkeletonComponent width={80} height={15} borderRadius={5} style={{ marginTop: 10 }} />
    </View>
  );

  const fetchCategories = async () => {
    try {
      const response = await axios(`${SERVER_URL}/admin/categories`);
      console.log("Categories retrieved:", response.data);
      const categoriesWithKeys = response.data.map((category, index) => ({
        ...category,
        key: category._id ? category._id : `category-${index}`,
      }));
      setCategories(categoriesWithKeys);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      if (!hasMoreProducts || loadingMore) return;
  
      setLoadingMore(true);
  
      const savedWishlist = await getData("wishlist");
  
      let fetchedProducts = [];
      const fetchedProductIds = new Set(loadedProductIds);
  
      if (!savedWishlist) {
        console.log("No wishlist found. Fetching default products.");
        const response = await axios.get(`${SERVER_URL}/user/products?page=${currentPage}&limit=10`);
        fetchedProducts = response.data.filter((product) => !fetchedProductIds.has(product._id));
      } else {
        const categoryCounts = {};
        Object.values(savedWishlist).forEach((item) => {
          if (item.category) {
            categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
          }
        });
  
        const sortedCategories = Object.keys(categoryCounts).sort(
          (a, b) => categoryCounts[b] - categoryCounts[a]
        );
        console.log("Categories sorted by count:", sortedCategories);
  
        const prioritizedProducts = [];
        for (const category of sortedCategories) {
          const response = await axios.get(
            `${SERVER_URL}/user/products?category=${category}&page=${currentPage}&limit=10`
          );
          response.data.forEach((product) => {
            if (!fetchedProductIds.has(product._id)) {
              prioritizedProducts.push(product);
              fetchedProductIds.add(product._id);
            }
          });
        }
  
        console.log("Prioritized products:", prioritizedProducts);
        const allProductsResponse = await axios.get(`${SERVER_URL}/user/products?page=${currentPage}&limit=10`);
        const remainingProducts = allProductsResponse.data.filter(
          (product) => !fetchedProductIds.has(product._id)
        );
  
        fetchedProducts = [...prioritizedProducts, ...remainingProducts];
      }
  
      // Shuffle fetched products if more than 1 product
      if (fetchedProducts.length > 1) {
        fetchedProducts.sort(() => Math.random() - 0.5);
      }
  
      if (fetchedProducts.length > 0) {
        setProducts((prevProducts) => [...prevProducts, ...fetchedProducts]);
        setFilteredProducts((prevFilteredProducts) => [...prevFilteredProducts, ...fetchedProducts]);
  
        // Update loaded product IDs
        const newLoadedIds = new Set(loadedProductIds);
        fetchedProducts.forEach((product) => newLoadedIds.add(product._id));
        setLoadedProductIds(newLoadedIds);
      }
  
      if (fetchedProducts.length < 10) {
        setHasMoreProducts(false); // No more products to load
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setIsLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };
  
  const handleRefresh = () => {
    setRefreshing(true); // Set refreshing state to true
    setProducts([]); // Clear the current product list for refresh
    setLoadedProductIds(new Set()); // Clear loaded product IDs to ensure fresh data
    setCurrentPage(1); // Reset page number to 1
    setHasMoreProducts(true); // Reset pagination
    fetchCategories(); // Fetch categories again
    fetchProducts(); // Fetch products again
  };

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, [currentPage]);


  const handleLoadMore = () => {
    if (!loadingMore && hasMoreProducts) {
      setLoadingMore(true);
      setCurrentPage((prevPage) => prevPage + 1); // Increment page number
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loadingMore && !hasMoreProducts) {
        setLoadingMore(false); // Reset the loading button after 20 seconds
      }
    }, 20000); // 20 seconds timeout

    return () => clearTimeout(timeout); // Clean up the timeout when component is unmounted
  }, [loadingMore, hasMoreProducts]);

  useEffect(() => {
    if (searchQuery.length === 1) {
      // Filter products where name starts with the search query letter
      const filtered = products.filter((product) =>
        product.name.toLowerCase().startsWith(searchQuery.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else if (searchQuery.length > 1) {
      // Filter products where the search query letter appears anywhere in the product name
      const filtered = products.filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products); // Reset filter if search query is cleared
    }
  }, [searchQuery, products]);

  const handlePress = async (product) => {
    if (isAuthenticated) {
      const token = await SecureStore.getItemAsync("authToken");
      console.log("User is authenticated. Passing userId and token.");
      console.log("User ID:", user?.id);
      console.log("Token:", token);
            // Send Segment event here
            sendEventToBackend("Product Viewed", { productId: product._id }, user, isAuthenticated, 'shopPage');
      navigation.navigate("SingleProduct", { productId: product._id, userId: user?.id, token });
    } else {
      console.log("User is not authenticated. Navigating without userId and token.");
      navigation.navigate("SingleProduct", { productId: product._id });
    }
  };

  const handleAddToCart = async (product) => {
    console.log("Handle Add to Cart started.");
    sendEventToBackend("Product Clicked", { productId: product._id }, user, isAuthenticated, 'shopPage');
  }; 

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TextInput
          style={styles.searchBar}
          placeholder="Search for products..."
          placeholderTextColor="#aaa"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <Feather name="search" size={20} color="#555" style={styles.searchIcon} />
      </View>

      {/* Product Carousel */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carousel}>
        {isLoading ? (
          Array.from({ length: 5 }).map((_, index) => renderSkeletonCategory())
        ) : (
          categories.map((category, index) => (
            <View key={category.key} style={styles.carouselItem}>
              <Image source={{ uri: category.image }} style={styles.carouselImage} />
              <Text style={styles.carouselText}>{category.name}</Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Suggested Items */}
      <Text style={styles.suggestionsTitle}>Suggested for you</Text>
      <ScrollView style={styles.suggestionsList}>
        {filteredProducts.map((product) => (
          <TouchableOpacity
            onPress={() => handlePress(product)}
            key={product._id}
            style={styles.suggestionCard}
          >
            <Image
              source={{ uri: product.images?.imageUrl }}
              style={styles.suggestionImage}
            />
            <View style={styles.suggestionInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productBrand}>{product.brand}</Text>
              <View style={styles.row}>
                <Text style={styles.salePrice}>${product.salePrice}</Text>
                <Text style={styles.productPrice}>${product.productPrice}</Text>
                <Text style={styles.discount}>-{product.discount}%</Text>
              </View>
              <Text style={styles.productDescription}>{product.description}</Text>
            </View>
            <TouchableOpacity
              onPress={() => handleAddToCart(product)}
              style={styles.cartButton}
            >
              <MaterialIcons
                name="add-shopping-cart"
                size={24}
                color="white"
                style={styles.cartIcon}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>



      {/* Load More Button */}
      {loadingMore && (
        <Animated.View style={styles.loadingMore}>
          <Text>Loading more products...</Text>
        </Animated.View>
      )}
      {!loadingMore && hasMoreProducts && (
        <TouchableOpacity onPress={handleLoadMore} style={styles.loadMoreButton}>
          <Text style={styles.loadMoreText}>Load More</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
    padding: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  searchBar: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 20,
    fontSize: 16,
    elevation: 3,
  },
  searchIcon: {
    position: 'absolute',
    right: 15,
  },
  carousel: {
    marginVertical: 15,
  },
  carouselItem: {
    marginRight: 15,
    alignItems: 'center',
  },
  carouselImage: {
    width: 120,
    height: 120,
    borderRadius: 10,
    marginBottom: 10,
  },
  carouselText: {
    fontSize: 16,
    fontWeight: '600',
  },
  suggestionsTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginVertical: 10,
  },
  suggestionsList: {
    marginTop: 10,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4682B4',
    marginBottom: 15,
    padding: 15,
    borderRadius: 15,
    elevation: 5,
  },
  suggestionImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
  },
  suggestionInfo: {
    flex: 1,
    marginLeft: 15,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  salePrice: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#e63946",
    marginRight: 10,
  },
  productPrice: {
    fontSize: 16,
    color: "#999",
    textDecorationLine: "line-through",
    marginRight: 10,
  },
  discount: {
    fontSize: 14,
    fontWeight: "500",
    color: "#d9534f",
    backgroundColor: "#f8d7da",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  productbrand: {
    color: 'pink',
    fontSize: 14,
  },
  cartIcon: {
    backgroundColor: '#ff6f61',
    padding: 10,
    borderRadius: 20,
  },
  productdescription: {
    color: '#fff',
    backgroundColor: 'grey',
    fontSize: 12,
    fontStyle: 'italic',
  },
  loadMoreContainer: {
    alignItems: 'center',
    marginVertical: 15,
  },
  loadMoreButton: {
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  loadMoreText: {
    color: '#fff',
    fontSize: 16,
  },
  SkeletonCarouselItem: {
    marginRight: 15,
    alignItems: 'center',
  },
  SkeletonSuggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4682B4',
    marginBottom: 15,
    padding: 15,
    borderRadius: 15,
    elevation: 5,
  },
});

export default KeepShopping;

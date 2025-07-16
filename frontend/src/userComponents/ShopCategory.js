import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { SERVER_URL } from '../../Constants/index';

const Shop = () => {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [wishlist, setWishlist] = useState({});
  const navigation = useNavigation();

  const { id: userId, token } = user || {};

  useEffect(() => {
    const fetchProductsAndCategories = async () => {
      try {
        const productResponse = await axios.get(`${SERVER_URL}/user/products`);
        setProducts(productResponse.data);

        const categoryResponse = await axios.get(`${SERVER_URL}/user/category`);
        setCategories(categoryResponse.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    const fetchWishlist = async () => {
      if (!userId || !token) return;
      try {
        const response = await axios.get(`${SERVER_URL}/user/wishlist`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const wishlistItems = response.data.reduce((acc, item) => {
          acc[item.productId._id] = item.wishlistStatus === 'added';
          return acc;
        }, {});
        setWishlist(wishlistItems);
      } catch (error) {
        console.error('Error fetching wishlist:', error);
      }
    };

    fetchProductsAndCategories();
    fetchWishlist();
  }, [userId, token]);

  const handleToggleFavorite = async (productId) => {
    if (!userId || !token) {
      navigation.navigate('Login');
      return;
    }
    try {
      const headers = { Authorization: `Bearer ${token}` };
      if (wishlist[productId]) {
        await axios.delete(`${SERVER_URL}/user/wishlist/remove`, {
          headers,
          data: { productId, userId },
        });
        setWishlist((prev) => ({ ...prev, [productId]: false }));
        Alert.alert('Success', 'Product removed from wishlist!');
      } else {
        await axios.post(
          `${SERVER_URL}/user/wishlist`,
          { productId, userId, wishlistStatus: 'added' },
          { headers }
        );
        setWishlist((prev) => ({ ...prev, [productId]: true }));
        Alert.alert('Success', 'Product added to wishlist!');
      }
    } catch (error) {
      console.error('Error updating wishlist:', error);
    }
  };

  const filteredProducts = products.filter((product) =>
    (selectedCategory ? product.category === selectedCategory : true) &&
    product.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={{ flex: 1 }}>
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Categories */}
      <View style={styles.categoriesContainer}>
        <FlatList
          data={[{ name: 'Show All', _id: '' }, ...categories]}
          horizontal
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryButton,
                selectedCategory === item.name && styles.categorySelected,
              ]}
              onPress={() => setSelectedCategory(item.name)}
            >
              <Text>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Products */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item._id}
        numColumns={2}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.productCard}
            onPress={() => navigation.navigate('SingleProduct', { id: item._id })}
          >
            <Image source={{ uri: item.imageUrl }} style={styles.productImage} />
            <Text style={styles.productName}>{item.name}</Text>
            <View style={styles.productFooter}>
              <Text style={styles.productPrice}>₹ {item.salePrice}</Text>
              {item.salePrice !== item.productPrice && (
                <Text style={styles.productOriginalPrice}>
                  ₹ {item.productPrice}
                </Text>
              )}
              <Icon
                name="heart"
                size={20}
                color={wishlist[item._id] ? 'red' : '#ccc'}
                onPress={() => handleToggleFavorite(item._id)}
              />
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
        </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 10 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 10,
    marginVertical: 10,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1 },
  categoriesContainer: { flexDirection: 'row', marginBottom: 10 },
  categoryButton: {
    padding: 10,
    borderWidth: 1,
    borderRadius: 20,
    marginHorizontal: 5,
  },
  categorySelected: { backgroundColor: '#add8e6' },
  productCard: {
    flex: 1,
    margin: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  productImage: { width: '100%', height: 150, borderRadius: 10 },
  productName: { fontWeight: 'bold', marginVertical: 5 },
  productFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  productPrice: { fontWeight: 'bold', color: '#007BFF' },
  productOriginalPrice: { textDecorationLine: 'line-through', color: '#888' },
});

export default Shop;

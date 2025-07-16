// frontend/src/components/User/ProductsContainer.js
import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    Dimensions,
    TouchableOpacity,
} from "react-native";
import { FontAwesome } from '@expo/vector-icons';
import SkeletonComponent from "../Loading/SkeletonComponent";
import axios from 'axios';
import { SERVER_URL } from '../../Constants/index';
import { storeData, getData } from '../../utils/storage';
import { useUserStore } from '../../src/store/userStore'; // Import the user store
import { useNavigation } from '@react-navigation/native';
import * as SecureStore from "expo-secure-store";
const { width } = Dimensions.get("window");
import AsyncStorage from '@react-native-async-storage/async-storage';
import sendEventToBackend from '../../API/segmentCode';
import io from "socket.io-client";

const ProductsContainer = ({ isLoading }) => {
    const [products, setProducts] = useState([]);
    const wishlist = useUserStore((state) => state.wishlist);
    const setWishlist = useUserStore((state) => state.setWishlist);
    const [dialogMessage, setDialogMessage] = useState("");
    const [showDialog, setShowDialog] = useState(false);
    const isMobile = width < 768;
    const isWeb = width >= 1024;
    const [isOffline, setIsOffline] = useState(false);
    const navigation = useNavigation();
    const { isAuthenticated, user } = useUserStore();
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        const socketConnection = io(SERVER_URL); // Establish WebSocket connection
        setSocket(socketConnection);

        // Listen for wishlist updates
        socketConnection.on("wishlistUpdated", (updatedWishlist) => {
            console.log("Wishlist updated in real-time:", updatedWishlist);
            setWishlist(updatedWishlist); // Update wishlist state
        });

                // Listen for real-time product updates
                socketConnection.on("productUpdated", (updatedProduct) => {
                    console.log("Product updated in real-time:", updatedProduct);
                    setProducts((prevProducts) => {
                        const index = prevProducts.findIndex(p => p._id === updatedProduct._id);
                        if (index !== -1) {
                            // Update the existing product
                            const updatedProducts = [...prevProducts];
                            updatedProducts[index] = updatedProduct;
                            return updatedProducts;
                        }
                        // Add the new product if not already in the list
                        return [...prevProducts, updatedProduct];
                    });
                });

        return () => {
            socketConnection.disconnect(); // Cleanup WebSocket connection on unmount
        };
    }, []);

    const shuffleArray = (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    };

    useEffect(() => {
        // Fetch products from the database
        const fetchProducts = async () => {
            try {
                // Check for offline data first
                const cachedProducts = await AsyncStorage.getItem("cachedProducts");
                if (cachedProducts) {
                    console.log("Loading products from cache...");
                    const shuffledCachedProducts = shuffleArray(JSON.parse(cachedProducts));
                    setProducts(shuffledCachedProducts);
                }
                console.log("Fetching products from the database...");
                const response = await axios.get(`${SERVER_URL}/user/products`);

                const populatedProducts = await Promise.all(
                    response.data.map(async (product) => {
                        const populatedProduct = await axios.get(
                            `${SERVER_URL}/user/products/${product._id}?populate=images`
                        );
                        return populatedProduct.data;
                    })
                );

                const uniqueProducts = Array.from(new Set(populatedProducts.map(p => p._id)))
                    .map(id => populatedProducts.find(p => p._id === id));
                const shuffledProducts = shuffleArray(uniqueProducts);

                setProducts(shuffledProducts); // Set unique and shuffled products
                await AsyncStorage.setItem("cachedProducts", JSON.stringify(shuffledProducts));
                setIsOffline(false);
            } catch (error) {
                console.error("Error fetching products:", error);
                setProducts([]); // Set to empty array on error
                setIsOffline(true);
            }
        };

        fetchProducts();
        loadWishlist();
    }, []);

    const loadWishlist = async () => {
        try {
            const savedWishlist = await getData("wishlist");
            // console.log("Loaded Wishlist from storage:", savedWishlist);
            setWishlist(savedWishlist || {});
        } catch (error) {
            console.error("Error loading wishlist:", error);
        }
    };

    // frontend/src/components/User/ProductsContainer.js
    const toggleFavorite = async (productId) => {
        try {
            if (!isAuthenticated) {
                navigation.navigate("UserLogin");
                return;
            }
    
            const userId = user?.id;
            if (!userId) {
                console.log("User ID is missing");
                return;
            }
    
            const token = await SecureStore.getItemAsync("authToken");
            if (!token) {
                console.error("Authorization token is missing");
                return;
            }
    
            const selectedProduct = products.find(product => product._id === productId);
            if (!selectedProduct) return;
    
            const config = { headers: { Authorization: `Bearer ${token}` } };
    
            if (wishlist[productId]) {
                // Remove from wishlist
                await axios.delete(`${SERVER_URL}/user/wishlist/${productId}`, {
                    data: { userId, wishlistStatus: 'removed' }, // Pass wishlistStatus here
                    ...config
                });
    
                const updatedWishlist = { ...wishlist };
                delete updatedWishlist[productId];
                setWishlist(updatedWishlist);
                await storeData("wishlist", updatedWishlist);
                setDialogMessage("Product removed from wishlist!");
    
                sendEventToBackend('Removed from Wishlist', {
                    productId: selectedProduct._id,
                    productName: selectedProduct.name,
                }, user, isAuthenticated, "ProductsContainer");
            } else {
                // Add to wishlist
                await axios.post(`${SERVER_URL}/user/wishlist`, { productId, userId, wishlistStatus: 'added' }, config); // Include wishlistStatus here
    
                const updatedWishlist = { ...wishlist, [productId]: selectedProduct };
                setWishlist(updatedWishlist);
                await storeData("wishlist", updatedWishlist);
                setDialogMessage("Product added to wishlist!");
    
                sendEventToBackend('Added to Wishlist', {
                    productId: selectedProduct._id,
                    productName: selectedProduct.name,
                }, user, isAuthenticated, "ProductsContainer");
            }
    
            setShowDialog(true);
            setTimeout(() => setShowDialog(false), 2000);
        } catch (error) {
            console.error("Error updating wishlist:", error);
            alert("There was an issue adding/removing the item from your wishlist.");
        }
    };
    


    // Handle navigating to AllProducts screen
    const handleViewAll = () => {
        console.log("Navigate to all products screen");
        navigation.navigate('AllProducts'); // Navigate to AllProducts screen
    };


    // Render individual product card
    const renderProductCard = ({ item }) => {
        const handlePress = async () => {
            try {
                if (isAuthenticated) {
                    const token = await SecureStore.getItemAsync("authToken");
                    if (token) { // Ensure token exists
                        console.log("User is authenticated. Passing userId and token.");
                        console.log("User ID:", user?.id);
                        console.log("Token:", token);
                        // Send event before navigation
                        await sendEventToBackend(
                            'Viewed Product',
                            {
                                productId: item._id,
                                productName: item.name,
                                userId: user?.id,
                            },
                            user,
                            isAuthenticated,
                            "ProductsContainer"
                        );

                        // Navigate after successful event logging
                        navigation.navigate("SingleProduct", { productId: item._id, userId: user?.id, token });
                    } else {
                        console.error("Token is missing. Cannot send event or navigate.");
                        alert("Session expired. Please log in again.");
                    }
                } else {
                    console.log("User is not authenticated. Navigating without userId and token.");
                    navigation.navigate("SingleProduct", { productId: item._id });
                }
            } catch (error) {
                console.error("Error handling product press:", error);
            }
        };

        return (
            <TouchableOpacity
                onPress={handlePress}
                style={[
                    styles.card,
                    { width: isMobile ? width / 2 - 20 : isWeb ? width / 5 - 20 : width / 4 - 20 },
                ]}
            >
                <Image source={{ uri: item.images?.imageUrl || item.image }} style={styles.Productimage} />
                {/* Heart Icon for Wishlist */}
                <TouchableOpacity
                    style={styles.heartIconContainer}
                    onPress={(e) => {
                        e.preventDefault();
                        toggleFavorite(item._id);
                    }}
                >
                    <FontAwesome
                        name="heart"
                        size={24}
                        color={wishlist[item._id] ? "#ff5f57" : "#ccc"}
                    />
                </TouchableOpacity>
                <Text style={styles.name}>{item.name}</Text>

                {/* Price and Discount */}
                <View style={styles.priceContainer}>
                    {item.productPrice
                        && (
                            <Text style={styles.oldPrice}>{`$${item.productPrice}`}</Text>
                        )}
                    <Text style={styles.price}>{`$${item.salePrice}`}</Text>
                    {item.discount && (
                        <Text style={styles.discount}>-{item.discount}%</Text>
                    )}
                </View>

                {/* Product Category */}
                <Text style={styles.category}>{item.category}</Text>

                {/* Description */}
                <Text style={styles.description}>{item.description}</Text>
            </TouchableOpacity>
        );
    };

    const renderSkeletonProductCard = () => (
        <View
            style={[
                styles.card,
                {
                    width: isMobile ? width / 2 - 20 : isWeb ? width / 5 - 20 : width / 4 - 20,
                },
            ]}
        >
            <SkeletonComponent width="100%" height={150} borderRadius={12} />
            <SkeletonComponent width="60%" height={20} borderRadius={5} style={{ marginVertical: 10 }} />
            <SkeletonComponent width="40%" height={20} borderRadius={5} style={{ marginBottom: 10 }} />
            <SkeletonComponent width="80%" height={12} borderRadius={5} />
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>All Products</Text>
            {/* Display Skeleton if loading */}
            {isLoading ? (
                <FlatList
                    data={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]} // Dummy data to show loading skeleton
                    renderItem={renderSkeletonProductCard}
                    keyExtractor={(item, index) => index.toString()}
                    numColumns={isMobile ? 2 : isWeb ? 5 : 4}
                    contentContainerStyle={styles.grid}
                />
            ) : (
                <FlatList
                    data={products.slice(0, 10)}
                    renderItem={renderProductCard}
                    keyExtractor={(item) => item.id ? item.id.toString() : Math.random().toString()}
                    numColumns={isMobile ? 2 : isWeb ? 5 : 4}
                    contentContainerStyle={styles.grid}
                />
            )}

            {/* View All Button */}
            {products.length > 10 && (
                <View style={styles.viewAllContainer}>
                    <TouchableOpacity style={styles.viewAllButton} onPress={handleViewAll}>
                        <Text style={styles.viewAllText}>View More</Text>
                        <FontAwesome name="angle-right" size={20} color="#007BFF" />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 20,
        paddingHorizontal: 0,
    },
    title: {
        fontSize: 22,
        fontWeight: "bold",
        marginBottom: 10,
        textAlign: "center",
    },
    grid: {
        justifyContent: "space-between",
        paddingBottom: 20,
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 12,
        elevation: 5,
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 6 },
        margin: 7,
        alignItems: "center",
        padding: 12,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#eee",
        position: "relative",
    },
    Productimage: {
        width: "100%",
        height: Dimensions.get("window").width < 768
            ? 180
            : Dimensions.get("window").width >= 1024
                ? 300
                : 250,
        borderRadius: 12,
        resizeMode: "cover",
    },
    heartIconContainer: {
        position: "absolute",
        top: 10,
        right: 10,
        zIndex: 1,
        backgroundColor: "#ffffff",
        padding: 5,
        borderRadius: 50,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 5,
    },
    name: {
        fontSize: 18,
        fontWeight: "600",
        marginVertical: 5,
        textAlign: "center",
        color: "#333",
    },
    priceContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 8,
    },
    oldPrice: {
        fontSize: 14,
        fontWeight: "500",
        textDecorationLine: "line-through",
        color: "#888",
        marginRight: 5,
    },
    price: {
        fontSize: 16,
        fontWeight: "600",
        color: "#007BFF",
        marginRight: 5,
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
    category: {
        fontSize: 14,
        fontWeight: "400",
        color: "#999",
        marginBottom: 8,
    },
    description: {
        fontSize: 12,
        color: "#666",
        textAlign: "center",
        lineHeight: 18,
    },
    viewAllContainer: {
        justifyContent: "center",
        alignItems: "center",
        marginTop: 20,
    },
    viewAllButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        backgroundColor: "#f8f9fa",
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 5,
        elevation: 3,
        marginVertical: 10,
        width: "80%",
        alignSelf: "center",
    },
    viewAllText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#007BFF",
        marginRight: 8,
    },
});

export default ProductsContainer;

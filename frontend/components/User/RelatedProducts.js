//RelatedProducts.js
import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    FlatList,
    Image,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Dimensions,
} from "react-native";
import axios from "axios";
import { SERVER_URL } from "../../Constants/index";
import { useNavigation } from '@react-navigation/native';
import sendEventToBackend from '../../API/segmentCode';
import { useUserStore } from '../../src/store/userStore';

const RelatedProducts = ({ category }) => {
    const [relatedProducts, setRelatedProducts] = useState([]);
      const navigation = useNavigation();
  const { user, isAuthenticated, checkAuthentication, cartItems, setCartState, cartItemCount, addToCart } = useUserStore();
  
    useEffect(() => {
        const fetchRelatedProducts = async () => {
            try {
                const response = await axios.get(`${SERVER_URL}/user/products/category/${category}`);
                const products = response.data.slice(0, 6); // Limit to 6 products

                // Map through products to use images directly from the `images` object
                const updatedProducts = products.map((product) => {
                    const image = product.images?.imageUrl || "https://via.placeholder.com/150";
                    return { ...product, image };
                });

                setRelatedProducts(updatedProducts);
            } catch (error) {
                console.error("Error fetching related products:", error);
            }
        };

        fetchRelatedProducts();
    }, [category]);


    const renderProduct = ({ item, index }) => {
        // Skip rendering the "View More" button in FlatList's renderItem
        if (index === 5) return null;

        const handleProductClick = () => {
            // Send Segment event when a related product is clicked
            sendEventToBackend("Viewed Related Product", {
                productId: item._id,
                productName: item.name,
                category: item.category,
            }, user, isAuthenticated, "RelatedProduct");

            // Navigate to the SingleProduct screen
            navigation.navigate("SingleProduct", {
                productId: item._id, // Pass the productId to SingleProduct
            });
        };

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={handleProductClick}
            >
                <Image source={{ uri: item.image || "https://via.placeholder.com/150" }} style={styles.Productimage} />
                <Text style={styles.name}>{item.name}</Text>

                <View style={styles.priceContainer}>
                    {item.productPrice && <Text style={styles.oldPrice}>{`$${item.productPrice}`}</Text>}
                    <Text style={styles.price}>{`$${item.salePrice}`}</Text>
                    {item.discount && <Text style={styles.discount}>-{item.discount}%</Text>}
                </View>

                <Text style={styles.category}>{item.category}</Text>
                <Text style={styles.description}>{item.description}</Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Related Products</Text>
            <FlatList
                horizontal
                data={relatedProducts}
                renderItem={renderProduct}
                keyExtractor={(item, index) => index.toString()}
                showsHorizontalScrollIndicator={false}
            />
            {relatedProducts.length > 5 && (
                <TouchableOpacity
                    style={styles.viewMoreButton}
                    onPress={() => navigation.navigate("ProductsList", { category })}
                >
                    <Text style={styles.viewMoreText}>View More</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 20,
        paddingHorizontal: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 10,
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 10,
        elevation: 5,
        margin: 5,
        alignItems: "center",
        padding: 10,
        borderWidth: 1,
        borderColor: "#ddd",
        width: Dimensions.get("window").width * 0.4,
    },
    cardWithButton: {
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        margin: 8,
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
        top: 7,
        right: 8,
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
        fontSize: 12,
        fontWeight: "500",
        color: "#d9534f",
        backgroundColor: "#f8d7da",
        paddingVertical: 2,
        paddingHorizontal: 8,
        borderRadius: 12,
    },
    category: {
        fontSize: 13,
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
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 20,
        width: "100%",
    },
    viewAllButton: {
        flexDirection: "row",
        backgroundColor: "#f8f9fa",
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: "center",
        alignSelf: "center",
        elevation: 5,
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
    },
    viewAllText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#007BFF",
        marginRight: 8,
    },
    viewMoreButton: {
        marginTop: 10,
        alignItems: "center",
    },
    viewMoreText: {
        color: "#0077b6",
        fontWeight: "bold",
        fontSize: 16,
    },
});

export default RelatedProducts;

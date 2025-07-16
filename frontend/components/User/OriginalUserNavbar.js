// frontend/Components/User/OriginalUserNavbar.js
import React, { useState, useEffect } from "react";
import { View, Text, Image, TouchableOpacity, Modal, FlatList, StyleSheet, Platform, Dimensions, StatusBar } from "react-native";
import { Ionicons, FontAwesome5, MaterialIcons } from "react-native-vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useUserStore } from "../../src/store/userStore"; // Import user store

const { height, width } = Dimensions.get("window");

const OriginalNavbar = () => {
    const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
    const { user, isAuthenticated, checkAuthentication } = useUserStore();
    const navigation = useNavigation();

    useEffect(() => {
        checkAuthentication();
      }, []);

    const handleLanguageDropdown = () => {
        setShowLanguageDropdown(!showLanguageDropdown);
    };

    const handleWalletClick = () => {
        navigation.navigate("Wallet");
    };

    const handleSignInClick = () => {
        navigation.navigate("UserLogin");
    };

    return (
        <View style={[styles.container, { marginTop: StatusBar.currentHeight }]}>
            <TouchableOpacity onPress={() => navigation.navigate("HomePage")}>
                <Image
                    source={require("../../assets/logo.png")}
                    style={[styles.logo, { width: width > 800 ? 230 : 120, height: width > 800 ? 120 : 50 }]}
                    resizeMode="contain"
                />
            </TouchableOpacity>

            <View style={styles.navGroup}>
                {/* Divider */}
                <View style={styles.divider} />

                {/* Conditionally Render "Sign In" or "Wallet" based on user authentication */}
                {isAuthenticated ? (
                    <TouchableOpacity onPress={handleWalletClick}>
                        <FontAwesome5 name="wallet" size={width > 800 ? 30 : 20} style={styles.icon} />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity onPress={handleSignInClick}>
                        <Text style={[styles.navText, { fontSize: width > 800 ? 28 : 14 }]}>Sign In</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 10,
        backgroundColor: "white",
        elevation: 4,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        width: "100%",
    },
    logo: {
        width: 120,
        height: 50,
    },
    navGroup: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        maxWidth: "75%",
    },
    navText: {
        marginHorizontal: 10,
        fontSize: 14,
        color: "gray",
        fontWeight: "500",
    },
    icon: {
        marginHorizontal: 10,
        color: "orange",
    },
    divider: {
        borderLeftWidth: 1,
        borderLeftColor: 'gray',
        height: 20,
        marginLeft: 20,
        marginRight: 20,
    },
    dropdown: {
        position: "absolute",
        top: 50,
        right: 10,
        backgroundColor: "white",
        borderWidth: 1,
        borderColor: "gray",
        borderRadius: 5,
        padding: 10,
        zIndex: 1000,
        elevation: 5,
    },
    dropdownItem: {
        paddingVertical: 5,
    },
});

export default OriginalNavbar;

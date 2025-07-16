//ChatBot.js
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Animated, Image, StatusBar, TextInput, Modal, TouchableWithoutFeedback, Keyboard, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Easing } from 'react-native-reanimated';
import { FontAwesome, MaterialIcons } from "@expo/vector-icons";
import axios from "axios";
import { SERVER_URL } from '../../Constants/index';
import { useUserStore } from "../../src/store/userStore";
import { getData, storeData } from "../../utils/storage";
import * as SecureStore from "expo-secure-store";
import { useNavigation } from '@react-navigation/native';
const dummyData = [
    { id: '1', sender: 'bot', text: 'Hello! How can I assist you today?' },
];

const intents = [
    { id: '1', text: 'Account Assistance', icon: 'user' },
    { id: '2', text: 'Track My Order', icon: 'history' },
    { id: '3', text: 'My Cart Items', icon: 'shopping-cart' },
    { id: '4', text: 'My Orders', icon: 'list' },
    { id: '5', text: 'Recommend Product', icon: 'gift' },
    { id: '6', text: 'Refund Process', icon: 'undo' },
    { id: '7', text: 'Feedback Submission', icon: 'envelope' },
    { id: '8', text: 'Contact Us', icon: 'phone' },
];

const ChatBot = () => {
    const [messages, setMessages] = useState(dummyData);
    const [isloading, setIsLoading] = useState(true);
    const [iconAnimation, setIconAnimation] = useState(new Animated.Value(0));
    const [typingAnimation, setTypingAnimation] = useState('');
    const [isBotTyping, setIsBotTyping] = useState(false);
    const [botTypingId, setBotTypingId] = useState(null);
    const [trackingId, setTrackingId] = useState('');
    const [orderDetails, setOrderDetails] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [isTrackingIntent, setIsTrackingIntent] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [animationValue] = useState(new Animated.Value(0));
    const [cartItems, setCartItems] = useState([]);
    const [showViewMore, setShowViewMore] = useState(false);
    const [showViewAll, setShowViewAll] = useState(false);
    const [cartIntentActive, setCartIntentActive] = useState(false);
    const [orderIntentActive, setOrderIntentActive] = useState(false);
    const [orders, setOrders] = useState([]);
    const { user, isAuthenticated, checkAuthentication } = useUserStore();
    const navigation = useNavigation();
    const imageTranslateX = useRef(new Animated.Value(0)).current;
    const flatListRef = useRef(null);
    const [isFeedbackFormVisible, setIsFeedbackFormVisible] = useState(false);
    const [feedbackText, setFeedbackText] = useState('');
    const [feedbackRating, setFeedbackRating] = useState(0);

    const handleFeedbackTextChange = (text) => {
        setFeedbackText(text); // Directly update feedback text without delay
    };

    useEffect(() => {
        if (isAuthenticated === null) {
            checkAuthentication();
        }
    }, [isAuthenticated, checkAuthentication]);

    // Function to fetch backend response for an intent
    const fetchIntentResponse = async (intentText, userId) => {
        try {
            console.log('Sending data to backend:', { intent: intentText, userId });
            const response = await axios.post(`${SERVER_URL}/chatbot/message`, { intent: intentText, userId });
            if (response.data && response.data.reply) {
                console.log('Reply received from backend:', response.data.reply);
                if (intentText === 'Recommend Product') {
                    const product = response.data.reply; // Expecting product details in response
                    console.log('Recommended product:', product);
                    return product;
                } else if (intentText === 'My Cart Items') {
                    const cartItems = response.data.reply.filter(item => item.name && item.price);
                    console.log('Filtered cart items:', cartItems);
                    return cartItems;
                }
                else if (intentText === 'My Orders') {
                    const orders = response.data.reply.filter(item => item.orderId && item.totalPrice);
                    console.log('Filtered orders:', orders);
                    return orders;
                }
            }
            throw new Error('Invalid response format from backend.');
        } catch (error) {
            console.error('Error fetching intent response:', error);
            if (error.response) {
                if (error.response.status === 404) {
                    return 'Sorry, the requested resource was not found.';
                }
                if (error.response.status === 400) {
                    return 'Invalid request. Please check the data and try again.';
                }
            }

            return 'Sorry, there was an error fetching the response. Please try again later.';
        }
    };

    // Function to handle feedback submission
    const handleFeedbackSubmit = async () => {
        try {
            const userId = user?.id;

                    // Log the data being sent to the backend
        console.log("Sending feedback data to the backend:", {
            userId,
            feedbackText,
            rating: feedbackRating,
        });

            const response = await axios.post(`${SERVER_URL}/chatbot/submitFeedback`, {
                userId,
                feedbackText,
                rating: feedbackRating,
            });

            if (response.data.success) {
                const botMessage = {
                    id: `${messages.length + 1}`,
                    sender: 'bot',
                    text: 'Thank you for your feedback! We appreciate your input.',
                };
                setMessages((prevMessages) => [...prevMessages, botMessage]);
                setIsFeedbackFormVisible(false);
                setFeedbackText('');
                setFeedbackRating(0);
            } else {
                const errorMessage = {
                    id: `${messages.length + 1}`,
                    sender: 'bot',
                    text: 'Oops! Something went wrong while submitting your feedback. Please try again.',
                };
                setMessages((prevMessages) => [...prevMessages, errorMessage]);
            }
        } catch (error) {
            console.error('Error submitting feedback:', error);
            const errorMessage = {
                id: `${messages.length + 1}`,
                sender: 'bot',
                text: 'Oops! Something went wrong while submitting your feedback. Please try again.',
            };
            setMessages((prevMessages) => [...prevMessages, errorMessage]);
        }
    };

    // Function to handle feedback intent click
    const handleFeedbackIntentClick = () => {
        const userMessage = { id: `${messages.length + 1}`, sender: 'user', text: 'Feedback Submission' };
        setMessages([...messages, userMessage]);

        const feedbackFormMessage = {
            id: `${messages.length + 2}`,
            sender: 'bot',
            text: 'Please provide your feedback below:',
            showFeedbackForm: true,
        };

        setMessages((prevMessages) => [...prevMessages, feedbackFormMessage]);
        setIsFeedbackFormVisible(true);
    };

    // Render the feedback form when it is visible
    const renderFeedbackForm = () => {
        return (
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.feedbackFormContainer}
            >

                {/* Rating stars container */}
                <View style={styles.starsContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity
                            key={star}
                            onPress={() => setFeedbackRating(star)}
                        >
                            <Ionicons
                                name={feedbackRating >= star ? 'star' : 'star-outline'}
                                size={30}
                                color={feedbackRating >= star ? '#FFD700' : '#888'}
                            />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Submit button within the bot message container */}
                <TouchableOpacity onPress={handleFeedbackSubmit} style={styles.submitButton}>
                <MaterialIcons name="double-arrow" size={26} color="#ddd" style={styles.arrowIcon2} />
                    <Text style={styles.submitButtonText}>Submit Feedback</Text>
                    <MaterialIcons name="double-arrow" size={26} color="#ddd" style={styles.arrowIcon2} />
                </TouchableOpacity>
            </KeyboardAvoidingView>
        );
    };

    // Function to handle new messages being added
    useEffect(() => {
        if (flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: true }); // Automatically scroll to the latest message
        }
    }, [messages]);

    const handleIntentClick = async (intentText) => {
        const userMessage = { id: `${messages.length + 1}`, sender: 'user', text: intentText };
        setMessages([...messages, userMessage]);

        setIsBotTyping(true);
        setBotTypingId(`${messages.length + 2}`);
        try {
            const userId = user?.id;
            console.log('Sending intent to fetch response:', { intentText, userId });

            let botMessageText = '';
            if (intentText === 'Feedback Submission') {
                handleFeedbackIntentClick();
                return;
            }
            const intentsRequiringLogin = ['Track My Order', 'My Cart Items', 'My Orders'];

            let showLogin = false;
            if (!isAuthenticated && intentsRequiringLogin.includes(intentText)) {
                botMessageText = 'You are not authenticated user, login now';
                showLogin = true;
            } else if (intentText === 'Track My Order') {
                botMessageText = 'Please enter or paste your order tracking ID here:';
                setIsTrackingIntent(true);
                setCartItems(false);
                setOrders(false);
                setShowViewMore(false);
                setCartIntentActive(false);
                setOrderIntentActive(false);
                setIsFeedbackFormVisible(false);
            } else if (intentText === 'Recommend Product') {
                const product = await fetchIntentResponse(intentText, userId);
                botMessageText = 'Here is a product recommendation:';
                setIsTrackingIntent(false);
                setCartItems(false);
                setOrders(false);
                setShowViewMore(false);
                setShowViewAll(false);
                setCartIntentActive(false);
                setOrderIntentActive(false);
                setIsFeedbackFormVisible(false);

                // Prepare the product message with details
                const productMessage = {
                    id: `${messages.length + 2}`,
                    sender: 'bot',
                    text: botMessageText,
                    product: product,
                };
                setMessages((prevMessages) => [...prevMessages, productMessage]);
                return;
            } else if (intentText === 'My Cart Items') {
                const response = await fetchIntentResponse(intentText, userId);
                botMessageText = 'Here are your cart items:';
                setCartItems(response);
                setShowViewMore(response.length > 3);
                setIsTrackingIntent(false);
                setCartIntentActive(true);
                setOrders(false);
                setShowViewAll(false);
                setOrderIntentActive(false);
                setIsFeedbackFormVisible(false);
            } else if (intentText === 'My Orders') {
                const response = await fetchIntentResponse(intentText, userId);
                botMessageText = 'Here are your orders:';
                setOrders(response);
                setShowViewAll(response.length > 3);
                setCartItems(false);
                setShowViewMore(false);
                setIsTrackingIntent(false);
                setCartIntentActive(false);
                setOrderIntentActive(true);
                setIsFeedbackFormVisible(false);
            } else {
                const response = await fetchIntentResponse(intentText, userId);
                botMessageText = response || 'Here is the response for your request.';
                setIsTrackingIntent(false);
                setCartItems(false);
                setOrders(false);
                setShowViewMore(false);
                setShowViewAll(false);
                setCartIntentActive(false);
                setOrderIntentActive(false);
                setIsFeedbackFormVisible(false);
            }

            const botMessage = {
                id: `${messages.length + 2}`,
                sender: 'bot',
                text: botMessageText,
                showLoginButton: showLogin
            };
            setMessages((prevMessages) => [...prevMessages, botMessage]);
        } catch (error) {
            const errorMessage = {
                id: `${messages.length + 2}`,
                sender: 'bot',
                text: 'An error occurred while processing your request.'
            };
            setMessages((prevMessages) => [...prevMessages, errorMessage]);
        } finally {
            setIsBotTyping(false);
            setExpanded(false);
            Animated.timing(animationValue, {
                toValue: 0,
                duration: 300,
                useNativeDriver: false,
            }).start();
        }
    };

    const handleTrackingIdSubmit = async () => {
        try {
            if (!trackingId.trim()) {
                alert('Please enter a valid tracking ID.');
                return;
            }

            console.log("Submitting tracking ID:", trackingId);

            const response = await axios.post(`${SERVER_URL}/chatbot/track-order`, { trackingId });

            // Check the response data from the backend
            console.log("Backend response:", response);

            if (response.data && response.data.assignOrderDetails) {
                const fetchedOrderDetails = response.data.assignOrderDetails;
                console.log("Fetched order details:", fetchedOrderDetails);
                setOrderDetails(fetchedOrderDetails);
            } else {
                console.log("No order details found in the response.");
                setOrderDetails(null);
            }
        } catch (error) {
            console.error("Error fetching order details:", error);
            setOrderDetails(null);
        } finally {
            setTrackingId('');
            setShowModal(true);
        }
    };

    useEffect(() => {
        // Sliding animation for multiple images
        if (orderDetails && orderDetails.cartItems.length > 1) {
            const animationDuration = 3000; // Set the duration for each slide
            const slideWidth = 300 + 10; // Width of each image + marginHorizontal (10px)

            Animated.loop(
                Animated.sequence([
                    Animated.timing(imageTranslateX, {
                        toValue: -slideWidth,
                        duration: animationDuration,
                        useNativeDriver: true,
                    }),
                    Animated.timing(imageTranslateX, {
                        toValue: 0,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        }
    }, [orderDetails]);

    const animateIcon = () => {
        Animated.loop(
            Animated.timing(iconAnimation, {
                toValue: 1,
                duration: 1500,
                easing: Easing.ease,
                useNativeDriver: true,
            })
        ).start();
    };

    const toggleExpand = () => {
        setExpanded(!expanded);
        Animated.timing(animationValue, {
            toValue: expanded ? 0 : 1,
            duration: 300,
            useNativeDriver: false,
        }).start();
    };

    const handleViewMoreCartItems = () => {
        navigation.navigate('Cart');
    };

    const handleViewMoreOrders = () => {
        navigation.navigate('OrdersList');
    };

    useEffect(() => {
        const handleIntentActive = (intentActive, expanded, items, setItems) => {
            if (intentActive && expanded) {
                setItems(items);
            } else if (intentActive) {
                setItems(items.slice(0, 3));
            }
        };

        handleIntentActive(cartIntentActive, expanded, cartItems, setCartItems);
        handleIntentActive(orderIntentActive, expanded, orders, setOrders);
    }, [expanded, cartIntentActive, orderIntentActive]);

    useEffect(() => {
        animateIcon();
    }, []);

    useEffect(() => {
        const resetItems = (intentText, setItems, setIntentActive, setShowView) => {
            if (!messages.some((msg) => msg.text === intentText)) {
                setItems(false);
                setShowView(false);
                setIntentActive(false);
            }
        };

        resetItems('Here are your cart items:', setCartItems, setCartIntentActive, setShowViewMore);
        resetItems('Here are your orders:', setOrders, setOrderIntentActive, setShowViewAll);
        if (!cartItems && cartIntentActive) {
            setCartIntentActive(false);
        }
        if (!orders && orderIntentActive) {
            setOrderIntentActive(false);
        }
    }, [messages]);

    const handleArrowPress = (item) => {
        console.log("Arrow pressed for item:", item);
    };

    const handleCartPress = (item) => {
        console.log("Cart pressed for item:", item);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString(); // Formats the date to a readable format based on locale
    };

    // Display the product in the message container
    const renderProductMessage = (product) => {
        return (
            <View style={styles.productMessageContainer}>
                <Image source={{ uri: product.imageUrl }} style={styles.productImage} resizeMode="contain" />
                <View style={styles.productDetails}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productPrice}>${product.price}</Text>
                </View>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <LinearGradient colors={['#4caf50', '#1976d2']} style={styles.header}>
                <Animated.View style={[styles.iconContainer, { transform: [{ scale: iconAnimation }] }]}>
                    <MaterialCommunityIcons name="robot" size={40} color="#fff" />
                </Animated.View>
                <Text style={styles.headerText}>AI ChatBot</Text>
            </LinearGradient>

            <View style={styles.chatContainer}>
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <View style={[styles.messageContainer, item.sender === 'bot' ? styles.botMessage : styles.userMessage]}>
                            {item.sender === 'bot' && (
                                <LinearGradient
                                    colors={['#b2ebf2', '#80deea']} // Add a gradient color for all bot messages
                                    style={styles.gradientBackground}
                                >
                                    <Text style={styles.messageText}>{item.text}</Text>
                                    {item.showFeedbackForm && isFeedbackFormVisible && renderFeedbackForm()}
                                    {item.product && renderProductMessage(item.product)}
                                    {item.showLoginButton && (
                                        <TouchableOpacity style={styles.loginButton} onPress={() => navigation.navigate('UserLogin')}>
                                            <MaterialIcons name="double-arrow" size={26} color="#ddd" style={styles.arrowIcon} />
                                            <Text style={styles.loginButtonText}>Login</Text>
                                            <MaterialIcons name="double-arrow" size={26} color="#ddd" style={styles.arrowIcon} />
                                        </TouchableOpacity>
                                    )}
                                </LinearGradient>
                            )}
                            {item.sender === 'user' && <Text style={styles.messageText}>{item.text}</Text>}
                        </View>
                    )}
                />

                {/* Display Cart Items */}
                {cartIntentActive && cartItems && (
                    <View style={styles.cartItemsContainer}>
                        <FlatList
                            data={cartItems}
                            keyExtractor={(item) => item._id}
                            renderItem={({ item }) => (
                                <View style={styles.cartItem}>
                                    <TouchableOpacity style={styles.cartIconContainer} onPress={() => handleCartPress(item)}>
                                        <MaterialIcons name="shopping-cart" size={24} color="#fff" />
                                    </TouchableOpacity>
                                    <Text style={styles.cartItemText}>
                                        {item.name} - {item.price}
                                    </Text>
                                    <TouchableOpacity style={styles.arrowContainer} onPress={() => handleArrowPress(item)}>
                                        <MaterialIcons name="double-arrow" size={24} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            )}
                        />
                        {showViewMore && (
                            <TouchableOpacity onPress={handleViewMoreCartItems} style={styles.viewMoreButton}>
                                <Text style={styles.viewMoreText}>View More</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* Display Order Items */}
                {orderIntentActive && orders && (
                    <View style={styles.orderItemsContainer}>
                        <FlatList
                            data={orders}
                            keyExtractor={(item) => item._id}
                            renderItem={({ item }) => (
                                <View style={styles.orderItem}>
                                    <TouchableOpacity style={styles.orderIconContainer} onPress={() => handleOrderPress(item)}>
                                        <MaterialCommunityIcons name="file-document" size={24} color="#fff" />
                                    </TouchableOpacity>
                                    <Text style={styles.orderItemText}>
                                        {item.orderId} - {item.totalPrice}
                                    </Text>
                                    <TouchableOpacity style={styles.arrowContainer} onPress={() => handleOrderDetailsPress(item)}>
                                        <MaterialIcons name="double-arrow" size={24} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            )}
                        />
                        {showViewAll && (
                            <TouchableOpacity onPress={handleViewMoreOrders} style={styles.viewMoreButton}>
                                <Text style={styles.viewMoreText}>View All</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {!isBotTyping && isTrackingIntent && messages.some((msg) => msg.text === 'Please enter or paste your order tracking ID here:') && (
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter Tracking ID"
                            value={trackingId}
                            onChangeText={setTrackingId}
                        />
                        <TouchableOpacity onPress={handleTrackingIdSubmit} style={styles.sendButton}>
                            <Ionicons name="send" size={24} color="blue" />
                        </TouchableOpacity>
                    </View>
                )}

                {!isBotTyping && isFeedbackFormVisible && messages.some((msg) => msg.text === 'Please provide your feedback below:') && (
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter feedback"
                            value={feedbackText}
                            onChangeText={handleFeedbackTextChange}
                        />

                    </View>
                )}
            </View>

            <Modal transparent={true} animationType="fade" visible={showModal} onRequestClose={() => setShowModal(false)}>
                <TouchableWithoutFeedback onPress={() => setShowModal(false)}>
                    <View style={styles.modalBackground}>
                        <View style={styles.modalContainer}>
                            {orderDetails && (
                                <>
                                    <Text style={styles.modalTitle}>Order ID: {orderDetails.orderId?._id}</Text>
                                    <Text>Status: {orderDetails.orderStatus}</Text>

                                    {/* Image Container */}
                                    {orderDetails.cartItems && orderDetails.cartItems.length > 0 && (
                                        <View style={styles.imageContainer}>
                                            {orderDetails.cartItems.length > 1 ? (
                                                <Animated.View
                                                    style={[styles.imageSlider, { transform: [{ translateX: imageTranslateX }] }]}
                                                >
                                                    {orderDetails.cartItems.map((item, index) => (
                                                        <Image
                                                            key={index}
                                                            source={{ uri: item.image || 'https://via.placeholder.com/150' }}
                                                            style={styles.orderImage}
                                                        />
                                                    ))}
                                                </Animated.View>
                                            ) : (
                                                <Image
                                                    source={{ uri: orderDetails.cartItems[0].image || 'https://via.placeholder.com/150' }}
                                                    style={styles.orderImage}
                                                />
                                            )}
                                        </View>
                                    )}

                                    <Text style={styles.modalDetails}>On the Way: {orderDetails.area}</Text>
                                    <Text style={styles.modalDetails}>Last updated: {orderDetails.locationUpdateTime ? formatDate(orderDetails.locationUpdateTime) : 'No update available'}</Text>

                                    <View style={styles.modalButtons}>
                                        <TouchableOpacity onPress={() => setShowModal(false)} style={styles.modalButton}>
                                            <Text style={styles.modalButtonText}>Close</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => console.log('Location icon clicked')} style={styles.modalButton2}>
                                            <Ionicons name="location-sharp" size={30} color="red" />
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            <View style={styles.buttonSection}>
                <Text style={styles.buttonSectionTitle}>Select your option to enquiry</Text>
                <View style={styles.buttonContainer}>
                    {intents.slice(0, 2).map((intent) => (
                        <TouchableOpacity key={intent.id} style={styles.intentButton} onPress={() => handleIntentClick(intent.text)}>
                            <FontAwesome name={intent.icon} size={24} color="#fff" style={styles.icon} />
                            <Text style={styles.intentButtonText}>{intent.text}</Text>
                        </TouchableOpacity>
                    ))}

                    {expanded && (
                        <View>
                            {intents.slice(2).map((intent) => (
                                <TouchableOpacity key={intent.id} style={styles.intentButton} onPress={() => handleIntentClick(intent.text)}>
                                    <FontAwesome name={intent.icon} size={24} color="#fff" style={styles.icon} />
                                    <Text style={styles.intentButtonText}>{intent.text}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    <TouchableOpacity onPress={toggleExpand} style={styles.toggleButton}>
                        <MaterialIcons
                            name={expanded ? 'expand-less' : 'expand-more'}
                            size={28}
                            color="#000"
                            style={styles.icon}
                        />
                    </TouchableOpacity>
                </View>
            </View>

        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f4f4f9',
        paddingHorizontal: 10,
        paddingTop: StatusBar.currentHeight || 24,
    },
    header: {
        width: '100%',
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        paddingTop: 20,
        marginBottom: 10,
    },
    iconContainer: {
        marginBottom: 10,
    },
    headerText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    chatContainer: {
        flex: 1,
        justifyContent: 'flex-start',
        paddingBottom: 20,
    },
    messageContainer: {
        marginBottom: 10,
        padding: 10,
        borderRadius: 10,
        maxWidth: '80%',
    },
    userMessage: {
        backgroundColor: '#e0e0e0',
        alignSelf: 'flex-end',
        borderBottomRightRadius: 0,
        padding: 10,
    },
    botMessage: {
        alignSelf: 'flex-start',
        borderRadius: 10,
    },
    gradientBackground: {
        padding: 10,
        borderRadius: 10,
    },
    messageText: {
        fontSize: 16,
        color: '#fff',
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 5,
        backgroundColor: '#fff',
        borderRadius: 50,
        alignItems: 'center',
        paddingHorizontal: 15,
    },
    input: {
        flex: 1,
        fontSize: 16,
        height: 40,
    },
    sendButton: {
        padding: 10,
    },
    modalBackground: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    modalContainer: {
        overflow: 'hidden',
        width: "90%",
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    imageContainer: {
        overflow: 'hidden',
        marginVertical: 20,
        resizeMode: "contain",
    },
    imageSlider: {
        flexDirection: 'row',
    },
    orderImage: {
        width: 300,
        height: 300,
        marginHorizontal: 5,
        borderRadius: 10,
        resizeMode: "contain",
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginTop: 20,
    },
    modalButton: {
        backgroundColor: '#007BFF',
        padding: 10,
        borderRadius: 5,
        width: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalButton2: {
        paddingHorizontal: 10,
        borderRadius: 10,
        marginTop: 10,
    },
    modalButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    buttonContainer: { padding: 5 },
    buttonSection: {
        marginVertical: 2,
    },
    buttonSectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 10,
        textAlign: 'center',
    },
    intentButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e0e0e0', borderRadius: 8, marginBottom: 10, padding: 5 },
    intentButtonText: { color: '#000', marginLeft: 10 },
    icon: {
        padding: 5,
    },
    toggleButton: { alignItems: 'center', padding: 5 },
    cartItemsContainer: {
        marginTop: 20,
        padding: 10,
        backgroundColor: '#f9f9f9',
        borderRadius: 10,
    },
    cartItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        marginBottom: 10,
        backgroundColor: '#4caf50',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#388e3c',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    cartItemText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
        flex: 1,
        marginHorizontal: 10,
    },
    cartIconContainer: {
        padding: 5,
        backgroundColor: '#2e7d32',
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    arrowContainer: {
        padding: 5,
        backgroundColor: '#2e7d32',
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    orderItemsContainer: {
        marginTop: 20,
        padding: 10,
        backgroundColor: '#f9f9f9',
        borderRadius: 10,
    },
    orderItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        marginBottom: 10,
        backgroundColor: '#4caf50',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#388e3c',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    orderIconContainer: {
        padding: 5,
        backgroundColor: '#2e7d32',
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    orderItemText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
        flex: 1,
        marginHorizontal: 10,
    },
    viewMoreButton: {
        padding: 10,
        alignItems: 'center',
        marginTop: 10,
        backgroundColor: '#1976d2',
        borderRadius: 8,
    },
    viewMoreText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    loginButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fafafafa',
        paddingVertical: 10,
        paddingHorizontal: 50,
        borderRadius: 30,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    loginButtonText: {
        color: 'red',
        fontSize: 18,
        fontWeight: 'bold',
        marginHorizontal: 10,
    },
    arrowIcon: {
        marginHorizontal: 10,
    },
    imageContainer: {
        flexDirection: 'row',
        marginVertical: 10,
    },
    orderImage: {
        width: 100,
        height: 100,
        marginHorizontal: 5,
        borderRadius: 10,
    },
    modalDetails: {
        fontSize: 14,
        marginVertical: 5,
        alignSelf: "center",
    },
    productMessageContainer: {
        flexDirection: 'row',
        padding: 10,
        marginBottom: 10,
        backgroundColor: 'white',
        borderRadius: 8,
        elevation: 2, // For Android shadow
        shadowColor: '#000', // For iOS shadow
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
    },
    productImage: {
        width: 80,   // Set a fixed width for the image
        height: 80,  // Set a fixed height for the image
        borderRadius: 8,  // Optional: Round the image corners for a smoother look
        marginRight: 10,  // Space between image and details
    },
    productDetails: {
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    productName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    productPrice: {
        fontSize: 14,
        color: 'green',
    },
    feedbackFormContainer: {
        padding: 20,
        backgroundColor: 'white',
        borderRadius: 8,
        marginTop: 20,
    },
    feedbackInput: {
        height: 100,
        borderColor: '#ccc',
        borderWidth: 1,
        padding: 10,
        borderRadius: 5,
        marginBottom: 20,
    },
    starsContainer: {
        flexDirection: 'row',
        marginBottom: 20,
        alignSelf: "center",
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fafafafa',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 30,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    submitButtonText: {
        color: 'green',
        fontSize: 16,
        fontWeight: 'bold',
    },
    arrowIcon2: {
        marginHorizontal: 0,
    },
});

export default ChatBot;

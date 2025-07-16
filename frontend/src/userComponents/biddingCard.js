import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Dimensions,
    ScrollView,
    ActivityIndicator,
    FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { SERVER_URL } from '../../Constants/index';
import { useUserStore } from "../../src/store/userStore";
const { width, height } = Dimensions.get('window');
import io from "socket.io-client";
import OrginalNavbar from "../../components/User/OriginalUserNavbar";

const BiddingCard = ({ route }) => {
    const { voucherId } = route.params;
    const [bidAmount, setBidAmount] = useState('');
    const [voucher, setVoucher] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user, isAuthenticated, checkAuthentication } = useUserStore();
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        const socketConnection = io(SERVER_URL); // Establish WebSocket connection
        setSocket(socketConnection);

        // Listen for voucher updates
        socketConnection.on("voucherUpdated", (data) => {
            if (data.type === "voucherUpdated" && data.voucher._id === voucherId) {
                console.log("Voucher updated via WebSocket:", data.voucher);
                setVoucher(data.voucher);
            }
        });

        return () => {
            socketConnection.disconnect(); // Clean up the WebSocket connection
        };
    }, [voucherId]);


    useEffect(() => {
        if (isAuthenticated === null) {
            checkAuthentication();
        }
    }, [isAuthenticated, checkAuthentication]);

    useEffect(() => {
        console.log('Received voucherId:', voucherId);
        const fetchVoucher = async () => {
            try {
                console.log(`Fetching voucher details for ID: ${voucherId}`);
                const response = await axios.get(`${SERVER_URL}/user/vouchers/${voucherId}`);
                console.log('Voucher details fetched successfully:', response.data);
                setVoucher(response.data); // Updated to set a single voucher object
                setLoading(false);
            } catch (err) {
                console.error('Error fetching voucher details:', err.message);
                setError(err.message);
                setLoading(false);
            }
        };

        if (voucherId) {
            fetchVoucher();
        } else {
            console.log('No voucher ID provided.');
        }
    }, [voucherId]);

    const calculateTimeLeft = (endTime) => {
        const now = new Date();
        const endDate = new Date(endTime);
        const timeDiff = endDate - now; // Time difference in milliseconds

        if (timeDiff <= 0) return "Expired";

        const days = Math.floor(timeDiff / (1000 * 3600 * 24));
        const hours = Math.floor((timeDiff % (1000 * 3600 * 24)) / (1000 * 3600));
        const minutes = Math.floor((timeDiff % (1000 * 3600)) / (1000 * 60));

        return `${days}d ${hours}h ${minutes}m`;
    };

    // Get the highest bid amount safely
    const getHighestBid = () => {
        if (!voucher || !voucher.currentBids || voucher.currentBids.length === 0) {
            return voucher?.price || 0; // Return the default price if no bids
        }
        return Math.max(...voucher.currentBids.map((bid) => bid.bidAmount));
    };

    // Compute the highest bid dynamically
    const highestBid = voucher ? getHighestBid() : 0;

    // If still loading, show a loader
    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6200EE" />
                <Text style={styles.loadingText}>Loading voucher details...</Text>
            </View>
        );
    }

    // If there's an error, display the error message
    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Error: {error}</Text>
            </View>
        );
    }

    // If voucher data is not available, return a message
    if (!voucher) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>No voucher details available.</Text>
            </View>
        );
    }

    const timeLeft = calculateTimeLeft(voucher.end_time);

    // Calculate the progress of the highest bid against the target price
    const progress =
        voucher.price && voucher.productPrice
            ? ((highestBid - voucher.price) / (voucher.productPrice - voucher.price)) * 100
            : 0;
    // Clamp progress between 0 and 100
    const progressWidth = Math.min(Math.max(progress, 0), 100);

    // Inside the BiddingCard component
    const getUserBiddingStatus = () => {
        if (!voucher || !user || !voucher.currentBids) return null;

        // Find the current user's bid
        const userBid = voucher.currentBids.find(
            (bid) => bid.userId && bid.userId.toString() === user.id
        );

        if (!userBid) {
            // If the user hasn't bid yet
            return { message: "Get started to bid now", emoji: "😊" };
        }

        // Extract all bid amounts except the current user's bid
        const otherBids = voucher.currentBids
            .filter((bid) => bid.userId && bid.userId.toString() !== user.id)
            .map((bid) => bid.bidAmount);

        // If no other users have placed a bid, the current user is the top bidder
        if (otherBids.length === 0 || userBid.bidAmount > Math.max(...otherBids)) {
            return { message: "You are the top bidder!", emoji: "😎" };
        }

        // If the current user's bid is lower than the highest other user's bid
        return { message: "You are the lowest bidder now, hurry up!", emoji: "😔" };
    };

    const userBiddingStatus = getUserBiddingStatus();

    // Get the count of unique bid users
    const getBidUserCount = () => {
        if (!voucher || !voucher.currentBids) return 0;

        // Filter out bids with null userId and count unique userIds
        const uniqueUserIds = new Set(
            voucher.currentBids
                .filter((bid) => bid.userId) // Exclude null userIds
                .map((bid) => bid.userId.toString()) // Convert to strings for uniqueness
        );

        return uniqueUserIds.size; // Return the count of unique userIds
    };

    // Compute the bid user count dynamically
    const bidUserCount = getBidUserCount();


    return (
        <View style={{ flex: 1 }}>
            {/* Fixed Header */}
            <View style={styles.fixedHeader}>
                <OrginalNavbar />
            </View>
    
            {/* Scrollable Content */}
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.card}>
                    {/* Ensure voucher image exists before rendering */}
                    <Image
                        source={{ uri: voucher.imageUrl || 'https://via.placeholder.com/300' }}
                        style={styles.productImage}
                    />
                    <View style={styles.cardBody}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>{voucher.voucher_name}</Text>
                            <Text style={styles.badge}>Active Auction</Text>
                        </View>
    
                        <View style={styles.bidInfo}>
                            <View style={styles.currentBid}>
                                <Text style={styles.textMuted}>Current Highest Bid</Text>
                                <Text style={styles.bidAmount}>₹{highestBid}</Text>
                                <Text style={styles.cardDescription}>{voucher.details}</Text>
                            </View>
                        </View>
    
                        <View style={styles.bidChart}>
                            <View style={styles.progressContainer}>
                                <View style={styles.unfilledProgressBar}>
                                    <View style={[styles.filledProgressBar, { width: `${progressWidth}%` }]} />
                                </View>
                            </View>
                            <View style={styles.progressText}>
                                <Text style={styles.textMuted}>Starting: ₹{voucher.price}</Text>
                                <Text style={styles.textMuted}>Target: ₹{voucher.productPrice}</Text>
                            </View>
                        </View>
    
                        <View style={styles.bidInput}>
                            <TextInput
                                style={styles.input}
                                placeholder={`Bid: ₹${highestBid}`}
                                value={String(bidAmount)}
                                editable={false}
                            />
                            <TouchableOpacity
                                style={styles.plusButton}
                                onPress={() => {
                                    const incrementedBid = parseFloat(bidAmount || highestBid) + 50;
                                    setBidAmount(incrementedBid);
                                }}
                            >
                                <Ionicons name="add-circle-outline" size={28} color="#0070f3" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.placeBidButton}
                                onPress={async () => {
                                    try {
                                        if (!isAuthenticated || !user) {
                                            console.error('User is not authenticated.');
                                            return;
                                        }
    
                                        const bidPayload = {
                                            userId: user.id,
                                            email: user.email,
                                            bidAmount,
                                        };
    
                                        const response = await axios.post(
                                            `${SERVER_URL}/user/vouchers/${voucherId}/placeBid`,
                                            bidPayload
                                        );
    
                                        if (response.data?.success) {
                                            const updatedVoucherResponse = await axios.get(`${SERVER_URL}/user/vouchers/${voucherId}`);
                                            setVoucher(updatedVoucherResponse.data);
                                            setBidAmount('');
                                        } else {
                                            console.error('Failed to place bid:', response.data?.message);
                                        }
                                    } catch (error) {
                                        console.error('Error placing bid:', error.message);
                                    }
                                }}
                            >
                                <Ionicons name="hammer" size={20} color="white" />
                                <Text style={styles.buttonText}>Place Bid</Text>
                            </TouchableOpacity>
                        </View>
    
                        {userBiddingStatus && (
                            <View style={styles.noticeContainer}>
                                <Text style={styles.noticeText}>{userBiddingStatus.message}</Text>
                                <View style={styles.emojiWrapper}>
                                    <Text style={[styles.emoji, { transform: [{ scale: 1.2 }] }]}>
                                        {userBiddingStatus.emoji}
                                    </Text>
                                </View>
                            </View>
                        )}
    
                        <View style={styles.stats}>
                            <View style={styles.statItem}>
                                <Ionicons name="people" size={24} color="#0070f3" />
                                <Text style={styles.statText}>{bidUserCount} Bids</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Ionicons name="time" size={24} color="#0070f3" />
                                <Text style={styles.statText}>{timeLeft}</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Ionicons name="eye" size={24} color="#0070f3" />
                                <Text style={styles.statText}>{voucher.watchers} Watching</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
    
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        paddingTop: 20,
        paddingBottom: 20,
    },
    fixedHeader: {
        position: 'absolute',
        top: 0,
        width: '100%',
        zIndex: 10,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    scrollContainer: {
        flexGrow: 1,
        paddingTop: 100, // Adjust to ensure content starts below the header
    },    
    card: {
        width: width, // Full-screen width
        overflow: 'hidden',
        backgroundColor: '#000',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 10,
    },
    productImage: {
        width: '100%',
        height: height * 0.4,
        resizeMode: 'cover',
    },
    cardBody: {
        padding: 10,
        flex: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    cardTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    badge: {
        backgroundColor: '#0070f3',
        color: '#fff',
        paddingVertical: 6,
        paddingHorizontal: 15,
        borderRadius: 20,
        fontSize: 12,
    },
    bidInfo: {
        marginBottom: 20,
    },
    currentBid: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
    },
    textMuted: {
        color: '#777',
        fontSize: 14,
    },
    bidAmount: {
        fontSize: 26,
        fontWeight: 'bold',
        marginVertical: 10,
    },
    bidChart: {
        marginBottom: 25,
    },
    progressContainer: {
        height: 12,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 10,
    },
    unfilledProgressBar: {
        height: '100%',
        backgroundColor: '#e0e0e0',  // Gray color for unfilled area
    },
    filledProgressBar: {
        height: '100%',
        backgroundColor: '#0070f3',  // Blue color for filled area
    },
    progressText: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        fontSize: 14,
        color: '#555',
    },
    bidInput: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    input: {
        flex: 1,
        height: 50,
        paddingHorizontal: 15,
        borderColor: '#fff',
        backgroundColor: '#ccc',
        borderWidth: 1,
        borderRadius: 8,
        marginRight: 10,
        fontSize: 16,
    },
    placeBidButton: {
        backgroundColor: '#ccc',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        marginLeft: 10,
        fontWeight: 'bold',
        fontSize: 16,
    },
    stats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        marginBottom: 50,
    },
    statItem: {
        alignItems: 'center',
    },
    statText: {
        marginTop: 5,
        fontSize: 14,
        color: '#ccc',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#6200EE',
        marginTop: 10,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: 'red',
        fontSize: 16,
    },
    noticeContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#e6f7ff", // Light blue for a pleasant look
        padding: 15,
        borderRadius: 15, // Rounded corners for a soft appearance
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#fff", // Slightly darker blue for the border
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5, // Android shadow
    },
    noticeText: {
        fontSize: 16,
        color: "#004d99", // Deep blue for readability
        fontWeight: "bold",
        flex: 1,
        marginRight: 10,
    },
    emojiWrapper: {
        width: 50,
        height: 50,
        borderRadius: 25, // Circular design
        backgroundColor: "#fff", // White background for the emoji
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#004d99", // Deep blue for the border
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 6, // Android shadow
        transform: [{ scale: 1.1 }], // Slightly larger for 3D effect
    },
    emoji: {
        fontSize: 28,
        transform: [{ scale: 1.2 }], // Animation starts from this scale
        color: "#004d99", // Consistent with the theme
    },


});

export default BiddingCard;

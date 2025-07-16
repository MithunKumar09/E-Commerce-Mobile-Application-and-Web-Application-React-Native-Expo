import React, { useState, useEffect } from 'react';
import { View, Text, Image, Button, TextInput, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import axios from 'axios';
import { SERVER_URL } from '../../Constants/index';
import DateTimePicker from "@react-native-community/datetimepicker";

const TodayDeals = () => {
    const [deals, setDeals] = useState([]);
    const [products, setProducts] = useState([]);
    const [productName, setProductName] = useState('');
    const [productId, setProductId] = useState('');
    const [discount, setDiscount] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [isAutomated, setIsAutomated] = useState(false);
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [showStartTimePicker, setShowStartTimePicker] = useState(false);
    const [showEndTimePicker, setShowEndTimePicker] = useState(false);

    // Fetch all deals on component mount
    useEffect(() => {
        const fetchDeals = async () => {
            try {
                const response = await axios.get(`${SERVER_URL}/admin/todaydeals`);
                setDeals(response.data);
            } catch (error) {
                console.error("Error fetching deals:", error);
                Alert.alert("Error", "Failed to fetch deals.");
            }
        };

        fetchDeals();
    }, []);

    // Fetch products on component mount
    useEffect(() => {
        // Fetch products from the database
        const fetchProducts = async () => {
            try {
                console.log("Fetching products from the database...");
                const response = await axios.get(`${SERVER_URL}/admin/products`);
                console.log("Initial products fetched:", response.data);

                // Extract only product name and product ID (_id)
                const productList = response.data.map((product) => ({
                    _id: product._id,
                    name: product.name, // You can also include any other field here if needed
                }));

                console.log("Filtered products:", productList);

                setProducts(productList);
            } catch (error) {
                console.error("Error fetching products:", error);
                setProducts([]);
            }
        };

        fetchProducts();
    }, []);


    const addDeal = async () => {
        if (!productName || !discount || !startDate || !endDate || !startTime || !endTime || !productId) {
            Alert.alert('Error', 'Please fill all fields.');
            return;
        }
    
        // Ensure startDate and startTime are not in the past
        const currentDate = new Date();
        const selectedStartDateTime = new Date(`${startDate}T${startTime}:00`);
        if (selectedStartDateTime < currentDate) {
            Alert.alert('Error', 'Start date and time cannot be in the past.');
            return;
        }
    
        const parsedEndTime = new Date(`1970-01-01T${endTime}:00`);
        const formattedEndTime =
            new Date(endDate) > new Date(startDate) && parsedEndTime <= new Date(`1970-01-01T${startTime}:00`)
                ? `${24 + parseInt(endTime.split(':')[0])}:${endTime.split(':')[1]}`
                : endTime;
    
        const newDeal = {
            productId,
            productName,
            discount: parseInt(discount),
            startDate,
            endDate,
            startTime,
            endTime: formattedEndTime,
            isAutomated,
        };
    
        console.log('Data sent to backend:', newDeal);
    
        try {
            const response = await axios.post(`${SERVER_URL}/admin/todaydeals`, newDeal);
            if (response.status === 201) {
                setDeals((prevDeals) => [...prevDeals, response.data.deal]);
                setProductName('');
                setProductId('');
                setDiscount('');
                setStartDate('');
                setEndDate('');
                setStartTime('');
                setEndTime('');
                setIsAutomated(false);
                Alert.alert('Success', 'Deal added successfully!');
            }
        } catch (error) {
            console.error('Error adding deal:', error.response?.data || error.message);
            Alert.alert('Error', error.response?.data?.error || 'Failed to add deal.');
        }
    };
    
    
    

    const deleteDeal = async (id) => {
        try {
            await axios.delete(`${SERVER_URL}/admin/todaydeals/${id}`);
            setDeals((prevDeals) => prevDeals.filter((deal) => deal._id !== id));
            Alert.alert('Success', 'Deal deleted successfully!');
        } catch (error) {
            console.error("Error deleting deal:", error);
            Alert.alert("Error", "Failed to delete deal.");
        }
    };

    const onStartDateChange = (event, selectedDate) => {
        const currentDate = selectedDate || startDate;
        setShowStartDatePicker(false);
        setStartDate(currentDate.toISOString().split('T')[0]);
    };

    const onEndDateChange = (event, selectedDate) => {
        const currentDate = selectedDate || endDate;
        setShowEndDatePicker(false);
    
        // Validate that end date is not earlier than start date
        if (new Date(currentDate) < new Date(startDate)) {
            Alert.alert('Error', 'End date cannot be earlier than start date.');
            return;
        }
    
        setEndDate(currentDate.toISOString().split('T')[0]);
    };

    const onStartTimeChange = (event, selectedTime) => {
        const currentTime = selectedTime || startTime;
        setShowStartTimePicker(false);
        setStartTime(currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };

    const onEndTimeChange = (event, selectedTime) => {
        const currentTime = selectedTime || endTime;
        setShowEndTimePicker(false);
        setEndTime(currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Today's Deals</Text>

            <View style={styles.form}>
                <TextInput
                    style={styles.input}
                    placeholder="Select Product"
                    value={productName}
                    onFocus={() => setProductName('')}
                />
                <FlatList
                    data={products}
                    keyExtractor={(item) => item._id}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            onPress={() => { setProductName(item.name); setProductId(item._id); }}
                        >
                            <Text>{item.name}</Text>
                        </TouchableOpacity>
                    )}
                    style={styles.productList}
                />

                <TextInput
                    style={styles.input}
                    placeholder="Discount (%)"
                    keyboardType="numeric"
                    value={discount}
                    onChangeText={setDiscount}
                />

                <TouchableOpacity onPress={() => setShowStartDatePicker(true)}>
                    <TextInput
                        style={styles.input}
                        placeholder="Start Date"
                        value={startDate}
                        editable={false}
                    />
                </TouchableOpacity>
                {showStartDatePicker && (
                    <DateTimePicker
                        testID="startDatePicker"
                        value={new Date()}
                        mode="date"
                        display="default"
                        onChange={onStartDateChange}
                    />
                )}

                <TouchableOpacity onPress={() => setShowEndDatePicker(true)}>
                    <TextInput
                        style={styles.input}
                        placeholder="End Date"
                        value={endDate}
                        editable={false}
                    />
                </TouchableOpacity>
                {showEndDatePicker && (
                    <DateTimePicker
                        testID="endDatePicker"
                        value={new Date()}
                        mode="date"
                        display="default"
                        onChange={onEndDateChange}
                    />
                )}

                <TouchableOpacity onPress={() => setShowStartTimePicker(true)}>
                    <TextInput
                        style={styles.input}
                        placeholder="Start Time"
                        value={startTime}
                        editable={false}
                    />
                </TouchableOpacity>
                {showStartTimePicker && (
                    <DateTimePicker
                        testID="startTimePicker"
                        value={new Date()}
                        mode="time"
                        display="default"
                        onChange={onStartTimeChange}
                    />
                )}

                <TouchableOpacity onPress={() => setShowEndTimePicker(true)}>
                    <TextInput
                        style={styles.input}
                        placeholder="End Time"
                        value={endTime}
                        editable={false}
                    />
                </TouchableOpacity>
                {showEndTimePicker && (
                    <DateTimePicker
                        testID="endTimePicker"
                        value={new Date()}
                        mode="time"
                        display="default"
                        onChange={onEndTimeChange}
                    />
                )}

                <View style={styles.toggleContainer}>
                    <Text>Automated Deal</Text>
                    <TouchableOpacity
                        style={[styles.toggleButton, isAutomated ? styles.toggleOn : styles.toggleOff]}
                        onPress={() => setIsAutomated((prev) => !prev)}
                    >
                        <Text style={styles.toggleButtonText}>{isAutomated ? 'ON' : 'OFF'}</Text>
                    </TouchableOpacity>
                </View>

                <Button title="Add Deal" onPress={addDeal} />
            </View>

            <FlatList
                data={deals}
                renderItem={({ item }) => (
                    <View style={styles.dealCard}>
                        <Image source={{ uri: item.productDetails?.images.imageUrl || '' }} style={styles.productImage} />
                        <Text style={styles.dealTitle}>{item.productName}</Text>
                        <Text>Discount: {item.discount}%</Text>
                        <Text>Start Date: {item.startDate}</Text>
                        <Text>End Date: {item.endDate}</Text>
                        <Text>Start Time: {item.startTime}</Text>
                        <Text>End Time: {item.endTime}</Text>
                        <Text>Automation: {item.isAutomated ? 'Enabled' : 'Disabled'}</Text>
                        <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => deleteDeal(item._id)}
                        >
                            <Text style={styles.deleteButtonText}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                )}
                keyExtractor={(item) => item._id}
                style={styles.dealList}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f4f4f4',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
    },
    form: {
        marginBottom: 20,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        marginBottom: 12,
        borderRadius: 5,
        backgroundColor: '#fff',
    },
    toggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    toggleButton: {
        padding: 8,
        borderRadius: 5,
        marginLeft: 10,
    },
    toggleOn: {
        backgroundColor: 'green',
    },
    toggleOff: {
        backgroundColor: 'red',
    },
    toggleButtonText: {
        color: '#fff',
    },
    dealList: {
        marginTop: 20,
    },
    dealCard: {
        backgroundColor: '#fff',
        padding: 15,
        marginBottom: 12,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#ccc',
    },
    dealTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    deleteButton: {
        backgroundColor: '#ff4d4d',
        padding: 8,
        borderRadius: 5,
        marginTop: 10,
        alignItems: 'center',
    },
    deleteButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    productList: {
        marginTop: 10,
        marginBottom: 20,
    },
});

export default TodayDeals;

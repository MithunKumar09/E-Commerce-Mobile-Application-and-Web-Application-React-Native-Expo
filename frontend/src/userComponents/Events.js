import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useNavigation } from '@react-navigation/native';
import axios from "axios";
import { SERVER_URL } from "../../Constants/index";

const { width } = Dimensions.get("window");

const eventsData = [
  {
    id: "1",
    imageUrl: "https://images.unsplash.com/photo-1540317580384-e5d43616b9aa",
    altText: "Event 1",
  },
  {
    id: "2",
    imageUrl: "https://images.unsplash.com/photo-1566737236500-c8ac43014a67",
    altText: "Event 2",
  },
  {
    id: "3",
    imageUrl: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30",
    altText: "Event 3",
  },
];

const vouchersData = [
  {
    id: "1",
    title: "Concert Voucher",
    description: "Get 30% off on any concert ticket",
    imageUrl: "https://images.unsplash.com/photo-1572375992501-4b0892d50c69",
  },
  {
    id: "2",
    title: "Theater Pass",
    description: "Special discount on theater shows",
    imageUrl: "https://images.unsplash.com/photo-1567593810070-7a3d471af022",
  },
  {
    id: "3",
    title: "Festival Package",
    description: "Complete festival experience at 40% off",
    imageUrl: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3",
  },
];

const EventComponent = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [deals, setDeals] = useState([]);

  useEffect(() => {
    // Fetch deals when component mounts
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    try {
      // Fetch only active deals
      console.log("Fetching active deals...");
      const response = await axios.get(`${SERVER_URL}/user/todaydeals/scheduled`);
      const dealsData = response.data;
      console.log("Fetched active deals:", dealsData);

      const detailedDeals = await Promise.all(
        dealsData.map(async (deal) => {
          const product = deal.productId; // Accessing populated productId

          return {
            id: deal._id,
            title: product.name, // Using product name from populated data
            description: `Discount: ${deal.discount}% - Price: ₹${product.salePrice}`, // Using salePrice from product
            banner: product.images?.imageUrl, // Assuming the first image in the product images is the banner
            date: deal.startDate, // Using startDate for the event date
            type: deal.automationStatus === 'scheduled' ? 'Scheduled Deal' : 'Expired Deal',
          };
        })
      );

      setDeals(detailedDeals); // Update deals state with the fetched data
    } catch (error) {
      console.error("Error fetching deals:", error);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prevIndex) => (prevIndex + 1) % eventsData.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

    // Countdown Timer Logic
    const calculateTimeLeft = (endDate) => {
      const difference = new Date(endDate) - new Date();
      let timeLeft = {};
  
      if (difference > 0) {
        timeLeft = {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        };
      }
      return timeLeft;
    };

  return (
    <ScrollView style={styles.container}>
      {/* Carousel */}
      <View style={styles.carouselContainer}>
        <Image
          source={{ uri: eventsData[activeIndex].imageUrl }}
          style={styles.carouselImage}
        />
        <View style={styles.indicators}>
          {eventsData.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                activeIndex === index && styles.activeIndicator,
              ]}
            />
          ))}
        </View>
      </View>

      {/* Deals Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Deal's</Text>
        <FlatList
  horizontal
  data={deals}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => {
    // Safely calculate the countdown only if item.date exists
    const timeLeft = item.date ? calculateTimeLeft(item.date) : null;

    return (
      <View style={styles.card}>
        <Image source={{ uri: item.banner }} style={styles.cardImage} />
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardDescription}>{item.description}</Text>
        <Text style={styles.eventType}>{item.type}</Text>
        {timeLeft && Object.keys(timeLeft).length > 0 && (
          <Text style={styles.eventCountdown}>
            Starts in: {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
          </Text>
        )}
      </View>
    );
  }}
/>

      </View>

      {/* Vouchers Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Available Vouchers</Text>
        <FlatList
          data={vouchersData}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            <View style={styles.voucherCard}>
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.voucherImage}
              />
              <Text style={styles.voucherTitle}>{item.title}</Text>
              <Text style={styles.voucherDescription}>{item.description}</Text>
              <TouchableOpacity style={styles.button}>
                <Text style={styles.buttonText}>Redeem Now</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    flex: 1,
  },
  carouselContainer: {
    position: "relative",
  },
  carouselImage: {
    width: "100%",
    height: 300,
    resizeMode: "cover",
  },
  indicators: {
    position: "absolute",
    bottom: 10,
    flexDirection: "row",
    alignSelf: "center",
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ccc",
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: "#0070f3",
  },
  section: {
    marginVertical: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginHorizontal: 8,
    width: width * 0.8,
    padding: 16,
  },
  cardImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
    resizeMode: "cover",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: "#555",
  },
  row: {
    justifyContent: "space-between",
  },
  voucherCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 16,
    padding: 16,
    flex: 1,
    marginHorizontal: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  voucherImage: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    marginBottom: 10,
    resizeMode: "cover",
  },
  voucherTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
    textAlign: "center",
  },
  voucherDescription: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    marginBottom: 10,
  },
  button: {
    backgroundColor: "#0070f3",
    padding: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
  eventType: {
    fontSize: 12,
    color: '#888',
    marginBottom: 10,
  },
  eventCountdown: {
    fontSize: 14,
    color: '#ff3d00',
    fontWeight: 'bold',
  },
});

export default EventComponent;

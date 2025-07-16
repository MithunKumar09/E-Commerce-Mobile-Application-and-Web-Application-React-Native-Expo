//Dashboard.js
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import axios from 'axios';
import moment from 'moment';
import { SERVER_URL } from '../../Constants/index';
import { useUserStore } from '../../src/store/userStore'; // Zustand store
import * as SecureStore from 'expo-secure-store';

const screenWidth = Dimensions.get('window').width;

const Dashboard = () => {
  const [counts, setCounts] = useState({
    userCount: 0,
    auctionCount: 0,
    auctionUniqueParticipants: 0,
    orderCount: 0,
    orderStatusCounts: {},
    userRegistrationDates: [],
    auctionDates: [],
    orderDates: [],
  });
  const [timeframe, setTimeframe] = useState("year");
  const { admin, isAuthenticated, checkAdminAuthentication, signOutAdmin } = useUserStore(state => state);

    useEffect(() => {
      checkAdminAuthentication();
    }, []);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const response = await axios.get(`${SERVER_URL}/admin/dashboardCounts`);
        setCounts(response.data);
      } catch (error) {
        console.error('Error fetching dashboard counts:', error);
      }
    };

    fetchCounts();
  }, []);

  const filterDataByTimeframe = (dates) => {
    const now = moment();
    return dates.filter(date => {
      const dateMoment = moment(date);
      if (timeframe === "day") {
        return now.isSame(dateMoment, 'day');
      } else if (timeframe === "week") {
        return now.isSame(dateMoment, 'week');
      } else if (timeframe === "month") {
        return now.isSame(dateMoment, 'month');
      } else if (timeframe === "year") {
        return now.isSame(dateMoment, 'year');
      }
      return false;
    });
  };

  const filteredUserCount = filterDataByTimeframe(counts.userRegistrationDates).length;
  const filteredAuctionCount = filterDataByTimeframe(counts.auctionDates).length;
  const filteredOrderCount = filterDataByTimeframe(counts.orderDates).length;
  const orderStatusCounts = counts.orderStatusCounts || {};
  const auctionUniqueParticipants = counts.auctionUniqueParticipants || 0;

  const filteredOrderStatusCounts = Object.keys(counts.orderStatusCounts || {}).reduce((acc, status) => {
    const statusData = counts.orderStatusCounts[status];
    const filteredDates = filterDataByTimeframe(statusData?.dates || []);
    acc[status] = {
      count: filteredDates.length,
      dates: filteredDates,
    };
    return acc;
  }, {});

  const orderStatusLabels = Object.keys(filteredOrderStatusCounts);
  const orderStatusValues = orderStatusLabels.map(status => filteredOrderStatusCounts[status]?.count || 0);

  // Bar Chart Data
  const barData = {
    labels: ['User Count', 'Auction Counts', 'Auction Participants', 'Orders Count', ...Object.keys(filteredOrderStatusCounts)],
    datasets: [
      {
        label: `Counts (${timeframe})`,
        data: [filteredUserCount, filteredAuctionCount, auctionUniqueParticipants, filteredOrderCount, ...Object.values(filteredOrderStatusCounts).map(item => item.count)],
        backgroundColor: ['#4F46E5', '#22C55E', '#34D399', '#EAB308', ...Object.keys(filteredOrderStatusCounts).map(() => `#${Math.floor(Math.random() * 16777215).toString(16)}`)],
        borderWidth: 1,
      },
    ],
  };

  // Pie Chart Data
  const pieData = {
    labels: ['User Count', 'Auction Counts', 'Auction Participants', 'Orders Count', ...orderStatusLabels],
    datasets: [
      {
        data: [
          filteredUserCount,
          filteredAuctionCount,
          auctionUniqueParticipants,
          filteredOrderCount,
          ...orderStatusLabels.map(status => filteredOrderStatusCounts[status]?.count || 0),
        ],
        backgroundColor: [
          '#6366F1', '#34D399', '#FBBF24',
          ...orderStatusLabels.map(() => `#${Math.floor(Math.random() * 16777215).toString(16)}`),
        ],
        hoverBackgroundColor: [
          '#4338CA', '#10B981', '#F59E0B',
          ...orderStatusLabels.map(() => `#${Math.floor(Math.random() * 16777215).toString(16)}`),
        ],
      },
    ],
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.header}>Dashboard</Text>

          {/* Cards Section */}
          <View style={styles.cardRow}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>User Count</Text>
              <Text style={styles.cardValue}>{filteredUserCount}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Auction Counts</Text>
              <Text style={styles.cardValue}>{filteredAuctionCount}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Orders Count</Text>
              <Text style={styles.cardValue}>{filteredOrderCount}</Text>
            </View>
          </View>

          {/* Order Status Cards */}
          <View style={styles.cardRow}>
            {orderStatusLabels.map((status, index) => (
              <View key={index} style={styles.card}>
                <Text style={styles.cardTitle}>{status} Orders</Text>
                <Text style={styles.cardValue}>{filteredOrderStatusCounts[status]?.count || 0}</Text>
              </View>
            ))}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Auction Unique Participants</Text>
              <Text style={styles.cardValue}>{auctionUniqueParticipants}</Text>
            </View>
          </View>

          {/* Timeframe Buttons */}
          <View style={styles.buttonRow}>
            {['day', 'week', 'month', 'year'].map(period => (
              <TouchableOpacity key={period} onPress={() => setTimeframe(period)} style={[styles.timeframeButton, timeframe === period && styles.activeButton]}>
                <Text style={styles.buttonText}>{period.charAt(0).toUpperCase() + period.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Bar Chart and Pie Chart */}
          <View style={styles.chartRow}>
            <View style={styles.chart}>
              <BarChart
                data={barData}
                width={screenWidth - 40}
                height={220}
                chartConfig={{
                  backgroundColor: '#fff',
                  backgroundGradientFrom: '#fff',
                  backgroundGradientTo: '#fff',
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  style: { borderRadius: 16 },
                }}
                fromZero
              />
            </View>

            <View style={styles.chart}>
              <PieChart
                data={pieData.datasets[0].data.map((value, index) => ({
                  name: pieData.labels[index],
                  population: value,
                  color: pieData.datasets[0].backgroundColor[index],
                  legendFontColor: '#7F7F7F',
                  legendFontSize: 15,
                }))}
                width={screenWidth - 40}
                height={220}
                chartConfig={{
                  backgroundColor: '#fff',
                  backgroundGradientFrom: '#fff',
                  backgroundGradientTo: '#fff',
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  style: { borderRadius: 16 },
                }}
                accessor="population"
                backgroundColor="transparent"
              />
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flex: 1,
  },
  content: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '30%',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14,
    color: '#888',
  },
  cardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timeframeButton: {
    backgroundColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginRight: 10,
  },
  activeButton: {
    backgroundColor: '#4F46E5',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
  },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chart: {
    width: '48%',
  },
});

export default Dashboard;

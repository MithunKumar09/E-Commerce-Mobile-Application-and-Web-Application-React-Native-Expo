import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, StatusBar } from 'react-native';
import { useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Activities from '../../src/SalesmanComponents/Activities';
import Orders from '../../src/SalesmanComponents/Orders';
import Request from '../../src/SalesmanComponents/Request';
import SalesmanProfile from '../../src/SalesmanComponents/SalesmanProfile';

const SalesManNavbars = () => {
  const [activeTab, setActiveTab] = useState('Completed');
  const { width } = useWindowDimensions();

  const renderContent = () => {
    switch (activeTab) {
      case 'Requests':
        return <Request />;
      case 'Activities':
        return <Activities />;
      case 'Orders':
        return <Orders />;
      case 'Profile':
        return <SalesmanProfile />;
      default:
        return <Text style={styles.contentText}>Welcome!</Text>;
    }
  };

  const tabs = [
    { title: 'Requests', icon: 'swap-horizontal-outline' },
    { title: 'Activities', icon: 'location-outline' },
    { title: 'Orders', icon: 'list' },
    { title: 'Profile', icon: 'person-circle' },
  ];

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.navbarContainer}>
        <FlatList
          data={tabs}
          horizontal
          keyExtractor={(item) => item.title}
          renderItem={({ item }) => (
            <Tab
              title={item.title}
              icon={item.icon}
              active={activeTab === item.title}
              onPress={() => setActiveTab(item.title)}
            />
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.navbarScroll}
        />
      </View>

      {/* Tab Content */}
      <View style={styles.contentContainer}>{renderContent()}</View>
    </View>
  );
};

const Tab = ({ title, icon, active, onPress }) => (
  <TouchableOpacity
    style={[styles.tab, active && styles.activeTab]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <Ionicons
      name={icon}
      size={24}
      color={active ? '#ffffff' : '#6c757d'}
      style={styles.icon}
    />
    <Text style={[styles.tabText, active && styles.activeTabText]}>{title}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: StatusBar.currentHeight || 24,
  },
  navbarContainer: {
    backgroundColor: '#ffffff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    paddingVertical: 5,
  },
  navbarScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 25,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#e9ecef',
  },
  activeTab: {
    backgroundColor: '#0d6efd',
  },
  tabText: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
  },
  activeTabText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  contentText: {
    fontSize: 18,
    color: '#495057',
    textAlign: 'center',
    marginVertical: 10,
  },
});

export default SalesManNavbars;

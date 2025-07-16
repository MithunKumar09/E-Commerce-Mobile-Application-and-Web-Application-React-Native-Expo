//Request.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions } from 'react-native';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { Ionicons } from '@expo/vector-icons';
import CancelledOrder from './CancelledOrder';

const { width } = Dimensions.get('window');

const Request = () => {
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'replaceOrder', title: 'Replace Order' },
    { key: 'cancellationOrder', title: 'Cancellation Order' },
  ]);

  const renderTabBar = (props) => (
    <TabBar
      {...props}
      indicatorStyle={styles.indicator}
      style={styles.tabBar}
      labelStyle={styles.labelStyle}
      activeColor="#007bff"
      inactiveColor="#8a8a8a"
      renderIcon={({ route, focused }) => {
        const icons = {
          replaceOrder: focused ? 'refresh-circle' : 'refresh-circle-outline',
          cancellationOrder: focused ? 'close-circle' : 'close-circle-outline',
        };
        return (
          <Ionicons
            name={icons[route.key]}
            size={24}
            color={focused ? '#007bff' : '#8a8a8a'}
          />
        );
      }}
    />
  );

  const sampleData = {
    replaceOrder: [
      { id: '1', title: 'Order #123 - Replace Requested' },
      { id: '2', title: 'Order #124 - Replace Approved' },
    ],
  };

  const renderList = (data) => (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.listItem}>
          <Text style={styles.listItemText}>{item.title}</Text>
        </View>
      )}
      contentContainerStyle={styles.listContainer}
    />
  );

  const ReplaceOrderRoute = () => renderList(sampleData.replaceOrder);
  const CancellationOrderRoute = () => <CancelledOrder />;

  const renderScene = SceneMap({
    replaceOrder: ReplaceOrderRoute,
    cancellationOrder: CancellationOrderRoute,
  });

  return (
    <View style={styles.container}>
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width }}
        renderTabBar={renderTabBar}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  tabBar: {
    backgroundColor: '#ffffff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  indicator: {
    backgroundColor: '#007bff',
    height: 3,
  },
  labelStyle: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    padding: 5,
  },
  listItem: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
  },
  listItemText: {
    fontSize: 16,
    color: '#333',
  },
});

export default Request;

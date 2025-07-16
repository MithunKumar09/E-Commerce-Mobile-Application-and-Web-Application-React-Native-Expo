import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  FlatList,
} from 'react-native';
import CodOrders from '../../src/adminComponents/Orders/CodOrders';
import PrepaidOrders from '../../src/adminComponents/Orders/PrepaidOrders';
import WalletOrders from '../../src/adminComponents/Orders/WalletOrders';

const OrderTabs = () => {
  const [activeTab, setActiveTab] = useState(0);
  const slideAnim = React.useRef(new Animated.Value(0)).current;

  const tabData = [
    { id: 0, title: 'Cash on Delivery', content: <CodOrders /> },
    { id: 1, title: 'Pre-Paid Delivery', content: <PrepaidOrders /> },
    { id: 2, title: 'Wallet Delivery', content: <WalletOrders /> },
  ];

  const handleTabPress = (index) => {
    setActiveTab(index);
    Animated.spring(slideAnim, {
      toValue: index * (Dimensions.get('window').width / tabData.length),
      useNativeDriver: false,
    }).start();
  };

  const renderContent = ({ item }) => (
    <View style={styles.contentWrapper}>
      {typeof item.content === 'string' ? (
        <Text style={styles.contentText}>{item.content}</Text>
      ) : (
        item.content
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {tabData.map((tab, index) => (
          <TouchableOpacity
            key={tab.id}
            style={styles.tab}
            onPress={() => handleTabPress(index)}
          >
            <Text style={[styles.tabText, activeTab === index && styles.activeTabText]}>
              {tab.title}
            </Text>
          </TouchableOpacity>
        ))}
        <Animated.View
          style={[
            styles.slider,
            {
              width: Dimensions.get('window').width / tabData.length,
              left: slideAnim,
            },
          ]}
        />
      </View>

      {/* Tab Content */}
      <FlatList
        data={[tabData[activeTab]]}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderContent}
        showsVerticalScrollIndicator={false}
        style={styles.contentContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f4',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    position: 'relative',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    color: '#888',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#6200ea',
    fontWeight: '700',
  },
  slider: {
    position: 'absolute',
    bottom: 0,
    height: 4,
    backgroundColor: '#6200ea',
    borderRadius: 2,
  },
  contentContainer: {
    flex: 1,
  },
  contentWrapper: {
    padding: 10,
  },
  contentText: {
    fontSize: 16,
    color: '#444',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default OrderTabs;

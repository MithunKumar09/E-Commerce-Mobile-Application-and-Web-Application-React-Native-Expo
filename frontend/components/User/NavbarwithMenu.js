import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput, Dimensions, Modal, Animated, Easing, TouchableWithoutFeedback, Image, SafeAreaView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faRobot, faCaretDown, faCaretRight, faUserLarge } from '@fortawesome/free-solid-svg-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { SERVER_URL } from "../../Constants";
import { BlurView } from 'expo-blur';
import { useUserStore } from '../../src/store/userStore';
import { removeData } from '../../../frontend/utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NavbarWithMenu = () => {
  const [showDrawer, setShowDrawer] = useState(false);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAccountSubmenu, setShowAccountSubmenu] = useState(false);
  const [showSettingsSubmenu, setShowSettingsSubmenu] = useState(false);
  const navigation = useNavigation();
  const slideAnim = useState(new Animated.Value(-300))[0];
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const { width } = Dimensions.get('window');
  const isMobile = width < 768;
  const { user, isAuthenticated, checkAuthentication, signOut, clearAllUserData } = useUserStore();

  useEffect(() => {
    const startRotation = () => {
      rotateAnim.setValue(0);
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 4000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        { iterations: -1 }
      ).start();
    };

    startRotation();

    return () => rotateAnim.stopAnimation();
  }, [rotateAnim]);

  useEffect(() => {
    checkAuthentication(); // Check authentication on mount
  }, []);

  const toggleDrawer = () => {
    if (showDrawer) {
      closeDrawer();
    } else {
      openDrawer();
    }
  };

  const openDrawer = () => {
    setShowDrawer(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  };

  const closeDrawer = () => {
    Animated.timing(slideAnim, {
      toValue: -300,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: false,
    }).start(() => setShowDrawer(false));
  };

  const fetchSuggestions = async (query) => {
    try {
      if (query.trim() === '') {
        setSuggestions([]);
        return;
      }
      // Simulate API call for NLP-based suggestions
      const response = await fetch(`${SERVER_URL}/user/suggestions?query=${encodeURIComponent(query)}`);
      if (!response.ok) {
        console.error(`Server returned status: ${response.status}`);
        throw new Error('Failed to fetch suggestions.');
      }
      const data = await response.json();
      if (data.suggestions) {
        setSuggestions(data.suggestions);
      } else {
        console.error('Unexpected response structure:', data);
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]); // Clear suggestions on error
    }
  };


  const handleSearchQueryChange = (query) => {
    setSearchQuery(query);

    if (query.trim() === '') {
      // Clear suggestions if input is empty
      setSuggestions([]);
      return;
    }

    // Fetch suggestions for non-empty input
    fetchSuggestions(query);
  };


  const handleSuggestionClick = (suggestion) => {
    if (suggestion.type === 'product') {
      navigation.navigate('SingleProduct', { productId: suggestion.id });
    } else if (suggestion.type === 'category') {
      navigation.navigate('AllProducts', { category: suggestion.name });
    }
    setSuggestions([]); // Clear suggestions after navigation
  };

  const handleSearch = () => {
    navigation.navigate('SearchResults', { query: searchQuery });
    setSuggestions([]); // Clear suggestions on manual search
  };

  const handleDiscoverOption = (option) => {
    if (!isMobile) { // Ensure the option is handled only on the web platform
      setShowDropdown(false);
      if (option === "Today's Deals") {
        navigation.navigate('DealsScreen');
      } else if (option === 'Events') {
        navigation.navigate('Event');
      }
    }
  };

  const handleSignOut = async () => {
    await signOut();
    closeDrawer();
    Alert.alert('Signed out successfully');
    navigation.reset({ index: 0, routes: [{ name: 'HomePage' }] });
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

// Clear complete cache data (including offline cached data) from AsyncStorage
const handleClearCache = async () => {
  try {
    // Get all keys before clearing the cache to log what will be removed
    const allKeys = await AsyncStorage.getAllKeys();
    console.log('Clearing cache for the following keys:', allKeys);

    // Filter out 'userProfile' and 'addresses' keys from being cleared
    const keysToClear = allKeys.filter(key => key !== 'userProfile' && key !== 'addresses');
    console.log('Keys to be cleared:', keysToClear);

    // Remove the selected keys, excluding 'userProfile' and 'addresses'
    await AsyncStorage.multiRemove(keysToClear);

    console.log('Cache cleared successfully.');
    Alert.alert('Cache cleared successfully');
  } catch (error) {
    console.error('Error clearing cache:', error);
    Alert.alert('Failed to clear cache');
  }
};

  return (
    <LinearGradient
      colors={['#1E40AF', '#3B82F6']}
      style={styles.header}
    >
      {/* Left Section: Menu and Search */}
      <View style={styles.leftSection}>
        <TouchableOpacity
          onPress={toggleDrawer}
          style={styles.menuButton}
        >
          <Ionicons name="menu" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.searchBox}>
          <TouchableOpacity onPress={() => navigation.navigate('CameraScreen')}>
            <Ionicons name="camera" size={20} color="#ccc" style={styles.cameraIcon} />
          </TouchableOpacity>
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor="#ccc"
            value={searchQuery}
            onChangeText={handleSearchQueryChange}
          />
          <TouchableOpacity onPress={handleSearch}>
            <Ionicons name="search" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Suggestions Dropdown */}
      {suggestions.length > 0 && (
        <View style={styles.suggestionsBox}>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item._id?.toString() || item.name}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => handleSuggestionClick(item)}
              >
                <Text style={styles.suggestionText}>{item.name}</Text>
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={false} // Optional: hides the scroll bar
          />
        </View>
      )}


      {!isMobile && (
        <View style={styles.dropdownContainer}>
          <TouchableOpacity
            style={styles.dropdownToggle}
            onPress={() => setShowDropdown(!showDropdown)}
          >
            <Text style={styles.dropdownText}>Discover</Text>
            <FontAwesomeIcon icon={faCaretDown} size={16} color="white" />
          </TouchableOpacity>
          {showDropdown && (
            <View style={styles.dropdownList}>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => handleDiscoverOption("Today's Deals")}
              >
                <Text style={styles.dropdownItemText}>Today's Deals</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => handleDiscoverOption('Events')}
              >
                <Text style={styles.dropdownItemText}>Events</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}


      {/* Right Section */}
      <View style={styles.rightSection}>
        <View style={styles.robotContainer}>
          <Animated.View
            style={[styles.rotatingRing, { transform: [{ rotate: rotateInterpolate }] }]}
          />
          <TouchableOpacity onPress={() => navigation.navigate('ChatBot')}>
            <FontAwesomeIcon icon={faRobot} size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Drawer */}
      {showDrawer && (
        <TouchableWithoutFeedback onPress={closeDrawer}>
          <BlurView intensity={50} tint="dark" style={styles.overlay}>
            <SafeAreaView style={styles.drawerContainer}>
              <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
                <LinearGradient
                  colors={['#1E40AF', '#3B82F6']}
                  style={styles.drawerGradient}
                >
                  {/* Profile Section */}
                  <View style={styles.profileSection}>
                    <View style={styles.iconWrapper}>
                      <FontAwesomeIcon icon={faUserLarge} size={40} color="#3B82F6" />
                    </View>
                    <Text style={styles.profileName}>{isAuthenticated ? user?.username : "Register Now"}</Text>
                  </View>

                  {/* Navigation Items */}
                  <View style={styles.navItems}>
                    {/* Home */}
                    <TouchableOpacity
                      style={styles.navItem}
                      onPress={() => {
                        closeDrawer(); // Close the drawer when navigating
                        navigation.navigate('HomePage'); // Navigate to HomePage
                      }}
                    >
                      <Ionicons name="home" size={20} color="#B5C9F4" style={styles.navIcon} />
                      <Text style={styles.navItemText}>Home</Text>
                    </TouchableOpacity>

                    {/* My Account */}
                    {isAuthenticated && (
                      <TouchableOpacity
                        style={styles.navItem}
                        onPress={() => setShowAccountSubmenu(!showAccountSubmenu)}
                      >
                        <Ionicons name="person" size={20} color="#B5C9F4" style={styles.navIcon} />
                        <View style={styles.navItemContent}>
                          <Text style={styles.navItemText}>My Account</Text>
                          <Ionicons
                            name={showAccountSubmenu ? "chevron-down" : "chevron-forward"}
                            size={16}
                            color="#FFFFFF"
                          />
                        </View>
                      </TouchableOpacity>
                    )}
                    {showAccountSubmenu && isAuthenticated && (
                      <View style={styles.submenu}>
                        {/* Personal Information */}
                        <View style={styles.submenuItem}>
                          <Text style={styles.navItemText}>Personal Information</Text>
                          <TouchableOpacity style={styles.editIconWrapper}>
                            <Ionicons name="pencil" size={16} color="#B5C9F4" />
                          </TouchableOpacity>
                        </View>

                        {/* Manage Address */}
                        <View style={styles.submenuItem}>
                          <Text style={styles.navItemText}>Manage Address</Text>
                          <TouchableOpacity style={styles.editIconWrapper}>
                            <Ionicons name="pencil" size={16} color="#B5C9F4" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {/* Wishlist */}
                    <TouchableOpacity
                      style={styles.navItem}
                      onPress={() => {
                        closeDrawer(); // Close the drawer when navigating
                        if (isAuthenticated) {
                          // If the user is authenticated, navigate to the WishlistPage
                          navigation.navigate('WishlistPage');
                        } else {
                          // If the user is not authenticated, navigate to the UserLogin screen
                          navigation.navigate('UserLogin');
                        }
                      }}
                    >
                      <Ionicons name="heart" size={20} color="#B5C9F4" style={styles.navIcon} />
                      <Text style={styles.navItemText}>My Wishlist</Text>
                    </TouchableOpacity>

                    {/* My Orders */}
                    <TouchableOpacity
                      style={styles.navItem}
                      onPress={() => {
                        closeDrawer(); // Close the drawer when navigating
                        if (isAuthenticated) {
                          // If the user is authenticated, navigate to OrdersList
                          navigation.navigate('OrdersList');
                        } else {
                          // If the user is not authenticated, navigate to UserLogin
                          navigation.navigate('UserLogin');
                        }
                      }}
                    >
                      <Ionicons name="cart" size={20} color="#B5C9F4" style={styles.navIcon} />
                      <Text style={styles.navItemText}>My Orders</Text>
                    </TouchableOpacity>


                    {/* Keep Shopping */}
                    <TouchableOpacity style={styles.navItem} onPress={() => {
                      closeDrawer(); // Close the drawer when navigating
                      navigation.navigate('Shop'); // Navigate to HomePage
                    }}
                    >
                      <Ionicons name="basket" size={20} color="#B5C9F4" style={styles.navIcon} />
                      <Text style={styles.navItemText}>Keep Shopping</Text>
                    </TouchableOpacity>

                    {/* Shopping List */}
                    <TouchableOpacity style={styles.navItem} onPress={() => {
                      closeDrawer(); // Close the drawer when navigating
                      navigation.navigate('Shop'); // Navigate to HomePage
                    }}
                    >
                      <Ionicons name="list" size={20} color="#B5C9F4" style={styles.navIcon} />
                      <Text style={styles.navItemText}>Shopping List</Text>
                    </TouchableOpacity>

                                      {/* Settings (New Item) */}
                  <TouchableOpacity style={styles.navItem} onPress={() => setShowSettingsSubmenu(!showSettingsSubmenu)}>
                    <Ionicons name="settings" size={20} color="#B5C9F4" style={styles.navIcon} />
                    <View style={styles.navItemContent}>
                      <Text style={styles.navItemText}>Settings</Text>
                      <Ionicons
                        name={showSettingsSubmenu ? "chevron-down" : "chevron-forward"}
                        size={16}
                        color="#FFFFFF"
                      />
                    </View>
                  </TouchableOpacity>
                  {showSettingsSubmenu && (
                    <View style={styles.submenu}>
                      {/* Clear Cache */}
                      <TouchableOpacity style={styles.submenuItem} onPress={handleClearCache}>
                        <Text style={styles.navItemText}>Clear Cache</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                    {/* Select Language */}
                    <TouchableOpacity style={styles.navItem} onPress={() => {
                      closeDrawer(); // Close the drawer when navigating
                      navigation.navigate('LanguageScreen'); // Navigate to HomePage 
                    }}
                    >
                      <Ionicons name="language" size={20} color="#B5C9F4" style={styles.navIcon} />
                      <Text style={styles.navItemText}>Select Language</Text>
                    </TouchableOpacity>

                    {/* Sign Out */}
                    {isAuthenticated && (
                      <TouchableOpacity
                        style={styles.navItem}
                        onPress={handleSignOut}
                      >
                        <Ionicons name="log-out" size={20} color="#B5C9F4" style={styles.navIcon} />
                        <Text style={styles.navItemText}>Sign Out</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </LinearGradient>
              </Animated.View>
            </SafeAreaView>
          </BlurView>
        </TouchableWithoutFeedback>
      )}

    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 10,
    paddingHorizontal: 20,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuButton: {
    width: Dimensions.get('window').width > 768 ? 60 : 40,
    height: Dimensions.get('window').width > 768 ? 60 : 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingHorizontal: 10,
    marginLeft: 10,
    width: Dimensions.get('window').width > 768 ? 300 : 200, // Adjust for web
    height: Dimensions.get('window').width > 768 ? 50 : 40,
    flex: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: Dimensions.get('window').width > 768 ? 18 : 14, // Larger font for web
    color: '#fff',
  },
  suggestionsBox: {
    position: 'absolute',
    top: 80, // Adjust this to align with your search box
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 5, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 1000,
    maxHeight: 350, // Limit the height of the dropdown
  },

  suggestionItem: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  suggestionText: {
    fontSize: 14,
    color: '#333',
  },
  cameraIcon: {
    marginRight: 10,
  },
  dropdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  dropdownToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Dimensions.get('window').width > 768 ? 12 : 8,
    paddingHorizontal: Dimensions.get('window').width > 768 ? 16 : 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
  },
  dropdownText: {
    fontSize: Dimensions.get('window').width > 768 ? 18 : 14,
    color: 'white',
    marginRight: 5,
  },
  dropdownList: {
    position: 'absolute',
    top: 30,
    backgroundColor: 'white',
    borderRadius: 5,
    padding: 10,
    zIndex: 10,
    width: 150,
  },
  dropdownItem: {
    paddingVertical: Dimensions.get('window').width > 768 ? 12 : 8,
    paddingHorizontal: Dimensions.get('window').width > 768 ? 16 : 10,
  },
  dropdownItemText: {
    fontSize: Dimensions.get('window').width > 768 ? 18 : 14,
    color: '#333',
  },
  rightSection: {
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  robotContainer: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotatingRing: {
    position: 'absolute',
    width: Dimensions.get('window').width > 768 ? 40 : 30,
    height: Dimensions.get('window').width > 768 ? 40 : 30,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawerGradient: {
    flex: 1,
  },
  drawerContainer: {
    flex: 1,
  },
  drawer: {
    width: 300,
    height: Dimensions.get('window').height,
    elevation: 10,
    backgroundColor: '#FFF',
    padding: 15,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 15,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 50,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  navItems: {
    marginTop: 10,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
  },
  navIcon: {
    marginRight: 10,
    marginLeft: 10,
  },
  navItemText: {
    fontSize: 16,
    color: '#fff',
  },
  navItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    paddingLeft: 10,
  },
  submenu: {
    paddingLeft: 15,
  },
  submenuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
  },
  editIconWrapper: {
    padding: 5,
  },
});

export default NavbarWithMenu;
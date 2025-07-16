//frontend/components/User/Topbar.js
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import logo from '../../assets/logo.png';

const TopBar = () => {
  return (
    <View style={styles.container}>
      {/* Left: Logo */}
      <View style={styles.logoContainer}>
        <TouchableOpacity onPress={() => console.log('Logo clicked')}>
          <Image source={logo} style={styles.logo} />
        </TouchableOpacity>
      </View>

      {/* Mobile Menu (can be added later for mobile responsiveness) */}
      {/* You can add icons or buttons here for mobile menus */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 30 : 0,
  },
  logoContainer: {
    marginLeft: 16,
  },
  logo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
});

export default TopBar;

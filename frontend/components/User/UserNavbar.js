//frontend/components/User/UserNavbar.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const UserNavbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigation = useNavigation();

  // Function to navigate to different screens
  const navigateTo = (screen) => {
    navigation.navigate(screen);
    setIsOpen(false);
  };

  return (
    <View style={styles.navbar}>
      {/* Mobile Menu Icon */}
      <View style={styles.mobileMenuIcon}>
        <TouchableOpacity onPress={() => setIsOpen(!isOpen)}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
      </View>

      {/* Desktop Navigation Links */}
      <View style={styles.navLinks}>
        <TouchableOpacity onPress={() => navigateTo('Home')}>
          <Text style={styles.navLink}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigateTo('Shop')}>
          <Text style={styles.navLink}>Shop</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigateTo('AboutUs')}>
          <Text style={styles.navLink}>About Us</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigateTo('Contact')}>
          <Text style={styles.navLink}>Contact</Text>
        </TouchableOpacity>
      </View>

      {/* Mobile Dropdown Menu */}
      {isOpen && (
        <Modal
          transparent={true}
          animationType="slide"
          visible={isOpen}
          onRequestClose={() => setIsOpen(false)}>
          <View style={styles.modalContainer}>
            <View style={styles.modalMenu}>
              <TouchableOpacity onPress={() => navigateTo('Home')}>
                <Text style={styles.modalLink}>Home</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigateTo('Shop')}>
                <Text style={styles.modalLink}>Shop</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigateTo('AboutUs')}>
                <Text style={styles.modalLink}>About Us</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigateTo('Contact')}>
                <Text style={styles.modalLink}>Contact</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  navbar: {
    backgroundColor: '#1E3A8A',
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mobileMenuIcon: {
    display: 'flex',
    flexDirection: 'row',
  },
  menuIcon: {
    fontSize: 30,
    color: 'white',
  },
  navLinks: {
    flexDirection: 'row',
    display: 'none',
  },
  navLink: {
    color: 'white',
    fontSize: 16,
    marginHorizontal: 15,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalMenu: {
    backgroundColor: '#1E3A8A',
    padding: 20,
    borderRadius: 5,
    alignItems: 'center',
  },
  modalLink: {
    color: 'white',
    fontSize: 20,
    marginVertical: 10,
    fontWeight: 'bold',
  },
});

export default UserNavbar;

// frontend/src/components/Layout.js
import React from 'react';
import { View, StyleSheet, FlatList, ScrollView, Platform, SafeAreaView } from 'react-native';
import OrginalNavbar from "../../components/User/OriginalUserNavbar";
import NavbarWithMenu from "../../components/User/NavbarwithMenu";
import Footer from "../../components/User/Footer";

const Layout = ({ children }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerContainer}>
        <OrginalNavbar />
        <NavbarWithMenu />
      </View>
      <View style={styles.contentContainer}>
        {Platform.OS === 'web' ? (
          <ScrollView contentContainerStyle={styles.webContent}>
            {children}
          </ScrollView>
        ) : (
          <FlatList
            contentContainerStyle={styles.mobileContent}
            data={[children]}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => item}
          />
        )}
      </View>
      <Footer />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  headerContainer: {
    zIndex: 1,
    backgroundColor: "#fff",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  contentContainer: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#f8f8f8",
  },
  webContent: {
    flexGrow: 1,
    padding: 3,
    paddingBottom: 80,
  },
  mobileContent: {
    flexGrow: 1,
    paddingBottom: 80,
  },
});

export default Layout;

// frontend/Components/User/LanguageScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { Switch } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

const LanguageScreen = () => {
  const { i18n } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState('English');

  // List of languages
  const languages = ['English', 'Hindi', 'Kannada', 'Tamil', 'Telugu', 'Malayalam'];

  // Set the initial language based on the current language
  useEffect(() => {
    // Synchronize the selectedLanguage state with i18n's current language
    const currentLanguage = i18n.language.charAt(0).toUpperCase() + i18n.language.slice(1); // 'en' -> 'English'
    setSelectedLanguage(currentLanguage);
  }, [i18n.language]);

  // Toggle function to change selected language
  const toggleLanguage = (language) => {
    setSelectedLanguage(language);
    // Change language dynamically based on the selected language
    const langCode = language.toLowerCase(); // Assuming language codes are lowercase (e.g., 'english' -> 'en')
    i18n.changeLanguage(langCode);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f8f8" translucent={true} />

      {/* Header Title that changes based on language */}
      <Text style={styles.headerTitle}>{i18n.t('languageScreenHeader')}</Text>

      <Text style={styles.title}>{i18n.t('languageSelection')}</Text>

      <ScrollView contentContainerStyle={styles.languageList}>
        {languages.map((language) => (
          <View key={language} style={styles.languageItem}>
            <Text style={styles.languageText}>{language}</Text>
            <Switch
              value={selectedLanguage === language} // This will reflect the selected language
              onValueChange={() => toggleLanguage(language)}
              color="#4CAF50"
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    backgroundColor: '#f8f8f8',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2E3A59',
    marginBottom: 20,
    textAlign: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#2E3A59',
    marginBottom: 30,
    textAlign: 'center',
  },
  languageList: {
    width: '100%',
    paddingBottom: 20,
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  languageText: {
    fontSize: 20,
    color: '#333',
    fontWeight: '500',
  },
});

export default LanguageScreen;

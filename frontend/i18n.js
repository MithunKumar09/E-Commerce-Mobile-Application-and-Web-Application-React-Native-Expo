//frontend/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json'; // English translations
import hi from './locales/hi.json'; // Hindi translations
// Add more translations as needed

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  // Add other languages here, e.g., 'kn': { translation: kn }, for Kannada
};

i18n
  .use(initReactI18next) // Pass i18n to react-i18next
  .init({
    resources,
    lng: 'en', // Default language
    fallbackLng: 'en', // Fallback language
    interpolation: {
      escapeValue: false, // React already handles escaping
    },
  });

export default i18n;

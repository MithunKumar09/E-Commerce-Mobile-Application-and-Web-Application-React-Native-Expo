//AnimatedOfferCard.js
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

const AnimatedOfferCard = () => {
  const bounceAnim = useRef(new Animated.Value(0)).current; // Animation for gift box
  const buttonScaleAnim = useRef(new Animated.Value(1)).current; // Animation for "Claim Now" button

  useEffect(() => {
    // Gift box bounce animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -15,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Button scale animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(buttonScaleAnim, {
          toValue: 1.1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(buttonScaleAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [bounceAnim, buttonScaleAnim]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#FFDEE9", "#B5FFFC"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.cardBody}>
          {/* Gift Box Animation */}
          <Animated.View
            style={[styles.giftBox, { transform: [{ translateY: bounceAnim }] }]}
          >
            <FontAwesome5 name="gift" size={48} color="#FFD700" />
          </Animated.View>

          {/* Title and Description */}
          <Text style={styles.title}>Special Offer!</Text>
          <Text style={styles.description}>
            Get an exclusive 50% discount on all premium packages. Limited time offer!
          </Text>

          {/* Animated "Claim Now" Button */}
          <Animated.View style={{ transform: [{ scale: buttonScaleAnim }] }}>
            <TouchableOpacity style={styles.button}>
              <Text style={styles.buttonText}>Claim Now</Text>
              <FontAwesome5 name="arrow-right" size={16} color="#FFF" style={styles.icon} />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: width * 0.9,
    borderRadius: 20,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    paddingVertical: 20,
    backgroundColor: "transparent",
  },
  cardBody: {
    alignItems: "center",
    padding: 20,
    position: "relative",
  },
  giftBox: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    color: "#333",
    textShadowColor: "rgba(255, 255, 255, 0.6)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    color: "#555",
    lineHeight: 22,
  },
  button: {
    backgroundColor: "#FF6B6B",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  icon: {
    marginLeft: 8,
  },
});

export default AnimatedOfferCard;

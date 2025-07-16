import React, { Component } from "react";
import { View, Text, Image, StyleSheet } from "react-native";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.log("Error caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.errorBox}>
            <Image
              source={{
                uri: "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExMHkwMmNpNjZiaHBrdW8yZzJnOHB6ZzI1ZjltcmhxdGF5ZHZzMWt0aCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/HzPtbOKyBoBFsK4hyc/giphy.webp",
              }}
              style={styles.image}
            />
            <Text style={styles.title}>Oops, Something went wrong!</Text>
            <Text style={styles.description}>
              It's not you, it's us. Even the best of us have bad days.
            </Text>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
  },
  errorBox: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    maxWidth: "90%",
    alignItems: "center",
  },
  image: {
    width: 200,
    height: 200,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#e3342f",
    marginBottom: 8,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: "#4a5568",
    textAlign: "center",
  },
});

export default ErrorBoundary;

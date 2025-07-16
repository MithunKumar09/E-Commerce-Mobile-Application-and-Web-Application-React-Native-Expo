//components/SkeletonComponent.js
import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';

const SkeletonComponent = ({ width, height, borderRadius }) => {
  const shimmerOpacity = new Animated.Value(0.3);

  React.useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerOpacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerOpacity, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    shimmerAnimation.start();

    return () => shimmerAnimation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius, opacity: shimmerOpacity },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
});

export default SkeletonComponent;

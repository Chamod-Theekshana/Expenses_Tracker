import React, { useEffect, useRef, useContext } from 'react';
import { View, StyleSheet, Animated, ActivityIndicator, Image } from 'react-native';
import AppText from '../components/AppText';
import { ThemeContext } from '../store/theme';
import { images } from '../constants/images';

export default function SplashScreen({ onDone }: { onDone?: () => void }) {
  const { colors } = useContext(ThemeContext);
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale]);

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
       <Image source={images.splashScreen} style={{ width: '100%', height: 500 }} />
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 0 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  }
});

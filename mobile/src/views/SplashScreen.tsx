import React, { useEffect, useMemo, useRef, useContext } from 'react';
import { View, StyleSheet, Animated, ActivityIndicator, Image, useWindowDimensions } from 'react-native';
import { ThemeContext } from '../store/theme';
import { images } from '../constants/images';

export default function SplashScreen({ onDone }: { onDone?: () => void }) {
  const { colors } = useContext(ThemeContext);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const imageSize = useMemo(() => {
    const source = Image.resolveAssetSource(images.splashScreen);
    const sourceWidth = source?.width || 1;
    const sourceHeight = source?.height || 1;
    const aspectRatio = sourceWidth / sourceHeight;

    const maxWidth = Math.min(screenWidth * 0.72, 320);
    const maxHeight = screenHeight * 0.35;

    let width = maxWidth;
    let height = width / aspectRatio;

    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    return { width, height };
  }, [screenHeight, screenWidth]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale]);

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
      <Animated.View style={{ opacity, transform: [{ scale }] }}>
        <Image
          source={images.splashScreen}
          resizeMode="contain"
          style={[styles.logo, imageSize]}
        />
      </Animated.View>
      <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    alignSelf: 'center',
  },
  loader: {
    marginTop: 18,
  },
});

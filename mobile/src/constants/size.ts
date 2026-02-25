import { useEffect } from 'react';
import { Dimensions, BackHandler } from 'react-native';
import DeviceInfo from "react-native-device-info";


// Base dimensions (mobile: w-430 h-932, tablet: w-834 h-1194)
const BASE_WIDTH = 430;
const BASE_HEIGHT = 932;
const TABLET_WIDTH = 834;
const TABLET_HEIGHT = 1194;

export const isTablet = DeviceInfo.isTablet();

// Get current dimensions
function getCurrentDimensions() {
  const windowDimensions = Dimensions.get('window');
  const isTablet = windowDimensions.width >= 600 || windowDimensions.height >= 1000;
  
  const currentBaseWidth = isTablet ? TABLET_WIDTH : BASE_WIDTH;
  const currentBaseHeight = isTablet ? TABLET_HEIGHT : BASE_HEIGHT;
  
  return {
    width: windowDimensions.width,
    height: windowDimensions.height,
    currentBaseWidth,
    currentBaseHeight,
  };
}

export const scaleWidth = (size: number) => {
  const { width, currentBaseWidth } = getCurrentDimensions();
  return (width / currentBaseWidth) * size;
};

export const scaleHeight = (size: number) => {
  const { height, currentBaseHeight } = getCurrentDimensions();
  return (height / currentBaseHeight) * size;
};

export function useBack(navigation: any) {
  useEffect(() => {
    const backAction = () => {
      navigation.goBack();
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [navigation]);
}

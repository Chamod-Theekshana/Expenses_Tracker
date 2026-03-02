import React, { useContext } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../views/app/HomeScreen';
import TransactionsScreen from '../views/app/TransactionsScreen';
import ProfileScreen from '../views/app/ProfileScreen';
import ChartsScreen from '../views/app/ChartsScreen';
import { View, Animated, StyleSheet, Image } from 'react-native';
import AppText from '../components/AppText';
import { scaleHeight } from '../constants/size';
import AddTransactionScreen from '../views/app/AddTransactionScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { images } from '../constants/images';
import { ThemeContext } from '../store/theme';

export type AppTabParamList = {
  Home: undefined;
  Transactions: undefined;
  Add: undefined;
  Profile: undefined;
  Charts: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

function Label({ title, focused, accentColor, mutedColor }: { title: string; focused: boolean; accentColor: string; mutedColor: string }) {
  const scale = React.useRef(new Animated.Value(focused ? 1 : 0.9)).current;

  React.useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1 : 0.9,
      useNativeDriver: true,
      tension: 100,
      friction: 7,
    }).start();
  }, [focused]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <AppText numberOfLines={1} style={{ fontSize: 10, marginTop: 4, color: focused ? accentColor : mutedColor, fontWeight: '600', textAlign: 'center' }}>
        {title}
      </AppText>
    </Animated.View>
  );
}

export default function AppTabs() {
  const insets = useSafeAreaInsets();
  const { colors } = useContext(ThemeContext);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          height: scaleHeight(90) + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: scaleHeight(25),
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 12,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={{ alignItems: 'center' }}>
              <Image source={images.home} style={{ width: 24, height: 24, tintColor: focused ? colors.accent : colors.muted }} />
              <Label title="Home" focused={focused} accentColor={colors.accent} mutedColor={colors.muted} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={{ alignItems: 'center' }}>
              <Image source={images.activity} style={{ width: 24, height: 24, tintColor: focused ? colors.accent : colors.muted }} />
              <Label title="Activity" focused={focused} accentColor={colors.accent} mutedColor={colors.muted} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Add"
        component={AddTransactionScreen}
        options={{
          tabBarIcon: ({ focused }) => {
            const scale = React.useRef(new Animated.Value(1)).current;

            React.useEffect(() => {
              Animated.spring(scale, {
                toValue: focused ? 1.05 : 1,
                useNativeDriver: true,
                tension: 80,
                friction: 6,
              }).start();
            }, [focused]);

            return (
              <Animated.View style={{ transform: [{ scale }] }}>
                <View style={[
                  styles.addButton,
                  {
                    backgroundColor: colors.accent,
                    shadowColor: colors.accent,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.35,
                    shadowRadius: 10,
                    elevation: 10,
                  },
                ]}>
                  <AppText style={{ color: '#FFF', fontWeight: '800', fontSize: 24 }}>＋</AppText>
                </View>
              </Animated.View>
            );
          },
        }}
      />
      <Tab.Screen
        name="Charts"
        component={ChartsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={{ alignItems: 'center' }}>
              <Image source={images.chart} style={{ width: 24, height: 24, tintColor: focused ? colors.accent : colors.muted }} />
              <Label title="Charts" focused={focused} accentColor={colors.accent} mutedColor={colors.muted} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={{ alignItems: 'center' }}>
              <Image source={images.profile} style={{ width: 24, height: 24, tintColor: focused ? colors.accent : colors.muted }} />
              <Label title="Profile" focused={focused} accentColor={colors.accent} mutedColor={colors.muted} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

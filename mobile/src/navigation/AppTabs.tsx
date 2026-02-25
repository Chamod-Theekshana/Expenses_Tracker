import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../views/app/HomeScreen';
import TransactionsScreen from '../views/app/TransactionsScreen';
import ProfileScreen from '../views/app/ProfileScreen';
import ChartsScreen from '../views/app/ChartsScreen';
import { colors } from '../theme/colors';
import { View, Animated, StyleSheet, Image } from 'react-native';
import AppText from '../components/AppText';
import { scaleHeight } from '../constants/size';
import AddTransactionScreen from '../views/app/AddTransactionScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { images } from '../constants/images';

export type AppTabParamList = {
  Home: undefined;
  Transactions: undefined;
  Add: undefined;
  Profile: undefined;
  Charts: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

function Label({ title, focused }: { title: string; focused: boolean }) {
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
      <AppText numberOfLines={1} style={{ fontSize: 9, marginTop: 4, color: focused ? colors.accent : colors.muted, fontWeight: '700', textAlign: 'center' }}>
        {title}
      </AppText>
    </Animated.View>
  );
}

function IconBubble({ focused, text }: { focused: boolean; text: string }) {
  const scale = React.useRef(new Animated.Value(1)).current;
  const opacity = React.useRef(new Animated.Value(focused ? 1 : 0.7)).current;
  
  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: focused ? 1.1 : 1,
        useNativeDriver: true,
        tension: 80,
        friction: 6,
      }),
      Animated.timing(opacity, {
        toValue: focused ? 1 : 0.7,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused]);

  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <View
        style={[
          styles.iconBubble,
          {
            backgroundColor: focused ? colors.accent : colors.surface,
            borderWidth: focused ? 0 : 1,
            borderColor: colors.border,
            shadowColor: focused ? colors.accent : 'transparent',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: focused ? 0.4 : 0,
            shadowRadius: 8,
            elevation: focused ? 8 : 0,
          },
        ]}
      >
        <AppText style={{ color: focused ? colors.bg : colors.text, fontWeight: '900', fontSize: 18 }}>{text}</AppText>
      </View>
    </Animated.View>
  );
}

export default function AppTabs() {
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          height: scaleHeight(90) + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: scaleHeight(25),
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 20,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={{ alignItems: 'center' }}>
              <Image source={images.home} style={{width:24,height:24,tintColor: focused ? colors.accent : colors.muted}} />
              <Label title="Home" focused={focused} />
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
              <Image source={images.activity} style={{width:24,height:24,tintColor: focused ? colors.accent : colors.muted}} />
              <Label title="Activity" focused={focused} />
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
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.5,
                    shadowRadius: 12,
                    elevation: 12,
                  },
                ]}>
                  <AppText style={{ color: colors.bg, fontWeight: '900', fontSize: 24 }}>＋</AppText>
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
              <Image source={images.chart} style={{width:24,height:24,tintColor: focused ? colors.accent : colors.muted}} />
              <Label title="Charts" focused={focused} />
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
              <Image source={images.profile} style={{width:24,height:24,tintColor: focused ? colors.accent : colors.muted}} />
              <Label title="Profile" focused={focused} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

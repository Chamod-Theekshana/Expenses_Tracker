import React, { useContext } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../views/app/HomeScreen';
import TransactionsScreen from '../views/app/TransactionsScreen';
import ProfileScreen from '../views/app/ProfileScreen';
import ChartsScreen from '../views/app/ChartsScreen';
import { View, Animated, StyleSheet, Pressable } from 'react-native';
import AppText from '../components/AppText';
import Icon, { type IconName } from '../components/Icon';
import { scaleHeight } from '../constants/size';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeContext } from '../store/theme';
import { useNavigation } from '@react-navigation/native';

export type AppTabParamList = {
  Home: undefined;
  Transactions: undefined;
  AddPlaceholder: undefined;
  Charts: undefined;
  Profile: undefined;
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
    <Animated.View style={{ transform: [{ scale }], minWidth: 70, alignItems: 'center' }}>
      <AppText numberOfLines={1} style={{ fontSize: 10, marginTop: 4, color: focused ? accentColor : mutedColor, fontWeight: '600', textAlign: 'center' }}>
        {title}
      </AppText>
    </Animated.View>
  );
}

function TabIcon({ icon, title, focused, colors }: { icon: IconName; title: string; focused: boolean; colors: any }) {
  return (
    <View style={{ alignItems: 'center', minWidth: 70 }}>
      <Icon name={icon} size={24} color={focused ? colors.accent : colors.muted} />
      <Label title={title} focused={focused} accentColor={colors.accent} mutedColor={colors.muted} />
    </View>
  );
}

/** Center FAB that opens the AddTx modal from the parent stack */
function AddTabButton() {
  const navigation: any = useNavigation();
  const { colors } = useContext(ThemeContext);
  const scale = React.useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.92,
      useNativeDriver: true,
      tension: 120,
      friction: 8,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 80,
      friction: 6,
    }).start();
  };

  return (
    <Pressable
      onPress={() => navigation.getParent()?.navigate('AddTx')}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={styles.addTouchable}
    >
      <Animated.View
        style={[
          styles.addButton,
          {
            transform: [{ scale }],
            backgroundColor: colors.accent,
            shadowColor: colors.accent,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 10,
            elevation: 10,
          },
        ]}
      >
        <Icon name="plus" size={28} color="#FFF" strokeWidth={2.5} />
      </Animated.View>
    </Pressable>
  );
}

/** Empty placeholder component — never rendered (tab is intercepted by AddTabButton) */
function EmptyScreen() {
  return null;
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
            <TabIcon icon="home" title="Home" focused={focused} colors={colors} />
          ),
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="activity" title="Activity" focused={focused} colors={colors} />
          ),
        }}
      />
      <Tab.Screen
        name="AddPlaceholder"
        component={EmptyScreen}
        options={{
          tabBarButton: () => <AddTabButton />,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
          },
        }}
      />
      <Tab.Screen
        name="Charts"
        component={ChartsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="chart" title="Charts" focused={focused} colors={colors} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="profile" title="Profile" focused={focused} colors={colors} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  addTouchable: {
    top: -16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

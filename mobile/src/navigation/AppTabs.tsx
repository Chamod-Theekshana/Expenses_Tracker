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
  const scale = React.useRef(new Animated.Value(focused ? 1 : 1)).current;

  React.useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 7,
    }).start();
  }, [focused]);

  return (
    <Animated.View style={{ transform: [{ scale }], minWidth: 82, alignItems: 'center' }}>
      <AppText
        numberOfLines={1}
        style={{
          fontSize: 14,
          marginTop: 8,
          color: focused ? accentColor : mutedColor,
          fontWeight: focused ? '700' : '600',
          textAlign: 'center',
        }}
      >
        {title}
      </AppText>
    </Animated.View>
  );
}

function TabIcon({ icon, title, focused, colors }: { icon: IconName; title: string; focused: boolean; colors: any }) {
  return (
    <View style={{ alignItems: 'center', minWidth: 82 }}>
      <Icon name={icon} size={28} color={focused ? colors.accent : colors.muted} strokeWidth={2.2} />
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
          styles.addButtonOuter,
          {
            transform: [{ scale }],
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: StyleSheet.hairlineWidth,
            borderTopWidth: 3,
          },
        ]}
      >
        <View
          style={[
            styles.addButton,
            {
              backgroundColor: colors.accent,
              shadowColor: colors.accent,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.55,
              shadowRadius: 10,
              elevation: 10,
            },
          ]}
        >
          <Icon name="plus" size={32} color="#FFF" strokeWidth={2.8} />
        </View>
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
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: 0,
          borderTopWidth: 2,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          height: scaleHeight(92) + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: scaleHeight(30),
          borderRadius: 0,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.12,
          shadowRadius: 20,
          elevation: 18,
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
            <TabIcon icon="analytics" title="Analytics" focused={focused} colors={colors} />
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
    top: -60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonOuter: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  addButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
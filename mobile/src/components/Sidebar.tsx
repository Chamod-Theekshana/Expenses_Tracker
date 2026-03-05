import React, { useContext, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Pressable, Dimensions, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { SidebarContext } from '../store/sidebar';
import { ThemeContext } from '../store/theme';
import { AuthContext } from '../store/auth';
import { ProfileContext } from '../store/profile';
import AppText from './AppText';
import Icon, { IconName } from './Icon';
import DateFilterBar from './DateFilterBar';
import { radius } from '../theme/colors';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.75; // 75% of screen width

export default function Sidebar() {
  const insets = useSafeAreaInsets();
  const navigation: any = useNavigation();
  const { isOpen, closeSidebar } = useContext(SidebarContext);
  const { colors } = useContext(ThemeContext);
  const { userEmail } = useContext(AuthContext);
  const { name, profilePhoto } = useContext(ProfileContext);

  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -SIDEBAR_WIDTH,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen, slideAnim, fadeAnim]);

  const handleNav = (screen: string) => {
    closeSidebar();
    setTimeout(() => {
      navigation.navigate(screen);
    }, 150);
  };

  const NavItem = ({ title, icon, screen }: { title: string, icon: IconName, screen: string }) => (
    <Pressable
      style={({ pressed }) => [
        styles.navItem,
        { backgroundColor: pressed ? colors.surface2 : 'transparent' }
      ]}
      onPress={() => handleNav(screen)}
    >
      <Icon name={icon} size={20} color={colors.accent} />
      <AppText style={[styles.navText, { color: colors.text }]}>{title}</AppText>
    </Pressable>
  );

  return (
    <>
      {/* Backdrop */}
      <Animated.View
        style={[
          styles.backdrop,
          {
            backgroundColor: colors.cardShadow,
            opacity: fadeAnim,
            pointerEvents: isOpen ? 'auto' : 'none',
          },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={closeSidebar} />
      </Animated.View>

      {/* Sidebar Content */}
      <Animated.View
        style={[
          styles.sidebar,
          {
            backgroundColor: colors.surface,
            width: SIDEBAR_WIDTH,
            transform: [{ translateX: slideAnim }],
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <View style={styles.header}>
          {profilePhoto ? (
            <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
          ) : (
            <View style={[styles.profilePlaceholder, { backgroundColor: colors.accent }]}>
              <AppText style={styles.profileInitial}>{name.charAt(0).toUpperCase() || 'U'}</AppText>
            </View>
          )}

          <View style={{ marginTop: 12 }}>
            <AppText style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {name || 'User Profile'}
            </AppText>
            <AppText muted style={styles.email} numberOfLines={1}>
              {userEmail}
            </AppText>
          </View>
        </View>

        <View style={styles.content}>
          {/* ── DATE FILTER ── */}
          <View style={{ marginBottom: 16 }}>
            <AppText muted style={styles.sectionHeader}>DATE FILTER</AppText>
            <DateFilterBar />
          </View>

          <AppText muted style={styles.sectionHeader}>FINANCIAL PLANNING</AppText>
          <NavItem title="Savings Goals" icon="target" screen="Goals" />
          <NavItem title="Manage Budgets" icon="chart" screen="Budgets" />
          <NavItem title="Recurring Transactions" icon="refresh-cw" screen="Recurring" />
        </View>

        <View style={styles.footer}>
          <AppText muted style={{ fontSize: 11, textAlign: 'center' }}>
            PulseSpend v1.0
          </AppText>
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 900,
  },
  sidebar: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 901,
    borderRightWidth: 1,
    borderRightColor: 'rgba(0,0,0,0.05)',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 5, height: 0 },
  },
  header: {
    padding: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.2)',
    alignItems: 'center',
    paddingTop: 40,
  },
  profileImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  profilePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  profileInitial: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  email: {
    fontSize: 13,
    marginTop: 2,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingVertical: 16,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  navText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 16,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
    marginHorizontal: 24,
  },
  footer: {
    padding: 24,
    paddingBottom: 30,
  },
});

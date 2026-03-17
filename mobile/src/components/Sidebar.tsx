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
import { radius } from '../theme/colors';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.78; // 78% of screen width

export default function Sidebar() {
  const insets = useSafeAreaInsets();
  const navigation: any = useNavigation();
  const { isOpen, closeSidebar } = useContext(SidebarContext);
  const { colors, theme, setTheme } = useContext(ThemeContext);
  const { userEmail, signOut } = useContext(AuthContext);
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

  const NavItem = ({
    title,
    icon,
    screen,
    isLast,
  }: {
    title: string;
    icon: IconName;
    screen: string;
    isLast?: boolean;
  }) => (
    <Pressable
      onPress={() => handleNav(screen)}
      style={({ pressed }) => [
        styles.navRow,
        { backgroundColor: pressed ? colors.surface2 : 'transparent' },
      ]}
    >
      <View style={styles.navRowInner}>
        <View style={styles.navRowLeft}>
          <Icon name={icon} size={22} color={colors.text} />
          <AppText style={[styles.navText, { color: colors.text }]}>{title}</AppText>
        </View>
        <Icon name="chevron-right" size={18} color={colors.muted} />
      </View>
      {!isLast && <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />}
    </Pressable>
  );

  return (
    <>
      <Animated.View
        style={[
          styles.backdrop,
          {
            backgroundColor: 'rgba(0,0,0,0.4)',
            opacity: fadeAnim,
            pointerEvents: isOpen ? 'auto' : 'none',
          },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={closeSidebar} />
      </Animated.View>

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
          <View style={styles.headerTopRow}>
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
            ) : (
              <View style={[styles.profilePlaceholder, { backgroundColor: colors.surface2 }]}>
                <AppText style={[styles.profileInitial, { color: colors.text }]}>
                  {(name || userEmail || 'U').charAt(0).toUpperCase()}
                </AppText>
              </View>
            )}

            <View style={[styles.themePill, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Light theme"
                onPress={() => setTheme('light')}
                style={[
                  styles.themePillBtn,
                  theme === 'light' && { backgroundColor: colors.accent },
                ]}
              >
                <Icon name="sun" size={18} color={theme === 'light' ? '#FFF' : colors.text} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dark theme"
                onPress={() => setTheme('dark')}
                style={[
                  styles.themePillBtn,
                  theme === 'dark' && { backgroundColor: colors.accent },
                ]}
              >
                <Icon name="moon" size={18} color={theme === 'dark' ? '#FFF' : colors.text} />
              </Pressable>
            </View>
          </View>

          <View style={styles.headerTextBlock}>
            <AppText style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {name || 'User Name'}
            </AppText>
            <AppText style={[styles.email, { color: colors.muted }]} numberOfLines={1}>
              {userEmail}
            </AppText>
          </View>
        </View>

        <View style={styles.content}>
          <AppText style={[styles.sectionHeader, { color: colors.muted }]}>Financial Planning</AppText>
          <View style={[styles.navGroup, { borderColor: colors.border }]}>
            <NavItem title="Saving Goals" icon="target" screen="Goals" />
            <NavItem title="Budget Management" icon="chart" screen="Budgets" />
            <NavItem title="Recurring Transactions" icon="refresh-cw" screen="Recurring" isLast />
          </View>

          <AppText style={[styles.sectionHeader, { color: colors.muted }]}>Account</AppText>
          <View style={[styles.navGroup, { borderColor: colors.border }]}>
            <NavItem title="Profile Settings" icon="profile" screen="Profile" />
            <NavItem title="Categories" icon="tag" screen="Categories" isLast />
          </View>
        </View>

        <View style={styles.footer}>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Pressable
            onPress={signOut}
            style={({ pressed }) => [
              styles.logoutRow,
              { backgroundColor: pressed ? colors.surface2 : 'transparent' },
            ]}
          >
            <View style={styles.logoutRowLeft}>
              <Icon name="log-out" size={22} color={colors.danger} />
              <AppText style={[styles.logoutText, { color: colors.danger }]}>Logout</AppText>
            </View>
          </Pressable>
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
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 5, height: 0 },
  },
  header: {
    paddingHorizontal: 22,
    paddingTop: 18,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileImage: {
    width: 66,
    height: 66,
    borderRadius: 33,
  },
  profilePlaceholder: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: {
    fontSize: 22,
    fontWeight: '700',
  },
  headerTextBlock: {
    marginTop: 14,
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
  },
  email: {
    fontSize: 13,
    marginTop: 2,
  },
  themePill: {
    flexDirection: 'row',
    borderRadius: 18,
    padding: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  themePillBtn: {
    width: 44,
    height: 34,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingTop: 18,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 22,
    marginBottom: 10,
    marginTop: 18,
  },
  navGroup: {
    marginHorizontal: 22,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  navRow: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  navRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  navText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 14,
    marginLeft: 34,
  },
  footer: {
    paddingHorizontal: 22,
    paddingBottom: 26,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
    marginBottom: 10,
  },
  logoutRow: {
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: radius.md,
  },
  logoutRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 12,
  },
});

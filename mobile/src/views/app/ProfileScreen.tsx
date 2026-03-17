import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import AppInput from '../../components/AppInput';
import AppPicker from '../../components/AppPicker';
import Card from '../../components/Card';
import CloudinaryPhotoPicker from '../../components/CloudinaryPhotoPicker';
import Icon, { type IconName } from '../../components/Icon';
import { scaleHeight } from '../../constants/size';
import { ProfileService } from '../../services/ProfileService';
import { AuthContext } from '../../store/auth';
import { ProfileContext } from '../../store/profile';
import { ThemeContext } from '../../store/theme';
import { radius, spacing } from '../../theme/colors';

export default function ProfileScreen({ navigation }: any) {
  const { userEmail, userId, signOut } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const { theme, colors, setTheme } = useContext(ThemeContext);
  const {
    name: profileName,
    profilePhoto,
    currency,
    dateFormat,
    updateName,
    updatePhoto,
    updateCurrency,
    updateDateFormat,
  } = useContext(ProfileContext);

  const [manageVisible, setManageVisible] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [prefsVisible, setPrefsVisible] = useState(false);

  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setNameDraft(profileName || '');
  }, [profileName]);

  if (!userId) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top + scaleHeight(18) }]}>
        <AppText>Please sign in to view your profile.</AppText>
      </View>
    );
  }

  const subtitleRightColor = theme === 'light' ? colors.accent : colors.accentLight;

  const displayName = profileName?.trim() ? profileName.trim() : 'Your Name';
  const displayEmail = userEmail || '';
  const displayTheme = theme === 'light' ? 'Light Mode' : 'Dark Mode';
  const displayLanguage = 'English';
  const displayCurrency = currency || 'USD';
  const displayDateFormat = dateFormat || 'DD/MM/YYYY';

  const currencyOptions = useMemo(
    () => [
      { label: 'USD - US Dollar', value: 'USD' },
      { label: 'LKR - Sri Lankan Rupee', value: 'LKR' },
      { label: 'GBP - British Pound', value: 'GBP' },
      { label: 'EUR - Euro', value: 'EUR' },
    ],
    [],
  );

  const dateFormatOptions = useMemo(
    () => [
      { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' },
      { label: 'MM/DD/YYYY', value: 'MM/DD/YYYY' },
      { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' },
    ],
    [],
  );

  const themeOptions = useMemo(() => [{ label: 'Light Mode', value: 'light' }, { label: 'Dark Mode', value: 'dark' }], []);

  const closePasswordSheet = () => {
    setPasswordVisible(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleSaveName = async () => {
    try {
      const next = nameDraft.trim();
      if (!next) return Alert.alert('Name required', 'Please enter a name.');
      setSavingName(true);
      await updateName(userId, next);
      Alert.alert('Updated', 'Name updated successfully');
      setManageVisible(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update name');
    } finally {
      setSavingName(false);
    }
  };

  const handlePhotoUploaded = async (url: string) => {
    try {
      await updatePhoto(userId, url);
      Alert.alert('Updated', 'Profile photo updated');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update photo');
    }
  };

  const handleUpdatePassword = async () => {
    try {
      if (!currentPassword || !newPassword || !confirmPassword) {
        return Alert.alert('Error', 'Please fill all password fields');
      }
      if (newPassword !== confirmPassword) {
        return Alert.alert('Error', 'New passwords do not match');
      }
      if (newPassword.length < 8) {
        return Alert.alert('Error', 'Password must be at least 8 characters');
      }

      setSavingPassword(true);
      await ProfileService.updatePassword(userId, currentPassword, newPassword);
      Alert.alert('Success', 'Password updated successfully');
      closePasswordSheet();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleThemeChange = async (value: string) => {
    const next = value === 'light' ? 'light' : 'dark';
    try {
      await ProfileService.updateProfile(userId, { theme: next });
      setTheme(next);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update theme');
    }
  };

  const handleCurrencyChange = async (value: string) => {
    try {
      await updateCurrency(userId, value);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update currency');
    }
  };

  const handleDateFormatChange = async (value: string) => {
    try {
      await updateDateFormat(userId, value);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update date format');
    }
  };

  type Row = {
    title: string;
    icon: IconName;
    rightText?: string;
    danger?: boolean;
    onPress?: () => void;
  };

  const sections = useMemo(
    () => ({
      account: [
        {
          title: 'Manage Profile',
          icon: 'profile' as const,
          onPress: () => setManageVisible(true),
        },
        {
          title: 'Password & Security',
          icon: 'lock' as const,
          onPress: () => setPasswordVisible(true),
        },
        {
          title: 'Notifications',
          icon: 'bell' as const,
          onPress: () => Alert.alert('Notifications', 'Coming soon'),
        },
        {
          title: 'Language',
          icon: 'globe' as const,
          rightText: displayLanguage,
          onPress: () => Alert.alert('Language', 'Coming soon'),
        },
      ] satisfies Row[],
      preferences: [
        {
          title: 'Theme',
          icon: theme === 'light' ? ('sun' as const) : ('moon' as const),
          rightText: displayTheme,
          onPress: () => setPrefsVisible(true),
        },
        {
          title: 'Default Currency',
          icon: 'dollar-sign' as const,
          rightText: displayCurrency,
          onPress: () => setPrefsVisible(true),
        },
        {
          title: 'Date Format',
          icon: 'calendar' as const,
          rightText: displayDateFormat,
          onPress: () => setPrefsVisible(true),
        },
      ] satisfies Row[],
      support: [
        {
          title: 'About',
          icon: 'info' as const,
          onPress: () => Alert.alert('About', 'Coming soon'),
        },
        {
          title: 'Report a Problem',
          icon: 'alert-triangle' as const,
          onPress: () => Alert.alert('Report a Problem', 'Coming soon'),
        },
        {
          title: 'Help Center',
          icon: 'file-text' as const,
          onPress: () => Alert.alert('Help Center', 'Coming soon'),
        },
      ] satisfies Row[],
      bottom: [
        {
          title: 'Add Account',
          icon: 'user-plus' as const,
          onPress: () => Alert.alert('Add Account', 'Coming soon'),
        },
        {
          title: 'Logout',
          icon: 'log-out' as const,
          danger: true,
          onPress: signOut,
        },
      ] satisfies Row[],
    }),
    [displayCurrency, displayDateFormat, displayLanguage, displayTheme, signOut, theme],
  );

  const RowItem = ({ title, icon, rightText, danger, onPress, isLast }: Row & { isLast: boolean }) => {
    const leftColor = danger ? colors.danger : colors.text;
    const titleColor = danger ? colors.danger : colors.text;
    const rightColor = danger ? colors.danger : subtitleRightColor;

    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          { opacity: pressed ? 0.72 : 1 },
          !isLast && [styles.rowDivider, { borderBottomColor: colors.border }],
        ]}
      >
        <View style={styles.rowLeft}>
          <View style={[styles.rowIcon, { backgroundColor: danger ? colors.danger + '14' : colors.surface2 }]}>
            <Icon name={icon} size={20} color={leftColor} strokeWidth={2.2} />
          </View>
          <AppText style={[styles.rowTitle, { color: titleColor }]}>{title}</AppText>
        </View>

        <View style={styles.rowRight}>
          {!!rightText && (
            <AppText style={[styles.rowRightText, { color: rightColor }]} numberOfLines={1}>
              {rightText}
            </AppText>
          )}
          <Icon name="chevron-right" size={20} color={danger ? colors.danger : colors.muted} />
        </View>
      </Pressable>
    );
  };

  const BottomSheet = ({
    visible,
    title,
    children,
    onClose,
  }: {
    visible: boolean;
    title: string;
    children: React.ReactNode;
    onClose: () => void;
  }) => {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable style={styles.sheetOverlay} onPress={onClose}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => {}}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <View style={styles.sheetHeader}>
              <AppText style={[styles.sheetTitle, { color: colors.text }]}>{title}</AppText>
              <Pressable onPress={onClose} hitSlop={12} style={{ padding: 6 }}>
                <Icon name="x" size={22} color={colors.muted} />
              </Pressable>
            </View>
            <View style={styles.sheetBody}>{children}</View>
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top + scaleHeight(14) }]}>
      <View style={styles.header}>
        <AppText style={[styles.headerTitle, { color: colors.text }]}>Profile Settings</AppText>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 18, 28) }]}
      >
        <Card elevated style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.userRow}>
            <View style={[styles.avatar, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.avatarImg} />
              ) : (
                <Icon name="profile" size={26} color={colors.muted} />
              )}
            </View>

            <View style={{ flex: 1 }}>
              <AppText style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                {displayName}
              </AppText>
              <AppText muted style={styles.userEmail} numberOfLines={1}>
                {displayEmail}
              </AppText>
            </View>
          </View>
        </Card>

        <AppText muted style={styles.sectionLabel}>
          Account
        </AppText>
        <Card elevated style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {sections.account.map((r, idx) => (
            <RowItem key={r.title} {...r} isLast={idx === sections.account.length - 1} />
          ))}
        </Card>

        <AppText muted style={styles.sectionLabel}>
          Preferences
        </AppText>
        <Card elevated style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {sections.preferences.map((r, idx) => (
            <RowItem key={r.title} {...r} isLast={idx === sections.preferences.length - 1} />
          ))}
        </Card>

        <AppText muted style={styles.sectionLabel}>
          Support
        </AppText>
        <Card elevated style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {sections.support.map((r, idx) => (
            <RowItem key={r.title} {...r} isLast={idx === sections.support.length - 1} />
          ))}
        </Card>

        <Card elevated style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 14 }]}>
          {sections.bottom.map((r, idx) => (
            <RowItem key={r.title} {...r} isLast={idx === sections.bottom.length - 1} />
          ))}
        </Card>
      </ScrollView>

      <BottomSheet visible={manageVisible} title="Manage Profile" onClose={() => setManageVisible(false)}>
        <View style={{ alignItems: 'center', marginBottom: 14 }}>
          <CloudinaryPhotoPicker value={profilePhoto} onChange={handlePhotoUploaded} />
        </View>

        <AppText muted style={styles.fieldLabel}>
          Display Name
        </AppText>
        <AppInput placeholder="Enter your name" value={nameDraft} onChangeText={setNameDraft} />

        <View style={{ height: 14 }} />
        <AppButton
          title={savingName ? 'Saving...' : 'Save'}
          loading={savingName}
          onPress={handleSaveName}
          disabled={savingName || nameDraft.trim() === (profileName || '').trim()}
        />
      </BottomSheet>

      <BottomSheet visible={passwordVisible} title="Password & Security" onClose={closePasswordSheet}>
        <AppText muted style={styles.fieldLabel}>
          Current Password
        </AppText>
        <AppInput placeholder="Current password" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />

        <View style={{ height: 12 }} />
        <AppText muted style={styles.fieldLabel}>
          New Password
        </AppText>
        <AppInput placeholder="New password" value={newPassword} onChangeText={setNewPassword} secureTextEntry />

        <View style={{ height: 12 }} />
        <AppText muted style={styles.fieldLabel}>
          Confirm New Password
        </AppText>
        <AppInput placeholder="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />

        <View style={{ height: 16 }} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <AppButton title="Cancel" variant="secondary" onPress={closePasswordSheet} disabled={savingPassword} />
          </View>
          <View style={{ flex: 1 }}>
            <AppButton
              title={savingPassword ? 'Updating...' : 'Update'}
              loading={savingPassword}
              onPress={handleUpdatePassword}
              disabled={savingPassword}
            />
          </View>
        </View>
      </BottomSheet>

      <BottomSheet visible={prefsVisible} title="Preferences" onClose={() => setPrefsVisible(false)}>
        <AppText muted style={styles.fieldLabel}>
          Theme
        </AppText>
        <AppPicker options={themeOptions} value={theme} onValueChange={handleThemeChange} />

        <View style={{ height: 14 }} />
        <AppText muted style={styles.fieldLabel}>
          Default Currency
        </AppText>
        <AppPicker options={currencyOptions} value={displayCurrency} onValueChange={handleCurrencyChange} />

        <View style={{ height: 14 }} />
        <AppText muted style={styles.fieldLabel}>
          Date Format
        </AppText>
        <AppPicker options={dateFormatOptions} value={displayDateFormat} onValueChange={handleDateFormatChange} />

        <View style={{ height: 16 }} />
        <AppButton title="Done" variant="secondary" onPress={() => setPrefsVisible(false)} />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: scaleHeight(14),
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: 6,
  },
  userCard: {
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
  },
  userEmail: {
    marginTop: 2,
    fontSize: 12.5,
  },
  sectionLabel: {
    marginTop: 14,
    marginBottom: 8,
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'none',
  },
  groupCard: {
    borderRadius: radius.lg,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 10,
  },
  rowRightText: {
    fontSize: 13,
    fontWeight: '700',
    maxWidth: 130,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    maxHeight: 520,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 10,
  },
  sheetHeader: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  sheetBody: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 18,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
});

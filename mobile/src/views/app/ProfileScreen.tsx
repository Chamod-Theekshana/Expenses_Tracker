import React, { useContext, useState, useEffect } from "react";
import { View, StyleSheet, Alert, ScrollView } from "react-native";
import AppText from "../../components/AppText";
import Card from "../../components/Card";
import AppButton from "../../components/AppButton";
import AppInput from "../../components/AppInput";
import AppPicker from "../../components/AppPicker";
import CloudinaryPhotoPicker from "../../components/CloudinaryPhotoPicker";
import CustomSwitch from "../../components/Switch";
import { spacing, radius } from "../../theme/colors";
import { AuthContext } from "../../store/auth";
import { ThemeContext } from "../../store/theme";
import { ProfileContext } from "../../store/profile";
import { ProfileService } from "../../services/ProfileService";
import { scaleHeight } from "../../constants/size";

export default function ProfileScreen() {
  const { userEmail, userId, signOut } = useContext(AuthContext);
  const { theme, colors, setTheme } = useContext(ThemeContext);
  const { name: profileName, profilePhoto, currency, dateFormat, updateName, updatePhoto, updateCurrency, updateDateFormat } = useContext(ProfileContext);

  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setName(profileName);
  }, [profileName]);

  const currencyOptions = [
    { label: 'USD - US Dollar', value: 'USD' },
    { label: 'LKR - Sri Lankan Rupee', value: 'LKR' },
    { label: 'GBP - British Pound', value: 'GBP' },
    { label: 'EUR - Euro', value: 'EUR' },
  ];

  const dateFormatOptions = [
    { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' },
    { label: 'MM/DD/YYYY', value: 'MM/DD/YYYY' },
    { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' },
  ];

  const onPhotoUploaded = async (url: string) => {
    try {
      await updatePhoto(userId!, url);
      Alert.alert("Success", "Profile photo updated");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to update profile");
    }
  };

  const handleUpdateName = async () => {
    try {
      if (!name.trim()) return Alert.alert("Name required", "Please enter a name.");
      setSavingName(true);
      await updateName(userId!, name.trim());
      Alert.alert("Updated", "Name updated successfully");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to update name");
    } finally {
      setSavingName(false);
    }
  };

  const toggleTheme = async (isDark: boolean) => {
    const next = isDark ? "dark" : "light";
    try {
      await ProfileService.updateProfile(userId!, { theme: next });
      setTheme(next);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to update theme");
    }
  };

  const handleUpdatePassword = async () => {
    try {
      if (!currentPassword || !newPassword || !confirmPassword) {
        return Alert.alert("Error", "Please fill all password fields");
      }
      if (newPassword !== confirmPassword) {
        return Alert.alert("Error", "New passwords do not match");
      }
      if (newPassword.length < 6) {
        return Alert.alert("Error", "Password must be at least 6 characters");
      }
      setSavingPassword(true);
      await ProfileService.updatePassword(userId!, currentPassword, newPassword);
      Alert.alert("Success", "Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordSection(false);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to update password");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleCurrencyChange = async (value: string) => {
    try {
      await updateCurrency(userId!, value);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to update currency");
    }
  };

  const handleDateFormatChange = async (value: string) => {
    try {
      await updateDateFormat(userId!, value);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to update date format");
    }
  };

  if (!userId) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <AppText>Please sign in to view your profile.</AppText>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <AppText title style={{ fontSize: 28,marginBottom: 16 }}>
        Profile
      </AppText>
        <Card elevated>
          <View style={styles.header}>
            <CloudinaryPhotoPicker value={profilePhoto} onChange={onPhotoUploaded} />
            <View style={{ height: 12 }} />
            <AppText style={[styles.email, { color: colors.text }]}>{userEmail}</AppText>
          </View>
        </Card>

        <View style={{ height: 16 }} />

        <Card elevated>
          <AppText style={[styles.sectionTitle, { color: colors.text }]}>Personal Information</AppText>
          <AppText muted style={styles.label}>Your Name</AppText>
          <AppInput placeholder="Your name" value={name} onChangeText={setName} />
          <View style={{ height: 12 }} />
          <AppButton title={savingName ? "Updating..." : "Update Name"} onPress={handleUpdateName} disabled={savingName} />
        </Card>

        <View style={{ height: 16 }} />

        <Card elevated>
          <AppText style={[styles.sectionTitle, { color: colors.text }]}>Security</AppText>
          {!showPasswordSection ? (
            <AppButton title="Change Password" onPress={() => setShowPasswordSection(true)} variant="secondary" />
          ) : (
            <>
              <AppText muted style={styles.label}>Current Password</AppText>
              <AppInput placeholder="Enter current password" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
              <View style={{ height: 12 }} />
              <AppText muted style={styles.label}>New Password</AppText>
              <AppInput placeholder="Enter new password" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
              <View style={{ height: 12 }} />
              <AppText muted style={styles.label}>Confirm New Password</AppText>
              <AppInput placeholder="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
              <View style={{ height: 12 }} />
              <View style={styles.buttonRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <AppButton title="Cancel" onPress={() => {
                    setShowPasswordSection(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                  }} variant="ghost" />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <AppButton title={savingPassword ? "Updating..." : "Update"} onPress={handleUpdatePassword} disabled={savingPassword} />
                </View>
              </View>
            </>
          )}
        </Card>

        <View style={{ height: 16 }} />

        <Card elevated>
          <AppText style={[styles.sectionTitle, { color: colors.text }]}>Preferences</AppText>

          <View style={styles.preferenceRow}>
            <View>
              <AppText style={{ color: colors.text, fontWeight: '600', fontSize: 15 }}>Dark Theme</AppText>
              <AppText muted style={{ fontSize: 12, marginTop: 2 }}>Switch between light and dark mode</AppText>
            </View>
            <CustomSwitch value={theme === "dark"} onValueChange={toggleTheme} />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <AppText muted style={styles.label}>Currency</AppText>
          <AppPicker options={currencyOptions} value={currency} onValueChange={handleCurrencyChange} />

          <View style={{ height: 16 }} />

          <AppText muted style={styles.label}>Date Format</AppText>
          <AppPicker options={dateFormatOptions} value={dateFormat} onValueChange={handleDateFormatChange} />
        </Card>

        <View style={{ height: 16 }} />

        <Card elevated>
          <AppButton title="Sign Out" onPress={signOut} variant="ghost" />
        </Card>

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: scaleHeight(50)
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    alignItems: "center",
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    marginBottom: 8,
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  buttonRow: {
    flexDirection: 'row',
  },
});

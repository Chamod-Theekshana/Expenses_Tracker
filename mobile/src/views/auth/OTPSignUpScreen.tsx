import React, { useState, useMemo, useContext } from 'react';
import { View, StyleSheet, Alert, Pressable, ScrollView } from 'react-native';
import AppText from '../../components/AppText';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import Card from '../../components/Card';
import Icon from '../../components/Icon';
import IconButton from '../../components/IconButton';
import { radius, spacing } from '../../theme/colors';
import { scaleHeight } from '../../constants/size';
import { OtpService } from '../../services/OtpService';
import { ThemeContext } from '../../store/theme';

export default function OTPSignUpScreen({ navigation }: any) {
  const { colors, theme } = useContext(ThemeContext);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => email.includes('@') && email.includes('.'), [email]);

  const handleSendOTP = async () => {
    if (!canSubmit) {
      Alert.alert('Invalid email', 'Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      await OtpService.sendOTP(email.trim().toLowerCase());
      navigation.navigate('OTPVerify', { email: email.trim().toLowerCase() });
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to send Passkey');
    } finally {
      setLoading(false);
    }
  };

  const cardShadow = theme === 'light' ? styles.cardShadowLight : {};

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
      <View style={styles.topBar}>
        <IconButton icon="arrow-left" size={40} iconSize={24} onPress={() => navigation.goBack()} />
      </View>

      <ScrollView 
        contentContainerStyle={{ flexGrow: 1, paddingBottom: scaleHeight(40) }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: colors.accent + '20' }]}>
            <Icon name="mail" size={32} color={colors.accent} />
          </View>
          <AppText title style={{ fontSize: 28, marginTop: 16 }}>
            Create Account
          </AppText>
          <AppText muted style={{ fontSize: 16, marginTop: 8, textAlign: 'center' }}>
            Enter your email to get started. We'll send you a secure passkey to verify.
          </AppText>
        </View>

        <Card style={[styles.formCard, cardShadow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <AppText style={[styles.label, { color: colors.text }]}>Email Address</AppText>
          <AppInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
            editable={!loading}
            returnKeyType="send"
            onSubmitEditing={handleSendOTP}
          />

          <AppButton
            title="Send Passkey"
            onPress={handleSendOTP}
            loading={loading}
            disabled={!canSubmit}
            style={{ marginTop: 32 }}
            size="lg"
          />
        </Card>

        <View style={styles.footer}>
          <Pressable onPress={() => navigation.navigate('SignIn')} hitSlop={10} style={{ padding: 10 }}>
            <AppText muted style={{ fontSize: 15 }}>
              Already have an account?{' '}
              <AppText style={{ color: colors.accent, fontWeight: '700', fontSize: 15 }}>Sign in instead</AppText>
            </AppText>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: scaleHeight(50),
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginLeft: -8,
  },
  header: {
    alignItems: 'center',
    marginBottom: scaleHeight(30),
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  formCard: {
    padding: 24,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
    paddingTop: 32,
  },
  cardShadowLight: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
});

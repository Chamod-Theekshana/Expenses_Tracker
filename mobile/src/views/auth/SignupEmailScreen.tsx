import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import AppText from '../../components/AppText';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import Card from '../../components/Card';
import { colors, spacing } from '../../theme/colors';
import { AuthService } from '../../services/AuthService';

export default function SignupEmailScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => email.includes('@'), [email]);

  const handleSendPasskey = async () => {
    if (!canSubmit) {
      Alert.alert('Invalid email', 'Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      await AuthService.sendPasskey(email.trim().toLowerCase());
      navigation.navigate('PasskeyVerify', { email: email.trim().toLowerCase() });
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to send passkey');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <AppText title style={{ marginBottom: 6 }}>
        Create Account
      </AppText>
      <AppText muted style={{ marginBottom: 18 }}>
        Enter your email to get started.
      </AppText>

      <Card style={{ marginBottom: 16 }}>
        <AppText muted style={{ marginBottom: 8 }}>
          Email
        </AppText>
        <AppInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
          editable={!loading}
        />

        <AppButton
          title="Send Passkey"
          onPress={handleSendPasskey}
          loading={loading}
          disabled={!canSubmit}
          style={{ marginTop: 16 }}
        />
      </Card>

      <AppText muted style={{ textAlign: 'center', fontSize: 13 }}>
        We'll send a 6-digit passkey to your email
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.lg,
    paddingTop: 56,
  },
});

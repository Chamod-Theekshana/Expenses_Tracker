import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SignInScreen from '../views/auth/SignInScreen';
import SignupEmailScreen from '../views/auth/SignupEmailScreen';
import PasskeyVerifyScreen from '../views/auth/PasskeyVerifyScreen';
import PasswordCreateScreen from '../views/auth/PasswordCreateScreen';

export type AuthStackParamList = {
  SignIn: undefined;
  SignupEmail: undefined;
  PasskeyVerify: { email: string };
  PasswordCreate: { email: string; signupToken: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="SignupEmail" component={SignupEmailScreen} />
      <Stack.Screen name="PasskeyVerify" component={PasskeyVerifyScreen} />
      <Stack.Screen name="PasswordCreate" component={PasswordCreateScreen} />
    </Stack.Navigator>
  );
}

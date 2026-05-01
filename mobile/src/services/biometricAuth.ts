import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';

type BiometricLabel = 'Face ID' | 'Fingerprint' | 'Biometrics';
type SensorType = (typeof BiometryTypes)[keyof typeof BiometryTypes];

export type BiometricAvailability = {
  available: boolean;
  biometryType: SensorType | null;
  label: BiometricLabel;
};

const rnBiometrics = new ReactNativeBiometrics();

function getBiometryLabel(biometryType: SensorType | null | undefined): BiometricLabel {
  if (biometryType === BiometryTypes.FaceID) {
    return 'Face ID';
  }

  if (biometryType === BiometryTypes.TouchID) {
    return 'Fingerprint';
  }

  return 'Biometrics';
}

export async function getBiometricAvailability(): Promise<BiometricAvailability> {
  try {
    const { available, biometryType } = await rnBiometrics.isSensorAvailable();
    return {
      available: Boolean(available),
      biometryType: biometryType || null,
      label: getBiometryLabel(biometryType),
    };
  } catch {
    return {
      available: false,
      biometryType: null,
      label: 'Biometrics',
    };
  }
}

export async function promptForBiometricUnlock(promptMessage: string): Promise<boolean> {
  try {
    const { success } = await rnBiometrics.simplePrompt({
      promptMessage,
      cancelButtonText: 'Cancel',
    });
    return Boolean(success);
  } catch {
    return false;
  }
}

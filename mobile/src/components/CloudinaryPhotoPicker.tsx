import React, { useState, useContext } from "react";
import { View, StyleSheet, Image, Pressable, ActivityIndicator, Alert } from "react-native";
import * as ImagePicker from "react-native-image-picker";
import AppText from "./AppText";
import { uploadImageToCloudinary } from "../utils/cloudinary";
import { radius, spacing } from "../theme/colors";
import { ThemeContext } from "../store/theme";

type Props = {
  /** Current image URL (Cloudinary secure_url) */
  value?: string | null;
  /** Called with the new uploaded URL */
  onChange: (url: string) => Promise<void> | void;
  /** Optional size of the avatar */
  size?: number;
  /** Optional label */
  label?: string;
};

export default function CloudinaryPhotoPicker({
  value,
  onChange,
  size = 110,
  label = "Change Photo",
}: Props) {
  const { colors } = useContext(ThemeContext);
  const [uploading, setUploading] = useState(false);

  const pickImage = () => {
    ImagePicker.launchImageLibrary(
      {
        mediaType: "photo",
        selectionLimit: 1,
        quality: 0.85 as ImagePicker.PhotoQuality,
      },
      async (response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert("Error", response.errorMessage || "Image picker error");
          return;
        }

        const uri = response.assets?.[0]?.uri;
        if (!uri) return;

        try {
          setUploading(true);
          const url = await uploadImageToCloudinary(uri);
          await onChange(url);
        } catch (e: any) {
          Alert.alert("Upload failed", e?.message || "Could not upload image");
        } finally {
          setUploading(false);
        }
      }
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.avatarWrap, { width: size, height: size, borderRadius: size / 2, borderColor: colors.accent + '33' }]}>
        {value ? (
          <Image source={{ uri: value }} style={styles.avatar} />
        ) : (
          <View style={[styles.placeholder, { backgroundColor: colors.accentBg }]}>
            <AppText style={[styles.placeholderText, { color: colors.muted }]}>No Photo</AppText>
          </View>
        )}

        {uploading && (
          <View style={styles.overlay}>
            <ActivityIndicator color={colors.accent} />
          </View>
        )}
      </View>

      <Pressable onPress={pickImage} style={[styles.btn, { borderColor: colors.accent + '33' }]} disabled={uploading}>
        <AppText style={[styles.btnText, { color: colors.accent }]}>{label}</AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 12,
  },
  avatarWrap: {
    overflow: "hidden",
    borderWidth: 2,
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
  },
  placeholderText: {
    opacity: 0.8,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

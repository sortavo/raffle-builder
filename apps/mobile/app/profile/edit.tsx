// Edit Profile Screen
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from '@sortavo/sdk/react';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
  sizes,
  commonStyles,
} from '../../src/theme';
import { useTranslation } from '../../src/i18n';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();
  const { t } = useTranslation();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t('common.error'), t('editProfile.errors.nameRequired'));
      return;
    }

    setIsLoading(true);

    try {
      const result = await updateProfile({
        name: name.trim(),
        phone: phone.trim() || undefined,
      });

      if (result.success) {
        Alert.alert(t('editProfile.success.title'), t('editProfile.success.message'), [
          { text: t('common.ok'), onPress: () => router.back() }
        ]);
      } else {
        Alert.alert(t('common.error'), result.error?.message || t('editProfile.errors.nameRequired'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('editProfile.errors.nameRequired'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: t('editProfile.title'),
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: spacing.sm }}>
              <Ionicons name="close" size={sizes.iconLg} color={colors.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={commonStyles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
              </Text>
            </View>
            <TouchableOpacity style={styles.changeAvatarButton}>
              <Text style={styles.changeAvatarText}>{t('editProfile.changePhoto')}</Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={commonStyles.inputGroup}>
              <Text style={commonStyles.inputLabel}>{t('editProfile.form.fullName')}</Text>
              <TextInput
                style={commonStyles.input}
                value={name}
                onChangeText={setName}
                placeholder={t('editProfile.form.fullNamePlaceholder')}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
              />
            </View>

            <View style={commonStyles.inputGroup}>
              <Text style={commonStyles.inputLabel}>{t('editProfile.form.email')}</Text>
              <View style={commonStyles.inputDisabled}>
                <Text style={styles.disabledInputText}>{user?.email}</Text>
                <Ionicons name="lock-closed-outline" size={sizes.iconSm} color={colors.textMuted} />
              </View>
              <Text style={commonStyles.inputHint}>{t('editProfile.form.emailHint')}</Text>
            </View>

            <View style={commonStyles.inputGroup}>
              <Text style={commonStyles.inputLabel}>{t('editProfile.form.phone')}</Text>
              <TextInput
                style={commonStyles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder={t('editProfile.form.phonePlaceholder')}
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={commonStyles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, isLoading && commonStyles.buttonDisabled]}
            onPress={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={commonStyles.buttonPrimaryText}>{t('editProfile.saveButton')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.base,
  },
  avatarContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  avatar: {
    width: sizes.avatarXl,
    height: sizes.avatarXl,
    borderRadius: sizes.avatarXl / 2,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: sizes.iconXl,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  changeAvatarButton: {
    marginTop: spacing.md,
  },
  changeAvatarText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  form: {
    gap: spacing.lg,
  },
  disabledInputText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.base,
    alignItems: 'center',
  },
});

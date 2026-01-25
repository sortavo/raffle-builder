// Profile Screen
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Linking, AccessibilityRole } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth, useTenant } from '@sortavo/sdk/react';
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

// Minimum touch target size for accessibility (44x44 points)
const MIN_TOUCH_TARGET = 44;

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, signOut } = useAuth();
  const { tenantSlug } = useTenant();
  const { t } = useTranslation();

  const handleSignOut = async () => {
    Alert.alert(
      t('profile.signOut.confirmTitle'),
      t('profile.signOut.confirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.signOut.button'),
          style: 'destructive',
          onPress: async () => {
            await signOut();
          },
        },
      ]
    );
  };

  const openExternalLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(t('common.error'), t('profile.errors.openLink'));
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={commonStyles.centerContainer}>
        <Ionicons name="person-outline" size={sizes.iconXxl} color={colors.textMuted} />
        <Text style={commonStyles.title}>{t('profile.loginPrompt.title')}</Text>
        <Text style={commonStyles.subtitle}>
          {t('profile.loginPrompt.subtitle')}
        </Text>
        <TouchableOpacity
          style={[commonStyles.buttonPrimary, styles.loginButton]}
          onPress={() => router.push('/auth/login')}
          accessibilityLabel={t('auth.login.loginButton')}
          accessibilityRole="button"
        >
          <Text style={commonStyles.buttonPrimaryText}>{t('auth.login.loginButton')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={commonStyles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={styles.name}>{user?.name || t('profile.header.defaultName')}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      {/* Menu Items */}
      <View style={commonStyles.section}>
        <Text style={commonStyles.sectionTitle}>{t('profile.sections.account')}</Text>

        <MenuItem
          icon="person-outline"
          label={t('profile.menu.editProfile')}
          onPress={() => router.push('/profile/edit' as any)}
        />
        <MenuItem
          icon="receipt-outline"
          label={t('profile.menu.purchaseHistory')}
          onPress={() => router.push('/profile/purchases' as any)}
        />
        <MenuItem
          icon="notifications-outline"
          label={t('profile.menu.notificationPreferences')}
          onPress={() => router.push('/profile/notifications' as any)}
        />
      </View>

      <View style={commonStyles.section}>
        <Text style={commonStyles.sectionTitle}>{t('profile.sections.support')}</Text>

        <MenuItem
          icon="help-circle-outline"
          label={t('profile.menu.helpCenter')}
          onPress={() => openExternalLink('https://sortavo.com/ayuda')}
          accessibilityRole="link"
        />
        <MenuItem
          icon="document-text-outline"
          label={t('profile.menu.termsAndConditions')}
          onPress={() => openExternalLink('https://sortavo.com/terminos')}
          accessibilityRole="link"
        />
        <MenuItem
          icon="shield-checkmark-outline"
          label={t('profile.menu.privacyPolicy')}
          onPress={() => openExternalLink('https://sortavo.com/privacidad')}
          accessibilityRole="link"
        />
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity
        style={styles.signOutButton}
        onPress={handleSignOut}
        accessibilityLabel={t('profile.signOut.button')}
        accessibilityRole="button"
      >
        <Ionicons name="log-out-outline" size={sizes.iconMd} color={colors.error} />
        <Text style={styles.signOutText}>{t('profile.signOut.button')}</Text>
      </TouchableOpacity>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appVersion}>{t('profile.appInfo.version', { version: '1.0.0' })}</Text>
        {tenantSlug && (
          <Text style={styles.tenantInfo}>{t('profile.appInfo.organization', { name: tenantSlug })}</Text>
        )}
      </View>
    </ScrollView>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  accessibilityRole = 'button',
}: {
  icon: string;
  label: string;
  onPress: () => void;
  accessibilityRole?: AccessibilityRole;
}) {
  return (
    <TouchableOpacity
      style={[commonStyles.menuItem, styles.menuItemAccessible]}
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole={accessibilityRole}
    >
      <Ionicons name={icon as React.ComponentProps<typeof Ionicons>['name']} size={22} color={colors.textSecondary} />
      <Text style={commonStyles.menuItemLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={fontSize.lg} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  loginButton: {
    marginTop: spacing.xl,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: sizes.avatarLg,
    height: sizes.avatarLg,
    borderRadius: sizes.avatarLg / 2,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  name: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
  },
  email: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.base,
    marginTop: spacing['2xl'],
    paddingVertical: 14,
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.lg,
    minHeight: MIN_TOUCH_TARGET,
  },
  menuItemAccessible: {
    minHeight: MIN_TOUCH_TARGET,
  },
  signOutText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.error,
    marginLeft: spacing.sm,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  appVersion: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  tenantInfo: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});

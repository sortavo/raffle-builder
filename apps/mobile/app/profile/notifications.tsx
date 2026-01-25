// Notification Preferences Screen
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { useTranslation } from '../../src/i18n';

interface NotificationSetting {
  key: string;
  titleKey: string;
  descriptionKey: string;
  enabled: boolean;
}

export default function NotificationPreferencesScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();

  const [settings, setSettings] = useState<NotificationSetting[]>([
    {
      key: 'push_enabled',
      titleKey: 'notificationPreferences.settings.pushEnabled.title',
      descriptionKey: 'notificationPreferences.settings.pushEnabled.description',
      enabled: true,
    },
    {
      key: 'raffle_updates',
      titleKey: 'notificationPreferences.settings.raffleUpdates.title',
      descriptionKey: 'notificationPreferences.settings.raffleUpdates.description',
      enabled: true,
    },
    {
      key: 'winner_announcements',
      titleKey: 'notificationPreferences.settings.winnerAnnouncements.title',
      descriptionKey: 'notificationPreferences.settings.winnerAnnouncements.description',
      enabled: true,
    },
    {
      key: 'purchase_confirmations',
      titleKey: 'notificationPreferences.settings.purchaseConfirmations.title',
      descriptionKey: 'notificationPreferences.settings.purchaseConfirmations.description',
      enabled: true,
    },
    {
      key: 'promotional',
      titleKey: 'notificationPreferences.settings.promotional.title',
      descriptionKey: 'notificationPreferences.settings.promotional.description',
      enabled: false,
    },
    {
      key: 'email_notifications',
      titleKey: 'notificationPreferences.settings.emailNotifications.title',
      descriptionKey: 'notificationPreferences.settings.emailNotifications.description',
      enabled: true,
    },
  ]);

  const handleToggle = async (key: string) => {
    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 300));

    setSettings((prev) =>
      prev.map((setting) =>
        setting.key === key ? { ...setting, enabled: !setting.enabled } : setting
      )
    );

    setIsLoading(false);
  };

  return (
    <>
      <Stack.Screen options={{ title: t('notificationPreferences.title') }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.sectionDescription}>
          {t('notificationPreferences.description')}
        </Text>

        <View style={styles.settingsContainer}>
          {settings.map((setting, index) => (
            <View
              key={setting.key}
              style={[
                styles.settingItem,
                index === 0 && styles.settingItemFirst,
                index === settings.length - 1 && styles.settingItemLast,
              ]}
            >
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>{t(setting.titleKey)}</Text>
                <Text style={styles.settingDescription}>{t(setting.descriptionKey)}</Text>
              </View>
              <Switch
                value={setting.enabled}
                onValueChange={() => handleToggle(setting.key)}
                trackColor={{ false: '#E5E7EB', true: '#6366F1' }}
                thumbColor="#FFFFFF"
                disabled={isLoading}
              />
            </View>
          ))}
        </View>

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color="#6366F1" />
          </View>
        )}

        <Text style={styles.footer}>
          {t('notificationPreferences.footer')}
        </Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 24,
  },
  settingsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingItemFirst: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  settingItemLast: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  footer: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
    paddingHorizontal: 16,
  },
});

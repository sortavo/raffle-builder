// Login Screen
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEmailAuth } from '../../src/hooks/useEmailAuth';
import { usePhoneAuth } from '../../src/hooks/usePhoneAuth';
import { useTranslation } from '../../src/i18n';

type AuthMode = 'email' | 'phone';

export default function LoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('email');
  const { t } = useTranslation();

  const handleSuccess = () => {
    router.back();
  };

  const emailAuth = useEmailAuth({ onSuccess: handleSuccess });
  const phoneAuth = usePhoneAuth({ onSuccess: handleSuccess });

  const handleModeChange = (newMode: AuthMode) => {
    setMode(newMode);
    if (newMode === 'email') {
      phoneAuth.resetToPhoneInput();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Close Button */}
      <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
        <Ionicons name="close" size={28} color="#111827" />
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>Sortavo</Text>
          <Text style={styles.title}>{t('auth.login.title')}</Text>
          <Text style={styles.subtitle}>
            {t('auth.login.subtitle')}
          </Text>
        </View>

        {/* Mode Toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'email' && styles.modeButtonActive]}
            onPress={() => handleModeChange('email')}
          >
            <Ionicons
              name="mail-outline"
              size={18}
              color={mode === 'email' ? '#6366F1' : '#6B7280'}
            />
            <Text
              style={[styles.modeButtonText, mode === 'email' && styles.modeButtonTextActive]}
            >
              {t('auth.login.email')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeButton, mode === 'phone' && styles.modeButtonActive]}
            onPress={() => handleModeChange('phone')}
          >
            <Ionicons
              name="phone-portrait-outline"
              size={18}
              color={mode === 'phone' ? '#6366F1' : '#6B7280'}
            />
            <Text
              style={[styles.modeButtonText, mode === 'phone' && styles.modeButtonTextActive]}
            >
              {t('auth.login.phone')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Email Form */}
        {mode === 'email' && (
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#9CA3AF" />
              <TextInput
                style={styles.input}
                placeholder={t('auth.login.emailPlaceholder')}
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={emailAuth.email}
                onChangeText={emailAuth.setEmail}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />
              <TextInput
                style={styles.input}
                placeholder={t('auth.login.passwordPlaceholder')}
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!emailAuth.showPassword}
                autoComplete="password"
                value={emailAuth.password}
                onChangeText={emailAuth.setPassword}
              />
              <TouchableOpacity onPress={emailAuth.toggleShowPassword}>
                <Ionicons
                  name={emailAuth.showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, emailAuth.isLoading && styles.buttonDisabled]}
              onPress={emailAuth.handleEmailSignIn}
              disabled={emailAuth.isLoading}
            >
              {emailAuth.isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>{t('auth.login.loginButton')}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>{t('auth.login.forgotPassword')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Phone Form */}
        {mode === 'phone' && !phoneAuth.showCodeInput && (
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.phonePrefix}>+52</Text>
              <TextInput
                style={styles.input}
                placeholder={t('auth.login.phonePlaceholder')}
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                value={phoneAuth.phone}
                onChangeText={phoneAuth.setPhone}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, phoneAuth.isLoading && styles.buttonDisabled]}
              onPress={phoneAuth.handleSendCode}
              disabled={phoneAuth.isLoading}
            >
              {phoneAuth.isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>{t('auth.login.sendCode')}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Code Verification */}
        {mode === 'phone' && phoneAuth.showCodeInput && (
          <View style={styles.form}>
            <Text style={styles.codeMessage}>
              {t('auth.login.verificationCodeSent', { phone: phoneAuth.phone })}
            </Text>

            <View style={styles.inputContainer}>
              <Ionicons name="keypad-outline" size={20} color="#9CA3AF" />
              <TextInput
                style={styles.input}
                placeholder={t('auth.login.verificationCodePlaceholder')}
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                maxLength={6}
                value={phoneAuth.code}
                onChangeText={phoneAuth.setCode}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, phoneAuth.isLoading && styles.buttonDisabled]}
              onPress={phoneAuth.handleVerifyCode}
              disabled={phoneAuth.isLoading}
            >
              {phoneAuth.isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>{t('auth.login.verify')}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendCode}
              onPress={phoneAuth.resetToPhoneInput}
            >
              <Text style={styles.resendCodeText}>{t('auth.login.useAnotherNumber')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    padding: 4,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: '#6366F1',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  modeButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  modeButtonTextActive: {
    color: '#6366F1',
  },
  form: {},
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#111827',
  },
  phonePrefix: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '500',
  },
  codeMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  resendCode: {
    alignItems: 'center',
    marginTop: 16,
  },
  resendCodeText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '500',
  },
});

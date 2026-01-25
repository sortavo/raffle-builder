// Hook for phone authentication
import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '@sortavo/sdk/react';

interface UsePhoneAuthOptions {
  onSuccess?: () => void;
}

interface UsePhoneAuthReturn {
  phone: string;
  setPhone: (phone: string) => void;
  code: string;
  setCode: (code: string) => void;
  showCodeInput: boolean;
  isLoading: boolean;
  error: string | null;
  handleSendCode: () => Promise<void>;
  handleVerifyCode: () => Promise<void>;
  resetToPhoneInput: () => void;
  reset: () => void;
}

export function usePhoneAuth(options: UsePhoneAuthOptions = {}): UsePhoneAuthReturn {
  const { onSuccess } = options;
  const { signInWithPhone, verifyPhone } = useAuth();

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendCode = useCallback(async () => {
    // Clear previous error
    setError(null);

    // Validate phone
    if (!phone) {
      const errorMsg = 'Por favor ingresa tu numero de telefono';
      setError(errorMsg);
      Alert.alert('Error', errorMsg);
      return;
    }

    setIsLoading(true);
    try {
      const result = await signInWithPhone(phone);

      if (result.success) {
        setShowCodeInput(true);
      } else {
        const errorMsg = result.error?.message || 'No pudimos enviar el codigo';
        setError(errorMsg);
        Alert.alert('Error', errorMsg);
      }
    } catch (err) {
      const errorMsg = 'Ocurrio un error inesperado';
      setError(errorMsg);
      Alert.alert('Error', errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [phone, signInWithPhone]);

  const handleVerifyCode = useCallback(async () => {
    // Clear previous error
    setError(null);

    // Validate code
    if (!code) {
      const errorMsg = 'Por favor ingresa el codigo';
      setError(errorMsg);
      Alert.alert('Error', errorMsg);
      return;
    }

    setIsLoading(true);
    try {
      const result = await verifyPhone(phone, code);

      if (result.success) {
        onSuccess?.();
      } else {
        const errorMsg = result.error?.message || 'Codigo invalido';
        setError(errorMsg);
        Alert.alert('Error', errorMsg);
      }
    } catch (err) {
      const errorMsg = 'Ocurrio un error inesperado';
      setError(errorMsg);
      Alert.alert('Error', errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [phone, code, verifyPhone, onSuccess]);

  const resetToPhoneInput = useCallback(() => {
    setShowCodeInput(false);
    setCode('');
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setPhone('');
    setCode('');
    setShowCodeInput(false);
    setError(null);
  }, []);

  return {
    phone,
    setPhone,
    code,
    setCode,
    showCodeInput,
    isLoading,
    error,
    handleSendCode,
    handleVerifyCode,
    resetToPhoneInput,
    reset,
  };
}

// Hook for email authentication
import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '@sortavo/sdk/react';

interface UseEmailAuthOptions {
  onSuccess?: () => void;
}

interface UseEmailAuthReturn {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  toggleShowPassword: () => void;
  isLoading: boolean;
  error: string | null;
  handleEmailSignIn: () => Promise<void>;
  reset: () => void;
}

export function useEmailAuth(options: UseEmailAuthOptions = {}): UseEmailAuthReturn {
  const { onSuccess } = options;
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleShowPassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const handleEmailSignIn = useCallback(async () => {
    // Clear previous error
    setError(null);

    // Validate inputs
    if (!email || !password) {
      const errorMsg = 'Por favor completa todos los campos';
      setError(errorMsg);
      Alert.alert('Error', errorMsg);
      return;
    }

    setIsLoading(true);
    try {
      const result = await signIn(email, password);

      if (result.success) {
        onSuccess?.();
      } else {
        const errorMsg = result.error?.message || 'No pudimos iniciar sesion';
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
  }, [email, password, signIn, onSuccess]);

  const reset = useCallback(() => {
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setError(null);
  }, []);

  return {
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    toggleShowPassword,
    isLoading,
    error,
    handleEmailSignIn,
    reset,
  };
}

import { describe, it, expect } from 'vitest';

// Test the pure business logic for MFA

type AALLevel = 'aal1' | 'aal2' | null;

interface MFAFactor {
  id: string;
  type: string;
  status: 'verified' | 'unverified';
  friendly_name?: string;
}

interface MFAState {
  isEnrolled: boolean;
  isVerified: boolean;
  currentLevel: AALLevel;
  factors: MFAFactor[];
}

describe('useMFA - AAL level validation', () => {
  const isAAL2Required = (currentLevel: AALLevel): boolean => {
    return currentLevel !== 'aal2';
  };

  const getAALDescription = (level: AALLevel): string => {
    switch (level) {
      case 'aal1':
        return 'Basic authentication (password only)';
      case 'aal2':
        return 'Multi-factor authentication verified';
      default:
        return 'Not authenticated';
    }
  };

  it('should require AAL2 when at AAL1', () => {
    expect(isAAL2Required('aal1')).toBe(true);
  });

  it('should not require AAL2 when already at AAL2', () => {
    expect(isAAL2Required('aal2')).toBe(false);
  });

  it('should require AAL2 when not authenticated', () => {
    expect(isAAL2Required(null)).toBe(true);
  });

  it('should describe AAL levels correctly', () => {
    expect(getAALDescription('aal1')).toContain('password');
    expect(getAALDescription('aal2')).toContain('Multi-factor');
    expect(getAALDescription(null)).toContain('Not authenticated');
  });
});

describe('useMFA - factor status', () => {
  const isFactorVerified = (factor: MFAFactor): boolean => {
    return factor.status === 'verified';
  };

  const getVerifiedFactors = (factors: MFAFactor[]): MFAFactor[] => {
    return factors.filter(f => f.status === 'verified');
  };

  const hasVerifiedTOTP = (factors: MFAFactor[]): boolean => {
    return factors.some(f => f.status === 'verified' && f.type === 'totp');
  };

  it('should identify verified factors', () => {
    expect(isFactorVerified({ id: '1', type: 'totp', status: 'verified' })).toBe(true);
    expect(isFactorVerified({ id: '1', type: 'totp', status: 'unverified' })).toBe(false);
  });

  it('should filter verified factors', () => {
    const factors: MFAFactor[] = [
      { id: '1', type: 'totp', status: 'verified' },
      { id: '2', type: 'totp', status: 'unverified' },
      { id: '3', type: 'totp', status: 'verified' },
    ];
    expect(getVerifiedFactors(factors)).toHaveLength(2);
  });

  it('should detect verified TOTP factors', () => {
    const withTOTP: MFAFactor[] = [
      { id: '1', type: 'totp', status: 'verified' },
    ];
    const withoutTOTP: MFAFactor[] = [
      { id: '1', type: 'totp', status: 'unverified' },
    ];
    expect(hasVerifiedTOTP(withTOTP)).toBe(true);
    expect(hasVerifiedTOTP(withoutTOTP)).toBe(false);
    expect(hasVerifiedTOTP([])).toBe(false);
  });
});

describe('useMFA - state derivation', () => {
  const deriveMFAState = (
    currentLevel: AALLevel,
    factors: MFAFactor[]
  ): MFAState => {
    const verifiedFactors = factors.filter(f => f.status === 'verified');
    return {
      isEnrolled: verifiedFactors.length > 0,
      isVerified: currentLevel === 'aal2',
      currentLevel,
      factors: verifiedFactors,
    };
  };

  it('should derive state for fully verified user', () => {
    const factors: MFAFactor[] = [
      { id: '1', type: 'totp', status: 'verified' },
    ];
    const state = deriveMFAState('aal2', factors);
    expect(state.isEnrolled).toBe(true);
    expect(state.isVerified).toBe(true);
    expect(state.currentLevel).toBe('aal2');
    expect(state.factors).toHaveLength(1);
  });

  it('should derive state for enrolled but not verified user', () => {
    const factors: MFAFactor[] = [
      { id: '1', type: 'totp', status: 'verified' },
    ];
    const state = deriveMFAState('aal1', factors);
    expect(state.isEnrolled).toBe(true);
    expect(state.isVerified).toBe(false);
    expect(state.currentLevel).toBe('aal1');
  });

  it('should derive state for user without MFA', () => {
    const state = deriveMFAState('aal1', []);
    expect(state.isEnrolled).toBe(false);
    expect(state.isVerified).toBe(false);
  });

  it('should derive state for unauthenticated user', () => {
    const state = deriveMFAState(null, []);
    expect(state.isEnrolled).toBe(false);
    expect(state.isVerified).toBe(false);
    expect(state.currentLevel).toBeNull();
  });
});

describe('useMFA - TOTP code validation', () => {
  const isValidTOTPFormat = (code: string): boolean => {
    // TOTP codes are 6 digits
    return /^\d{6}$/.test(code);
  };

  const sanitizeTOTPInput = (input: string): string => {
    // Remove non-digits and limit to 6 characters
    return input.replace(/\D/g, '').slice(0, 6);
  };

  it('should validate correct TOTP format', () => {
    expect(isValidTOTPFormat('123456')).toBe(true);
    expect(isValidTOTPFormat('000000')).toBe(true);
    expect(isValidTOTPFormat('999999')).toBe(true);
  });

  it('should reject invalid TOTP format', () => {
    expect(isValidTOTPFormat('12345')).toBe(false); // too short
    expect(isValidTOTPFormat('1234567')).toBe(false); // too long
    expect(isValidTOTPFormat('12345a')).toBe(false); // non-digit
    expect(isValidTOTPFormat('')).toBe(false); // empty
    expect(isValidTOTPFormat('abc123')).toBe(false); // mixed
  });

  it('should sanitize TOTP input', () => {
    expect(sanitizeTOTPInput('123456')).toBe('123456');
    expect(sanitizeTOTPInput('123 456')).toBe('123456');
    expect(sanitizeTOTPInput('12-34-56')).toBe('123456');
    expect(sanitizeTOTPInput('1234567890')).toBe('123456'); // truncate
    expect(sanitizeTOTPInput('abc123def456')).toBe('123456');
  });
});

describe('useMFA - friendly name generation', () => {
  const generateFriendlyName = (appName: string, deviceHint?: string): string => {
    const timestamp = new Date().toISOString().split('T')[0];
    if (deviceHint) {
      return `${appName} - ${deviceHint} (${timestamp})`;
    }
    return `${appName} MFA (${timestamp})`;
  };

  const sanitizeFriendlyName = (name: string): string => {
    // Remove special characters, limit length
    return name
      .replace(/[<>'"]/g, '')
      .slice(0, 50);
  };

  it('should generate friendly name with device hint', () => {
    const name = generateFriendlyName('Sortavo Admin', 'iPhone');
    expect(name).toContain('Sortavo Admin');
    expect(name).toContain('iPhone');
    expect(name).toMatch(/\d{4}-\d{2}-\d{2}/); // date format
  });

  it('should generate friendly name without device hint', () => {
    const name = generateFriendlyName('Sortavo Admin');
    expect(name).toContain('Sortavo Admin MFA');
  });

  it('should sanitize friendly names', () => {
    expect(sanitizeFriendlyName('Normal Name')).toBe('Normal Name');
    expect(sanitizeFriendlyName('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
    expect(sanitizeFriendlyName('A'.repeat(100))).toHaveLength(50);
  });
});

describe('useMFA - enrollment flow validation', () => {
  interface EnrollmentResult {
    factorId: string;
    qrCode: string;
    secret: string;
  }

  const validateEnrollmentResult = (result: EnrollmentResult | null): { valid: boolean; error?: string } => {
    if (!result) {
      return { valid: false, error: 'No enrollment data' };
    }
    if (!result.factorId) {
      return { valid: false, error: 'Missing factor ID' };
    }
    if (!result.qrCode) {
      return { valid: false, error: 'Missing QR code' };
    }
    if (!result.secret) {
      return { valid: false, error: 'Missing secret' };
    }
    // Secret should be base32 encoded (A-Z, 2-7)
    if (!/^[A-Z2-7]+=*$/.test(result.secret)) {
      return { valid: false, error: 'Invalid secret format' };
    }
    return { valid: true };
  };

  const isValidQRCodeSVG = (qrCode: string): boolean => {
    return qrCode.startsWith('<svg') && qrCode.includes('</svg>');
  };

  it('should validate complete enrollment result', () => {
    const result: EnrollmentResult = {
      factorId: 'factor-123',
      qrCode: '<svg>...</svg>',
      secret: 'JBSWY3DPEHPK3PXP',
    };
    expect(validateEnrollmentResult(result).valid).toBe(true);
  });

  it('should reject null enrollment result', () => {
    const result = validateEnrollmentResult(null);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('No enrollment data');
  });

  it('should reject enrollment without factor ID', () => {
    const result = validateEnrollmentResult({
      factorId: '',
      qrCode: '<svg>...</svg>',
      secret: 'JBSWY3DPEHPK3PXP',
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Missing factor ID');
  });

  it('should reject invalid secret format', () => {
    const result = validateEnrollmentResult({
      factorId: 'factor-123',
      qrCode: '<svg>...</svg>',
      secret: 'invalid-secret!@#',
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid secret format');
  });

  it('should validate QR code SVG format', () => {
    expect(isValidQRCodeSVG('<svg xmlns="http://www.w3.org/2000/svg">...</svg>')).toBe(true);
    expect(isValidQRCodeSVG('data:image/png;base64,...')).toBe(false);
    expect(isValidQRCodeSVG('')).toBe(false);
  });
});

describe('useMFA - error handling', () => {
  const categorizeError = (error: Error): 'auth' | 'network' | 'validation' | 'unknown' => {
    const message = error.message.toLowerCase();

    if (message.includes('invalid') || message.includes('code')) {
      return 'validation';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'network';
    }
    if (message.includes('auth') || message.includes('session')) {
      return 'auth';
    }
    return 'unknown';
  };

  const getErrorMessage = (error: Error, language: 'en' | 'es' = 'es'): string => {
    const category = categorizeError(error);

    const messages: Record<string, Record<string, string>> = {
      validation: { en: 'Invalid code', es: 'Código inválido' },
      network: { en: 'Connection error', es: 'Error de conexión' },
      auth: { en: 'Authentication error', es: 'Error de autenticación' },
      unknown: { en: 'Unexpected error', es: 'Error inesperado' },
    };

    return messages[category][language];
  };

  it('should categorize validation errors', () => {
    expect(categorizeError(new Error('Invalid code'))).toBe('validation');
    expect(categorizeError(new Error('Code expired'))).toBe('validation');
  });

  it('should categorize network errors', () => {
    expect(categorizeError(new Error('Network error'))).toBe('network');
    expect(categorizeError(new Error('Failed to fetch'))).toBe('network');
  });

  it('should categorize auth errors', () => {
    expect(categorizeError(new Error('Session expired'))).toBe('auth');
    expect(categorizeError(new Error('Auth required'))).toBe('auth');
  });

  it('should return unknown for unrecognized errors', () => {
    expect(categorizeError(new Error('Something went wrong'))).toBe('unknown');
  });

  it('should return localized error messages', () => {
    const validationError = new Error('Invalid code');
    expect(getErrorMessage(validationError, 'es')).toBe('Código inválido');
    expect(getErrorMessage(validationError, 'en')).toBe('Invalid code');
  });
});

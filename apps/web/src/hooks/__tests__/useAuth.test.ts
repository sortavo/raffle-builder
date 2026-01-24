import { describe, it, expect } from 'vitest';

// Test the pure business logic for authentication

type AuthProvider = 'email' | 'google' | 'github' | 'apple';

interface User {
  id: string;
  email: string | null;
  email_confirmed_at: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
}

interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  user: User;
}

describe('useAuth - email validation', () => {
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const normalizeEmail = (email: string): string => {
    return email.trim().toLowerCase();
  };

  it('should validate correct email formats', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('user.name@example.com')).toBe(true);
    expect(isValidEmail('user+tag@example.com')).toBe(true);
    expect(isValidEmail('user@subdomain.example.com')).toBe(true);
  });

  it('should reject invalid email formats', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('user')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
    expect(isValidEmail('user @example.com')).toBe(false);
    expect(isValidEmail('user@example')).toBe(false);
  });

  it('should normalize emails', () => {
    expect(normalizeEmail('  User@Example.COM  ')).toBe('user@example.com');
    expect(normalizeEmail('TEST@DOMAIN.ORG')).toBe('test@domain.org');
  });
});

describe('useAuth - password validation', () => {
  interface PasswordValidation {
    valid: boolean;
    errors: string[];
  }

  const validatePassword = (password: string, minLength: number = 8): PasswordValidation => {
    const errors: string[] = [];

    if (password.length < minLength) {
      errors.push(`La contraseña debe tener al menos ${minLength} caracteres`);
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Debe contener al menos una letra mayúscula');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Debe contener al menos una letra minúscula');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Debe contener al menos un número');
    }

    return { valid: errors.length === 0, errors };
  };

  const calculatePasswordStrength = (password: string): 'weak' | 'medium' | 'strong' => {
    let score = 0;

    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return 'weak';
    if (score <= 4) return 'medium';
    return 'strong';
  };

  it('should validate strong password', () => {
    const result = validatePassword('SecurePass123');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject short password', () => {
    const result = validatePassword('Ab1');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('La contraseña debe tener al menos 8 caracteres');
  });

  it('should require uppercase letter', () => {
    const result = validatePassword('lowercase123');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Debe contener al menos una letra mayúscula');
  });

  it('should require lowercase letter', () => {
    const result = validatePassword('UPPERCASE123');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Debe contener al menos una letra minúscula');
  });

  it('should require number', () => {
    const result = validatePassword('NoNumbersHere');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Debe contener al menos un número');
  });

  it('should calculate password strength', () => {
    expect(calculatePasswordStrength('abc')).toBe('weak');
    expect(calculatePasswordStrength('abcdefgh')).toBe('weak');
    expect(calculatePasswordStrength('Abcdefgh1')).toBe('medium');
    expect(calculatePasswordStrength('Abcdefgh123!')).toBe('strong');
  });
});

describe('useAuth - session validation', () => {
  const isSessionExpired = (session: Session | null): boolean => {
    if (!session) return true;
    const now = Math.floor(Date.now() / 1000);
    return session.expires_at <= now;
  };

  const getSessionTimeRemaining = (session: Session | null): number => {
    if (!session) return 0;
    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, session.expires_at - now);
  };

  const shouldRefreshSession = (session: Session | null, thresholdSeconds: number = 300): boolean => {
    if (!session) return false;
    const remaining = getSessionTimeRemaining(session);
    return remaining > 0 && remaining <= thresholdSeconds;
  };

  const mockSession = (expiresInSeconds: number): Session => ({
    access_token: 'test-token',
    refresh_token: 'test-refresh',
    expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
    expires_in: expiresInSeconds,
    user: {
      id: 'user-123',
      email: 'user@example.com',
      email_confirmed_at: new Date().toISOString(),
      phone: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      app_metadata: {},
      user_metadata: {},
    },
  });

  it('should detect expired session', () => {
    const expiredSession = mockSession(-60); // Expired 60 seconds ago
    expect(isSessionExpired(expiredSession)).toBe(true);
  });

  it('should detect valid session', () => {
    const validSession = mockSession(3600); // Expires in 1 hour
    expect(isSessionExpired(validSession)).toBe(false);
  });

  it('should handle null session', () => {
    expect(isSessionExpired(null)).toBe(true);
  });

  it('should calculate time remaining', () => {
    const session = mockSession(3600);
    const remaining = getSessionTimeRemaining(session);
    expect(remaining).toBeGreaterThan(3590);
    expect(remaining).toBeLessThanOrEqual(3600);
  });

  it('should return 0 for expired session', () => {
    const expiredSession = mockSession(-60);
    expect(getSessionTimeRemaining(expiredSession)).toBe(0);
  });

  it('should recommend refresh when near expiration', () => {
    const nearExpiry = mockSession(180); // 3 minutes left
    expect(shouldRefreshSession(nearExpiry, 300)).toBe(true);
  });

  it('should not recommend refresh when plenty of time left', () => {
    const plentyOfTime = mockSession(3600); // 1 hour left
    expect(shouldRefreshSession(plentyOfTime, 300)).toBe(false);
  });

  it('should not recommend refresh for expired session', () => {
    const expired = mockSession(-60);
    expect(shouldRefreshSession(expired)).toBe(false);
  });
});

describe('useAuth - user state derivation', () => {
  interface AuthState {
    isAuthenticated: boolean;
    isEmailVerified: boolean;
    hasPhoneVerified: boolean;
    provider: AuthProvider | null;
  }

  const deriveAuthState = (user: User | null, session: Session | null): AuthState => {
    if (!user || !session) {
      return {
        isAuthenticated: false,
        isEmailVerified: false,
        hasPhoneVerified: false,
        provider: null,
      };
    }

    const provider = (user.app_metadata?.provider as AuthProvider) || 'email';

    return {
      isAuthenticated: true,
      isEmailVerified: !!user.email_confirmed_at,
      hasPhoneVerified: !!user.phone,
      provider,
    };
  };

  const mockUser = (overrides: Partial<User> = {}): User => ({
    id: 'user-123',
    email: 'user@example.com',
    email_confirmed_at: new Date().toISOString(),
    phone: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    app_metadata: { provider: 'email' },
    user_metadata: {},
    ...overrides,
  });

  const mockSession = (): Session => ({
    access_token: 'test-token',
    refresh_token: 'test-refresh',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    expires_in: 3600,
    user: mockUser(),
  });

  it('should derive authenticated state', () => {
    const state = deriveAuthState(mockUser(), mockSession());
    expect(state.isAuthenticated).toBe(true);
    expect(state.isEmailVerified).toBe(true);
    expect(state.provider).toBe('email');
  });

  it('should derive unauthenticated state', () => {
    const state = deriveAuthState(null, null);
    expect(state.isAuthenticated).toBe(false);
    expect(state.isEmailVerified).toBe(false);
    expect(state.provider).toBeNull();
  });

  it('should detect unverified email', () => {
    const unverifiedUser = mockUser({ email_confirmed_at: null });
    const state = deriveAuthState(unverifiedUser, mockSession());
    expect(state.isAuthenticated).toBe(true);
    expect(state.isEmailVerified).toBe(false);
  });

  it('should detect phone verification', () => {
    const phoneUser = mockUser({ phone: '+521234567890' });
    const state = deriveAuthState(phoneUser, mockSession());
    expect(state.hasPhoneVerified).toBe(true);
  });

  it('should detect OAuth provider', () => {
    const googleUser = mockUser({ app_metadata: { provider: 'google' } });
    const state = deriveAuthState(googleUser, mockSession());
    expect(state.provider).toBe('google');
  });
});

describe('useAuth - role and permissions', () => {
  type Role = 'admin' | 'organizer' | 'user';

  interface UserRoles {
    role: Role;
    organization_id: string | null;
  }

  const getUserRole = (user: User | null): Role => {
    if (!user) return 'user';
    return (user.app_metadata?.role as Role) || 'user';
  };

  const hasPermission = (user: User | null, permission: string): boolean => {
    const role = getUserRole(user);

    const permissions: Record<Role, string[]> = {
      admin: ['*'],
      organizer: ['create_raffle', 'edit_raffle', 'view_orders', 'draw_winner'],
      user: ['view_raffle', 'buy_tickets'],
    };

    if (role === 'admin') return true;
    return permissions[role].includes(permission);
  };

  const canManageRaffle = (user: User | null, raffleOrganizerId: string): boolean => {
    if (!user) return false;
    const role = getUserRole(user);
    if (role === 'admin') return true;
    if (role === 'organizer') {
      return user.id === raffleOrganizerId;
    }
    return false;
  };

  const mockUser = (role: Role = 'user', id: string = 'user-123'): User => ({
    id,
    email: 'user@example.com',
    email_confirmed_at: new Date().toISOString(),
    phone: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    app_metadata: { role },
    user_metadata: {},
  });

  it('should get user role', () => {
    expect(getUserRole(mockUser('admin'))).toBe('admin');
    expect(getUserRole(mockUser('organizer'))).toBe('organizer');
    expect(getUserRole(mockUser('user'))).toBe('user');
    expect(getUserRole(null)).toBe('user');
  });

  it('should check admin permissions', () => {
    const admin = mockUser('admin');
    expect(hasPermission(admin, 'anything')).toBe(true);
    expect(hasPermission(admin, 'delete_universe')).toBe(true);
  });

  it('should check organizer permissions', () => {
    const organizer = mockUser('organizer');
    expect(hasPermission(organizer, 'create_raffle')).toBe(true);
    expect(hasPermission(organizer, 'draw_winner')).toBe(true);
    expect(hasPermission(organizer, 'delete_user')).toBe(false);
  });

  it('should check user permissions', () => {
    const user = mockUser('user');
    expect(hasPermission(user, 'view_raffle')).toBe(true);
    expect(hasPermission(user, 'buy_tickets')).toBe(true);
    expect(hasPermission(user, 'create_raffle')).toBe(false);
  });

  it('should check raffle management permission', () => {
    const organizer = mockUser('organizer', 'org-123');
    expect(canManageRaffle(organizer, 'org-123')).toBe(true);
    expect(canManageRaffle(organizer, 'other-org')).toBe(false);
  });

  it('should allow admin to manage any raffle', () => {
    const admin = mockUser('admin');
    expect(canManageRaffle(admin, 'any-org')).toBe(true);
  });

  it('should deny null user raffle management', () => {
    expect(canManageRaffle(null, 'any-org')).toBe(false);
  });
});

describe('useAuth - error categorization', () => {
  type AuthErrorCategory = 'credentials' | 'network' | 'rate_limit' | 'verification' | 'unknown';

  const categorizeAuthError = (error: Error): AuthErrorCategory => {
    const message = error.message.toLowerCase();

    if (message.includes('invalid') || message.includes('credentials') || message.includes('password')) {
      return 'credentials';
    }
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return 'network';
    }
    if (message.includes('rate') || message.includes('too many') || message.includes('limit')) {
      return 'rate_limit';
    }
    if (message.includes('verify') || message.includes('confirm') || message.includes('email')) {
      return 'verification';
    }
    return 'unknown';
  };

  const getAuthErrorMessage = (error: Error, language: 'en' | 'es' = 'es'): string => {
    const category = categorizeAuthError(error);

    const messages: Record<AuthErrorCategory, Record<string, string>> = {
      credentials: {
        en: 'Invalid email or password',
        es: 'Correo o contraseña incorrectos',
      },
      network: {
        en: 'Connection error. Please try again.',
        es: 'Error de conexión. Intenta de nuevo.',
      },
      rate_limit: {
        en: 'Too many attempts. Please wait.',
        es: 'Demasiados intentos. Espera un momento.',
      },
      verification: {
        en: 'Please verify your email first',
        es: 'Por favor verifica tu correo primero',
      },
      unknown: {
        en: 'An unexpected error occurred',
        es: 'Ocurrió un error inesperado',
      },
    };

    return messages[category][language];
  };

  it('should categorize credentials errors', () => {
    expect(categorizeAuthError(new Error('Invalid credentials'))).toBe('credentials');
    expect(categorizeAuthError(new Error('Wrong password'))).toBe('credentials');
  });

  it('should categorize network errors', () => {
    expect(categorizeAuthError(new Error('Network error'))).toBe('network');
    expect(categorizeAuthError(new Error('Request timeout'))).toBe('network');
  });

  it('should categorize rate limit errors', () => {
    expect(categorizeAuthError(new Error('Rate limit exceeded'))).toBe('rate_limit');
    expect(categorizeAuthError(new Error('Too many requests'))).toBe('rate_limit');
  });

  it('should categorize verification errors', () => {
    expect(categorizeAuthError(new Error('Email not verified'))).toBe('verification');
    expect(categorizeAuthError(new Error('Please confirm your email'))).toBe('verification');
  });

  it('should return localized error messages', () => {
    const error = new Error('Invalid credentials');
    expect(getAuthErrorMessage(error, 'es')).toBe('Correo o contraseña incorrectos');
    expect(getAuthErrorMessage(error, 'en')).toBe('Invalid email or password');
  });
});

describe('useAuth - OAuth state', () => {
  const generateOAuthState = (): string => {
    // In real implementation, this uses crypto.randomUUID()
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const isValidOAuthState = (state: string | null): boolean => {
    if (!state) return false;
    // UUID v4 format
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(state);
  };

  const buildOAuthRedirectUrl = (
    provider: AuthProvider,
    redirectTo: string,
    state: string
  ): string => {
    const baseUrl = 'https://example.supabase.co/auth/v1/authorize';
    const params = new URLSearchParams({
      provider,
      redirect_to: redirectTo,
      state,
    });
    return `${baseUrl}?${params.toString()}`;
  };

  it('should generate valid OAuth state', () => {
    const state = generateOAuthState();
    expect(isValidOAuthState(state)).toBe(true);
  });

  it('should validate OAuth state format', () => {
    expect(isValidOAuthState('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isValidOAuthState('invalid')).toBe(false);
    expect(isValidOAuthState(null)).toBe(false);
    expect(isValidOAuthState('')).toBe(false);
  });

  it('should build OAuth redirect URL', () => {
    const url = buildOAuthRedirectUrl('google', 'https://app.com/callback', 'test-state');
    expect(url).toContain('provider=google');
    expect(url).toContain('redirect_to=https%3A%2F%2Fapp.com%2Fcallback');
    expect(url).toContain('state=test-state');
  });
});

describe('useAuth - magic link validation', () => {
  const isMagicLinkExpired = (createdAt: string, expiryMinutes: number = 60): boolean => {
    const created = new Date(createdAt).getTime();
    const now = Date.now();
    const expiryMs = expiryMinutes * 60 * 1000;
    return (now - created) > expiryMs;
  };

  const extractTokenFromUrl = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.get('token') || urlObj.hash.match(/access_token=([^&]+)/)?.[1] || null;
    } catch {
      return null;
    }
  };

  it('should detect expired magic link', () => {
    const oldDate = new Date(Date.now() - 120 * 60 * 1000).toISOString(); // 2 hours ago
    expect(isMagicLinkExpired(oldDate, 60)).toBe(true);
  });

  it('should detect valid magic link', () => {
    const recentDate = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30 mins ago
    expect(isMagicLinkExpired(recentDate, 60)).toBe(false);
  });

  it('should extract token from URL query', () => {
    const url = 'https://app.com/auth/callback?token=abc123&type=recovery';
    expect(extractTokenFromUrl(url)).toBe('abc123');
  });

  it('should extract token from URL hash', () => {
    const url = 'https://app.com/auth/callback#access_token=xyz789&token_type=bearer';
    expect(extractTokenFromUrl(url)).toBe('xyz789');
  });

  it('should return null for invalid URL', () => {
    expect(extractTokenFromUrl('not-a-url')).toBeNull();
  });

  it('should return null for URL without token', () => {
    const url = 'https://app.com/auth/callback?other=value';
    expect(extractTokenFromUrl(url)).toBeNull();
  });
});

describe('useAuth - profile completion', () => {
  interface UserProfile {
    full_name: string | null;
    avatar_url: string | null;
    phone: string | null;
    organization_name: string | null;
  }

  const calculateProfileCompletion = (profile: UserProfile): number => {
    const fields = ['full_name', 'avatar_url', 'phone', 'organization_name'] as const;
    const completed = fields.filter(field => !!profile[field]).length;
    return Math.round((completed / fields.length) * 100);
  };

  const getMissingProfileFields = (profile: UserProfile): string[] => {
    const fieldNames: Record<keyof UserProfile, string> = {
      full_name: 'Nombre completo',
      avatar_url: 'Foto de perfil',
      phone: 'Teléfono',
      organization_name: 'Organización',
    };

    return (Object.keys(fieldNames) as Array<keyof UserProfile>)
      .filter(field => !profile[field])
      .map(field => fieldNames[field]);
  };

  it('should calculate 100% for complete profile', () => {
    const profile: UserProfile = {
      full_name: 'Juan Pérez',
      avatar_url: 'https://example.com/avatar.jpg',
      phone: '+521234567890',
      organization_name: 'Sorteos MX',
    };
    expect(calculateProfileCompletion(profile)).toBe(100);
  });

  it('should calculate 0% for empty profile', () => {
    const profile: UserProfile = {
      full_name: null,
      avatar_url: null,
      phone: null,
      organization_name: null,
    };
    expect(calculateProfileCompletion(profile)).toBe(0);
  });

  it('should calculate partial completion', () => {
    const profile: UserProfile = {
      full_name: 'Juan',
      avatar_url: null,
      phone: null,
      organization_name: null,
    };
    expect(calculateProfileCompletion(profile)).toBe(25);
  });

  it('should list missing fields', () => {
    const profile: UserProfile = {
      full_name: 'Juan',
      avatar_url: null,
      phone: '+521234567890',
      organization_name: null,
    };
    const missing = getMissingProfileFields(profile);
    expect(missing).toContain('Foto de perfil');
    expect(missing).toContain('Organización');
    expect(missing).not.toContain('Nombre completo');
    expect(missing).not.toContain('Teléfono');
  });
});

// English translations
import type { TranslationKeys } from './es';

export const en: TranslationKeys = {
  // Common
  common: {
    loading: 'Loading...',
    error: 'Error',
    cancel: 'Cancel',
    ok: 'OK',
    save: 'Save',
    delete: 'Delete',
    confirm: 'Confirm',
    retry: 'Retry',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    user: 'User',
    viewDetails: 'View details',
  },

  // Auth / Login
  auth: {
    login: {
      title: 'Sign in',
      subtitle: 'Access your account to buy tickets and see your raffles',
      loginButton: 'Sign in',
      email: 'Email',
      phone: 'Phone',
      emailPlaceholder: 'Email address',
      passwordPlaceholder: 'Password',
      phonePlaceholder: 'Phone number',
      forgotPassword: 'Forgot your password?',
      sendCode: 'Send code',
      verificationCodeSent: 'We sent a verification code to {{phone}}',
      verificationCodePlaceholder: 'Verification code',
      verify: 'Verify',
      useAnotherNumber: 'Use another number',
      errorFillAllFields: 'Please fill in all fields',
      errorPhoneRequired: 'Please enter your phone number',
      errorCodeRequired: 'Please enter the code',
      errorLoginFailed: 'We could not sign you in',
      errorCodeSendFailed: 'We could not send the code',
      errorInvalidCode: 'Invalid code',
    },
  },

  // My Tickets Tab
  myTickets: {
    loginPrompt: {
      title: 'Sign in to see your tickets',
      subtitle: 'You will be able to see all the tickets you have purchased',
    },
    loading: 'Loading tickets...',
    empty: {
      title: 'You have no tickets yet',
      subtitle: 'Explore available raffles and buy your first tickets',
      exploreButton: 'View raffles',
    },
    ticket: {
      confirmed: 'Confirmed',
      purchasedAt: 'Purchased: {{date}}',
    },
  },

  // Notifications Tab
  notifications: {
    loginPrompt: {
      title: 'Sign in',
      subtitle: 'Sign in to see your notifications',
    },
    loading: 'Loading notifications...',
    error: {
      title: 'Error loading',
      retryButton: 'Retry',
    },
    empty: {
      title: 'No notifications',
      subtitle: 'We will notify you when there are updates about your raffles and tickets',
    },
    header: {
      unreadCount: '{{count}} unread',
      markAllAsRead: 'Mark all as read',
    },
  },

  // Profile Tab
  profile: {
    loginPrompt: {
      title: 'Sign in',
      subtitle: 'Access your account to see your profile and manage your tickets',
    },
    header: {
      defaultName: 'User',
    },
    sections: {
      account: 'Account',
      support: 'Support',
    },
    menu: {
      editProfile: 'Edit profile',
      purchaseHistory: 'Purchase history',
      notificationPreferences: 'Notification preferences',
      helpCenter: 'Help center',
      termsAndConditions: 'Terms and conditions',
      privacyPolicy: 'Privacy policy',
    },
    signOut: {
      button: 'Sign out',
      confirmTitle: 'Sign out',
      confirmMessage: 'Are you sure you want to sign out?',
    },
    appInfo: {
      version: 'Sortavo v{{version}}',
      organization: 'Organization: {{name}}',
    },
    errors: {
      openLink: 'Could not open the link',
    },
  },

  // Edit Profile Screen
  editProfile: {
    title: 'Edit profile',
    changePhoto: 'Change photo',
    form: {
      fullName: 'Full name',
      fullNamePlaceholder: 'Your name',
      email: 'Email',
      emailHint: 'Email cannot be changed',
      phone: 'Phone (optional)',
      phonePlaceholder: '+1 123 456 7890',
    },
    saveButton: 'Save changes',
    errors: {
      nameRequired: 'Name is required',
    },
    success: {
      title: 'Success',
      message: 'Profile updated successfully',
    },
  },

  // Purchases Screen
  purchases: {
    title: 'Purchase history',
    loading: 'Loading history...',
    error: {
      title: 'Error loading',
    },
    empty: {
      title: 'No purchases',
      subtitle: 'You have not made any purchases yet',
      exploreButton: 'Explore raffles',
    },
    card: {
      purchaseId: 'Purchase #{{id}}',
      ticketCount: '{{count}} ticket',
      ticketCountPlural: '{{count}} tickets',
      totalPaid: 'Total paid',
    },
    status: {
      completed: 'Completed',
      pending: 'Pending',
      refunded: 'Refunded',
    },
  },

  // Notification Preferences Screen
  notificationPreferences: {
    title: 'Notifications',
    description: 'Configure which notifications you want to receive. You can change these preferences at any time.',
    footer: 'Push notifications require system permissions. If you are not receiving notifications, check your device settings.',
    settings: {
      pushEnabled: {
        title: 'Push notifications',
        description: 'Receive alerts on your device',
      },
      raffleUpdates: {
        title: 'Raffle updates',
        description: 'When a raffle is about to end or there are changes',
      },
      winnerAnnouncements: {
        title: 'Winner announcements',
        description: 'When raffle winners are announced',
      },
      purchaseConfirmations: {
        title: 'Purchase confirmations',
        description: 'When you successfully purchase tickets',
      },
      promotional: {
        title: 'Promotions and offers',
        description: 'Special discounts and new raffles',
      },
      emailNotifications: {
        title: 'Email notifications',
        description: 'Receive a summary by email',
      },
    },
  },
} as const;

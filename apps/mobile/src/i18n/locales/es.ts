// Spanish translations
export const es = {
  // Common
  common: {
    loading: 'Cargando...',
    error: 'Error',
    cancel: 'Cancelar',
    ok: 'OK',
    save: 'Guardar',
    delete: 'Eliminar',
    confirm: 'Confirmar',
    retry: 'Reintentar',
    close: 'Cerrar',
    back: 'Volver',
    next: 'Siguiente',
    user: 'Usuario',
    viewDetails: 'Ver detalles',
  },

  // Auth / Login
  auth: {
    login: {
      title: 'Inicia sesion',
      subtitle: 'Accede a tu cuenta para comprar boletos y ver tus rifas',
      loginButton: 'Iniciar sesion',
      email: 'Email',
      phone: 'Telefono',
      emailPlaceholder: 'Correo electronico',
      passwordPlaceholder: 'Contrasena',
      phonePlaceholder: 'Numero de telefono',
      forgotPassword: 'Olvidaste tu contrasena?',
      sendCode: 'Enviar codigo',
      verificationCodeSent: 'Enviamos un codigo de verificacion a {{phone}}',
      verificationCodePlaceholder: 'Codigo de verificacion',
      verify: 'Verificar',
      useAnotherNumber: 'Usar otro numero',
      errorFillAllFields: 'Por favor completa todos los campos',
      errorPhoneRequired: 'Por favor ingresa tu numero de telefono',
      errorCodeRequired: 'Por favor ingresa el codigo',
      errorLoginFailed: 'No pudimos iniciar sesion',
      errorCodeSendFailed: 'No pudimos enviar el codigo',
      errorInvalidCode: 'Codigo invalido',
    },
  },

  // My Tickets Tab
  myTickets: {
    loginPrompt: {
      title: 'Inicia sesion para ver tus boletos',
      subtitle: 'Podras ver todos los boletos que has comprado',
    },
    loading: 'Cargando boletos...',
    empty: {
      title: 'No tienes boletos aun',
      subtitle: 'Explora las rifas disponibles y compra tus primeros boletos',
      exploreButton: 'Ver rifas',
    },
    ticket: {
      confirmed: 'Confirmado',
      purchasedAt: 'Comprado: {{date}}',
    },
  },

  // Notifications Tab
  notifications: {
    loginPrompt: {
      title: 'Inicia sesion',
      subtitle: 'Inicia sesion para ver tus notificaciones',
    },
    loading: 'Cargando notificaciones...',
    error: {
      title: 'Error al cargar',
      retryButton: 'Reintentar',
    },
    empty: {
      title: 'Sin notificaciones',
      subtitle: 'Te avisaremos cuando haya actualizaciones sobre tus rifas y boletos',
    },
    header: {
      unreadCount: '{{count}} sin leer',
      markAllAsRead: 'Marcar todas como leidas',
    },
  },

  // Profile Tab
  profile: {
    loginPrompt: {
      title: 'Inicia sesion',
      subtitle: 'Accede a tu cuenta para ver tu perfil y gestionar tus boletos',
    },
    header: {
      defaultName: 'Usuario',
    },
    sections: {
      account: 'Cuenta',
      support: 'Soporte',
    },
    menu: {
      editProfile: 'Editar perfil',
      purchaseHistory: 'Historial de compras',
      notificationPreferences: 'Preferencias de notificacion',
      helpCenter: 'Centro de ayuda',
      termsAndConditions: 'Terminos y condiciones',
      privacyPolicy: 'Politica de privacidad',
    },
    signOut: {
      button: 'Cerrar sesion',
      confirmTitle: 'Cerrar sesion',
      confirmMessage: 'Estas seguro que deseas cerrar sesion?',
    },
    appInfo: {
      version: 'Sortavo v{{version}}',
      organization: 'Organizacion: {{name}}',
    },
    errors: {
      openLink: 'No se pudo abrir el enlace',
    },
  },

  // Edit Profile Screen
  editProfile: {
    title: 'Editar perfil',
    changePhoto: 'Cambiar foto',
    form: {
      fullName: 'Nombre completo',
      fullNamePlaceholder: 'Tu nombre',
      email: 'Correo electronico',
      emailHint: 'El correo no se puede cambiar',
      phone: 'Telefono (opcional)',
      phonePlaceholder: '+52 123 456 7890',
    },
    saveButton: 'Guardar cambios',
    errors: {
      nameRequired: 'El nombre es requerido',
    },
    success: {
      title: 'Exito',
      message: 'Perfil actualizado correctamente',
    },
  },

  // Purchases Screen
  purchases: {
    title: 'Historial de compras',
    loading: 'Cargando historial...',
    error: {
      title: 'Error al cargar',
    },
    empty: {
      title: 'Sin compras',
      subtitle: 'Aun no has realizado ninguna compra',
      exploreButton: 'Explorar rifas',
    },
    card: {
      purchaseId: 'Compra #{{id}}',
      ticketCount: '{{count}} boleto',
      ticketCountPlural: '{{count}} boletos',
      totalPaid: 'Total pagado',
    },
    status: {
      completed: 'Completada',
      pending: 'Pendiente',
      refunded: 'Reembolsada',
    },
  },

  // Notification Preferences Screen
  notificationPreferences: {
    title: 'Notificaciones',
    description: 'Configura que notificaciones quieres recibir. Puedes cambiar estas preferencias en cualquier momento.',
    footer: 'Las notificaciones push requieren permisos del sistema. Si no recibes notificaciones, verifica la configuracion de tu dispositivo.',
    settings: {
      pushEnabled: {
        title: 'Notificaciones push',
        description: 'Recibe alertas en tu dispositivo',
      },
      raffleUpdates: {
        title: 'Actualizaciones de rifas',
        description: 'Cuando una rifa esta por terminar o hay cambios',
      },
      winnerAnnouncements: {
        title: 'Anuncios de ganadores',
        description: 'Cuando se anuncian los ganadores de una rifa',
      },
      purchaseConfirmations: {
        title: 'Confirmaciones de compra',
        description: 'Cuando compras boletos exitosamente',
      },
      promotional: {
        title: 'Promociones y ofertas',
        description: 'Descuentos especiales y nuevas rifas',
      },
      emailNotifications: {
        title: 'Notificaciones por email',
        description: 'Recibe un resumen por correo electronico',
      },
    },
  },
};

// Define the translation structure type (allows any string values)
export interface TranslationKeys {
  common: {
    loading: string;
    error: string;
    cancel: string;
    ok: string;
    save: string;
    delete: string;
    confirm: string;
    retry: string;
    close: string;
    back: string;
    next: string;
    user: string;
    viewDetails: string;
  };
  auth: {
    login: {
      title: string;
      subtitle: string;
      loginButton: string;
      email: string;
      phone: string;
      emailPlaceholder: string;
      passwordPlaceholder: string;
      phonePlaceholder: string;
      forgotPassword: string;
      sendCode: string;
      verificationCodeSent: string;
      verificationCodePlaceholder: string;
      verify: string;
      useAnotherNumber: string;
      errorFillAllFields: string;
      errorPhoneRequired: string;
      errorCodeRequired: string;
      errorLoginFailed: string;
      errorCodeSendFailed: string;
      errorInvalidCode: string;
    };
  };
  myTickets: {
    loginPrompt: {
      title: string;
      subtitle: string;
    };
    loading: string;
    empty: {
      title: string;
      subtitle: string;
      exploreButton: string;
    };
    ticket: {
      confirmed: string;
      purchasedAt: string;
    };
  };
  notifications: {
    loginPrompt: {
      title: string;
      subtitle: string;
    };
    loading: string;
    error: {
      title: string;
      retryButton: string;
    };
    empty: {
      title: string;
      subtitle: string;
    };
    header: {
      unreadCount: string;
      markAllAsRead: string;
    };
  };
  profile: {
    loginPrompt: {
      title: string;
      subtitle: string;
    };
    header: {
      defaultName: string;
    };
    sections: {
      account: string;
      support: string;
    };
    menu: {
      editProfile: string;
      purchaseHistory: string;
      notificationPreferences: string;
      helpCenter: string;
      termsAndConditions: string;
      privacyPolicy: string;
    };
    signOut: {
      button: string;
      confirmTitle: string;
      confirmMessage: string;
    };
    appInfo: {
      version: string;
      organization: string;
    };
    errors: {
      openLink: string;
    };
  };
  editProfile: {
    title: string;
    changePhoto: string;
    form: {
      fullName: string;
      fullNamePlaceholder: string;
      email: string;
      emailHint: string;
      phone: string;
      phonePlaceholder: string;
    };
    saveButton: string;
    errors: {
      nameRequired: string;
    };
    success: {
      title: string;
      message: string;
    };
  };
  purchases: {
    title: string;
    loading: string;
    error: {
      title: string;
    };
    empty: {
      title: string;
      subtitle: string;
      exploreButton: string;
    };
    card: {
      purchaseId: string;
      ticketCount: string;
      ticketCountPlural: string;
      totalPaid: string;
    };
    status: {
      completed: string;
      pending: string;
      refunded: string;
    };
  };
  notificationPreferences: {
    title: string;
    description: string;
    footer: string;
    settings: {
      pushEnabled: {
        title: string;
        description: string;
      };
      raffleUpdates: {
        title: string;
        description: string;
      };
      winnerAnnouncements: {
        title: string;
        description: string;
      };
      purchaseConfirmations: {
        title: string;
        description: string;
      };
      promotional: {
        title: string;
        description: string;
      };
      emailNotifications: {
        title: string;
        description: string;
      };
    };
  };
}

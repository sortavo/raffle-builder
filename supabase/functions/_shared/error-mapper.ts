/**
 * E3, E5: Error Mapper for User-Friendly Messages
 * Maps technical error codes to Spanish user messages
 */

// Stripe error code to Spanish message mapping
const STRIPE_ERROR_MESSAGES: Record<string, string> = {
  // Card errors
  card_declined: "Tu tarjeta fue rechazada. Por favor intenta con otra tarjeta.",
  card_declined_generic: "Tu tarjeta fue rechazada. Contacta a tu banco para más información.",
  expired_card: "Tu tarjeta ha expirado. Por favor usa una tarjeta vigente.",
  incorrect_cvc: "El código de seguridad (CVC) es incorrecto. Verifica e intenta de nuevo.",
  incorrect_number: "El número de tarjeta es incorrecto. Verifica e intenta de nuevo.",
  invalid_card_type: "Este tipo de tarjeta no es aceptado. Intenta con Visa, Mastercard o Amex.",
  invalid_expiry_month: "El mes de expiración es inválido.",
  invalid_expiry_year: "El año de expiración es inválido.",
  processing_error: "Error al procesar el pago. Por favor intenta de nuevo en unos minutos.",
  insufficient_funds: "Fondos insuficientes. Verifica tu saldo e intenta de nuevo.",

  // Authentication errors
  authentication_required: "Se requiere verificación adicional. Completa la autenticación 3D Secure.",
  card_not_supported: "Esta tarjeta no soporta este tipo de transacción.",

  // Rate limit
  rate_limit: "Demasiadas solicitudes. Por favor espera un momento e intenta de nuevo.",

  // Customer errors
  customer_not_found: "No se encontró tu cuenta. Por favor contacta soporte.",
  resource_missing: "No se encontró la información solicitada. Contacta soporte.",

  // Subscription errors
  subscription_payment_intent_requires_action: "Tu pago requiere verificación adicional.",
  subscription_update_failed: "No se pudo actualizar la suscripción. Intenta de nuevo.",

  // Generic
  invalid_request_error: "Solicitud inválida. Verifica los datos e intenta de nuevo.",
  api_connection_error: "Error de conexión. Verifica tu internet e intenta de nuevo.",
  api_error: "Error del servidor. Por favor intenta más tarde.",
};

// Decline codes (more specific than card_declined)
const DECLINE_CODE_MESSAGES: Record<string, string> = {
  generic_decline: "Tu tarjeta fue rechazada. Contacta a tu banco.",
  insufficient_funds: "Fondos insuficientes en tu tarjeta.",
  lost_card: "Esta tarjeta fue reportada como perdida.",
  stolen_card: "Esta tarjeta fue reportada como robada.",
  expired_card: "Tu tarjeta ha expirado.",
  incorrect_cvc: "El código de seguridad es incorrecto.",
  processing_error: "Error al procesar. Intenta de nuevo.",
  incorrect_number: "Número de tarjeta incorrecto.",
  card_velocity_exceeded: "Has excedido el límite de transacciones de tu tarjeta.",
  do_not_honor: "Tu banco rechazó la transacción. Contacta a tu banco.",
  try_again_later: "Error temporal. Intenta de nuevo en unos minutos.",
  not_permitted: "Este tipo de transacción no está permitida para tu tarjeta.",
  fraudulent: "Esta transacción fue marcada como sospechosa.",
  card_not_supported: "Tu tarjeta no soporta este tipo de transacción.",
  currency_not_supported: "Tu tarjeta no soporta esta moneda.",
  duplicate_transaction: "Esta transacción ya fue procesada.",
  withdrawal_count_limit_exceeded: "Has excedido el límite de retiros.",
};

export interface StripeErrorInfo {
  code?: string;
  decline_code?: string;
  type?: string;
  message?: string;
}

/**
 * Map a Stripe error to a user-friendly Spanish message
 */
export function mapStripeError(error: StripeErrorInfo | Error | unknown): string {
  // Handle Error objects
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Check for known patterns in error message
    if (message.includes('card_declined') || message.includes('card was declined')) {
      return STRIPE_ERROR_MESSAGES.card_declined;
    }
    if (message.includes('expired')) {
      return STRIPE_ERROR_MESSAGES.expired_card;
    }
    if (message.includes('authentication') || message.includes('3d secure')) {
      return STRIPE_ERROR_MESSAGES.authentication_required;
    }
    if (message.includes('rate limit') || message.includes('too many')) {
      return STRIPE_ERROR_MESSAGES.rate_limit;
    }

    // Return a safe generic message
    return "Error al procesar tu solicitud. Por favor intenta de nuevo.";
  }

  // Handle Stripe error objects
  const stripeError = error as StripeErrorInfo;

  // First check decline_code (most specific)
  if (stripeError.decline_code && DECLINE_CODE_MESSAGES[stripeError.decline_code]) {
    return DECLINE_CODE_MESSAGES[stripeError.decline_code];
  }

  // Then check error code
  if (stripeError.code && STRIPE_ERROR_MESSAGES[stripeError.code]) {
    return STRIPE_ERROR_MESSAGES[stripeError.code];
  }

  // Then check error type
  if (stripeError.type) {
    switch (stripeError.type) {
      case 'card_error':
        return STRIPE_ERROR_MESSAGES.card_declined_generic;
      case 'rate_limit_error':
        return STRIPE_ERROR_MESSAGES.rate_limit;
      case 'invalid_request_error':
        return STRIPE_ERROR_MESSAGES.invalid_request_error;
      case 'authentication_error':
        return "Error de autenticación. Por favor inicia sesión de nuevo.";
      case 'api_connection_error':
        return STRIPE_ERROR_MESSAGES.api_connection_error;
      case 'api_error':
        return STRIPE_ERROR_MESSAGES.api_error;
    }
  }

  // Default safe message
  return "Error al procesar tu solicitud. Por favor intenta de nuevo.";
}

/**
 * Check if an error is a Stripe rate limit error
 */
export function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.toLowerCase().includes('rate limit');
  }
  const stripeError = error as StripeErrorInfo;
  return stripeError.type === 'rate_limit_error' || stripeError.code === 'rate_limit';
}

/**
 * Check if an error requires user authentication (3D Secure)
 */
export function requiresAuthentication(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('authentication') || msg.includes('3d secure') || msg.includes('action_required');
  }
  const stripeError = error as StripeErrorInfo;
  return stripeError.code === 'authentication_required' ||
         stripeError.code === 'subscription_payment_intent_requires_action';
}

/**
 * Sanitize error for logging (remove sensitive data)
 */
export function sanitizeErrorForLog(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      // Don't include stack in production logs
    };
  }

  const stripeError = error as StripeErrorInfo;
  return {
    type: stripeError.type,
    code: stripeError.code,
    decline_code: stripeError.decline_code,
    // Don't include raw message which might have PII
  };
}

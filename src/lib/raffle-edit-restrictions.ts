/**
 * Raffle field editing restrictions for post-publication
 * 
 * Defines which fields can be edited after a raffle is published,
 * ensuring data integrity and buyer trust.
 */

export type RestrictionType = 
  | 'locked'           // Cannot be changed at all
  | 'increment_only'   // Only increase allowed
  | 'postpone_only'    // Only later dates allowed  
  | 'block_if_passed'  // Blocked if date already passed
  | 'add_only';        // Can add new items, not edit/delete existing

export interface FieldRestriction {
  type: RestrictionType;
  message: string;
  shortMessage: string;
}

// Fields that are completely locked after publication
export const LOCKED_FIELDS = [
  'slug',
  'ticket_price',
  'currency_code',
  'numbering_config',
  'draw_method',
  'lottery_draw_number',
  'lottery_digits',
] as const;

// Fields with conditional restrictions
export const RESTRICTED_FIELDS: Record<string, RestrictionType> = {
  total_tickets: 'increment_only',
  draw_date: 'postpone_only',
  start_date: 'block_if_passed',
  packages: 'add_only',
};

// Restriction messages in Spanish
const RESTRICTION_MESSAGES: Record<string, FieldRestriction> = {
  slug: {
    type: 'locked',
    message: 'La URL no puede cambiar después de publicar para evitar enlaces rotos',
    shortMessage: 'URL bloqueada',
  },
  ticket_price: {
    type: 'locked',
    message: 'El precio no puede cambiar para mantener equidad con compradores previos',
    shortMessage: 'Precio bloqueado',
  },
  currency_code: {
    type: 'locked',
    message: 'La moneda no puede cambiar después de tener ventas',
    shortMessage: 'Moneda bloqueada',
  },
  numbering_config: {
    type: 'locked',
    message: 'El formato de numeración está fijado por los boletos ya generados',
    shortMessage: 'Numeración bloqueada',
  },
  draw_method: {
    type: 'locked',
    message: 'El método de sorteo anunciado no puede cambiar',
    shortMessage: 'Método bloqueado',
  },
  lottery_draw_number: {
    type: 'locked',
    message: 'El número de sorteo de lotería no puede modificarse',
    shortMessage: 'Bloqueado',
  },
  lottery_digits: {
    type: 'locked',
    message: 'Los dígitos de lotería no pueden modificarse',
    shortMessage: 'Bloqueado',
  },
  total_tickets: {
    type: 'increment_only',
    message: 'Solo puedes agregar más boletos, no reducir la cantidad',
    shortMessage: 'Solo incrementar',
  },
  draw_date: {
    type: 'postpone_only',
    message: 'La fecha solo puede posponerse, no adelantarse',
    shortMessage: 'Solo posponer',
  },
  start_date: {
    type: 'block_if_passed',
    message: 'La fecha de inicio ya pasó y no puede modificarse',
    shortMessage: 'Fecha pasada',
  },
  packages: {
    type: 'add_only',
    message: 'Los paquetes existentes no pueden eliminarse, solo agregar nuevos',
    shortMessage: 'Solo agregar',
  },
};

/**
 * Check if a raffle is considered "published" (not in draft status)
 */
export function isPublished(status: string | undefined | null): boolean {
  return !!status && status !== 'draft';
}

/**
 * Check if a specific field is locked (completely uneditable)
 */
export function isFieldLocked(field: string, status: string | undefined | null): boolean {
  if (!isPublished(status)) return false;
  return (LOCKED_FIELDS as readonly string[]).includes(field);
}

/**
 * Get the restriction info for a field
 */
export function getFieldRestriction(
  field: string, 
  status: string | undefined | null
): FieldRestriction | null {
  if (!isPublished(status)) return null;
  
  if (isFieldLocked(field, status)) {
    return RESTRICTION_MESSAGES[field] || {
      type: 'locked',
      message: 'Este campo no puede modificarse después de publicar',
      shortMessage: 'Bloqueado',
    };
  }
  
  if (field in RESTRICTED_FIELDS) {
    return RESTRICTION_MESSAGES[field] || null;
  }
  
  return null;
}

/**
 * Validate that a field update is allowed
 * Returns an error message if not allowed, null if allowed
 */
export function validateFieldUpdate(
  field: string,
  oldValue: unknown,
  newValue: unknown,
  status: string | undefined | null,
  context?: { existingTicketCount?: number }
): string | null {
  if (!isPublished(status)) return null;
  
  // Locked fields cannot change at all
  if (isFieldLocked(field, status)) {
    if (oldValue !== newValue) {
      return RESTRICTION_MESSAGES[field]?.message || 
        `El campo "${field}" no puede modificarse después de publicar`;
    }
    return null;
  }
  
  // Handle restricted fields
  const restrictionType = RESTRICTED_FIELDS[field];
  if (!restrictionType) return null;
  
  switch (restrictionType) {
    case 'increment_only':
      if (typeof newValue === 'number' && typeof oldValue === 'number') {
        if (newValue < oldValue) {
          return RESTRICTION_MESSAGES[field]?.message || 
            'Este valor solo puede incrementarse';
        }
      }
      break;
      
    case 'postpone_only':
      if (newValue && oldValue) {
        const newDate = new Date(newValue as string);
        const oldDate = new Date(oldValue as string);
        if (newDate < oldDate) {
          return RESTRICTION_MESSAGES[field]?.message || 
            'La fecha solo puede posponerse';
        }
      }
      break;
      
    case 'block_if_passed':
      if (oldValue) {
        const oldDate = new Date(oldValue as string);
        if (oldDate < new Date()) {
          return RESTRICTION_MESSAGES[field]?.message || 
            'Esta fecha ya pasó y no puede modificarse';
        }
      }
      break;
  }
  
  return null;
}

/**
 * Get all locked fields for a published raffle
 */
export function getLockedFields(status: string | undefined | null): string[] {
  if (!isPublished(status)) return [];
  return [...LOCKED_FIELDS];
}

/**
 * Get all restricted fields with their restriction types
 */
export function getRestrictedFields(
  status: string | undefined | null
): Record<string, RestrictionType> {
  if (!isPublished(status)) return {};
  return { ...RESTRICTED_FIELDS };
}

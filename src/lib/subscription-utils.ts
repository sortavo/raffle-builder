/**
 * Calculate the number of days remaining in a trial period.
 * Issue M10: Uses UTC normalization for consistency across all timezones.
 * 
 * @param trialEndsAt - The trial end date as a string, Date, null, or undefined
 * @returns Number of days remaining (minimum 0)
 */
export function calculateTrialDaysRemaining(trialEndsAt: string | Date | null | undefined): number {
  if (!trialEndsAt) return 0;

  try {
    // Parse as UTC to ensure consistency across timezones
    const endDate = new Date(trialEndsAt);
    const today = new Date();

    // Normalize both to start of day in UTC
    const endDateUTC = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());
    const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());

    const diffMs = endDateUTC - todayUTC;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  } catch {
    return 0;
  }
}

/**
 * Format trial days remaining as a human-readable string in Spanish.
 * 
 * @param daysRemaining - Number of days remaining
 * @returns Formatted string like "1 día restante" or "5 días restantes"
 */
export function formatTrialDaysRemaining(daysRemaining: number): string {
  if (daysRemaining === 0) return "Termina hoy";
  if (daysRemaining === 1) return "1 día restante";
  return `${daysRemaining} días restantes`;
}

/**
 * Check if a trial is urgent (2 days or less)
 */
export function isTrialUrgent(daysRemaining: number): boolean {
  return daysRemaining <= 2;
}

/**
 * Check if today is the last day of the trial
 */
export function isTrialLastDay(daysRemaining: number): boolean {
  return daysRemaining === 0;
}

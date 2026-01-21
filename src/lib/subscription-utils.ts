import { differenceInDays, startOfDay } from "date-fns";

/**
 * Calculate the number of days remaining in a trial period.
 * Normalizes dates to start of day for consistent counting across components.
 * 
 * @param trialEndsAt - The trial end date as a string, Date, null, or undefined
 * @returns Number of days remaining (minimum 0)
 */
export function calculateTrialDaysRemaining(trialEndsAt: string | Date | null | undefined): number {
  if (!trialEndsAt) return 0;

  try {
    const endDate = startOfDay(new Date(trialEndsAt));
    const today = startOfDay(new Date());

    return Math.max(0, differenceInDays(endDate, today));
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

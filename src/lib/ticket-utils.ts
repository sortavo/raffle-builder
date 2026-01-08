/**
 * Utility functions for ticket number/index manipulation
 * Used to ensure consistent handling across selection modes
 */

/**
 * Parse a ticket number string to get its numeric index
 * Handles prefixes, padding, and various formats
 * 
 * @param ticketNumber - The formatted ticket number (e.g., "0007", "TICKET-0042")
 * @param numberStart - The starting number for tickets (default: 1)
 * @returns The zero-based ticket index, or -1 if parsing fails
 */
export function parseTicketIndex(
  ticketNumber: string,
  numberStart: number = 1
): number {
  if (!ticketNumber) return -1;
  
  // Extract numeric portion from the ticket number
  // Handles formats like: "0042", "TICKET-0042", "A-0042", "42"
  const numericMatch = ticketNumber.match(/(\d+)$/);
  if (!numericMatch) return -1;
  
  const numericPart = parseInt(numericMatch[1], 10);
  if (isNaN(numericPart)) return -1;
  
  // Convert to zero-based index
  // If numberStart is 1 and ticket is "0042" -> index = 42 - 1 = 41
  const index = numericPart - numberStart;
  
  return index >= 0 ? index : -1;
}

/**
 * Parse multiple ticket numbers to get their indices
 * Filters out any that fail to parse
 * 
 * @param ticketNumbers - Array of formatted ticket numbers
 * @param numberStart - The starting number for tickets
 * @returns Array of valid zero-based indices
 */
export function parseTicketIndices(
  ticketNumbers: string[],
  numberStart: number = 1
): number[] {
  return ticketNumbers
    .map(tn => parseTicketIndex(tn, numberStart))
    .filter(idx => idx >= 0);
}

/**
 * Validate that ticket numbers and indices are in sync
 * 
 * @param ticketNumbers - Array of selected ticket numbers
 * @param ticketIndices - Array of selected ticket indices
 * @returns true if arrays are consistent
 */
export function validateTicketSelection(
  ticketNumbers: string[],
  ticketIndices: number[]
): boolean {
  // Both should have the same length
  if (ticketNumbers.length !== ticketIndices.length) {
    return false;
  }
  
  // All indices should be valid (non-negative)
  if (ticketIndices.some(idx => idx < 0)) {
    return false;
  }
  
  return true;
}

/**
 * Format a ticket summary for display
 * Avoids joining huge arrays which can freeze the UI
 * 
 * @param ticketNumbers - Array of ticket numbers
 * @param maxDisplay - Maximum numbers to show before truncating (default: 10)
 * @returns Formatted string like "001, 002, 003 y 97 más"
 */
export function formatTicketSummary(
  ticketNumbers: string[],
  maxDisplay: number = 10
): string {
  if (ticketNumbers.length === 0) return '';
  
  if (ticketNumbers.length <= maxDisplay) {
    return ticketNumbers.join(', ');
  }
  
  const displayed = ticketNumbers.slice(0, maxDisplay);
  const remaining = ticketNumbers.length - maxDisplay;
  
  return `${displayed.join(', ')} y ${remaining.toLocaleString()} más`;
}

/**
 * Bulk threshold - above this we optimize UI rendering
 */
export const BULK_PURCHASE_THRESHOLD = 200;

/**
 * Check if a selection is considered "bulk" (large)
 */
export function isBulkPurchase(count: number): boolean {
  return count >= BULK_PURCHASE_THRESHOLD;
}

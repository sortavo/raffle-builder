/**
 * Utility functions for ticket number/index manipulation
 * Used to ensure consistent handling across selection modes
 */

/**
 * Parse a ticket number string to get its numeric index
 * Handles prefixes, padding, suffixes, and various formats
 * 
 * @param ticketNumber - The formatted ticket number (e.g., "0007", "TICKET-0042", "0042-X")
 * @param numberStart - The starting number for tickets (default: 1)
 * @param step - The step between ticket numbers (default: 1)
 * @returns The zero-based ticket index, or -1 if parsing fails
 */
export function parseTicketIndex(
  ticketNumber: string,
  numberStart: number = 1,
  step: number = 1
): number {
  if (!ticketNumber) return -1;
  
  // Extract all numeric sequences from the ticket number
  // Handles formats like: "0042", "TICKET-0042", "A-0042", "42", "0042-X", "RIFA-0001-X"
  const numericMatches = ticketNumber.match(/\d+/g);
  if (!numericMatches || numericMatches.length === 0) return -1;
  
  // Use the longest numeric match (most likely the ticket number)
  // This handles cases like "TICKET-0042-2024" where we want "0042"
  const longestMatch = numericMatches.reduce((a, b) => 
    a.length >= b.length ? a : b
  );
  
  const numericPart = parseInt(longestMatch, 10);
  if (isNaN(numericPart)) return -1;
  
  // Convert to zero-based index using the formula:
  // display = start + index * step
  // Therefore: index = (display - start) / step
  const index = (numericPart - numberStart) / step;
  
  // Validate the index is a valid integer and non-negative
  return Number.isInteger(index) && index >= 0 ? index : -1;
}

/**
 * Parse multiple ticket numbers to get their indices
 * Filters out any that fail to parse
 * 
 * @param ticketNumbers - Array of formatted ticket numbers
 * @param numberStart - The starting number for tickets
 * @param step - The step between ticket numbers (default: 1)
 * @returns Array of valid zero-based indices
 */
export function parseTicketIndices(
  ticketNumbers: string[],
  numberStart: number = 1,
  step: number = 1
): number[] {
  return ticketNumbers
    .map(tn => parseTicketIndex(tn, numberStart, step))
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

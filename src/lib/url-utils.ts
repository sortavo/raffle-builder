/**
 * Utility functions for generating public URLs for raffles and organizations
 */

/**
 * Get the production base URL for public links
 * In development/preview environments, shows a placeholder
 */
const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    // If it's a real production domain (not lovable preview or localhost), use it
    if (!hostname.includes("lovableproject.com") && 
        !hostname.includes("localhost") &&
        !hostname.includes("127.0.0.1")) {
      return window.location.origin;
    }
  }
  // Production domain for Sortavo
  return "https://sortavo.com";
};

/**
 * Generate a public URL for a raffle
 * If the organization has a slug, uses the path-based format: /org/:orgSlug/:raffleSlug
 * Otherwise, uses the legacy format: /r/:raffleSlug
 */
export function getRafflePublicUrl(
  raffleSlug: string,
  organizationSlug?: string | null
): string {
  const baseUrl = getBaseUrl();
  
  if (organizationSlug) {
    return `${baseUrl}/org/${organizationSlug}/${raffleSlug}`;
  }
  
  return `${baseUrl}/r/${raffleSlug}`;
}

/**
 * Generate a public URL for an organization's landing page
 */
export function getOrganizationPublicUrl(organizationSlug: string): string {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/org/${organizationSlug}`;
}

/**
 * Get the relative path for a raffle (without base URL)
 */
export function getRaffleRelativePath(
  raffleSlug: string,
  organizationSlug?: string | null
): string {
  if (organizationSlug) {
    return `/org/${organizationSlug}/${raffleSlug}`;
  }
  return `/r/${raffleSlug}`;
}

/**
 * Get the relative path for an organization landing page
 */
export function getOrganizationRelativePath(organizationSlug: string): string {
  return `/org/${organizationSlug}`;
}

/**
 * Check if a slug is valid (alphanumeric with hyphens, no special characters)
 */
export function isValidSlug(slug: string): boolean {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
}

/**
 * Normalize a string to a valid slug
 */
export function normalizeToSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[áàäâã]/g, "a")
    .replace(/[éèëê]/g, "e")
    .replace(/[íìïî]/g, "i")
    .replace(/[óòöôõ]/g, "o")
    .replace(/[úùüû]/g, "u")
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

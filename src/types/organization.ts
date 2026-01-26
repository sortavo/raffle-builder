import { Tables } from "@/integrations/supabase/types";
import type { CoverMediaItem } from "@/components/settings/CoverMediaUploader";

/**
 * Extended Organization type with properly typed cover_media
 * The base Tables<'organizations'> already includes all fields,
 * so we just need to override cover_media to have proper typing
 */
export type OrganizationExtended = Tables<'organizations'> & {
  // Override cover_media with proper typing (JSON in DB, but we know the shape)
  cover_media?: CoverMediaItem[] | null;
};

/**
 * Type guard to safely cast organization to OrganizationExtended
 */
export function isOrganizationExtended(org: unknown): org is OrganizationExtended {
  return org !== null && typeof org === 'object' && 'id' in org && 'name' in org;
}

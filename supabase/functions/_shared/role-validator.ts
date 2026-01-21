/**
 * Role Validator for Multi-Tenancy Security
 * MT11, MT12: Validates user has appropriate role before subscription operations
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export type OrgRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface RoleValidationResult {
  isValid: boolean;
  role: OrgRole | null;
  error?: string;
}

/**
 * Validate that a user has one of the required roles in an organization
 *
 * @param supabase - Supabase client
 * @param userId - User ID to validate
 * @param organizationId - Organization ID to check membership
 * @param requiredRoles - Array of roles that are allowed (e.g., ['owner', 'admin'])
 * @returns RoleValidationResult with validation status and user's role
 */
export async function validateUserRole(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string,
  requiredRoles: OrgRole[]
): Promise<RoleValidationResult> {
  try {
    // First check user_roles table
    const { data: userRole, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("organization_id", organizationId)
      .single();

    if (roleError && roleError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is handled below
      console.error("[ROLE-VALIDATOR] Error fetching role:", roleError);
      return { isValid: false, role: null, error: "Failed to validate user role" };
    }

    // If no role in user_roles, check if user is the org creator via profiles
    if (!userRole) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id, role")
        .eq("id", userId)
        .single();

      // If user's profile organization matches, treat them as owner if they created it
      if (profile?.organization_id === organizationId) {
        // Check if this is the only user in the org (likely the creator)
        const { count } = await supabase
          .from("profiles")
          .select("id", { count: 'exact', head: true })
          .eq("organization_id", organizationId);

        if (count === 1) {
          // Single user = owner by default
          const role: OrgRole = 'owner';
          return {
            isValid: requiredRoles.includes(role),
            role,
            error: requiredRoles.includes(role) ? undefined : `Role '${role}' is not authorized for this action`,
          };
        }
      }

      return {
        isValid: false,
        role: null,
        error: "User does not have a role in this organization",
      };
    }

    const role = userRole.role as OrgRole;
    const isValid = requiredRoles.includes(role);

    return {
      isValid,
      role,
      error: isValid ? undefined : `Role '${role}' is not authorized for this action. Required: ${requiredRoles.join(' or ')}`,
    };
  } catch (err) {
    console.error("[ROLE-VALIDATOR] Exception:", err);
    return {
      isValid: false,
      role: null,
      error: "Failed to validate user role",
    };
  }
}

/**
 * Validate that user can manage subscriptions (owner or admin only)
 */
export async function canManageSubscription(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string
): Promise<RoleValidationResult> {
  return validateUserRole(supabase, userId, organizationId, ['owner', 'admin']);
}

/**
 * Validate that user can view billing info (owner, admin, or member)
 */
export async function canViewBilling(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string
): Promise<RoleValidationResult> {
  return validateUserRole(supabase, userId, organizationId, ['owner', 'admin', 'member']);
}

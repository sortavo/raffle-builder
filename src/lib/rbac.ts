// Role-Based Access Control for Sortavo

export type UserRole = 'owner' | 'admin' | 'member';

export interface Permission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'publish' | 'approve';
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  owner: [
    // Can do EVERYTHING
    { resource: 'raffle', action: 'create' },
    { resource: 'raffle', action: 'read' },
    { resource: 'raffle', action: 'update' },
    { resource: 'raffle', action: 'delete' },
    { resource: 'raffle', action: 'publish' },
    { resource: 'ticket', action: 'read' },
    { resource: 'ticket', action: 'approve' },
    { resource: 'organization', action: 'update' },
    { resource: 'team', action: 'create' },
    { resource: 'team', action: 'update' },
    { resource: 'team', action: 'delete' },
    { resource: 'subscription', action: 'update' },
    { resource: 'buyer', action: 'read' },
  ],
  
  admin: [
    // Can manage raffles and approve payments, but NOT team or billing
    { resource: 'raffle', action: 'create' },
    { resource: 'raffle', action: 'read' },
    { resource: 'raffle', action: 'update' },
    { resource: 'raffle', action: 'delete' },
    { resource: 'raffle', action: 'publish' },
    { resource: 'ticket', action: 'read' },
    { resource: 'ticket', action: 'approve' },
    { resource: 'buyer', action: 'read' },
  ],
  
  member: [
    // Can only view raffles and help with approvals
    { resource: 'raffle', action: 'read' },
    { resource: 'ticket', action: 'read' },
    { resource: 'ticket', action: 'approve' },
    { resource: 'buyer', action: 'read' },
  ],
};

export function hasPermission(
  role: UserRole | null | undefined,
  resource: string,
  action: string
): boolean {
  if (!role) return false;
  
  const permissions = ROLE_PERMISSIONS[role];
  return permissions.some(
    p => p.resource === resource && p.action === action
  );
}

export function canCreateRaffle(role: UserRole | null | undefined): boolean {
  return hasPermission(role, 'raffle', 'create');
}

export function canDeleteRaffle(role: UserRole | null | undefined): boolean {
  return hasPermission(role, 'raffle', 'delete');
}

export function canUpdateRaffle(role: UserRole | null | undefined): boolean {
  return hasPermission(role, 'raffle', 'update');
}

export function canPublishRaffle(role: UserRole | null | undefined): boolean {
  return hasPermission(role, 'raffle', 'publish');
}

export function canApproveTickets(role: UserRole | null | undefined): boolean {
  return hasPermission(role, 'ticket', 'approve');
}

export function canManageTeam(role: UserRole | null | undefined): boolean {
  return hasPermission(role, 'team', 'create');
}

export function canManageSubscription(role: UserRole | null | undefined): boolean {
  return hasPermission(role, 'subscription', 'update');
}

export function canUpdateOrganization(role: UserRole | null | undefined): boolean {
  return hasPermission(role, 'organization', 'update');
}

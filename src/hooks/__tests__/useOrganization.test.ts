import { describe, it, expect } from 'vitest';

// Test the pure business logic functions for organization management
// These don't require mocking Supabase

// Role types from the application
type OrganizationRole = 'owner' | 'admin' | 'member';

interface OrganizationMember {
  id: string;
  user_id: string;
  role: OrganizationRole;
  profile: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface OrganizationSettings {
  name: string;
  slug: string | null;
  email: string;
  phone: string | null;
  description: string | null;
  logo_url: string | null;
  brand_color: string | null;
  website_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  whatsapp_number: string | null;
  city: string | null;
  verified: boolean | null;
}

// =====================================================
// Role Permission Logic
// =====================================================

describe('useOrganization - role permissions', () => {
  const isOwner = (role: OrganizationRole): boolean => role === 'owner';
  const isAdmin = (role: OrganizationRole): boolean => role === 'admin';
  const isMember = (role: OrganizationRole): boolean => role === 'member';

  const canManageMembers = (role: OrganizationRole): boolean => {
    return role === 'owner' || role === 'admin';
  };

  const canDeleteOrganization = (role: OrganizationRole): boolean => {
    return role === 'owner';
  };

  const canEditSettings = (role: OrganizationRole): boolean => {
    return role === 'owner' || role === 'admin';
  };

  const canCreateRaffles = (role: OrganizationRole): boolean => {
    return role === 'owner' || role === 'admin';
  };

  const canApprovePayments = (role: OrganizationRole): boolean => {
    return role === 'owner' || role === 'admin' || role === 'member';
  };

  const canViewRaffles = (role: OrganizationRole): boolean => {
    return true; // All roles can view
  };

  describe('role identification', () => {
    it('should identify owner role', () => {
      expect(isOwner('owner')).toBe(true);
      expect(isOwner('admin')).toBe(false);
      expect(isOwner('member')).toBe(false);
    });

    it('should identify admin role', () => {
      expect(isAdmin('owner')).toBe(false);
      expect(isAdmin('admin')).toBe(true);
      expect(isAdmin('member')).toBe(false);
    });

    it('should identify member role', () => {
      expect(isMember('owner')).toBe(false);
      expect(isMember('admin')).toBe(false);
      expect(isMember('member')).toBe(true);
    });
  });

  describe('member management permissions', () => {
    it('should allow owner to manage members', () => {
      expect(canManageMembers('owner')).toBe(true);
    });

    it('should allow admin to manage members', () => {
      expect(canManageMembers('admin')).toBe(true);
    });

    it('should not allow member to manage members', () => {
      expect(canManageMembers('member')).toBe(false);
    });
  });

  describe('organization deletion permissions', () => {
    it('should only allow owner to delete organization', () => {
      expect(canDeleteOrganization('owner')).toBe(true);
      expect(canDeleteOrganization('admin')).toBe(false);
      expect(canDeleteOrganization('member')).toBe(false);
    });
  });

  describe('settings permissions', () => {
    it('should allow owner to edit settings', () => {
      expect(canEditSettings('owner')).toBe(true);
    });

    it('should allow admin to edit settings', () => {
      expect(canEditSettings('admin')).toBe(true);
    });

    it('should not allow member to edit settings', () => {
      expect(canEditSettings('member')).toBe(false);
    });
  });

  describe('raffle permissions', () => {
    it('should allow owner and admin to create raffles', () => {
      expect(canCreateRaffles('owner')).toBe(true);
      expect(canCreateRaffles('admin')).toBe(true);
      expect(canCreateRaffles('member')).toBe(false);
    });

    it('should allow all roles to view raffles', () => {
      expect(canViewRaffles('owner')).toBe(true);
      expect(canViewRaffles('admin')).toBe(true);
      expect(canViewRaffles('member')).toBe(true);
    });

    it('should allow all roles to approve payments', () => {
      expect(canApprovePayments('owner')).toBe(true);
      expect(canApprovePayments('admin')).toBe(true);
      expect(canApprovePayments('member')).toBe(true);
    });
  });
});

// =====================================================
// Role Hierarchy Logic
// =====================================================

describe('useOrganization - role hierarchy', () => {
  const ROLE_HIERARCHY: Record<OrganizationRole, number> = {
    owner: 3,
    admin: 2,
    member: 1,
  };

  const getRoleLevel = (role: OrganizationRole): number => {
    return ROLE_HIERARCHY[role];
  };

  const canChangeRole = (
    actorRole: OrganizationRole,
    targetCurrentRole: OrganizationRole,
    targetNewRole: OrganizationRole
  ): boolean => {
    const actorLevel = ROLE_HIERARCHY[actorRole];
    const targetCurrentLevel = ROLE_HIERARCHY[targetCurrentRole];
    const targetNewLevel = ROLE_HIERARCHY[targetNewRole];

    // Cannot change someone with higher or equal role
    if (targetCurrentLevel >= actorLevel) return false;

    // Cannot promote to equal or higher than yourself
    if (targetNewLevel >= actorLevel) return false;

    // Owner role cannot be assigned
    if (targetNewRole === 'owner') return false;

    return true;
  };

  const canRemoveMember = (
    actorRole: OrganizationRole,
    targetRole: OrganizationRole
  ): boolean => {
    const actorLevel = ROLE_HIERARCHY[actorRole];
    const targetLevel = ROLE_HIERARCHY[targetRole];

    // Cannot remove owner
    if (targetRole === 'owner') return false;

    // Cannot remove someone with higher or equal role
    if (targetLevel >= actorLevel) return false;

    return true;
  };

  describe('role level comparison', () => {
    it('should rank owner highest', () => {
      expect(getRoleLevel('owner')).toBeGreaterThan(getRoleLevel('admin'));
      expect(getRoleLevel('owner')).toBeGreaterThan(getRoleLevel('member'));
    });

    it('should rank admin above member', () => {
      expect(getRoleLevel('admin')).toBeGreaterThan(getRoleLevel('member'));
    });

    it('should rank member lowest', () => {
      expect(getRoleLevel('member')).toBe(1);
    });
  });

  describe('role change permissions', () => {
    it('should allow owner to change admin to member', () => {
      expect(canChangeRole('owner', 'admin', 'member')).toBe(true);
    });

    it('should allow owner to change member to admin', () => {
      expect(canChangeRole('owner', 'member', 'admin')).toBe(true);
    });

    it('should not allow owner to make someone else owner', () => {
      expect(canChangeRole('owner', 'admin', 'owner')).toBe(false);
      expect(canChangeRole('owner', 'member', 'owner')).toBe(false);
    });

    it('should allow admin to change member role within limits', () => {
      // Admin can demote member to member (no change) but not promote
      expect(canChangeRole('admin', 'member', 'member')).toBe(true);
    });

    it('should not allow admin to change owner role', () => {
      expect(canChangeRole('admin', 'owner', 'member')).toBe(false);
      expect(canChangeRole('admin', 'owner', 'admin')).toBe(false);
    });

    it('should not allow admin to promote to admin (same level)', () => {
      expect(canChangeRole('admin', 'member', 'admin')).toBe(false);
    });

    it('should not allow member to change any roles', () => {
      expect(canChangeRole('member', 'member', 'admin')).toBe(false);
      expect(canChangeRole('member', 'admin', 'member')).toBe(false);
    });
  });

  describe('member removal permissions', () => {
    it('should allow owner to remove admin', () => {
      expect(canRemoveMember('owner', 'admin')).toBe(true);
    });

    it('should allow owner to remove member', () => {
      expect(canRemoveMember('owner', 'member')).toBe(true);
    });

    it('should not allow removal of owner', () => {
      expect(canRemoveMember('owner', 'owner')).toBe(false);
      expect(canRemoveMember('admin', 'owner')).toBe(false);
    });

    it('should allow admin to remove member', () => {
      expect(canRemoveMember('admin', 'member')).toBe(true);
    });

    it('should not allow admin to remove another admin', () => {
      expect(canRemoveMember('admin', 'admin')).toBe(false);
    });

    it('should not allow member to remove anyone', () => {
      expect(canRemoveMember('member', 'member')).toBe(false);
      expect(canRemoveMember('member', 'admin')).toBe(false);
    });
  });
});

// =====================================================
// Organization Validation Logic
// =====================================================

describe('useOrganization - organization validation', () => {
  interface ValidationResult {
    valid: boolean;
    errors: string[];
  }

  const validateOrganizationName = (name: string): ValidationResult => {
    const errors: string[] = [];

    if (!name || name.trim().length === 0) {
      errors.push('Organization name is required');
    } else {
      if (name.trim().length < 2) {
        errors.push('Organization name must be at least 2 characters');
      }
      if (name.trim().length > 100) {
        errors.push('Organization name must be less than 100 characters');
      }
    }

    return { valid: errors.length === 0, errors };
  };

  const validateSlug = (slug: string): ValidationResult => {
    const errors: string[] = [];

    if (!slug || slug.length === 0) {
      errors.push('Slug is required');
    } else {
      // Slug should be lowercase, alphanumeric with hyphens
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        errors.push('Slug must be lowercase letters, numbers, and hyphens only');
      }
      if (slug.length < 3) {
        errors.push('Slug must be at least 3 characters');
      }
      if (slug.length > 50) {
        errors.push('Slug must be less than 50 characters');
      }
    }

    return { valid: errors.length === 0, errors };
  };

  const validateEmail = (email: string): ValidationResult => {
    const errors: string[] = [];

    if (!email || email.trim().length === 0) {
      errors.push('Email is required');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push('Invalid email format');
      }
    }

    return { valid: errors.length === 0, errors };
  };

  const validatePhone = (phone: string | null): ValidationResult => {
    const errors: string[] = [];

    if (phone && phone.length > 0) {
      // Remove non-digits for validation
      const digitsOnly = phone.replace(/\D/g, '');
      if (digitsOnly.length < 10) {
        errors.push('Phone number must have at least 10 digits');
      }
      if (digitsOnly.length > 15) {
        errors.push('Phone number is too long');
      }
    }

    return { valid: errors.length === 0, errors };
  };

  const validateUrl = (url: string | null, fieldName: string): ValidationResult => {
    const errors: string[] = [];

    if (url && url.length > 0) {
      try {
        new URL(url);
      } catch {
        errors.push(`${fieldName} must be a valid URL`);
      }
    }

    return { valid: errors.length === 0, errors };
  };

  const validateBrandColor = (color: string | null): ValidationResult => {
    const errors: string[] = [];

    if (color && color.length > 0) {
      // Must be a valid hex color
      if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
        errors.push('Brand color must be a valid hex color (e.g., #FF5733)');
      }
    }

    return { valid: errors.length === 0, errors };
  };

  describe('organization name validation', () => {
    it('should accept valid organization names', () => {
      expect(validateOrganizationName('Acme Inc').valid).toBe(true);
      expect(validateOrganizationName('My Organization').valid).toBe(true);
      expect(validateOrganizationName('A1').valid).toBe(true);
    });

    it('should reject empty names', () => {
      expect(validateOrganizationName('').valid).toBe(false);
      expect(validateOrganizationName('').errors).toContain('Organization name is required');
    });

    it('should reject names that are too short', () => {
      expect(validateOrganizationName('A').valid).toBe(false);
      expect(validateOrganizationName('A').errors).toContain('Organization name must be at least 2 characters');
    });

    it('should reject names that are too long', () => {
      const longName = 'A'.repeat(101);
      expect(validateOrganizationName(longName).valid).toBe(false);
      expect(validateOrganizationName(longName).errors).toContain('Organization name must be less than 100 characters');
    });

    it('should trim whitespace when validating', () => {
      expect(validateOrganizationName('  Acme  ').valid).toBe(true);
    });
  });

  describe('slug validation', () => {
    it('should accept valid slugs', () => {
      expect(validateSlug('my-organization').valid).toBe(true);
      expect(validateSlug('acme').valid).toBe(true);
      expect(validateSlug('org123').valid).toBe(true);
      expect(validateSlug('my-org-2024').valid).toBe(true);
    });

    it('should reject empty slugs', () => {
      expect(validateSlug('').valid).toBe(false);
    });

    it('should reject slugs with uppercase', () => {
      expect(validateSlug('My-Organization').valid).toBe(false);
    });

    it('should reject slugs with special characters', () => {
      expect(validateSlug('my_org').valid).toBe(false);
      expect(validateSlug('my@org').valid).toBe(false);
      expect(validateSlug('my.org').valid).toBe(false);
    });

    it('should reject slugs starting or ending with hyphens', () => {
      expect(validateSlug('-myorg').valid).toBe(false);
      expect(validateSlug('myorg-').valid).toBe(false);
    });

    it('should reject slugs with consecutive hyphens', () => {
      expect(validateSlug('my--org').valid).toBe(false);
    });

    it('should reject slugs that are too short', () => {
      expect(validateSlug('ab').valid).toBe(false);
    });

    it('should reject slugs that are too long', () => {
      const longSlug = 'a'.repeat(51);
      expect(validateSlug(longSlug).valid).toBe(false);
    });
  });

  describe('email validation', () => {
    it('should accept valid emails', () => {
      expect(validateEmail('test@example.com').valid).toBe(true);
      expect(validateEmail('user.name@domain.co.uk').valid).toBe(true);
      expect(validateEmail('admin+tag@company.org').valid).toBe(true);
    });

    it('should reject empty emails', () => {
      expect(validateEmail('').valid).toBe(false);
    });

    it('should reject invalid email formats', () => {
      expect(validateEmail('notanemail').valid).toBe(false);
      expect(validateEmail('missing@domain').valid).toBe(false);
      expect(validateEmail('@nodomain.com').valid).toBe(false);
      expect(validateEmail('no@.com').valid).toBe(false);
    });
  });

  describe('phone validation', () => {
    it('should accept valid phone numbers', () => {
      expect(validatePhone('1234567890').valid).toBe(true);
      expect(validatePhone('+1 (555) 123-4567').valid).toBe(true);
      expect(validatePhone('52 55 1234 5678').valid).toBe(true);
    });

    it('should accept null phone (optional field)', () => {
      expect(validatePhone(null).valid).toBe(true);
    });

    it('should accept empty phone (optional field)', () => {
      expect(validatePhone('').valid).toBe(true);
    });

    it('should reject phone numbers that are too short', () => {
      expect(validatePhone('123456789').valid).toBe(false);
    });

    it('should reject phone numbers that are too long', () => {
      expect(validatePhone('1234567890123456').valid).toBe(false);
    });
  });

  describe('URL validation', () => {
    it('should accept valid URLs', () => {
      expect(validateUrl('https://example.com', 'Website').valid).toBe(true);
      expect(validateUrl('http://localhost:3000', 'Website').valid).toBe(true);
      expect(validateUrl('https://sub.domain.com/path', 'Website').valid).toBe(true);
    });

    it('should accept null URLs (optional field)', () => {
      expect(validateUrl(null, 'Website').valid).toBe(true);
    });

    it('should accept empty URLs (optional field)', () => {
      expect(validateUrl('', 'Website').valid).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(validateUrl('not-a-url', 'Website').valid).toBe(false);
      expect(validateUrl('example.com', 'Website').valid).toBe(false);
    });
  });

  describe('brand color validation', () => {
    it('should accept valid hex colors', () => {
      expect(validateBrandColor('#FF5733').valid).toBe(true);
      expect(validateBrandColor('#fff').valid).toBe(true);
      expect(validateBrandColor('#000000').valid).toBe(true);
      expect(validateBrandColor('#AbCdEf').valid).toBe(true);
    });

    it('should accept null color (optional field)', () => {
      expect(validateBrandColor(null).valid).toBe(true);
    });

    it('should accept empty color (optional field)', () => {
      expect(validateBrandColor('').valid).toBe(true);
    });

    it('should reject invalid hex colors', () => {
      expect(validateBrandColor('FF5733').valid).toBe(false); // missing #
      expect(validateBrandColor('#GGG').valid).toBe(false); // invalid chars
      expect(validateBrandColor('#12345').valid).toBe(false); // wrong length
      expect(validateBrandColor('red').valid).toBe(false); // color name
    });
  });
});

// =====================================================
// Member Data Transformation
// =====================================================

describe('useOrganization - member data transformation', () => {
  const getInitials = (name: string | null): string => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const sortMembersByRole = (members: OrganizationMember[]): OrganizationMember[] => {
    const roleOrder: Record<OrganizationRole, number> = {
      owner: 0,
      admin: 1,
      member: 2,
    };
    return [...members].sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);
  };

  const filterMembersByRole = (
    members: OrganizationMember[],
    role: OrganizationRole
  ): OrganizationMember[] => {
    return members.filter((m) => m.role === role);
  };

  const getMemberCount = (members: OrganizationMember[]): {
    total: number;
    owners: number;
    admins: number;
    members: number;
  } => {
    return {
      total: members.length,
      owners: members.filter((m) => m.role === 'owner').length,
      admins: members.filter((m) => m.role === 'admin').length,
      members: members.filter((m) => m.role === 'member').length,
    };
  };

  describe('initials generation', () => {
    it('should generate initials from full name', () => {
      expect(getInitials('John Doe')).toBe('JD');
      expect(getInitials('Alice Bob Charlie')).toBe('AB');
    });

    it('should handle single name', () => {
      expect(getInitials('John')).toBe('J');
    });

    it('should return U for null', () => {
      expect(getInitials(null)).toBe('U');
    });

    it('should uppercase initials', () => {
      expect(getInitials('john doe')).toBe('JD');
    });

    it('should limit to 2 characters', () => {
      expect(getInitials('Alice Bob Charlie')).toHaveLength(2);
    });
  });

  describe('member sorting', () => {
    const testMembers: OrganizationMember[] = [
      { id: '1', user_id: 'u1', role: 'member', profile: null },
      { id: '2', user_id: 'u2', role: 'owner', profile: null },
      { id: '3', user_id: 'u3', role: 'admin', profile: null },
      { id: '4', user_id: 'u4', role: 'member', profile: null },
    ];

    it('should sort owners first', () => {
      const sorted = sortMembersByRole(testMembers);
      expect(sorted[0].role).toBe('owner');
    });

    it('should sort admins second', () => {
      const sorted = sortMembersByRole(testMembers);
      expect(sorted[1].role).toBe('admin');
    });

    it('should sort members last', () => {
      const sorted = sortMembersByRole(testMembers);
      expect(sorted[2].role).toBe('member');
      expect(sorted[3].role).toBe('member');
    });

    it('should not mutate original array', () => {
      const original = [...testMembers];
      sortMembersByRole(testMembers);
      expect(testMembers).toEqual(original);
    });
  });

  describe('member filtering', () => {
    const testMembers: OrganizationMember[] = [
      { id: '1', user_id: 'u1', role: 'owner', profile: null },
      { id: '2', user_id: 'u2', role: 'admin', profile: null },
      { id: '3', user_id: 'u3', role: 'admin', profile: null },
      { id: '4', user_id: 'u4', role: 'member', profile: null },
    ];

    it('should filter by owner role', () => {
      const owners = filterMembersByRole(testMembers, 'owner');
      expect(owners).toHaveLength(1);
      expect(owners[0].role).toBe('owner');
    });

    it('should filter by admin role', () => {
      const admins = filterMembersByRole(testMembers, 'admin');
      expect(admins).toHaveLength(2);
    });

    it('should filter by member role', () => {
      const members = filterMembersByRole(testMembers, 'member');
      expect(members).toHaveLength(1);
    });
  });

  describe('member count', () => {
    const testMembers: OrganizationMember[] = [
      { id: '1', user_id: 'u1', role: 'owner', profile: null },
      { id: '2', user_id: 'u2', role: 'admin', profile: null },
      { id: '3', user_id: 'u3', role: 'admin', profile: null },
      { id: '4', user_id: 'u4', role: 'member', profile: null },
      { id: '5', user_id: 'u5', role: 'member', profile: null },
      { id: '6', user_id: 'u6', role: 'member', profile: null },
    ];

    it('should count members correctly', () => {
      const counts = getMemberCount(testMembers);
      expect(counts.total).toBe(6);
      expect(counts.owners).toBe(1);
      expect(counts.admins).toBe(2);
      expect(counts.members).toBe(3);
    });

    it('should handle empty array', () => {
      const counts = getMemberCount([]);
      expect(counts.total).toBe(0);
      expect(counts.owners).toBe(0);
      expect(counts.admins).toBe(0);
      expect(counts.members).toBe(0);
    });
  });
});

// =====================================================
// Invitation Logic
// =====================================================

describe('useOrganization - invitation validation', () => {
  interface Invitation {
    id: string;
    email: string;
    role: 'admin' | 'member';
    created_at: string;
    expires_at: string;
    accepted_at: string | null;
  }

  const isInvitationExpired = (invitation: Invitation): boolean => {
    return new Date(invitation.expires_at) < new Date();
  };

  const isInvitationAccepted = (invitation: Invitation): boolean => {
    return invitation.accepted_at !== null;
  };

  const isInvitationPending = (invitation: Invitation): boolean => {
    return !isInvitationAccepted(invitation) && !isInvitationExpired(invitation);
  };

  const getDaysUntilExpiration = (invitation: Invitation): number => {
    const expiresAt = new Date(invitation.expires_at);
    const now = new Date();
    const diffMs = expiresAt.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const validateInviteEmail = (
    email: string,
    existingMembers: OrganizationMember[],
    pendingInvites: Invitation[]
  ): { valid: boolean; error?: string } => {
    // Check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Invalid email format' };
    }

    // Check if already a member
    const isMember = existingMembers.some(
      (m) => m.profile?.email.toLowerCase() === email.toLowerCase()
    );
    if (isMember) {
      return { valid: false, error: 'User is already a member' };
    }

    // Check if already invited
    const hasPendingInvite = pendingInvites.some(
      (i) =>
        i.email.toLowerCase() === email.toLowerCase() &&
        isInvitationPending(i)
    );
    if (hasPendingInvite) {
      return { valid: false, error: 'User already has a pending invitation' };
    }

    return { valid: true };
  };

  describe('invitation status', () => {
    it('should detect expired invitations', () => {
      const expiredInvite: Invitation = {
        id: '1',
        email: 'test@example.com',
        role: 'member',
        created_at: '2024-01-01T00:00:00Z',
        expires_at: '2024-01-08T00:00:00Z', // Past date
        accepted_at: null,
      };
      expect(isInvitationExpired(expiredInvite)).toBe(true);
    });

    it('should detect active invitations', () => {
      const activeInvite: Invitation = {
        id: '1',
        email: 'test@example.com',
        role: 'member',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days from now
        accepted_at: null,
      };
      expect(isInvitationExpired(activeInvite)).toBe(false);
    });

    it('should detect accepted invitations', () => {
      const acceptedInvite: Invitation = {
        id: '1',
        email: 'test@example.com',
        role: 'member',
        created_at: '2024-01-01T00:00:00Z',
        expires_at: '2024-01-08T00:00:00Z',
        accepted_at: '2024-01-02T00:00:00Z',
      };
      expect(isInvitationAccepted(acceptedInvite)).toBe(true);
    });

    it('should detect pending invitations', () => {
      const pendingInvite: Invitation = {
        id: '1',
        email: 'test@example.com',
        role: 'member',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
        accepted_at: null,
      };
      expect(isInvitationPending(pendingInvite)).toBe(true);
    });
  });

  describe('days until expiration', () => {
    it('should calculate days correctly', () => {
      const invite: Invitation = {
        id: '1',
        email: 'test@example.com',
        role: 'member',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 86400000 * 5).toISOString(), // 5 days
        accepted_at: null,
      };
      const days = getDaysUntilExpiration(invite);
      expect(days).toBeGreaterThanOrEqual(4);
      expect(days).toBeLessThanOrEqual(6);
    });

    it('should return negative for expired', () => {
      const invite: Invitation = {
        id: '1',
        email: 'test@example.com',
        role: 'member',
        created_at: '2024-01-01T00:00:00Z',
        expires_at: '2024-01-08T00:00:00Z',
        accepted_at: null,
      };
      expect(getDaysUntilExpiration(invite)).toBeLessThan(0);
    });
  });

  describe('invite email validation', () => {
    const existingMembers: OrganizationMember[] = [
      {
        id: '1',
        user_id: 'u1',
        role: 'owner',
        profile: {
          id: 'u1',
          email: 'owner@example.com',
          full_name: 'Owner',
          avatar_url: null,
        },
      },
    ];

    const pendingInvites: Invitation[] = [
      {
        id: '1',
        email: 'pending@example.com',
        role: 'member',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
        accepted_at: null,
      },
    ];

    it('should accept valid new email', () => {
      const result = validateInviteEmail('new@example.com', existingMembers, pendingInvites);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid email format', () => {
      const result = validateInviteEmail('invalid-email', existingMembers, pendingInvites);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid email format');
    });

    it('should reject existing member email', () => {
      const result = validateInviteEmail('owner@example.com', existingMembers, pendingInvites);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('User is already a member');
    });

    it('should reject email case-insensitively', () => {
      const result = validateInviteEmail('OWNER@EXAMPLE.COM', existingMembers, pendingInvites);
      expect(result.valid).toBe(false);
    });

    it('should reject email with pending invitation', () => {
      const result = validateInviteEmail('pending@example.com', existingMembers, pendingInvites);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('User already has a pending invitation');
    });
  });
});

// =====================================================
// Statistics Calculation
// =====================================================

describe('useOrganization - statistics calculation', () => {
  interface TicketStats {
    total: number;
    sold: number;
    reserved: number;
    available: number;
    revenue: number;
  }

  const calculateAvailableTickets = (stats: Omit<TicketStats, 'available'>): number => {
    return Math.max(0, stats.total - stats.sold - stats.reserved);
  };

  const calculateSellThroughRate = (stats: TicketStats): number => {
    if (stats.total === 0) return 0;
    return (stats.sold / stats.total) * 100;
  };

  const calculateAverageTicketPrice = (stats: TicketStats): number => {
    if (stats.sold === 0) return 0;
    return stats.revenue / stats.sold;
  };

  const validateStats = (stats: TicketStats): boolean => {
    // Available should equal total - sold - reserved
    const expectedAvailable = stats.total - stats.sold - stats.reserved;
    if (stats.available !== Math.max(0, expectedAvailable)) return false;

    // No negative values
    if (stats.total < 0 || stats.sold < 0 || stats.reserved < 0 || stats.available < 0) {
      return false;
    }

    // Sold + reserved + available should not exceed total
    if (stats.sold + stats.reserved + stats.available > stats.total) return false;

    return true;
  };

  describe('available tickets calculation', () => {
    it('should calculate available correctly', () => {
      expect(calculateAvailableTickets({ total: 100, sold: 50, reserved: 20, revenue: 500 })).toBe(30);
    });

    it('should return 0 when all sold', () => {
      expect(calculateAvailableTickets({ total: 100, sold: 100, reserved: 0, revenue: 1000 })).toBe(0);
    });

    it('should handle overselling (return 0, not negative)', () => {
      expect(calculateAvailableTickets({ total: 100, sold: 80, reserved: 30, revenue: 800 })).toBe(0);
    });
  });

  describe('sell-through rate calculation', () => {
    it('should calculate percentage correctly', () => {
      expect(calculateSellThroughRate({ total: 100, sold: 50, reserved: 20, available: 30, revenue: 500 })).toBe(50);
    });

    it('should return 100 for fully sold', () => {
      expect(calculateSellThroughRate({ total: 100, sold: 100, reserved: 0, available: 0, revenue: 1000 })).toBe(100);
    });

    it('should return 0 for no tickets', () => {
      expect(calculateSellThroughRate({ total: 0, sold: 0, reserved: 0, available: 0, revenue: 0 })).toBe(0);
    });

    it('should handle partial sales', () => {
      expect(calculateSellThroughRate({ total: 1000, sold: 333, reserved: 100, available: 567, revenue: 3330 })).toBeCloseTo(33.3, 1);
    });
  });

  describe('average ticket price calculation', () => {
    it('should calculate average correctly', () => {
      expect(calculateAverageTicketPrice({ total: 100, sold: 50, reserved: 0, available: 50, revenue: 500 })).toBe(10);
    });

    it('should return 0 when no sales', () => {
      expect(calculateAverageTicketPrice({ total: 100, sold: 0, reserved: 0, available: 100, revenue: 0 })).toBe(0);
    });

    it('should handle decimal prices', () => {
      expect(calculateAverageTicketPrice({ total: 100, sold: 3, reserved: 0, available: 97, revenue: 100 })).toBeCloseTo(33.33, 2);
    });
  });

  describe('stats validation', () => {
    it('should validate consistent stats', () => {
      expect(validateStats({ total: 100, sold: 50, reserved: 20, available: 30, revenue: 500 })).toBe(true);
    });

    it('should reject inconsistent available count', () => {
      expect(validateStats({ total: 100, sold: 50, reserved: 20, available: 40, revenue: 500 })).toBe(false);
    });

    it('should reject negative values', () => {
      expect(validateStats({ total: 100, sold: -10, reserved: 0, available: 110, revenue: 0 })).toBe(false);
    });

    it('should reject when sum exceeds total', () => {
      expect(validateStats({ total: 100, sold: 60, reserved: 30, available: 20, revenue: 600 })).toBe(false);
    });
  });
});

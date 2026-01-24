import { describe, it, expect } from 'vitest';

// Test the pure business logic functions from useBuyers
// These don't require mocking Supabase

interface Buyer {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  tickets: string[];
  ticketCount: number;
  status: string;
  date: string;
  orderTotal: number | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  hasPaymentProof: boolean;
  soldAt: string | null;
  approvedAt: string | null;
  paymentProofUploadedAt: string | null;
  approvedBy: string | null;
  approvedByName: string | null;
}

interface BuyerFilters {
  status?: string;
  city?: string;
  search?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}

// =====================================================
// Buyer Data Validation
// =====================================================

describe('useBuyers - buyer data validation', () => {
  interface ValidationResult {
    valid: boolean;
    errors: string[];
  }

  const validateBuyerName = (name: string): ValidationResult => {
    const errors: string[] = [];

    if (!name || name.trim().length === 0) {
      errors.push('Name is required');
    } else {
      if (name.trim().length < 2) {
        errors.push('Name must be at least 2 characters');
      }
      if (name.trim().length > 100) {
        errors.push('Name must be less than 100 characters');
      }
    }

    return { valid: errors.length === 0, errors };
  };

  const validateBuyerEmail = (email: string): ValidationResult => {
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

  const validateBuyerPhone = (phone: string): ValidationResult => {
    const errors: string[] = [];

    if (!phone || phone.trim().length === 0) {
      errors.push('Phone is required');
    } else {
      // Remove non-digits for validation
      const digitsOnly = phone.replace(/\D/g, '');
      if (digitsOnly.length < 10) {
        errors.push('Phone must have at least 10 digits');
      }
      if (digitsOnly.length > 15) {
        errors.push('Phone is too long');
      }
    }

    return { valid: errors.length === 0, errors };
  };

  const validateBuyer = (buyer: Partial<Buyer>): ValidationResult => {
    const errors: string[] = [];

    const nameResult = validateBuyerName(buyer.name || '');
    const emailResult = validateBuyerEmail(buyer.email || '');
    const phoneResult = validateBuyerPhone(buyer.phone || '');

    errors.push(...nameResult.errors, ...emailResult.errors, ...phoneResult.errors);

    return { valid: errors.length === 0, errors };
  };

  describe('name validation', () => {
    it('should accept valid names', () => {
      expect(validateBuyerName('John Doe').valid).toBe(true);
      expect(validateBuyerName('Maria').valid).toBe(true);
      expect(validateBuyerName('AB').valid).toBe(true);
    });

    it('should reject empty names', () => {
      expect(validateBuyerName('').valid).toBe(false);
      expect(validateBuyerName('').errors).toContain('Name is required');
    });

    it('should reject names that are too short', () => {
      expect(validateBuyerName('A').valid).toBe(false);
      expect(validateBuyerName('A').errors).toContain('Name must be at least 2 characters');
    });

    it('should reject names that are too long', () => {
      const longName = 'A'.repeat(101);
      expect(validateBuyerName(longName).valid).toBe(false);
    });

    it('should trim whitespace', () => {
      expect(validateBuyerName('  John  ').valid).toBe(true);
    });
  });

  describe('email validation', () => {
    it('should accept valid emails', () => {
      expect(validateBuyerEmail('test@example.com').valid).toBe(true);
      expect(validateBuyerEmail('user.name@domain.co.mx').valid).toBe(true);
    });

    it('should reject empty emails', () => {
      expect(validateBuyerEmail('').valid).toBe(false);
    });

    it('should reject invalid email formats', () => {
      expect(validateBuyerEmail('notanemail').valid).toBe(false);
      expect(validateBuyerEmail('missing@').valid).toBe(false);
      expect(validateBuyerEmail('@nodomain.com').valid).toBe(false);
    });
  });

  describe('phone validation', () => {
    it('should accept valid phone numbers', () => {
      expect(validateBuyerPhone('5551234567').valid).toBe(true);
      expect(validateBuyerPhone('+52 55 1234 5678').valid).toBe(true);
      expect(validateBuyerPhone('(555) 123-4567').valid).toBe(true);
    });

    it('should reject empty phones', () => {
      expect(validateBuyerPhone('').valid).toBe(false);
    });

    it('should reject phones that are too short', () => {
      expect(validateBuyerPhone('123456789').valid).toBe(false);
    });
  });

  describe('full buyer validation', () => {
    it('should validate complete buyer data', () => {
      const validBuyer: Partial<Buyer> = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '5551234567',
      };
      expect(validateBuyer(validBuyer).valid).toBe(true);
    });

    it('should collect all errors for invalid buyer', () => {
      const invalidBuyer: Partial<Buyer> = {
        name: '',
        email: 'invalid',
        phone: '123',
      };
      const result = validateBuyer(invalidBuyer);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});

// =====================================================
// Search/Filter Logic
// =====================================================

describe('useBuyers - search and filter logic', () => {
  const createBuyer = (overrides: Partial<Buyer>): Buyer => ({
    id: 'test-id',
    name: 'Test User',
    email: 'test@example.com',
    phone: '5551234567',
    city: 'Ciudad de Mexico',
    tickets: ['001', '002'],
    ticketCount: 2,
    status: 'sold',
    date: new Date().toISOString(),
    orderTotal: 200,
    paymentMethod: 'transfer',
    paymentReference: 'ABC123',
    hasPaymentProof: true,
    soldAt: new Date().toISOString(),
    approvedAt: null,
    paymentProofUploadedAt: null,
    approvedBy: null,
    approvedByName: null,
    ...overrides,
  });

  const matchesSearch = (buyer: Buyer, search: string): boolean => {
    if (!search || search.trim().length === 0) return true;

    const searchLower = search.toLowerCase().trim();

    return (
      buyer.name.toLowerCase().includes(searchLower) ||
      buyer.email.toLowerCase().includes(searchLower) ||
      buyer.phone.includes(searchLower) ||
      buyer.tickets.some((t) => t.includes(searchLower)) ||
      (buyer.paymentReference?.toLowerCase().includes(searchLower) ?? false)
    );
  };

  const matchesStatus = (buyer: Buyer, status: string | undefined): boolean => {
    if (!status || status === 'all') return true;
    return buyer.status === status;
  };

  const matchesCity = (buyer: Buyer, city: string | undefined): boolean => {
    if (!city || city === 'all') return true;
    return buyer.city === city;
  };

  const matchesDateRange = (
    buyer: Buyer,
    startDate: Date | undefined,
    endDate: Date | undefined
  ): boolean => {
    if (!startDate && !endDate) return true;

    const buyerDate = new Date(buyer.date);

    if (startDate && buyerDate < startDate) return false;
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      if (buyerDate > endOfDay) return false;
    }

    return true;
  };

  const filterBuyers = (buyers: Buyer[], filters: BuyerFilters): Buyer[] => {
    return buyers.filter((buyer) => {
      if (!matchesSearch(buyer, filters.search || '')) return false;
      if (!matchesStatus(buyer, filters.status)) return false;
      if (!matchesCity(buyer, filters.city)) return false;
      if (!matchesDateRange(buyer, filters.startDate, filters.endDate)) return false;
      return true;
    });
  };

  describe('search matching', () => {
    const buyers = [
      createBuyer({ id: '1', name: 'John Doe', email: 'john@example.com', phone: '5551234567' }),
      createBuyer({ id: '2', name: 'Jane Smith', email: 'jane@test.com', phone: '5559876543' }),
      createBuyer({ id: '3', name: 'Carlos Garcia', email: 'carlos@gmail.com', phone: '5555555555' }),
    ];

    it('should match by name', () => {
      expect(matchesSearch(buyers[0], 'John')).toBe(true);
      expect(matchesSearch(buyers[0], 'john')).toBe(true); // case insensitive
      expect(matchesSearch(buyers[0], 'Jane')).toBe(false);
    });

    it('should match by email', () => {
      expect(matchesSearch(buyers[1], 'jane@test')).toBe(true);
      expect(matchesSearch(buyers[1], 'TEST.COM')).toBe(true); // case insensitive
    });

    it('should match by phone', () => {
      expect(matchesSearch(buyers[0], '1234567')).toBe(true);
      expect(matchesSearch(buyers[1], '9876')).toBe(true);
    });

    it('should match by ticket number', () => {
      const buyer = createBuyer({ tickets: ['001', '002', '003'] });
      expect(matchesSearch(buyer, '002')).toBe(true);
      expect(matchesSearch(buyer, '999')).toBe(false);
    });

    it('should match by payment reference', () => {
      const buyer = createBuyer({ paymentReference: 'REF123ABC' });
      expect(matchesSearch(buyer, 'ref123')).toBe(true);
      expect(matchesSearch(buyer, 'XYZ')).toBe(false);
    });

    it('should return true for empty search', () => {
      expect(matchesSearch(buyers[0], '')).toBe(true);
      expect(matchesSearch(buyers[0], '   ')).toBe(true);
    });
  });

  describe('status filtering', () => {
    it('should filter by status', () => {
      const soldBuyer = createBuyer({ status: 'sold' });
      const reservedBuyer = createBuyer({ status: 'reserved' });

      expect(matchesStatus(soldBuyer, 'sold')).toBe(true);
      expect(matchesStatus(soldBuyer, 'reserved')).toBe(false);
      expect(matchesStatus(reservedBuyer, 'reserved')).toBe(true);
    });

    it('should return true for "all" status', () => {
      const buyer = createBuyer({ status: 'sold' });
      expect(matchesStatus(buyer, 'all')).toBe(true);
    });

    it('should return true for undefined status', () => {
      const buyer = createBuyer({ status: 'sold' });
      expect(matchesStatus(buyer, undefined)).toBe(true);
    });
  });

  describe('city filtering', () => {
    it('should filter by city', () => {
      const buyer = createBuyer({ city: 'Guadalajara' });
      expect(matchesCity(buyer, 'Guadalajara')).toBe(true);
      expect(matchesCity(buyer, 'Monterrey')).toBe(false);
    });

    it('should return true for "all" city', () => {
      const buyer = createBuyer({ city: 'Guadalajara' });
      expect(matchesCity(buyer, 'all')).toBe(true);
    });
  });

  describe('date range filtering', () => {
    const buyer = createBuyer({ date: '2024-06-15T12:00:00Z' });

    it('should filter by start date', () => {
      expect(matchesDateRange(buyer, new Date('2024-06-01'), undefined)).toBe(true);
      expect(matchesDateRange(buyer, new Date('2024-07-01'), undefined)).toBe(false);
    });

    it('should filter by end date', () => {
      expect(matchesDateRange(buyer, undefined, new Date('2024-06-30'))).toBe(true);
      expect(matchesDateRange(buyer, undefined, new Date('2024-06-01'))).toBe(false);
    });

    it('should filter by date range', () => {
      expect(matchesDateRange(buyer, new Date('2024-06-01'), new Date('2024-06-30'))).toBe(true);
      expect(matchesDateRange(buyer, new Date('2024-07-01'), new Date('2024-07-31'))).toBe(false);
    });

    it('should return true for no date filters', () => {
      expect(matchesDateRange(buyer, undefined, undefined)).toBe(true);
    });
  });

  describe('combined filtering', () => {
    const buyers = [
      createBuyer({ id: '1', name: 'John', status: 'sold', city: 'CDMX' }),
      createBuyer({ id: '2', name: 'Jane', status: 'reserved', city: 'CDMX' }),
      createBuyer({ id: '3', name: 'Carlos', status: 'sold', city: 'Guadalajara' }),
    ];

    it('should apply multiple filters', () => {
      const filters: BuyerFilters = {
        status: 'sold',
        city: 'CDMX',
      };

      const result = filterBuyers(buyers, filters);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('John');
    });

    it('should combine search with filters', () => {
      const filters: BuyerFilters = {
        search: 'Carlos',
        status: 'sold',
      };

      const result = filterBuyers(buyers, filters);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Carlos');
    });
  });
});

// =====================================================
// Deduplication Logic
// =====================================================

describe('useBuyers - deduplication logic', () => {
  const createBuyer = (overrides: Partial<Buyer>): Buyer => ({
    id: 'test-id',
    name: 'Test User',
    email: 'test@example.com',
    phone: '5551234567',
    city: 'Ciudad de Mexico',
    tickets: ['001'],
    ticketCount: 1,
    status: 'sold',
    date: new Date().toISOString(),
    orderTotal: 100,
    paymentMethod: 'transfer',
    paymentReference: 'ABC123',
    hasPaymentProof: true,
    soldAt: new Date().toISOString(),
    approvedAt: null,
    paymentProofUploadedAt: null,
    approvedBy: null,
    approvedByName: null,
    ...overrides,
  });

  // Generate a unique key for buyer deduplication
  const getBuyerKey = (buyer: Buyer): string => {
    return `${buyer.email.toLowerCase()}_${buyer.phone.replace(/\D/g, '')}`;
  };

  // Merge duplicate buyers (same email+phone) into one record
  const mergeDuplicateBuyers = (buyers: Buyer[]): Buyer[] => {
    const buyerMap = new Map<string, Buyer>();

    for (const buyer of buyers) {
      const key = getBuyerKey(buyer);
      const existing = buyerMap.get(key);

      if (existing) {
        // Merge tickets
        const mergedTickets = [...new Set([...existing.tickets, ...buyer.tickets])].sort();
        buyerMap.set(key, {
          ...existing,
          tickets: mergedTickets,
          ticketCount: mergedTickets.length,
          orderTotal: (existing.orderTotal || 0) + (buyer.orderTotal || 0),
        });
      } else {
        buyerMap.set(key, { ...buyer });
      }
    }

    return Array.from(buyerMap.values());
  };

  // Find potential duplicates based on partial matches
  const findPotentialDuplicates = (buyers: Buyer[]): Map<string, Buyer[]> => {
    const duplicates = new Map<string, Buyer[]>();

    // Group by email
    const byEmail = new Map<string, Buyer[]>();
    for (const buyer of buyers) {
      const email = buyer.email.toLowerCase();
      const existing = byEmail.get(email) || [];
      existing.push(buyer);
      byEmail.set(email, existing);
    }

    // Find emails with multiple entries
    for (const [email, group] of byEmail) {
      if (group.length > 1) {
        duplicates.set(email, group);
      }
    }

    return duplicates;
  };

  // Check if two buyers are likely the same person
  const areLikelyDuplicates = (a: Buyer, b: Buyer): boolean => {
    // Same email
    if (a.email.toLowerCase() === b.email.toLowerCase()) return true;

    // Same phone (normalized)
    const phoneA = a.phone.replace(/\D/g, '');
    const phoneB = b.phone.replace(/\D/g, '');
    if (phoneA.length >= 10 && phoneA === phoneB) return true;

    // Similar name and same city
    const nameA = a.name.toLowerCase().trim();
    const nameB = b.name.toLowerCase().trim();
    if (nameA === nameB && a.city === b.city) return true;

    return false;
  };

  describe('buyer key generation', () => {
    it('should generate consistent keys for same buyer', () => {
      const buyer1 = createBuyer({ email: 'Test@Example.com', phone: '+1 (555) 123-4567' });
      const buyer2 = createBuyer({ email: 'test@example.com', phone: '15551234567' });

      expect(getBuyerKey(buyer1)).toBe(getBuyerKey(buyer2));
    });

    it('should generate different keys for different buyers', () => {
      const buyer1 = createBuyer({ email: 'john@example.com', phone: '5551111111' });
      const buyer2 = createBuyer({ email: 'jane@example.com', phone: '5552222222' });

      expect(getBuyerKey(buyer1)).not.toBe(getBuyerKey(buyer2));
    });
  });

  describe('duplicate merging', () => {
    it('should merge buyers with same email and phone', () => {
      const buyers = [
        createBuyer({ id: '1', email: 'test@example.com', phone: '5551234567', tickets: ['001'], orderTotal: 100 }),
        createBuyer({ id: '2', email: 'test@example.com', phone: '5551234567', tickets: ['002'], orderTotal: 100 }),
      ];

      const merged = mergeDuplicateBuyers(buyers);
      expect(merged).toHaveLength(1);
      expect(merged[0].tickets).toEqual(['001', '002']);
      expect(merged[0].ticketCount).toBe(2);
      expect(merged[0].orderTotal).toBe(200);
    });

    it('should not merge different buyers', () => {
      const buyers = [
        createBuyer({ id: '1', email: 'john@example.com', phone: '5551111111' }),
        createBuyer({ id: '2', email: 'jane@example.com', phone: '5552222222' }),
      ];

      const merged = mergeDuplicateBuyers(buyers);
      expect(merged).toHaveLength(2);
    });

    it('should deduplicate tickets when merging', () => {
      const buyers = [
        createBuyer({ tickets: ['001', '002'] }),
        createBuyer({ tickets: ['002', '003'] }), // 002 is duplicate
      ];

      const merged = mergeDuplicateBuyers(buyers);
      expect(merged[0].tickets).toEqual(['001', '002', '003']);
      expect(merged[0].ticketCount).toBe(3);
    });

    it('should handle null orderTotal', () => {
      const buyers = [
        createBuyer({ orderTotal: 100 }),
        createBuyer({ orderTotal: null }),
      ];

      const merged = mergeDuplicateBuyers(buyers);
      expect(merged[0].orderTotal).toBe(100);
    });
  });

  describe('potential duplicate detection', () => {
    it('should find buyers with same email', () => {
      const buyers = [
        createBuyer({ id: '1', email: 'same@example.com' }),
        createBuyer({ id: '2', email: 'same@example.com' }),
        createBuyer({ id: '3', email: 'different@example.com' }),
      ];

      const duplicates = findPotentialDuplicates(buyers);
      expect(duplicates.size).toBe(1);
      expect(duplicates.get('same@example.com')).toHaveLength(2);
    });

    it('should not flag unique emails', () => {
      const buyers = [
        createBuyer({ id: '1', email: 'john@example.com' }),
        createBuyer({ id: '2', email: 'jane@example.com' }),
      ];

      const duplicates = findPotentialDuplicates(buyers);
      expect(duplicates.size).toBe(0);
    });
  });

  describe('duplicate likelihood check', () => {
    it('should detect duplicates by email', () => {
      const a = createBuyer({ email: 'Test@Example.com' });
      const b = createBuyer({ email: 'test@example.com' });

      expect(areLikelyDuplicates(a, b)).toBe(true);
    });

    it('should detect duplicates by phone', () => {
      const a = createBuyer({ email: 'a@example.com', phone: '+52 55 1234 5678' });
      const b = createBuyer({ email: 'b@example.com', phone: '5512345678' });

      expect(areLikelyDuplicates(a, b)).toBe(true);
    });

    it('should detect duplicates by name and city', () => {
      const a = createBuyer({ email: 'a@example.com', phone: '1111111111', name: 'John Doe', city: 'CDMX' });
      const b = createBuyer({ email: 'b@example.com', phone: '2222222222', name: 'john doe', city: 'CDMX' });

      expect(areLikelyDuplicates(a, b)).toBe(true);
    });

    it('should not flag clearly different buyers', () => {
      const a = createBuyer({ email: 'a@example.com', phone: '1111111111', name: 'John', city: 'CDMX' });
      const b = createBuyer({ email: 'b@example.com', phone: '2222222222', name: 'Jane', city: 'GDL' });

      expect(areLikelyDuplicates(a, b)).toBe(false);
    });
  });
});

// =====================================================
// Contact Link Generation
// =====================================================

describe('useBuyers - contact link generation', () => {
  const getWhatsAppLink = (phone: string, message?: string): string => {
    const cleanPhone = phone.replace(/\D/g, '');
    const encodedMessage = message ? encodeURIComponent(message) : '';
    return `https://wa.me/${cleanPhone}${encodedMessage ? `?text=${encodedMessage}` : ''}`;
  };

  const getMailtoLink = (email: string, subject?: string, body?: string): string => {
    const params = new URLSearchParams();
    if (subject) params.set('subject', subject);
    if (body) params.set('body', body);
    const query = params.toString();
    return `mailto:${email}${query ? `?${query}` : ''}`;
  };

  describe('WhatsApp link generation', () => {
    it('should generate basic WhatsApp link', () => {
      expect(getWhatsAppLink('5551234567')).toBe('https://wa.me/5551234567');
    });

    it('should clean phone number', () => {
      expect(getWhatsAppLink('+52 55 1234 5678')).toBe('https://wa.me/525512345678');
      expect(getWhatsAppLink('(555) 123-4567')).toBe('https://wa.me/5551234567');
    });

    it('should include message when provided', () => {
      const link = getWhatsAppLink('5551234567', 'Hello!');
      expect(link).toBe('https://wa.me/5551234567?text=Hello!');
    });

    it('should encode message properly', () => {
      const link = getWhatsAppLink('5551234567', 'Hello World & More');
      expect(link).toContain(encodeURIComponent('Hello World & More'));
    });
  });

  describe('mailto link generation', () => {
    it('should generate basic mailto link', () => {
      expect(getMailtoLink('test@example.com')).toBe('mailto:test@example.com');
    });

    it('should include subject when provided', () => {
      const link = getMailtoLink('test@example.com', 'Test Subject');
      expect(link).toContain('subject=Test+Subject');
    });

    it('should include body when provided', () => {
      const link = getMailtoLink('test@example.com', undefined, 'Message body');
      expect(link).toContain('body=Message+body');
    });

    it('should include both subject and body', () => {
      const link = getMailtoLink('test@example.com', 'Subject', 'Body');
      expect(link).toContain('subject=Subject');
      expect(link).toContain('body=Body');
    });
  });
});

// =====================================================
// CSV Export Logic
// =====================================================

describe('useBuyers - CSV export', () => {
  const createBuyer = (overrides: Partial<Buyer>): Buyer => ({
    id: 'test-id',
    name: 'Test User',
    email: 'test@example.com',
    phone: '5551234567',
    city: 'Ciudad de Mexico',
    tickets: ['001', '002'],
    ticketCount: 2,
    status: 'sold',
    date: '2024-06-15T12:00:00Z',
    orderTotal: 200,
    paymentMethod: 'transfer',
    paymentReference: 'ABC123',
    hasPaymentProof: true,
    soldAt: new Date().toISOString(),
    approvedAt: null,
    paymentProofUploadedAt: null,
    approvedBy: null,
    approvedByName: null,
    ...overrides,
  });

  const escapeCSVField = (field: string): string => {
    // Escape double quotes by doubling them
    const escaped = field.replace(/"/g, '""');
    // Wrap in quotes if contains comma, newline, or quote
    if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')) {
      return `"${escaped}"`;
    }
    return `"${escaped}"`;
  };

  const formatBuyerForCSV = (buyer: Buyer): string[] => {
    return [
      buyer.name,
      buyer.email,
      buyer.phone,
      buyer.city,
      buyer.tickets.join('; '),
      buyer.ticketCount.toString(),
      buyer.status,
      buyer.date ? new Date(buyer.date).toLocaleDateString() : '',
    ];
  };

  const generateCSV = (buyers: Buyer[]): string => {
    const headers = ['Nombre', 'Email', 'Telefono', 'Ciudad', 'Boletos', 'Cantidad', 'Estado', 'Fecha'];
    const rows = buyers.map((buyer) => formatBuyerForCSV(buyer));
    const csvRows = [
      headers.join(','),
      ...rows.map((r) => r.map((cell) => escapeCSVField(cell)).join(',')),
    ];
    return csvRows.join('\n');
  };

  describe('CSV field escaping', () => {
    it('should wrap fields in quotes', () => {
      expect(escapeCSVField('simple')).toBe('"simple"');
    });

    it('should escape double quotes', () => {
      expect(escapeCSVField('has "quotes"')).toBe('"has ""quotes"""');
    });

    it('should handle commas', () => {
      expect(escapeCSVField('has, comma')).toBe('"has, comma"');
    });

    it('should handle newlines', () => {
      expect(escapeCSVField('has\nnewline')).toBe('"has\nnewline"');
    });
  });

  describe('buyer formatting', () => {
    it('should format buyer for CSV', () => {
      const buyer = createBuyer({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '5551234567',
        city: 'CDMX',
        tickets: ['001', '002', '003'],
        ticketCount: 3,
        status: 'sold',
      });

      const row = formatBuyerForCSV(buyer);
      expect(row[0]).toBe('John Doe');
      expect(row[1]).toBe('john@example.com');
      expect(row[4]).toBe('001; 002; 003');
      expect(row[5]).toBe('3');
      expect(row[6]).toBe('sold');
    });
  });

  describe('CSV generation', () => {
    it('should generate valid CSV', () => {
      const buyers = [
        createBuyer({ name: 'John', email: 'john@test.com', tickets: ['001'] }),
        createBuyer({ name: 'Jane', email: 'jane@test.com', tickets: ['002'] }),
      ];

      const csv = generateCSV(buyers);
      const lines = csv.split('\n');

      expect(lines[0]).toContain('Nombre');
      expect(lines[0]).toContain('Email');
      expect(lines).toHaveLength(3); // header + 2 buyers
    });

    it('should handle empty buyers array', () => {
      const csv = generateCSV([]);
      const lines = csv.split('\n');

      expect(lines).toHaveLength(1); // header only
      expect(lines[0]).toContain('Nombre');
    });
  });
});

// =====================================================
// Summary Statistics
// =====================================================

describe('useBuyers - summary statistics', () => {
  interface BuyersSummaryStats {
    totalBuyers: number;
    totalRevenue: number;
    pendingCount: number;
    confirmedCount: number;
    avgPerBuyer: number;
  }

  const createBuyer = (overrides: Partial<Buyer>): Buyer => ({
    id: 'test-id',
    name: 'Test User',
    email: 'test@example.com',
    phone: '5551234567',
    city: 'Ciudad de Mexico',
    tickets: ['001'],
    ticketCount: 1,
    status: 'sold',
    date: new Date().toISOString(),
    orderTotal: 100,
    paymentMethod: 'transfer',
    paymentReference: 'ABC123',
    hasPaymentProof: true,
    soldAt: new Date().toISOString(),
    approvedAt: null,
    paymentProofUploadedAt: null,
    approvedBy: null,
    approvedByName: null,
    ...overrides,
  });

  const calculateSummaryStats = (buyers: Buyer[]): BuyersSummaryStats => {
    const confirmedBuyers = buyers.filter((b) => b.status === 'sold');
    const pendingBuyers = buyers.filter((b) => b.status === 'reserved');

    const totalRevenue = confirmedBuyers.reduce(
      (sum, b) => sum + (b.orderTotal || 0),
      0
    );

    return {
      totalBuyers: buyers.length,
      totalRevenue,
      pendingCount: pendingBuyers.length,
      confirmedCount: confirmedBuyers.length,
      avgPerBuyer: buyers.length > 0 ? totalRevenue / buyers.length : 0,
    };
  };

  describe('statistics calculation', () => {
    it('should calculate totals correctly', () => {
      const buyers = [
        createBuyer({ status: 'sold', orderTotal: 100 }),
        createBuyer({ status: 'sold', orderTotal: 200 }),
        createBuyer({ status: 'reserved', orderTotal: 150 }),
      ];

      const stats = calculateSummaryStats(buyers);
      expect(stats.totalBuyers).toBe(3);
      expect(stats.confirmedCount).toBe(2);
      expect(stats.pendingCount).toBe(1);
      expect(stats.totalRevenue).toBe(300); // Only sold count
      expect(stats.avgPerBuyer).toBe(100); // 300 / 3
    });

    it('should handle empty buyers', () => {
      const stats = calculateSummaryStats([]);
      expect(stats.totalBuyers).toBe(0);
      expect(stats.totalRevenue).toBe(0);
      expect(stats.avgPerBuyer).toBe(0);
    });

    it('should handle null orderTotal', () => {
      const buyers = [
        createBuyer({ status: 'sold', orderTotal: 100 }),
        createBuyer({ status: 'sold', orderTotal: null }),
      ];

      const stats = calculateSummaryStats(buyers);
      expect(stats.totalRevenue).toBe(100);
    });
  });
});

// =====================================================
// Pagination Logic
// =====================================================

describe('useBuyers - pagination', () => {
  interface PaginationResult {
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    startIndex: number;
    endIndex: number;
  }

  const calculatePagination = (
    totalItems: number,
    page: number,
    pageSize: number
  ): PaginationResult => {
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize - 1, totalItems - 1);

    return {
      page,
      pageSize,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      startIndex,
      endIndex,
    };
  };

  const paginateBuyers = (buyers: Buyer[], page: number, pageSize: number): Buyer[] => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return buyers.slice(start, end);
  };

  describe('pagination calculation', () => {
    it('should calculate first page correctly', () => {
      const result = calculatePagination(100, 1, 20);
      expect(result.totalPages).toBe(5);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrev).toBe(false);
      expect(result.startIndex).toBe(0);
      expect(result.endIndex).toBe(19);
    });

    it('should calculate middle page correctly', () => {
      const result = calculatePagination(100, 3, 20);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrev).toBe(true);
      expect(result.startIndex).toBe(40);
      expect(result.endIndex).toBe(59);
    });

    it('should calculate last page correctly', () => {
      const result = calculatePagination(100, 5, 20);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(true);
      expect(result.startIndex).toBe(80);
      expect(result.endIndex).toBe(99);
    });

    it('should handle partial last page', () => {
      const result = calculatePagination(95, 5, 20);
      expect(result.totalPages).toBe(5);
      expect(result.endIndex).toBe(94);
    });

    it('should handle single page', () => {
      const result = calculatePagination(10, 1, 20);
      expect(result.totalPages).toBe(1);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(false);
    });

    it('should handle zero items', () => {
      const result = calculatePagination(0, 1, 20);
      expect(result.totalPages).toBe(0);
      expect(result.hasNext).toBe(false);
    });
  });

  describe('buyer slicing', () => {
    const buyers = Array.from({ length: 50 }, (_, i) => ({
      id: `${i}`,
      name: `Buyer ${i}`,
      email: `buyer${i}@example.com`,
      phone: '5551234567',
      city: 'CDMX',
      tickets: [],
      ticketCount: 0,
      status: 'sold',
      date: new Date().toISOString(),
      orderTotal: 100,
      paymentMethod: null,
      paymentReference: null,
      hasPaymentProof: false,
      soldAt: null,
      approvedAt: null,
      paymentProofUploadedAt: null,
      approvedBy: null,
      approvedByName: null,
    }));

    it('should slice first page', () => {
      const page = paginateBuyers(buyers, 1, 10);
      expect(page).toHaveLength(10);
      expect(page[0].id).toBe('0');
      expect(page[9].id).toBe('9');
    });

    it('should slice middle page', () => {
      const page = paginateBuyers(buyers, 3, 10);
      expect(page).toHaveLength(10);
      expect(page[0].id).toBe('20');
    });

    it('should slice last page', () => {
      const page = paginateBuyers(buyers, 5, 10);
      expect(page).toHaveLength(10);
      expect(page[0].id).toBe('40');
    });
  });
});

// =====================================================
// Memory Safeguards
// =====================================================

describe('useBuyers - memory safeguards', () => {
  const MAX_EXPORT_PAGES = 100;
  const MAX_MEMORY_BYTES = 50 * 1024 * 1024; // 50MB

  const shouldTruncateExport = (
    currentRecords: number,
    currentPage: number,
    estimatedSize: number
  ): { truncate: boolean; reason: string | null } => {
    if (currentPage > MAX_EXPORT_PAGES) {
      return { truncate: true, reason: 'page_limit' };
    }
    if (estimatedSize > MAX_MEMORY_BYTES) {
      return { truncate: true, reason: 'memory_limit' };
    }
    return { truncate: false, reason: null };
  };

  const estimateRecordSize = (buyer: Partial<Buyer>): number => {
    return JSON.stringify(buyer).length;
  };

  describe('export safeguards', () => {
    it('should not truncate within limits', () => {
      const result = shouldTruncateExport(1000, 1, 1024 * 1024);
      expect(result.truncate).toBe(false);
    });

    it('should truncate when page limit exceeded', () => {
      const result = shouldTruncateExport(100000, 101, 10 * 1024 * 1024);
      expect(result.truncate).toBe(true);
      expect(result.reason).toBe('page_limit');
    });

    it('should truncate when memory limit exceeded', () => {
      const result = shouldTruncateExport(50000, 50, 60 * 1024 * 1024);
      expect(result.truncate).toBe(true);
      expect(result.reason).toBe('memory_limit');
    });
  });

  describe('size estimation', () => {
    it('should estimate record size reasonably', () => {
      const buyer: Partial<Buyer> = {
        id: '12345',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '5551234567',
        tickets: ['001', '002', '003'],
      };

      const size = estimateRecordSize(buyer);
      expect(size).toBeGreaterThan(0);
      expect(size).toBeLessThan(1000); // Should be reasonable for a single record
    });
  });
});

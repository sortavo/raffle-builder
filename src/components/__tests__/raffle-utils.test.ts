import { describe, it, expect } from 'vitest';
import {
  generateSlug,
  formatTicketNumber,
  generateRandomTicketNumbers,
  getTicketLimitByTier,
  getRaffleLimitByTier,
  formatCloseSaleTime,
  formatReservationTime,
  getTemplateById,
  RAFFLE_STATUS_CONFIG,
  RAFFLE_TEMPLATES,
  MAX_CLOSE_SALE_HOURS,
  MAX_RESERVATION_MINUTES,
} from '@/lib/raffle-utils';

describe('raffle-utils', () => {
  describe('generateSlug', () => {
    it('should convert title to lowercase slug', () => {
      expect(generateSlug('Test Raffle')).toBe('test-raffle');
    });

    it('should replace spaces with hyphens', () => {
      expect(generateSlug('My Amazing Raffle')).toBe('my-amazing-raffle');
    });

    it('should remove special characters', () => {
      expect(generateSlug('Raffle! @2024')).toBe('raffle-2024');
    });

    it('should handle multiple consecutive spaces', () => {
      expect(generateSlug('Test   Multiple   Spaces')).toBe('test-multiple-spaces');
    });

    it('should remove multiple consecutive hyphens', () => {
      expect(generateSlug('Test---Raffle')).toBe('test-raffle');
    });

    it('should truncate to 50 characters', () => {
      const longTitle = 'This is a very long title that should be truncated to fifty characters maximum';
      expect(generateSlug(longTitle).length).toBeLessThanOrEqual(50);
    });

    it('should trim whitespace', () => {
      expect(generateSlug('  Test Raffle  ')).toBe('test-raffle');
    });

    it('should handle empty string', () => {
      expect(generateSlug('')).toBe('');
    });

    it('should handle Spanish characters by removing them', () => {
      // The current implementation removes non-word characters
      expect(generateSlug('Rifa de Ano Nuevo')).toBe('rifa-de-ano-nuevo');
    });
  });

  describe('formatTicketNumber', () => {
    it('should format sequential ticket numbers with leading zeros', () => {
      expect(formatTicketNumber(1, 'sequential', 100)).toBe('001');
      expect(formatTicketNumber(42, 'sequential', 100)).toBe('042');
      expect(formatTicketNumber(100, 'sequential', 100)).toBe('100');
    });

    it('should adjust padding based on total tickets', () => {
      expect(formatTicketNumber(1, 'sequential', 10)).toBe('001'); // Min 3 digits
      expect(formatTicketNumber(1, 'sequential', 1000)).toBe('0001');
      expect(formatTicketNumber(1, 'sequential', 10000)).toBe('00001');
    });

    it('should format prefixed ticket numbers', () => {
      expect(formatTicketNumber(1, 'prefixed', 100)).toBe('TKT-001');
      expect(formatTicketNumber(42, 'prefixed', 100, 'RIFA')).toBe('RIFA-042');
    });

    it('should use custom prefix when provided', () => {
      expect(formatTicketNumber(1, 'prefixed', 100, 'CUSTOM')).toBe('CUSTOM-001');
    });

    it('should format random ticket numbers same as sequential', () => {
      expect(formatTicketNumber(42, 'random', 100)).toBe('042');
    });

    it('should handle unknown format by defaulting to sequential', () => {
      expect(formatTicketNumber(1, 'unknown' as any, 100)).toBe('001');
    });

    it('should use minimum 3 digits even for small totals', () => {
      expect(formatTicketNumber(1, 'sequential', 5)).toBe('001');
      expect(formatTicketNumber(1, 'sequential', 50)).toBe('001');
    });
  });

  describe('generateRandomTicketNumbers', () => {
    it('should generate requested count of unique numbers', () => {
      const numbers = generateRandomTicketNumbers(10);
      expect(numbers.length).toBe(10);
      expect(new Set(numbers).size).toBe(10); // All unique
    });

    it('should return sorted array', () => {
      const numbers = generateRandomTicketNumbers(20);
      for (let i = 1; i < numbers.length; i++) {
        expect(numbers[i]).toBeGreaterThan(numbers[i - 1]);
      }
    });

    it('should generate positive numbers', () => {
      const numbers = generateRandomTicketNumbers(10);
      numbers.forEach(n => {
        expect(n).toBeGreaterThan(0);
      });
    });

    it('should handle large counts', () => {
      const numbers = generateRandomTicketNumbers(100);
      expect(numbers.length).toBe(100);
      expect(new Set(numbers).size).toBe(100);
    });

    it('should return empty array for count 0', () => {
      const numbers = generateRandomTicketNumbers(0);
      expect(numbers).toEqual([]);
    });
  });

  describe('getTicketLimitByTier', () => {
    it('should return correct limit for enterprise tier', () => {
      expect(getTicketLimitByTier('enterprise')).toBe(10000000);
    });

    it('should return correct limit for premium tier', () => {
      expect(getTicketLimitByTier('premium')).toBe(100000);
    });

    it('should return correct limit for pro tier', () => {
      expect(getTicketLimitByTier('pro')).toBe(30000);
    });

    it('should return correct limit for basic tier', () => {
      expect(getTicketLimitByTier('basic')).toBe(2000);
    });

    it('should return basic limit for null tier', () => {
      expect(getTicketLimitByTier(null)).toBe(2000);
    });

    it('should return basic limit for unknown tier', () => {
      expect(getTicketLimitByTier('unknown')).toBe(2000);
    });
  });

  describe('getRaffleLimitByTier', () => {
    it('should return correct limit for enterprise tier', () => {
      expect(getRaffleLimitByTier('enterprise')).toBe(999);
    });

    it('should return correct limit for premium tier', () => {
      expect(getRaffleLimitByTier('premium')).toBe(15);
    });

    it('should return correct limit for pro tier', () => {
      expect(getRaffleLimitByTier('pro')).toBe(7);
    });

    it('should return correct limit for basic tier', () => {
      expect(getRaffleLimitByTier('basic')).toBe(2);
    });

    it('should return basic limit for null tier', () => {
      expect(getRaffleLimitByTier(null)).toBe(2);
    });
  });

  describe('formatCloseSaleTime', () => {
    it('should return "Sin limite" for 0 hours', () => {
      expect(formatCloseSaleTime(0)).toBe('Sin l\u00edmite');
    });

    it('should format single hour correctly', () => {
      expect(formatCloseSaleTime(1)).toBe('1 hora antes');
    });

    it('should format multiple hours correctly', () => {
      expect(formatCloseSaleTime(6)).toBe('6 horas antes');
      expect(formatCloseSaleTime(12)).toBe('12 horas antes');
    });

    it('should format exact days correctly', () => {
      expect(formatCloseSaleTime(24)).toBe('1 d\u00eda antes');
      expect(formatCloseSaleTime(48)).toBe('2 d\u00edas antes');
      expect(formatCloseSaleTime(72)).toBe('3 d\u00edas antes');
    });

    it('should use hours for non-exact days', () => {
      expect(formatCloseSaleTime(36)).toBe('36 horas antes');
    });
  });

  describe('formatReservationTime', () => {
    it('should format minutes less than 60', () => {
      expect(formatReservationTime(15)).toBe('15 minutos');
      expect(formatReservationTime(30)).toBe('30 minutos');
    });

    it('should format exactly 1 hour', () => {
      expect(formatReservationTime(60)).toBe('1 hora');
    });

    it('should format multiple hours', () => {
      expect(formatReservationTime(120)).toBe('2 horas');
    });

    it('should format exactly 1 day', () => {
      expect(formatReservationTime(1440)).toBe('1 d\u00eda');
    });

    it('should format multiple days', () => {
      expect(formatReservationTime(2880)).toBe('2 d\u00edas');
      expect(formatReservationTime(4320)).toBe('3 d\u00edas');
    });
  });

  describe('getTemplateById', () => {
    it('should return template for valid id', () => {
      const modern = getTemplateById('modern');
      expect(modern).toBeDefined();
      expect(modern.id).toBe('modern');
    });

    it('should return first template for invalid id', () => {
      const result = getTemplateById('invalid-id');
      expect(result).toBeDefined();
      expect(result.id).toBe(RAFFLE_TEMPLATES[0].id);
    });

    it('should return first template for null', () => {
      const result = getTemplateById(null);
      expect(result).toBeDefined();
      expect(result.id).toBe(RAFFLE_TEMPLATES[0].id);
    });

    it('should return first template for undefined', () => {
      const result = getTemplateById(undefined);
      expect(result).toBeDefined();
      expect(result.id).toBe(RAFFLE_TEMPLATES[0].id);
    });

    it('should find all defined templates', () => {
      const templateIds = ['modern', 'ultra-white', 'elegant', 'elegant-gold', 'elegant-purple', 'modern-blue'];
      templateIds.forEach(id => {
        const template = getTemplateById(id);
        expect(template.id).toBe(id);
      });
    });
  });

  describe('RAFFLE_STATUS_CONFIG', () => {
    it('should have all required statuses', () => {
      expect(RAFFLE_STATUS_CONFIG).toHaveProperty('draft');
      expect(RAFFLE_STATUS_CONFIG).toHaveProperty('active');
      expect(RAFFLE_STATUS_CONFIG).toHaveProperty('paused');
      expect(RAFFLE_STATUS_CONFIG).toHaveProperty('completed');
      expect(RAFFLE_STATUS_CONFIG).toHaveProperty('canceled');
    });

    it('should have label and color for each status', () => {
      Object.values(RAFFLE_STATUS_CONFIG).forEach(config => {
        expect(config).toHaveProperty('label');
        expect(config).toHaveProperty('color');
        expect(typeof config.label).toBe('string');
        expect(typeof config.color).toBe('string');
      });
    });
  });

  describe('RAFFLE_TEMPLATES', () => {
    it('should have at least one template', () => {
      expect(RAFFLE_TEMPLATES.length).toBeGreaterThan(0);
    });

    it('should have required fields for each template', () => {
      RAFFLE_TEMPLATES.forEach(template => {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('colors');
        expect(template).toHaveProperty('fonts');
        expect(template).toHaveProperty('effects');
        expect(template).toHaveProperty('layout');
      });
    });

    it('should have valid color definitions', () => {
      RAFFLE_TEMPLATES.forEach(template => {
        expect(template.colors).toHaveProperty('primary');
        expect(template.colors).toHaveProperty('secondary');
        expect(template.colors).toHaveProperty('accent');
        expect(template.colors).toHaveProperty('background');
        expect(template.colors).toHaveProperty('text');
      });
    });

    it('should have unique template ids', () => {
      const ids = RAFFLE_TEMPLATES.map(t => t.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });
  });

  describe('Constants', () => {
    it('should have valid MAX_CLOSE_SALE_HOURS', () => {
      expect(MAX_CLOSE_SALE_HOURS).toBe(168); // 7 days
    });

    it('should have valid MAX_RESERVATION_MINUTES', () => {
      expect(MAX_RESERVATION_MINUTES).toBe(10080); // 7 days in minutes
    });
  });
});

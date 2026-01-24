import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Unit tests for CountdownTimer business logic
 * Testing the pure functions extracted from the component
 */

// Recreate the calculateTimeLeft function for testing
interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function calculateTimeLeft(targetDate: Date, now: Date = new Date()): TimeLeft {
  const target = targetDate.getTime();
  const difference = target - now.getTime();

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((difference % (1000 * 60)) / 1000),
    expired: false,
  };
}

// Helper function to pad numbers (used in component)
function pad(num: number): string {
  return num.toString().padStart(2, '0');
}

// Determine if countdown is urgent (used in component variants)
function isUrgentDefault(timeLeft: TimeLeft): boolean {
  return timeLeft.days === 0 && timeLeft.hours < 6;
}

function isUrgentCompact(timeLeft: TimeLeft): boolean {
  return timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes < 5;
}

describe('CountdownTimer Logic', () => {
  describe('calculateTimeLeft', () => {
    describe('basic calculations', () => {
      it('should calculate days correctly', () => {
        const now = new Date('2024-01-15T12:00:00Z');
        const target = new Date('2024-01-18T12:00:00Z'); // 3 days later

        const result = calculateTimeLeft(target, now);
        expect(result.days).toBe(3);
        expect(result.hours).toBe(0);
        expect(result.minutes).toBe(0);
        expect(result.seconds).toBe(0);
        expect(result.expired).toBe(false);
      });

      it('should calculate hours correctly', () => {
        const now = new Date('2024-01-15T12:00:00Z');
        const target = new Date('2024-01-15T18:30:00Z'); // 6.5 hours later

        const result = calculateTimeLeft(target, now);
        expect(result.days).toBe(0);
        expect(result.hours).toBe(6);
        expect(result.minutes).toBe(30);
        expect(result.seconds).toBe(0);
        expect(result.expired).toBe(false);
      });

      it('should calculate minutes and seconds correctly', () => {
        const now = new Date('2024-01-15T12:00:00Z');
        const target = new Date('2024-01-15T12:05:45Z'); // 5 min 45 sec later

        const result = calculateTimeLeft(target, now);
        expect(result.days).toBe(0);
        expect(result.hours).toBe(0);
        expect(result.minutes).toBe(5);
        expect(result.seconds).toBe(45);
        expect(result.expired).toBe(false);
      });

      it('should calculate complex time differences', () => {
        const now = new Date('2024-01-15T12:00:00Z');
        const target = new Date('2024-01-17T15:30:45Z'); // 2d 3h 30m 45s

        const result = calculateTimeLeft(target, now);
        expect(result.days).toBe(2);
        expect(result.hours).toBe(3);
        expect(result.minutes).toBe(30);
        expect(result.seconds).toBe(45);
      });
    });

    describe('expired state', () => {
      it('should return expired when target is in the past', () => {
        const now = new Date('2024-01-15T12:00:00Z');
        const target = new Date('2024-01-14T12:00:00Z'); // Yesterday

        const result = calculateTimeLeft(target, now);
        expect(result.expired).toBe(true);
        expect(result.days).toBe(0);
        expect(result.hours).toBe(0);
        expect(result.minutes).toBe(0);
        expect(result.seconds).toBe(0);
      });

      it('should return expired when target is exactly now', () => {
        const now = new Date('2024-01-15T12:00:00Z');
        const target = new Date('2024-01-15T12:00:00Z');

        const result = calculateTimeLeft(target, now);
        expect(result.expired).toBe(true);
      });

      it('should not be expired with 1 millisecond remaining', () => {
        const now = new Date('2024-01-15T12:00:00.000Z');
        const target = new Date('2024-01-15T12:00:00.001Z');

        const result = calculateTimeLeft(target, now);
        expect(result.expired).toBe(false);
        expect(result.seconds).toBe(0); // Less than 1 second
      });
    });

    describe('edge cases', () => {
      it('should handle exactly 1 second remaining', () => {
        const now = new Date('2024-01-15T12:00:00Z');
        const target = new Date('2024-01-15T12:00:01Z');

        const result = calculateTimeLeft(target, now);
        expect(result.seconds).toBe(1);
        expect(result.expired).toBe(false);
      });

      it('should handle exactly 1 minute remaining', () => {
        const now = new Date('2024-01-15T12:00:00Z');
        const target = new Date('2024-01-15T12:01:00Z');

        const result = calculateTimeLeft(target, now);
        expect(result.minutes).toBe(1);
        expect(result.seconds).toBe(0);
      });

      it('should handle exactly 1 hour remaining', () => {
        const now = new Date('2024-01-15T12:00:00Z');
        const target = new Date('2024-01-15T13:00:00Z');

        const result = calculateTimeLeft(target, now);
        expect(result.hours).toBe(1);
        expect(result.minutes).toBe(0);
        expect(result.seconds).toBe(0);
      });

      it('should handle exactly 1 day remaining', () => {
        const now = new Date('2024-01-15T12:00:00Z');
        const target = new Date('2024-01-16T12:00:00Z');

        const result = calculateTimeLeft(target, now);
        expect(result.days).toBe(1);
        expect(result.hours).toBe(0);
        expect(result.minutes).toBe(0);
        expect(result.seconds).toBe(0);
      });

      it('should handle large time differences (100+ days)', () => {
        const now = new Date('2024-01-15T12:00:00Z');
        const target = new Date('2024-06-15T12:00:00Z'); // ~152 days

        const result = calculateTimeLeft(target, now);
        expect(result.days).toBeGreaterThan(100);
        expect(result.expired).toBe(false);
      });
    });
  });

  describe('pad', () => {
    it('should pad single digit numbers', () => {
      expect(pad(0)).toBe('00');
      expect(pad(1)).toBe('01');
      expect(pad(9)).toBe('09');
    });

    it('should not pad double digit numbers', () => {
      expect(pad(10)).toBe('10');
      expect(pad(59)).toBe('59');
    });

    it('should handle numbers larger than 99', () => {
      expect(pad(100)).toBe('100');
      expect(pad(999)).toBe('999');
    });
  });

  describe('isUrgentDefault (lottery variant)', () => {
    it('should return true when days are 0 and hours < 6', () => {
      expect(isUrgentDefault({ days: 0, hours: 0, minutes: 30, seconds: 0, expired: false })).toBe(true);
      expect(isUrgentDefault({ days: 0, hours: 5, minutes: 59, seconds: 59, expired: false })).toBe(true);
    });

    it('should return false when days are 0 and hours >= 6', () => {
      expect(isUrgentDefault({ days: 0, hours: 6, minutes: 0, seconds: 0, expired: false })).toBe(false);
      expect(isUrgentDefault({ days: 0, hours: 23, minutes: 0, seconds: 0, expired: false })).toBe(false);
    });

    it('should return false when days > 0', () => {
      expect(isUrgentDefault({ days: 1, hours: 0, minutes: 0, seconds: 0, expired: false })).toBe(false);
      expect(isUrgentDefault({ days: 5, hours: 5, minutes: 0, seconds: 0, expired: false })).toBe(false);
    });
  });

  describe('isUrgentCompact', () => {
    it('should return true when days=0, hours=0, minutes < 5', () => {
      expect(isUrgentCompact({ days: 0, hours: 0, minutes: 0, seconds: 30, expired: false })).toBe(true);
      expect(isUrgentCompact({ days: 0, hours: 0, minutes: 4, seconds: 59, expired: false })).toBe(true);
    });

    it('should return false when days=0, hours=0, minutes >= 5', () => {
      expect(isUrgentCompact({ days: 0, hours: 0, minutes: 5, seconds: 0, expired: false })).toBe(false);
      expect(isUrgentCompact({ days: 0, hours: 0, minutes: 30, seconds: 0, expired: false })).toBe(false);
    });

    it('should return false when hours > 0', () => {
      expect(isUrgentCompact({ days: 0, hours: 1, minutes: 0, seconds: 0, expired: false })).toBe(false);
    });

    it('should return false when days > 0', () => {
      expect(isUrgentCompact({ days: 1, hours: 0, minutes: 0, seconds: 0, expired: false })).toBe(false);
    });
  });

  describe('inline variant formatting', () => {
    // Test the inline format string generation
    function formatInline(timeLeft: TimeLeft): string {
      if (timeLeft.expired) return 'Sorteo Finalizado';
      return (timeLeft.days > 0 ? `${timeLeft.days}d ` : '') +
        `${pad(timeLeft.hours)}:${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`;
    }

    it('should format without days when 0', () => {
      const timeLeft = { days: 0, hours: 5, minutes: 30, seconds: 45, expired: false };
      expect(formatInline(timeLeft)).toBe('05:30:45');
    });

    it('should include days when > 0', () => {
      const timeLeft = { days: 2, hours: 5, minutes: 30, seconds: 45, expired: false };
      expect(formatInline(timeLeft)).toBe('2d 05:30:45');
    });

    it('should return expired message when expired', () => {
      const timeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
      expect(formatInline(timeLeft)).toBe('Sorteo Finalizado');
    });
  });
});

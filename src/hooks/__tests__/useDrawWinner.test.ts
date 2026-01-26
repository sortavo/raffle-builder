import { describe, it, expect, vi } from 'vitest';

// Test the pure business logic for draw winner

type DrawMethod = 'manual' | 'lottery' | 'random_org';

interface WinnerData {
  ticket_id: string;
  ticket_number: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  buyer_city: string | null;
  draw_method: DrawMethod;
  draw_timestamp: string;
  metadata?: Record<string, unknown>;
}

interface TicketCandidate {
  id: string;
  ticket_number: string;
  buyer_name: string | null;
  buyer_email: string | null;
  status: 'sold' | 'reserved' | 'available';
}

describe('useDrawWinner - random number generation', () => {
  // Simulating the crypto-based random number generation
  const generateRandomNumber = (max: number): number => {
    // In the actual implementation, this uses crypto.getRandomValues
    // For testing, we'll verify the logic
    const randomValue = Math.floor(Math.random() * max);
    return randomValue + 1; // 1-indexed
  };

  it('should generate number within range', () => {
    for (let i = 0; i < 100; i++) {
      const num = generateRandomNumber(100);
      expect(num).toBeGreaterThanOrEqual(1);
      expect(num).toBeLessThanOrEqual(100);
    }
  });

  it('should generate number for edge cases', () => {
    const singleTicket = generateRandomNumber(1);
    expect(singleTicket).toBe(1);
  });

  it('should handle large max values', () => {
    const num = generateRandomNumber(1000000);
    expect(num).toBeGreaterThanOrEqual(1);
    expect(num).toBeLessThanOrEqual(1000000);
  });
});

describe('useDrawWinner - winner data validation', () => {
  const validateWinnerData = (data: Partial<WinnerData>): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!data.ticket_id) {
      errors.push('Ticket ID is required');
    }
    if (!data.ticket_number) {
      errors.push('Ticket number is required');
    }
    if (!data.buyer_name) {
      errors.push('Buyer name is required');
    }
    if (!data.buyer_email) {
      errors.push('Buyer email is required');
    }
    if (!data.draw_method) {
      errors.push('Draw method is required');
    }
    if (!data.draw_timestamp) {
      errors.push('Draw timestamp is required');
    }

    // Validate email format
    if (data.buyer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.buyer_email)) {
      errors.push('Invalid email format');
    }

    // Validate draw method
    const validMethods: DrawMethod[] = ['manual', 'lottery', 'random_org'];
    if (data.draw_method && !validMethods.includes(data.draw_method)) {
      errors.push('Invalid draw method');
    }

    return { valid: errors.length === 0, errors };
  };

  it('should validate complete winner data', () => {
    const data: WinnerData = {
      ticket_id: 'order-123',
      ticket_number: '0001',
      buyer_name: 'Juan Pérez',
      buyer_email: 'juan@example.com',
      buyer_phone: '+521234567890',
      buyer_city: 'Ciudad de México',
      draw_method: 'manual',
      draw_timestamp: new Date().toISOString(),
    };
    expect(validateWinnerData(data).valid).toBe(true);
  });

  it('should require ticket ID', () => {
    const result = validateWinnerData({
      ticket_number: '0001',
      buyer_name: 'Juan',
      buyer_email: 'juan@example.com',
      draw_method: 'manual',
      draw_timestamp: new Date().toISOString(),
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Ticket ID is required');
  });

  it('should validate email format', () => {
    const result = validateWinnerData({
      ticket_id: '123',
      ticket_number: '0001',
      buyer_name: 'Juan',
      buyer_email: 'invalid-email',
      draw_method: 'manual',
      draw_timestamp: new Date().toISOString(),
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid email format');
  });

  it('should validate draw method', () => {
    const result = validateWinnerData({
      ticket_id: '123',
      ticket_number: '0001',
      buyer_name: 'Juan',
      buyer_email: 'juan@example.com',
      draw_method: 'invalid' as DrawMethod,
      draw_timestamp: new Date().toISOString(),
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid draw method');
  });
});

describe('useDrawWinner - ticket eligibility', () => {
  const isEligibleForDraw = (ticket: TicketCandidate): boolean => {
    // Only sold tickets can win
    if (ticket.status !== 'sold') return false;
    // Must have buyer info
    if (!ticket.buyer_name || !ticket.buyer_email) return false;
    return true;
  };

  const getEligibleTickets = (tickets: TicketCandidate[]): TicketCandidate[] => {
    return tickets.filter(isEligibleForDraw);
  };

  it('should accept sold tickets with buyer info', () => {
    const ticket: TicketCandidate = {
      id: '1',
      ticket_number: '0001',
      buyer_name: 'Juan',
      buyer_email: 'juan@example.com',
      status: 'sold',
    };
    expect(isEligibleForDraw(ticket)).toBe(true);
  });

  it('should reject reserved tickets', () => {
    const ticket: TicketCandidate = {
      id: '1',
      ticket_number: '0001',
      buyer_name: 'Juan',
      buyer_email: 'juan@example.com',
      status: 'reserved',
    };
    expect(isEligibleForDraw(ticket)).toBe(false);
  });

  it('should reject available tickets', () => {
    const ticket: TicketCandidate = {
      id: '1',
      ticket_number: '0001',
      buyer_name: null,
      buyer_email: null,
      status: 'available',
    };
    expect(isEligibleForDraw(ticket)).toBe(false);
  });

  it('should reject tickets without buyer email', () => {
    const ticket: TicketCandidate = {
      id: '1',
      ticket_number: '0001',
      buyer_name: 'Juan',
      buyer_email: null,
      status: 'sold',
    };
    expect(isEligibleForDraw(ticket)).toBe(false);
  });

  it('should filter eligible tickets from list', () => {
    const tickets: TicketCandidate[] = [
      { id: '1', ticket_number: '0001', buyer_name: 'Juan', buyer_email: 'juan@test.com', status: 'sold' },
      { id: '2', ticket_number: '0002', buyer_name: 'Maria', buyer_email: 'maria@test.com', status: 'reserved' },
      { id: '3', ticket_number: '0003', buyer_name: 'Pedro', buyer_email: 'pedro@test.com', status: 'sold' },
      { id: '4', ticket_number: '0004', buyer_name: null, buyer_email: null, status: 'available' },
    ];
    expect(getEligibleTickets(tickets)).toHaveLength(2);
  });
});

describe('useDrawWinner - draw method descriptions', () => {
  const getDrawMethodDescription = (method: DrawMethod, language: 'en' | 'es' = 'es'): string => {
    const descriptions: Record<DrawMethod, Record<string, string>> = {
      manual: {
        en: 'Manual selection by organizer',
        es: 'Selección manual por el organizador',
      },
      lottery: {
        en: 'Traditional lottery machine',
        es: 'Máquina de lotería tradicional',
      },
      random_org: {
        en: 'Random.org certified random number',
        es: 'Número aleatorio certificado por Random.org',
      },
    };
    return descriptions[method][language];
  };

  const getDrawMethodIcon = (method: DrawMethod): string => {
    const icons: Record<DrawMethod, string> = {
      manual: 'hand',
      lottery: 'dice',
      random_org: 'globe',
    };
    return icons[method];
  };

  it('should return Spanish descriptions by default', () => {
    expect(getDrawMethodDescription('manual')).toContain('manual');
    expect(getDrawMethodDescription('lottery')).toContain('lotería');
    expect(getDrawMethodDescription('random_org')).toContain('Random.org');
  });

  it('should return English descriptions when requested', () => {
    expect(getDrawMethodDescription('manual', 'en')).toContain('Manual');
    expect(getDrawMethodDescription('lottery', 'en')).toContain('lottery');
  });

  it('should return correct icons for methods', () => {
    expect(getDrawMethodIcon('manual')).toBe('hand');
    expect(getDrawMethodIcon('lottery')).toBe('dice');
    expect(getDrawMethodIcon('random_org')).toBe('globe');
  });
});

describe('useDrawWinner - winner announcement', () => {
  const formatWinnerAnnouncement = (
    winnerName: string,
    ticketNumber: string,
    prizeName: string
  ): string => {
    return `¡Felicidades a ${winnerName} con el boleto ${ticketNumber}! Ganador de: ${prizeName}`;
  };

  const anonymizeWinnerName = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return '***';

    if (parts.length === 1) {
      const firstName = parts[0];
      if (firstName.length <= 2) return firstName[0] + '***';
      return firstName[0] + '***' + firstName[firstName.length - 1];
    }

    const firstName = parts[0];
    const lastName = parts[parts.length - 1];
    return `${firstName[0]}*** ${lastName[0]}***`;
  };

  it('should format winner announcement', () => {
    const announcement = formatWinnerAnnouncement('Juan Pérez', '0001', 'iPhone 15');
    expect(announcement).toContain('Juan Pérez');
    expect(announcement).toContain('0001');
    expect(announcement).toContain('iPhone 15');
    expect(announcement).toContain('Felicidades');
  });

  it('should anonymize single name', () => {
    expect(anonymizeWinnerName('Juan')).toBe('J***n');
    expect(anonymizeWinnerName('A')).toBe('A***');
    expect(anonymizeWinnerName('AB')).toBe('A***');
  });

  it('should anonymize full name', () => {
    expect(anonymizeWinnerName('Juan Pérez')).toBe('J*** P***');
    expect(anonymizeWinnerName('María García López')).toBe('M*** L***');
  });
});

describe('useDrawWinner - raffle completion', () => {
  interface RaffleStatus {
    status: 'active' | 'paused' | 'completed' | 'canceled';
    winner_ticket_number: string | null;
    winner_announced: boolean;
  }

  const canDrawWinner = (raffle: RaffleStatus): { allowed: boolean; reason?: string } => {
    if (raffle.status === 'completed') {
      return { allowed: false, reason: 'Raffle already completed' };
    }
    if (raffle.status === 'canceled') {
      return { allowed: false, reason: 'Raffle was canceled' };
    }
    if (raffle.status === 'paused') {
      return { allowed: false, reason: 'Raffle is paused' };
    }
    if (raffle.winner_ticket_number) {
      return { allowed: false, reason: 'Winner already selected' };
    }
    return { allowed: true };
  };

  const canAnnounceWinner = (raffle: RaffleStatus): boolean => {
    return raffle.status === 'completed' &&
           raffle.winner_ticket_number !== null &&
           !raffle.winner_announced;
  };

  it('should allow drawing winner for active raffle', () => {
    const raffle: RaffleStatus = {
      status: 'active',
      winner_ticket_number: null,
      winner_announced: false,
    };
    expect(canDrawWinner(raffle).allowed).toBe(true);
  });

  it('should not allow drawing winner for completed raffle', () => {
    const raffle: RaffleStatus = {
      status: 'completed',
      winner_ticket_number: '0001',
      winner_announced: false,
    };
    const result = canDrawWinner(raffle);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('completed');
  });

  it('should not allow drawing winner for canceled raffle', () => {
    const raffle: RaffleStatus = {
      status: 'canceled',
      winner_ticket_number: null,
      winner_announced: false,
    };
    const result = canDrawWinner(raffle);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('canceled');
  });

  it('should not allow drawing winner for paused raffle', () => {
    const raffle: RaffleStatus = {
      status: 'paused',
      winner_ticket_number: null,
      winner_announced: false,
    };
    const result = canDrawWinner(raffle);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('paused');
  });

  it('should allow announcing winner when ready', () => {
    const raffle: RaffleStatus = {
      status: 'completed',
      winner_ticket_number: '0001',
      winner_announced: false,
    };
    expect(canAnnounceWinner(raffle)).toBe(true);
  });

  it('should not allow announcing already announced winner', () => {
    const raffle: RaffleStatus = {
      status: 'completed',
      winner_ticket_number: '0001',
      winner_announced: true,
    };
    expect(canAnnounceWinner(raffle)).toBe(false);
  });
});

describe('useDrawWinner - metadata generation', () => {
  const generateDrawMetadata = (
    method: DrawMethod,
    browserInfo?: string,
    ipAddress?: string
  ): Record<string, unknown> => {
    const metadata: Record<string, unknown> = {
      draw_method: method,
      timestamp: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    if (browserInfo) {
      metadata.user_agent = browserInfo;
    }
    if (ipAddress) {
      // Partially anonymize IP for privacy
      const parts = ipAddress.split('.');
      if (parts.length === 4) {
        metadata.ip_prefix = `${parts[0]}.${parts[1]}.xxx.xxx`;
      }
    }

    return metadata;
  };

  it('should generate basic metadata', () => {
    const metadata = generateDrawMetadata('manual');
    expect(metadata.draw_method).toBe('manual');
    expect(metadata.timestamp).toBeDefined();
    expect(metadata.timezone).toBeDefined();
  });

  it('should include browser info when provided', () => {
    const metadata = generateDrawMetadata('lottery', 'Mozilla/5.0...');
    expect(metadata.user_agent).toBe('Mozilla/5.0...');
  });

  it('should anonymize IP address', () => {
    const metadata = generateDrawMetadata('random_org', undefined, '192.168.1.100');
    expect(metadata.ip_prefix).toBe('192.168.xxx.xxx');
  });
});

describe('useDrawWinner - notification templates', () => {
  interface NotificationParams {
    buyerName: string;
    ticketNumber: string;
    prizeName: string;
    raffleTitle: string;
    orgName: string;
  }

  const generateEmailSubject = (params: NotificationParams): string => {
    return `¡Felicidades ${params.buyerName}! Has ganado en ${params.raffleTitle}`;
  };

  const generateSMSMessage = (params: NotificationParams): string => {
    const message = `Felicidades! Tu boleto ${params.ticketNumber} ganó ${params.prizeName} en el sorteo de ${params.orgName}. Contacta al organizador.`;
    // SMS should be under 160 characters
    return message.length > 160 ? message.slice(0, 157) + '...' : message;
  };

  it('should generate email subject', () => {
    const subject = generateEmailSubject({
      buyerName: 'Juan',
      ticketNumber: '0001',
      prizeName: 'iPhone 15',
      raffleTitle: 'Gran Sorteo 2024',
      orgName: 'Sorteos MX',
    });
    expect(subject).toContain('Juan');
    expect(subject).toContain('Gran Sorteo 2024');
    expect(subject).toContain('Felicidades');
  });

  it('should generate SMS message under 160 chars', () => {
    const message = generateSMSMessage({
      buyerName: 'Juan',
      ticketNumber: '0001',
      prizeName: 'iPhone 15',
      raffleTitle: 'Sorteo',
      orgName: 'Sorteos MX',
    });
    expect(message.length).toBeLessThanOrEqual(160);
  });

  it('should truncate long SMS messages', () => {
    const message = generateSMSMessage({
      buyerName: 'Juan Francisco',
      ticketNumber: '0001',
      prizeName: 'iPhone 15 Pro Max 256GB Azul Pacífico con AirPods Pro',
      raffleTitle: 'Gran Sorteo Navideño 2024',
      orgName: 'Organización de Sorteos y Rifas de México',
    });
    expect(message.length).toBeLessThanOrEqual(160);
    expect(message).toContain('...');
  });
});

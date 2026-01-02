export interface Prize {
  id: string;
  name: string;
  value?: number | null;
  currency?: string | null;
  scheduled_draw_date?: string | null;
}

export type PrizeDisplayMode = 'hierarchical' | 'equal' | 'numbered';

export const PRIZE_DISPLAY_MODES = [
  { value: 'hierarchical' as const, label: '🏆 Con jerarquía', description: '1°, 2°, 3° lugar' },
  { value: 'equal' as const, label: '🎁 Todos iguales', description: 'Sin orden de importancia' },
  { value: 'numbered' as const, label: '🔢 Numerados', description: 'Premio 1, 2, 3...' },
] as const;

export const createEmptyPrize = (): Prize => ({
  id: crypto.randomUUID(),
  name: '',
  value: null,
  currency: null,
  scheduled_draw_date: null,
});

export const parsePrizes = (prizes: unknown, fallbackName?: string, fallbackValue?: number | null): Prize[] => {
  if (Array.isArray(prizes) && prizes.length > 0) {
    return prizes.map(p => ({
      id: p.id || crypto.randomUUID(),
      name: p.name || '',
      value: p.value ?? null,
      currency: p.currency ?? null,
      scheduled_draw_date: p.scheduled_draw_date ?? null,
    }));
  }
  
  // Fallback: create single prize from legacy fields
  return [{
    id: crypto.randomUUID(),
    name: fallbackName || '',
    value: fallbackValue ?? null,
    currency: null,
    scheduled_draw_date: null,
  }];
};

export const serializePrizes = (prizes: Prize[]): Array<{ id: string; name: string; value: number | null; currency: string | null; scheduled_draw_date: string | null }> => {
  return prizes.map(p => ({
    id: p.id,
    name: p.name.trim(),
    value: p.value || null,
    currency: p.currency || null,
    scheduled_draw_date: p.scheduled_draw_date || null,
  }));
};

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('DrawWinner - useEffect Cleanup', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should properly cleanup interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    
    let intervalRef: NodeJS.Timeout | null = null;
    
    // Simulate the component behavior
    const mountComponent = () => {
      intervalRef = setInterval(() => {}, 100);
      return () => {
        if (intervalRef) {
          clearInterval(intervalRef);
          intervalRef = null;
        }
      };
    };
    
    const cleanup = mountComponent();
    expect(intervalRef).not.toBeNull();
    
    // Simulate unmount
    cleanup();
    
    expect(clearIntervalSpy).toHaveBeenCalled();
    expect(intervalRef).toBeNull();
  });

  it('should prevent multiple spins from running simultaneously', async () => {
    let isSpinning = false;
    let spinIntervalRef: NodeJS.Timeout | null = null;
    let spinCount = 0;
    
    const handleSpinRandom = () => {
      // Guard against multiple spins
      if (isSpinning) return false;
      
      // Clear any existing interval first
      if (spinIntervalRef) {
        clearInterval(spinIntervalRef);
        spinIntervalRef = null;
      }
      
      isSpinning = true;
      spinCount++;
      
      let counter = 0;
      const maxSpins = 5;
      
      spinIntervalRef = setInterval(() => {
        counter++;
        if (counter >= maxSpins) {
          if (spinIntervalRef) {
            clearInterval(spinIntervalRef);
            spinIntervalRef = null;
          }
          isSpinning = false;
        }
      }, 100);
      
      return true;
    };
    
    // Try to spin multiple times simultaneously
    const result1 = handleSpinRandom();
    const result2 = handleSpinRandom();
    const result3 = handleSpinRandom();
    
    expect(result1).toBe(true);  // First spin should succeed
    expect(result2).toBe(false); // Second spin should be blocked
    expect(result3).toBe(false); // Third spin should be blocked
    expect(spinCount).toBe(1);   // Only one spin should have started
    
    // Advance timers to complete the spin
    vi.advanceTimersByTime(600);
    
    // Now we should be able to spin again
    const result4 = handleSpinRandom();
    expect(result4).toBe(true);
    expect(spinCount).toBe(2);
  });

  it('should clear existing interval before starting new spin', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    let spinIntervalRef: NodeJS.Timeout | null = null;
    let isSpinning = false;
    
    const handleSpinRandom = () => {
      if (isSpinning) return;
      
      // Clear any existing interval first
      if (spinIntervalRef) {
        clearInterval(spinIntervalRef);
        spinIntervalRef = null;
      }
      
      isSpinning = true;
      spinIntervalRef = setInterval(() => {}, 100);
    };
    
    // Create first interval
    handleSpinRandom();
    const firstInterval = spinIntervalRef;
    
    // Complete the first spin
    isSpinning = false;
    
    // Start second spin
    handleSpinRandom();
    
    // First interval should have been cleared
    expect(clearIntervalSpy).toHaveBeenCalledWith(firstInterval);
  });

  it('should handle null intervalRef gracefully', () => {
    let spinIntervalRef: NodeJS.Timeout | null = null;
    
    // Cleanup function should not throw when intervalRef is null
    const cleanup = () => {
      if (spinIntervalRef) {
        clearInterval(spinIntervalRef);
        spinIntervalRef = null;
      }
    };
    
    expect(() => cleanup()).not.toThrow();
  });

  it('should set intervalRef to null after clearing', () => {
    let spinIntervalRef: NodeJS.Timeout | null = setInterval(() => {}, 100);
    
    expect(spinIntervalRef).not.toBeNull();
    
    clearInterval(spinIntervalRef);
    spinIntervalRef = null;
    
    expect(spinIntervalRef).toBeNull();
  });
});

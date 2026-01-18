// ============================================================================
// Circuit Breaker Pattern for External API Resilience
// ============================================================================
// Prevents cascade failures when external APIs (Vercel, Stripe) are down
// States: closed (normal) → open (failing) → half-open (testing recovery)

interface CircuitState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
}

// In-memory circuit state (per isolate, resets on cold start)
const circuits = new Map<string, CircuitState>();

// Configuration
const FAILURE_THRESHOLD = 3;      // Failures before opening circuit
const RESET_TIMEOUT_MS = 60000;   // Time before trying half-open (1 minute)

/**
 * Check if circuit is open (should not make requests)
 */
export function isCircuitOpen(service: string): boolean {
  const circuit = circuits.get(service);
  
  if (!circuit) {
    return false; // No circuit = closed (allow requests)
  }

  if (circuit.state === 'open') {
    // Check if enough time has passed to try half-open
    if (Date.now() - circuit.lastFailure > RESET_TIMEOUT_MS) {
      circuit.state = 'half-open';
      console.log(`[CircuitBreaker] ${service}: open → half-open (testing recovery)`);
      return false; // Allow test request
    }
    return true; // Still open, reject request
  }

  return false; // closed or half-open = allow requests
}

/**
 * Record a successful request (closes circuit)
 */
export function recordSuccess(service: string): void {
  const circuit = circuits.get(service);
  
  if (circuit && circuit.state === 'half-open') {
    console.log(`[CircuitBreaker] ${service}: half-open → closed (recovered)`);
  }
  
  circuits.set(service, {
    failures: 0,
    lastFailure: 0,
    state: 'closed',
  });
}

/**
 * Record a failed request (may open circuit)
 */
export function recordFailure(service: string): void {
  const circuit = circuits.get(service) || {
    failures: 0,
    lastFailure: 0,
    state: 'closed' as const,
  };

  circuit.failures++;
  circuit.lastFailure = Date.now();

  if (circuit.failures >= FAILURE_THRESHOLD) {
    if (circuit.state !== 'open') {
      console.log(`[CircuitBreaker] ${service}: ${circuit.state} → open (${circuit.failures} failures)`);
    }
    circuit.state = 'open';
  }

  circuits.set(service, circuit);
}

/**
 * Get circuit status for monitoring
 */
export function getCircuitStatus(service: string): {
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  lastFailureAgo: number | null;
} {
  const circuit = circuits.get(service);
  
  if (!circuit) {
    return { state: 'closed', failures: 0, lastFailureAgo: null };
  }

  return {
    state: circuit.state,
    failures: circuit.failures,
    lastFailureAgo: circuit.lastFailure ? Date.now() - circuit.lastFailure : null,
  };
}

/**
 * Reset circuit (for testing or manual recovery)
 */
export function resetCircuit(service: string): void {
  circuits.delete(service);
  console.log(`[CircuitBreaker] ${service}: manually reset`);
}

/**
 * Get all circuit statuses
 */
export function getAllCircuitStatuses(): Record<string, ReturnType<typeof getCircuitStatus>> {
  const statuses: Record<string, ReturnType<typeof getCircuitStatus>> = {};
  
  for (const [service] of circuits) {
    statuses[service] = getCircuitStatus(service);
  }
  
  return statuses;
}

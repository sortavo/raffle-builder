/**
 * Persistent Circuit Breaker using Redis
 * State survives cold starts and is shared across all Edge Function isolates
 *
 * States:
 * - closed: Normal operation, all requests pass through
 * - open: Service is failing, requests are rejected immediately
 * - half-open: Testing if service has recovered, limited requests allowed
 */

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitStatus {
  state: CircuitState;
  failures: number;
  lastFailure: number;
  lastSuccess: number;
  openedAt: number | null;
  halfOpenSuccesses: number;
}

export interface CircuitConfig {
  failureThreshold: number;    // Failures before opening circuit
  successThreshold: number;    // Successes in half-open before closing
  timeout: number;             // Ms before trying half-open
  resetTimeout: number;        // Ms of success before resetting failure count
}

// Default configuration
const DEFAULT_CONFIG: CircuitConfig = {
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 30000,        // 30 seconds before half-open
  resetTimeout: 60000,   // 1 minute of success to reset
};

const CIRCUIT_PREFIX = 'circuit:';
const CIRCUIT_TTL_SECONDS = 3600; // 1 hour TTL for circuit state

// In-memory fallback when Redis is unavailable
const memoryCircuits = new Map<string, CircuitStatus>();

/**
 * Get circuit status from Redis, with in-memory fallback.
 */
export async function getCircuitStatus(
  redisUrl: string | undefined,
  redisToken: string | undefined,
  serviceName: string
): Promise<CircuitStatus> {
  const defaultStatus: CircuitStatus = {
    state: 'closed',
    failures: 0,
    lastFailure: 0,
    lastSuccess: Date.now(),
    openedAt: null,
    halfOpenSuccesses: 0,
  };

  // If no Redis, use memory fallback
  if (!redisUrl || !redisToken) {
    return memoryCircuits.get(serviceName) || defaultStatus;
  }

  try {
    const response = await fetch(redisUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${redisToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['GET', `${CIRCUIT_PREFIX}${serviceName}`]),
    });

    if (!response.ok) {
      return memoryCircuits.get(serviceName) || defaultStatus;
    }

    const data = await response.json();
    if (data.result) {
      const status = JSON.parse(data.result as string) as CircuitStatus;
      // Also cache in memory for faster subsequent reads
      memoryCircuits.set(serviceName, status);
      return status;
    }
  } catch (e) {
    console.warn(`[CIRCUIT-BREAKER] Redis get failed for ${serviceName}:`, e);
  }

  return memoryCircuits.get(serviceName) || defaultStatus;
}

/**
 * Save circuit status to Redis, with in-memory fallback.
 */
async function setCircuitStatus(
  redisUrl: string | undefined,
  redisToken: string | undefined,
  serviceName: string,
  status: CircuitStatus
): Promise<void> {
  // Always update memory cache
  memoryCircuits.set(serviceName, status);

  // If no Redis, we're done
  if (!redisUrl || !redisToken) {
    return;
  }

  try {
    await fetch(redisUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${redisToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        'SET',
        `${CIRCUIT_PREFIX}${serviceName}`,
        JSON.stringify(status),
        'EX', CIRCUIT_TTL_SECONDS.toString()
      ]),
    });
  } catch (e) {
    console.warn(`[CIRCUIT-BREAKER] Redis set failed for ${serviceName}:`, e);
  }
}

/**
 * Check if circuit is open (should block requests).
 */
export async function isCircuitOpen(
  redisUrl: string | undefined,
  redisToken: string | undefined,
  serviceName: string,
  config: CircuitConfig = DEFAULT_CONFIG
): Promise<boolean> {
  const status = await getCircuitStatus(redisUrl, redisToken, serviceName);
  const now = Date.now();

  if (status.state === 'open') {
    // Check if timeout has passed to move to half-open
    if (status.openedAt && now - status.openedAt >= config.timeout) {
      // Move to half-open
      status.state = 'half-open';
      status.halfOpenSuccesses = 0;
      await setCircuitStatus(redisUrl, redisToken, serviceName, status);
      console.log(`[CIRCUIT-BREAKER] ${serviceName}: open -> half-open (testing recovery)`);
      return false; // Allow test request
    }
    return true; // Still open, block request
  }

  return false; // closed or half-open = allow request
}

/**
 * Record a successful request (may close circuit from half-open).
 */
export async function recordSuccess(
  redisUrl: string | undefined,
  redisToken: string | undefined,
  serviceName: string,
  config: CircuitConfig = DEFAULT_CONFIG
): Promise<void> {
  const status = await getCircuitStatus(redisUrl, redisToken, serviceName);
  const now = Date.now();

  status.lastSuccess = now;

  if (status.state === 'half-open') {
    status.halfOpenSuccesses++;
    
    if (status.halfOpenSuccesses >= config.successThreshold) {
      status.state = 'closed';
      status.failures = 0;
      status.openedAt = null;
      status.halfOpenSuccesses = 0;
      console.log(`[CIRCUIT-BREAKER] ${serviceName}: half-open -> closed (recovered after ${config.successThreshold} successes)`);
    }
  } else if (status.state === 'closed') {
    // Reset failures after sustained success
    if (now - status.lastFailure > config.resetTimeout) {
      status.failures = 0;
    }
  }

  await setCircuitStatus(redisUrl, redisToken, serviceName, status);
}

/**
 * Record a failed request (may open circuit).
 */
export async function recordFailure(
  redisUrl: string | undefined,
  redisToken: string | undefined,
  serviceName: string,
  config: CircuitConfig = DEFAULT_CONFIG
): Promise<void> {
  const status = await getCircuitStatus(redisUrl, redisToken, serviceName);
  const now = Date.now();

  status.failures++;
  status.lastFailure = now;

  if (status.state === 'half-open') {
    // Any failure in half-open immediately opens the circuit
    status.state = 'open';
    status.openedAt = now;
    status.halfOpenSuccesses = 0;
    console.log(`[CIRCUIT-BREAKER] ${serviceName}: half-open -> open (failed during recovery test)`);
  } else if (status.state === 'closed' && status.failures >= config.failureThreshold) {
    status.state = 'open';
    status.openedAt = now;
    console.log(`[CIRCUIT-BREAKER] ${serviceName}: closed -> open (${status.failures} failures >= threshold ${config.failureThreshold})`);
  }

  await setCircuitStatus(redisUrl, redisToken, serviceName, status);
}

/**
 * Wrapper function to execute an operation with circuit breaker protection.
 * Throws an error if circuit is open.
 */
export async function withCircuitBreaker<T>(
  redisUrl: string | undefined,
  redisToken: string | undefined,
  serviceName: string,
  operation: () => Promise<T>,
  config: CircuitConfig = DEFAULT_CONFIG
): Promise<T> {
  if (await isCircuitOpen(redisUrl, redisToken, serviceName, config)) {
    throw new Error(`Circuit breaker open for ${serviceName}`);
  }

  try {
    const result = await operation();
    await recordSuccess(redisUrl, redisToken, serviceName, config);
    return result;
  } catch (error) {
    await recordFailure(redisUrl, redisToken, serviceName, config);
    throw error;
  }
}

/**
 * Get all circuit statuses for monitoring.
 */
export function getAllCircuitStatuses(): Record<string, CircuitStatus> {
  const statuses: Record<string, CircuitStatus> = {};
  
  for (const [service, status] of memoryCircuits) {
    statuses[service] = status;
  }
  
  return statuses;
}

/**
 * Reset a circuit manually (for testing or recovery).
 */
export async function resetCircuit(
  redisUrl: string | undefined,
  redisToken: string | undefined,
  serviceName: string
): Promise<void> {
  memoryCircuits.delete(serviceName);

  if (redisUrl && redisToken) {
    try {
      await fetch(redisUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${redisToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['DEL', `${CIRCUIT_PREFIX}${serviceName}`]),
      });
    } catch (e) {
      console.warn(`[CIRCUIT-BREAKER] Redis reset failed for ${serviceName}:`, e);
    }
  }

  console.log(`[CIRCUIT-BREAKER] ${serviceName}: manually reset`);
}

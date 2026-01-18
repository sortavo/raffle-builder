// ============================================================================
// Redis Client with Timeout Protection
// ============================================================================
// Provides timeout-protected Redis operations for Edge Functions
// Prevents hanging requests when Redis is slow or unavailable

const REDIS_TIMEOUT_MS = 2000;

/**
 * Execute a single Redis command with timeout protection
 */
export async function redisCommand(
  redisUrl: string,
  redisToken: string,
  command: string[]
): Promise<{ result?: unknown; error?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REDIS_TIMEOUT_MS);

  try {
    const response = await fetch(redisUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${redisToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const data = await response.json();
    return { result: data.result };
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      return { error: 'Redis timeout' };
    }
    return { error: String(error) };
  }
}

/**
 * Execute multiple Redis commands in a pipeline (batch operation)
 * Much more efficient than individual commands for bulk operations
 */
export async function redisPipeline(
  redisUrl: string,
  redisToken: string,
  commands: string[][]
): Promise<{ results?: unknown[]; error?: string }> {
  if (commands.length === 0) {
    return { results: [] };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REDIS_TIMEOUT_MS);

  try {
    const response = await fetch(`${redisUrl}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${redisToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const data = await response.json();
    return { results: Array.isArray(data) ? data : [data] };
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      return { error: 'Redis timeout' };
    }
    return { error: String(error) };
  }
}

/**
 * Delete multiple keys efficiently using pipeline
 */
export async function redisDeleteKeys(
  redisUrl: string,
  redisToken: string,
  keys: string[]
): Promise<{ deletedCount: number; error?: string }> {
  if (keys.length === 0) {
    return { deletedCount: 0 };
  }

  const commands = keys.map(key => ['DEL', key]);
  const result = await redisPipeline(redisUrl, redisToken, commands);

  if (result.error) {
    return { deletedCount: 0, error: result.error };
  }

  // Count successful deletions (each result is { result: 0 | 1 })
  const deletedCount = (result.results || []).reduce((sum: number, r: unknown) => {
    const res = r as { result?: number };
    return sum + (res?.result || 0);
  }, 0);

  return { deletedCount };
}

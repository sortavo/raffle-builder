import { lazy, ComponentType } from 'react';

/**
 * Wrapper around React.lazy that retries failed imports and refreshes on persistent failures.
 * This handles the common "Importing a module script failed" error on Mobile Safari
 * that occurs after deployments when the browser has cached old chunk filenames.
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  retries = 3,
  retryDelay = 1000
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    const sessionKey = `retry-refresh-${importFn.toString().slice(0, 50)}`;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const module = await importFn();
        // Success - clear the refresh flag
        sessionStorage.removeItem(sessionKey);
        return module;
      } catch (error) {
        const isLastAttempt = attempt === retries - 1;

        console.warn(
          `[lazyWithRetry] Import failed (attempt ${attempt + 1}/${retries}):`,
          error
        );

        if (isLastAttempt) {
          // Check if we've already tried refreshing this session
          const hasRefreshed = sessionStorage.getItem(sessionKey);

          if (!hasRefreshed) {
            // Mark that we're about to refresh
            sessionStorage.setItem(sessionKey, 'true');
            console.warn('[lazyWithRetry] All retries failed, forcing page reload...');

            // Clear the module cache by reloading with cache-busting
            window.location.reload();

            // Return a never-resolving promise to prevent rendering while reloading
            return new Promise(() => {});
          }

          // We already tried refreshing, throw the error
          console.error('[lazyWithRetry] Import failed even after refresh');
          throw error;
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }

    // This should never be reached, but TypeScript needs it
    throw new Error('Unexpected end of retry loop');
  });
}

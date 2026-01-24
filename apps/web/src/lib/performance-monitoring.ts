import * as Sentry from "@sentry/react";

/**
 * Web Vitals Performance Monitoring
 * Reports Core Web Vitals metrics to Sentry for alerting
 */

// Thresholds based on Google's Core Web Vitals (in milliseconds, except CLS)
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },    // Largest Contentful Paint
  FID: { good: 100, poor: 300 },      // First Input Delay
  CLS: { good: 0.1, poor: 0.25 },     // Cumulative Layout Shift
  INP: { good: 200, poor: 500 },      // Interaction to Next Paint
  TTFB: { good: 800, poor: 1800 },    // Time to First Byte
  FCP: { good: 1800, poor: 3000 },    // First Contentful Paint
} as const;

type MetricName = keyof typeof THRESHOLDS;
type MetricRating = 'good' | 'needs-improvement' | 'poor';

interface WebVitalsMetric {
  name: string;
  value: number;
  id?: string;
}

function getRating(name: string, value: number): MetricRating {
  const threshold = THRESHOLDS[name as MetricName];
  if (!threshold) return 'good';
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Reports a Web Vitals metric to Sentry
 * Poor metrics are captured as warning events for alerting
 */
export function reportWebVitals(metric: WebVitalsMetric): void {
  const rating = getRating(metric.name, metric.value);
  
  // Add breadcrumb for all metrics
  Sentry.addBreadcrumb({
    category: 'web-vital',
    message: `${metric.name}: ${metric.value.toFixed(2)} (${rating})`,
    level: rating === 'poor' ? 'warning' : 'info',
    data: {
      metric_name: metric.name,
      metric_value: metric.value,
      metric_rating: rating,
      metric_id: metric.id,
    },
  });
  
  // Capture poor metrics as events for alerting
  if (rating === 'poor') {
    const threshold = THRESHOLDS[metric.name as MetricName];
    
    Sentry.captureMessage(`Poor Web Vital: ${metric.name}`, {
      level: 'warning',
      tags: {
        metric_name: metric.name,
        metric_rating: rating,
        performance_issue: 'true',
      },
      extra: {
        value: metric.value,
        threshold_good: threshold?.good,
        threshold_poor: threshold?.poor,
        exceeded_by: threshold ? ((metric.value / threshold.poor) * 100 - 100).toFixed(1) + '%' : 'N/A',
      },
    });
  }
}

// Cumulative CLS value tracker
let clsValue = 0;
let clsEntries: PerformanceEntry[] = [];

/**
 * Initialize Web Vitals monitoring using Performance Observer API
 * Automatically reports LCP, FID, CLS, and FCP to Sentry
 */
export function initPerformanceMonitoring(): void {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') {
    console.warn('Performance monitoring not supported in this environment');
    return;
  }
  
  try {
    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        reportWebVitals({ 
          name: 'LCP', 
          value: lastEntry.startTime,
          id: `lcp-${Date.now()}`,
        });
      }
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

    // First Input Delay (FID)
    const fidObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const fidEntry = entry as PerformanceEventTiming;
        reportWebVitals({ 
          name: 'FID', 
          value: fidEntry.processingStart - fidEntry.startTime,
          id: `fid-${Date.now()}`,
        });
      }
    });
    fidObserver.observe({ type: 'first-input', buffered: true });

    // Cumulative Layout Shift (CLS)
    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        // Only count layout shifts without recent user input
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
          clsEntries.push(entry);
        }
      }
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });

    // Report CLS on page hide (most accurate final value)
    const reportCLS = () => {
      if (clsValue > 0) {
        reportWebVitals({ 
          name: 'CLS', 
          value: clsValue,
          id: `cls-${Date.now()}`,
        });
      }
    };

    // Report CLS when page is hidden or unloaded
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        reportCLS();
      }
    });

    // First Contentful Paint (FCP)
    const fcpObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          reportWebVitals({ 
            name: 'FCP', 
            value: entry.startTime,
            id: `fcp-${Date.now()}`,
          });
        }
      }
    });
    fcpObserver.observe({ type: 'paint', buffered: true });

    // Time to First Byte (TTFB)
    const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    if (navEntries.length > 0) {
      const navEntry = navEntries[0];
      reportWebVitals({ 
        name: 'TTFB', 
        value: navEntry.responseStart - navEntry.requestStart,
        id: `ttfb-${Date.now()}`,
      });
    }

    console.debug('[Performance] Web Vitals monitoring initialized');
  } catch (error) {
    console.warn('Failed to initialize performance monitoring:', error);
  }
}

/**
 * Reports a custom performance metric
 */
export function reportCustomMetric(name: string, value: number, unit: string = 'ms'): void {
  Sentry.addBreadcrumb({
    category: 'performance',
    message: `${name}: ${value.toFixed(2)} ${unit}`,
    level: 'info',
    data: { metric_name: name, value, unit },
  });
}

/**
 * Wraps an async operation and reports its duration
 */
export async function measureAsync<T>(
  name: string,
  operation: () => Promise<T>,
  slowThreshold: number = 3000
): Promise<T> {
  const start = performance.now();
  
  try {
    const result = await operation();
    const duration = performance.now() - start;
    
    reportCustomMetric(name, duration);
    
    if (duration > slowThreshold) {
      Sentry.captureMessage(`Slow operation: ${name}`, {
        level: 'warning',
        tags: { slow_operation: 'true' },
        extra: { duration, threshold: slowThreshold },
      });
    }
    
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    reportCustomMetric(`${name}_failed`, duration);
    throw error;
  }
}

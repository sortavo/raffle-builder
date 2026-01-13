import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initPerformanceMonitoring } from "./lib/performance-monitoring";

// Initialize Sentry with comprehensive performance monitoring
Sentry.init({
  dsn: "https://f27ed90bc71cfafe4fabadc264ecece1@o4510616701304832.ingest.us.sentry.io/4510616705892352",
  environment: import.meta.env.PROD ? "production" : "development",
  integrations: [
    Sentry.browserTracingIntegration({
      // Track slow transactions and interactions
      enableLongTask: true,
      enableInp: true,
    }),
  ],
  
  // Performance Monitoring - higher sample rate for production visibility
  tracesSampleRate: import.meta.env.PROD ? 0.5 : 1.0,
  
  // Session Replay - loaded lazily below
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: import.meta.env.PROD ? 1.0 : 0,
  
  // Tag slow transactions for alerting
  beforeSendTransaction(event) {
    const duration = event.timestamp && event.start_timestamp 
      ? (event.timestamp - event.start_timestamp) * 1000 
      : 0;
    
    if (duration > 3000) {
      event.tags = { ...event.tags, slow_transaction: 'true' };
    }
    if (duration > 5000) {
      event.tags = { ...event.tags, critical_latency: 'true' };
    }
    
    return event;
  },
});

// Initialize Web Vitals monitoring
if (typeof window !== 'undefined') {
  // Defer to avoid blocking initial render
  requestIdleCallback?.(() => initPerformanceMonitoring()) 
    ?? setTimeout(() => initPerformanceMonitoring(), 100);
}

// Lazy load Session Replay in production to avoid React context conflicts
if (import.meta.env.PROD) {
  setTimeout(() => {
    Sentry.addIntegration(
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      })
    );
  }, 2000);
}

createRoot(document.getElementById("root")!).render(<App />);

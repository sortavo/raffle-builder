import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize Sentry with deferred replay loading to avoid React context conflicts
Sentry.init({
  dsn: "https://f27ed90bc71cfafe4fabadc264ecece1@o4510616701304832.ingest.us.sentry.io/4510616705892352",
  environment: import.meta.env.PROD ? "production" : "development",
  integrations: [
    Sentry.browserTracingIntegration(),
  ],
  // Performance Monitoring
  tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
  // Session Replay - loaded lazily below
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
});

// Lazy load Session Replay in production to avoid conflicts
if (import.meta.env.PROD) {
  // Defer replay initialization to after React is stable
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

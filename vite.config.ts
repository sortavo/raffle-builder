import { defineConfig, PluginOption } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { sentryVitePlugin } from "@sentry/vite-plugin";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const plugins: PluginOption[] = [react()];
  
  if (mode === "development") {
    plugins.push(componentTagger() as PluginOption);
  }
  
  // Sentry source maps upload (only in production builds with auth token)
  if (mode === "production" && process.env.SENTRY_AUTH_TOKEN) {
    plugins.push(
      sentryVitePlugin({
        org: process.env.SENTRY_ORG || "sortavo",
        project: process.env.SENTRY_PROJECT || "sortavo",
        authToken: process.env.SENTRY_AUTH_TOKEN,
        sourcemaps: {
          filesToDeleteAfterUpload: ["**/*.map"],
        },
      }) as PluginOption
    );
  }

  return {
    server: {
      host: "::",
      port: 8080,
    },
    build: {
      sourcemap: true,
    },
    plugins,
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});

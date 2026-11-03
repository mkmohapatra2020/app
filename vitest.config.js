import { defineConfig } from 'vitest/config';

// Unit tests (npm test). Separate from vite.config.js so the dev-server proxies and
// Azure keys are never loaded during tests.
export default defineConfig({
  // Same JSX runtime as the app build (@vitejs/plugin-react), so .jsx components render in tests.
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx,js,jsx}'],
    env: { VITE_BACKEND_URL: 'https://api.example.test/api', VITE_WL_API_KEY: '', VITE_MOCK_API: 'off' },
    restoreMocks: true,
  },
});

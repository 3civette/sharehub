import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: [],
    include: ['tests/**/*.test.ts', '../tests/**/*.test.ts'],
    exclude: ['node_modules', '.next'],
    testTimeout: 30000,
    // Load environment variables for tests
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Ensure proper module resolution for ESM packages
    conditions: ['node', 'import', 'module', 'browser', 'default'],
  },
  // Handle ESM dependencies
  ssr: {
    noExternal: ['@supabase/supabase-js', '@supabase/auth-helpers-nextjs'],
  },
});

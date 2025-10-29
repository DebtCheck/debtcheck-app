/// <reference types="vitest" />
import { defineConfig, mergeConfig } from 'vitest/config';
import path from 'node:path';
import react from '@vitejs/plugin-react';

const baseConfig = defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setupTests.ts'],
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'tests/**/*.{test,spec}.{ts,tsx}',
    ],
    coverage: {
      enabled: true,
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/__tests__/**', 'src/**/types/**', 'src/**/*.d.ts'],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});

export default baseConfig;

export const api = mergeConfig(
  baseConfig, // <- the config above
  defineConfig({
    test: {
      include: ["tests/api/**/*.test.ts"],
      environment: "node",                 // <-- node for API route tests
      setupFiles: ["./tests/setupApi.ts"], // minimal setup for node env
    },
  })
);
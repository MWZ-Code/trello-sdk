import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit_tests/**/*.test.ts'],
    setupFiles: ['./tests/helpers/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 60000,
    sequence: {
      sequential: true,
    },
    singleFork: true,
    reporters: ['verbose'],
  },
})

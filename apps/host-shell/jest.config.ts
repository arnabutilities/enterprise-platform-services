import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/app/(.*)$': '<rootDir>/src/app/$1',
    '^@/shell/(.*)$': '<rootDir>/src/shell/$1',
    '^@/federation/(.*)$': '<rootDir>/src/federation/$1',
    '^@/runtime/(.*)$': '<rootDir>/src/runtime/$1',
    '^@/auth/(.*)$': '<rootDir>/src/auth/$1',
    '^@/telemetry/(.*)$': '<rootDir>/src/telemetry/$1',
    '^@/events/(.*)$': '<rootDir>/src/events/$1',
    '^@/middleware/(.*)$': '<rootDir>/src/middleware/$1',
    '^@/resilience/(.*)$': '<rootDir>/src/resilience/$1',
    '^@/config/(.*)$': '<rootDir>/src/config/$1',
    '^@/routing/(.*)$': '<rootDir>/src/routing/$1',
    '^@/state/(.*)$': '<rootDir>/src/state/$1',
    '^@/services/(.*)$': '<rootDir>/src/services/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/styles/(.*)$': '<rootDir>/src/styles/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/**/*.stories.tsx'],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/src/**/*.{spec,test}.{ts,tsx}',
  ],
};

export default config;

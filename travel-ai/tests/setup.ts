/**
 * Vitest Setup File
 * Runs before all tests
 */

import { beforeAll, afterAll, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Setup before all tests
beforeAll(() => {
  // Initialize test environment
  console.log('🧪 Test environment initialized');
});

// Cleanup after each test
afterEach(() => {
  // Clear mocks, reset state
});

// Cleanup after all tests
afterAll(() => {
  // Close connections, cleanup resources
  console.log('✅ Test environment cleaned up');
});

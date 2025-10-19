/**
 * Vitest Setup File
 * Runs before all tests
 */

import { beforeAll, afterAll, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Setup before all tests
beforeAll(() => {
  // Set default test environment variables if not present
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️  OPENAI_API_KEY not found in environment. Tests requiring API calls will fail.');
    console.warn('💡 Create a .env file with OPENAI_API_KEY to run integration tests.');
  }
  
  if (!process.env.MODEL_NAME) {
    process.env.MODEL_NAME = 'gpt-4o-mini';
  }
  
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

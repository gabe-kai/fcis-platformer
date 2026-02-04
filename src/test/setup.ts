import 'fake-indexeddb/auto';
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
// afterEach is available globally when globals: true in vitest config
afterEach(() => {
  cleanup();
});

# Tests

This directory contains all tests for the Travel AI App.

## Structure

- **unit/**: Unit tests for isolated components and functions
  - `lib/`: Tests for services, validations, and utilities
  - `ai/`: Tests for AI agents, RAG pipeline, and prompts

- **integration/**: Integration tests for API routes and database operations
  - `api/`: API endpoint tests

- **e2e/**: End-to-end tests for user workflows
  - `dashboard/`: Dashboard flow tests

## Running Tests

```bash
# Run all tests
pnpm test

# Run unit tests only
pnpm test:unit

# Run integration tests
pnpm test:integration

# Run e2e tests
pnpm test:e2e

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

## Testing Stack

- **Vitest**: Test runner and assertion library
- **Testing Library**: React component testing
- **MSW**: API mocking for integration tests
- **Playwright**: E2E testing (optional)

## Best Practices

1. **Isolation**: Each test should be independent
2. **Clarity**: Test names should describe what they test
3. **Coverage**: Aim for >80% code coverage on critical paths
4. **Speed**: Keep unit tests fast (<100ms each)
5. **Mocking**: Mock external dependencies (APIs, databases)

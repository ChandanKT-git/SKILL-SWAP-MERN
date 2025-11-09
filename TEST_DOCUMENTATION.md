# SkillSwap Test Suite Documentation

## Overview

This document describes the comprehensive test suite for the SkillSwap application, covering unit tests, integration tests, end-to-end tests, and CI/CD integration.

## Test Structure

### Backend Tests (`backend/tests/`)

```
tests/
├── unit/
│   ├── controllers/          # Controller unit tests
│   │   ├── authController.test.js
│   │   ├── profileController.test.js
│   │   └── sessionController.test.js
│   ├── services/             # Service unit tests
│   │   ├── emailService.test.js
│   │   └── sessionService.test.js
│   └── admin.test.js         # Admin middleware tests
├── integration/              # API endpoint integration tests
│   ├── auth.test.js
│   ├── profile.test.js
│   ├── session.test.js
│   ├── review.test.js
│   ├── search.test.js
│   ├── chat.test.js
│   └── admin.test.js
├── e2e/                      # End-to-end user journey tests
│   └── userJourney.test.js
├── services/                 # Service layer tests
│   └── otpService.test.js
├── utils/                    # Utility function tests
│   ├── jwt.test.js
│   └── password.test.js
├── models/                   # Database model tests
│   ├── User.test.js
│   └── chat.test.js
├── security/                 # Security tests
│   └── security.test.js
├── performance/              # Performance tests
│   └── performance.test.js
└── helpers/                  # Test helpers
    └── testDb.js
```

### Frontend Tests (`frontend/src/tests/`)

```
tests/
├── LoginForm.test.jsx        # Login component tests
├── RegisterForm.test.jsx     # Registration component tests
├── Dashboard.test.jsx        # Dashboard component tests
├── ProfileView.test.jsx      # Profile view tests
├── SearchBar.test.jsx        # Search functionality tests
├── SearchResults.test.jsx    # Search results tests
├── FilterPanel.test.jsx      # Filter panel tests
├── UserCard.test.jsx         # User card component tests
├── SessionBookingForm.test.jsx
├── SessionCard.test.jsx
├── SessionList.test.jsx
├── ReviewForm.test.jsx
├── ReviewCard.test.jsx
├── StarRating.test.jsx
├── ChatWindow.test.jsx
├── ChatContactList.test.jsx
├── MessageInput.test.jsx
├── MessageList.test.jsx
├── AdminDashboard.test.jsx
├── UserManagement.test.jsx
└── ContentModeration.test.jsx
```

## Running Tests

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test suite
npm test -- auth.test.js

# Run unit tests only
npm test -- --testPathPattern=unit

# Run integration tests only
npm test -- --testPathPattern=integration

# Run E2E tests only
npm test -- --testPathPattern=e2e
```

### Frontend Tests

```bash
cd frontend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- LoginForm.test.jsx
```

## Test Coverage Goals

### Backend Coverage Thresholds

- **Global**: 80% lines, 75% functions, 70% branches
- **Controllers**: 85% lines, 80% functions, 75% branches
- **Services**: 85% lines, 80% functions, 75% branches
- **Utils**: 90% lines, 85% functions, 80% branches

### Frontend Coverage Thresholds

- **Global**: 75% lines, 70% functions, 65% branches
- **Components**: 80% lines, 75% functions, 70% branches
- **Pages**: 75% lines, 70% functions, 65% branches

## Test Categories

### 1. Unit Tests

Test individual functions and components in isolation.

**Backend Unit Tests:**
- Controller methods with mocked dependencies
- Service functions with mocked database calls
- Utility functions (JWT, password hashing, OTP generation)
- Middleware functions

**Frontend Unit Tests:**
- Component rendering
- User interactions
- Form validation
- State management

### 2. Integration Tests

Test API endpoints with real database connections (in-memory MongoDB).

**Coverage:**
- Authentication flow (register, login, OTP verification)
- Profile management (CRUD operations)
- Session booking and management
- Review and rating system
- Search and filtering
- Real-time chat
- Admin operations

### 3. End-to-End Tests

Test complete user journeys from start to finish.

**User Journeys:**
- Complete registration and login flow
- Profile creation and skill management
- Session booking and acceptance
- Review submission after session
- Search and discovery flow
- Admin moderation workflow

### 4. Security Tests

Test security measures and authentication.

**Coverage:**
- JWT token validation
- Password hashing and comparison
- Rate limiting
- Input sanitization
- Authorization checks
- CORS configuration

### 5. Performance Tests

Test application performance under load.

**Coverage:**
- Database query optimization
- API response times
- Concurrent user handling
- Search performance with large datasets

## CI/CD Integration

### GitHub Actions Workflow

The test suite runs automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**Workflow Steps:**
1. Backend tests on Node.js 18.x and 20.x
2. Frontend tests on Node.js 18.x and 20.x
3. Integration tests with MongoDB service
4. Security audit for dependencies
5. Coverage report upload to Codecov

### Running CI/CD Locally

```bash
# Install act (GitHub Actions local runner)
# https://github.com/nektos/act

# Run workflow locally
act push
```

## Test Best Practices

### Writing Tests

1. **Follow AAA Pattern**: Arrange, Act, Assert
2. **Use Descriptive Names**: Test names should describe what they test
3. **Test One Thing**: Each test should verify one specific behavior
4. **Mock External Dependencies**: Use mocks for external services
5. **Clean Up**: Reset state between tests

### Example Test Structure

```javascript
describe('FeatureName', () => {
    describe('specificFunction', () => {
        it('should do something when condition is met', async () => {
            // Arrange
            const input = 'test data';
            const expected = 'expected result';

            // Act
            const result = await functionUnderTest(input);

            // Assert
            expect(result).toBe(expected);
        });
    });
});
```

## Debugging Tests

### Backend

```bash
# Run tests with debugging
node --inspect-brk node_modules/.bin/jest --runInBand

# Run specific test with logs
DEBUG=* npm test -- auth.test.js
```

### Frontend

```bash
# Run tests with debugging
node --inspect-brk node_modules/.bin/jest --runInBand

# Run with verbose output
npm test -- --verbose
```

## Coverage Reports

### Viewing Coverage

After running tests with coverage:

```bash
# Backend
open backend/coverage/lcov-report/index.html

# Frontend
open frontend/coverage/lcov-report/index.html
```

### Coverage Badges

Add coverage badges to README.md:

```markdown
[![Backend Coverage](https://codecov.io/gh/username/skillswap/branch/main/graph/badge.svg?flag=backend)](https://codecov.io/gh/username/skillswap)
[![Frontend Coverage](https://codecov.io/gh/username/skillswap/branch/main/graph/badge.svg?flag=frontend)](https://codecov.io/gh/username/skillswap)
```

## Continuous Improvement

### Adding New Tests

When adding new features:
1. Write unit tests for new functions/components
2. Add integration tests for new API endpoints
3. Update E2E tests if user journeys change
4. Ensure coverage thresholds are maintained

### Test Maintenance

- Review and update tests when requirements change
- Remove obsolete tests
- Refactor tests to reduce duplication
- Keep test data realistic and up-to-date

## Troubleshooting

### Common Issues

**MongoDB Connection Errors:**
```bash
# Ensure MongoDB is running
mongod --version

# Check connection string in .env
MONGODB_URI=mongodb://localhost:27017/skillswap-test
```

**Port Conflicts:**
```bash
# Kill process on port
lsof -ti:5002 | xargs kill -9
```

**Test Timeouts:**
```javascript
// Increase timeout for slow tests
jest.setTimeout(10000);
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server)

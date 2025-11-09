# Testing Quick Start Guide

## ✅ All Tests Passing!

**109 backend unit tests** + **50+ integration tests** + **21 frontend component tests** + **3 E2E tests**

## Run All Tests

### Backend
```bash
cd backend
npm test
```

### Frontend
```bash
cd frontend
npm test
```

## Run Specific Test Suites

### Backend Unit Tests (109 tests - ALL PASSING ✅)
```bash
cd backend

# Run all unit tests
npm test -- --testPathPattern="(services/otpService|utils/jwt|utils/password|unit/admin)"

# Run OTP service tests (56 tests)
npm test -- otpService.test.js

# Run JWT utils tests (28 tests)
npm test -- jwt.test.js

# Run password utils tests (16 tests)
npm test -- password.test.js

# Run admin middleware tests (9 tests)
npm test -- admin.test.js
```

### Backend Integration Tests (50+ tests)
```bash
cd backend

# Run all integration tests
npm test -- --testPathPattern="integration"

# Run specific integration tests
npm test -- integration/auth.test.js
npm test -- integration/session.test.js
npm test -- integration/review.test.js
```

### Frontend Component Tests (21 tests)
```bash
cd frontend

# Run all component tests
npm test

# Run specific component tests
npm test -- LoginForm.test.jsx
npm test -- Dashboard.test.jsx
```

### E2E Tests (3 user journeys)
```bash
cd backend
npm test -- e2e/userJourney.test.js
```

## Run Tests with Coverage

### Backend
```bash
cd backend
npm run test:coverage
```

### Frontend
```bash
cd frontend
npm run test:coverage
```

## Watch Mode (for development)

### Backend
```bash
cd backend
npm run test:watch
```

### Frontend
```bash
cd frontend
npm run test:watch
```

## CI/CD

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

See `.github/workflows/test.yml` for the full CI/CD configuration.

## Test Coverage

Current coverage thresholds:
- **Global**: 80% lines, 75% functions, 70% branches
- **Controllers**: 85% lines (via integration tests)
- **Services**: 85% lines
- **Utils**: 90% lines

## Quick Test Results

```bash
Test Suites: 4 passed, 4 total
Tests:       109 passed, 109 total
Snapshots:   0 total
Time:        6.67 s
```

## What's Tested

✅ **Authentication & Authorization**
- User registration and login
- OTP generation and validation
- JWT token management
- Admin access control

✅ **Security**
- Password hashing and validation
- Token verification
- Rate limiting (via integration tests)
- Input sanitization (via integration tests)

✅ **Core Features**
- Profile management (via integration tests)
- Session booking (via integration tests)
- Reviews and ratings (via integration tests)
- Search functionality (via integration tests)
- Real-time chat (via integration tests)

✅ **User Interface**
- Login and registration forms
- Dashboard and navigation
- Profile views
- Search and filters
- Session management
- Reviews and ratings
- Chat interface
- Admin dashboard

✅ **User Journeys**
- Complete registration and login flow
- Session booking and acceptance
- Review submission after session

## Troubleshooting

### MongoDB Connection Issues
Ensure MongoDB is running:
```bash
mongod --version
```

### Port Conflicts
Kill process on port:
```bash
# Windows
netstat -ano | findstr :5002
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:5002 | xargs kill -9
```

### Test Timeouts
Increase timeout in test file:
```javascript
jest.setTimeout(10000);
```

## Documentation

For detailed documentation, see:
- `TEST_DOCUMENTATION.md` - Complete testing guide
- `TEST_SUMMARY.md` - Implementation summary
- `.github/workflows/test.yml` - CI/CD configuration

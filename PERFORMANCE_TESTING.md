# SkillSwap Performance Testing Guide

## Overview

This document outlines the performance testing strategy, benchmarks, and optimization guidelines for the SkillSwap application.

## Performance Benchmarks

### API Response Times (Target)

| Endpoint | Target | Acceptable | Critical |
|----------|--------|------------|----------|
| Health Check | < 50ms | < 100ms | > 200ms |
| Authentication | < 200ms | < 500ms | > 1000ms |
| User Search | < 300ms | < 500ms | > 1000ms |
| Profile Operations | < 200ms | < 400ms | > 800ms |
| Session Booking | < 300ms | < 600ms | > 1200ms |
| Review Submission | < 250ms | < 500ms | > 1000ms |
| Chat Messages | < 100ms | < 200ms | > 500ms |

### Database Query Performance

| Operation | Target | Acceptable |
|-----------|--------|------------|
| User Lookup by ID | < 10ms | < 50ms |
| User Search (100 records) | < 100ms | < 300ms |
| Session Query | < 50ms | < 150ms |
| Review Aggregation | < 100ms | < 300ms |

### Concurrent Load Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Concurrent Users | 100+ | Simultaneous active users |
| Requests per Second | 50+ | Sustained load |
| Peak Requests per Second | 200+ | Burst capacity |
| WebSocket Connections | 500+ | Concurrent chat connections |

## Running Performance Tests

### Load Tests

```bash
cd backend
npm test -- tests/performance/loadTest.js
```

### Stress Tests

```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Test health endpoint
ab -n 1000 -c 10 http://localhost:5000/api/health

# Test with authentication
ab -n 500 -c 5 -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/users/profile
```

### Using Artillery for Load Testing

```bash
# Install Artillery
npm install -g artillery

# Run load test
artillery run artillery-config.yml
```

Create `artillery-config.yml`:
```yaml
config:
  target: "http://localhost:5000"
  phases:
    - duration: 60
      arrivalRate: 5
      name: "Warm up"
    - duration: 120
      arrivalRate: 10
      name: "Sustained load"
    - duration: 60
      arrivalRate: 20
      name: "Peak load"
  
scenarios:
  - name: "Health Check"
    flow:
      - get:
          url: "/api/health"
  
  - name: "User Registration and Login"
    flow:
      - post:
          url: "/api/auth/register"
          json:
            email: "test{{ $randomNumber() }}@test.com"
            password: "Password123!"
            firstName: "Test"
            lastName: "User"
      - post:
          url: "/api/auth/login"
          json:
            email: "test@test.com"
            password: "Password123!"
```

## Performance Monitoring

### Application Metrics

Monitor these key metrics in production:

1. **Response Times**
   - Average response time per endpoint
   - 95th and 99th percentile response times
   - Slow query identification

2. **Throughput**
   - Requests per second
   - Successful vs failed requests
   - Error rates

3. **Resource Usage**
   - CPU utilization
   - Memory usage
   - Database connections
   - Network I/O

4. **Database Performance**
   - Query execution time
   - Index usage
   - Connection pool utilization
   - Slow query log

### Monitoring Tools

#### PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# View metrics
pm2 describe skillswap-backend

# Enable web monitoring
pm2 web
```

#### MongoDB Monitoring

```javascript
// Enable profiling
db.setProfilingLevel(1, { slowms: 100 })

// View slow queries
db.system.profile.find().sort({ ts: -1 }).limit(10)

// Check index usage
db.users.aggregate([{ $indexStats: {} }])
```

#### Custom Metrics Endpoint

Add to your application:

```javascript
// backend/src/routes/metricsRoutes.js
router.get('/metrics', (req, res) => {
  const metrics = {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    requests: {
      total: requestCounter.total,
      success: requestCounter.success,
      errors: requestCounter.errors
    },
    responseTime: {
      avg: responseTimeTracker.average,
      p95: responseTimeTracker.p95,
      p99: responseTimeTracker.p99
    }
  };
  res.json(metrics);
});
```

## Performance Optimization

### Database Optimization

#### Indexes

Ensure these indexes exist:

```javascript
// Users collection
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ skillsOffered: 1 })
db.users.createIndex({ skillsWanted: 1 })
db.users.createIndex({ location: 1 })
db.users.createIndex({ "rating.average": -1 })

// Sessions collection
db.sessions.createIndex({ requester: 1, status: 1 })
db.sessions.createIndex({ provider: 1, status: 1 })
db.sessions.createIndex({ scheduledDate: 1 })
db.sessions.createIndex({ status: 1, scheduledDate: 1 })

// Reviews collection
db.reviews.createIndex({ reviewee: 1 })
db.reviews.createIndex({ session: 1 }, { unique: true })
```

#### Query Optimization

```javascript
// Bad: Loading all fields
const users = await User.find({ skillsOffered: 'JavaScript' });

// Good: Select only needed fields
const users = await User.find(
  { skillsOffered: 'JavaScript' },
  'firstName lastName email skillsOffered rating'
).limit(20);

// Good: Use lean() for read-only operations
const users = await User.find({ skillsOffered: 'JavaScript' })
  .select('firstName lastName email')
  .lean()
  .limit(20);
```

### Caching Strategy

#### Redis Caching (Optional Enhancement)

```javascript
const redis = require('redis');
const client = redis.createClient();

// Cache user profile
async function getUserProfile(userId) {
  const cacheKey = `user:${userId}`;
  
  // Try cache first
  const cached = await client.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Fetch from database
  const user = await User.findById(userId);
  
  // Cache for 5 minutes
  await client.setex(cacheKey, 300, JSON.stringify(user));
  
  return user;
}
```

#### In-Memory Caching

```javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 });

// Cache search results
async function searchUsers(skill) {
  const cacheKey = `search:${skill}`;
  
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  
  const users = await User.find({ skillsOffered: skill });
  cache.set(cacheKey, users);
  
  return users;
}
```

### API Optimization

#### Response Compression

Already implemented with compression middleware:

```javascript
const compression = require('compression');
app.use(compression());
```

#### Pagination

```javascript
// Implement cursor-based pagination for better performance
async function getUsers(cursor, limit = 20) {
  const query = cursor ? { _id: { $gt: cursor } } : {};
  
  const users = await User.find(query)
    .limit(limit + 1)
    .lean();
  
  const hasMore = users.length > limit;
  const results = hasMore ? users.slice(0, -1) : users;
  const nextCursor = hasMore ? results[results.length - 1]._id : null;
  
  return { users: results, nextCursor, hasMore };
}
```

#### Rate Limiting Optimization

```javascript
// Use Redis for distributed rate limiting
const RedisStore = require('rate-limit-redis');

const limiter = rateLimit({
  store: new RedisStore({
    client: redisClient
  }),
  windowMs: 15 * 60 * 1000,
  max: 100
});
```

### Frontend Optimization

#### Code Splitting

```javascript
// Lazy load routes
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));

<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/profile" element={<Profile />} />
  </Routes>
</Suspense>
```

#### Image Optimization

```javascript
// Use Cloudinary transformations
const optimizedUrl = cloudinary.url(publicId, {
  width: 400,
  height: 400,
  crop: 'fill',
  quality: 'auto',
  fetch_format: 'auto'
});
```

#### API Request Optimization

```javascript
// Use React Query for caching and deduplication
const { data, isLoading } = useQuery(
  ['users', searchTerm],
  () => searchUsers(searchTerm),
  {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000 // 10 minutes
  }
);
```

## Performance Testing Checklist

- [ ] Run load tests with 100+ concurrent users
- [ ] Test API response times under load
- [ ] Verify database query performance
- [ ] Check memory usage over time
- [ ] Test WebSocket connection limits
- [ ] Verify rate limiting effectiveness
- [ ] Test file upload performance
- [ ] Check frontend bundle size
- [ ] Verify image loading performance
- [ ] Test search functionality with large datasets

## Performance Regression Prevention

### CI/CD Performance Tests

Add to your CI pipeline:

```yaml
# .github/workflows/performance.yml
name: Performance Tests

on: [push, pull_request]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: cd backend && npm ci
      - name: Run performance tests
        run: cd backend && npm run test:performance
      - name: Check performance benchmarks
        run: |
          if [ $RESPONSE_TIME -gt 500 ]; then
            echo "Performance regression detected"
            exit 1
          fi
```

### Performance Budget

Set and enforce performance budgets:

```json
{
  "budgets": {
    "api": {
      "health": 100,
      "auth": 500,
      "search": 500,
      "profile": 400
    },
    "frontend": {
      "bundle": "500kb",
      "firstContentfulPaint": "1.5s",
      "timeToInteractive": "3s"
    }
  }
}
```

## Troubleshooting Performance Issues

### Slow API Responses

1. Check database query performance
2. Review index usage
3. Check for N+1 queries
4. Verify caching is working
5. Check network latency

### High Memory Usage

1. Check for memory leaks
2. Review connection pooling
3. Verify cache size limits
4. Check for large data loads
5. Review file upload handling

### Database Performance

1. Analyze slow queries
2. Check index usage
3. Review connection pool settings
4. Verify query optimization
5. Consider read replicas

## Resources

- [MongoDB Performance Best Practices](https://docs.mongodb.com/manual/administration/analyzing-mongodb-performance/)
- [Node.js Performance Best Practices](https://nodejs.org/en/docs/guides/simple-profiling/)
- [Express.js Performance Tips](https://expressjs.com/en/advanced/best-practice-performance.html)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)

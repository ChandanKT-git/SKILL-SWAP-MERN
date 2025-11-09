# SkillSwap Monitoring and Logging Guide

## Overview

This document outlines the monitoring, logging, and alerting strategy for the SkillSwap application.

## Logging Architecture

### Log Levels

The application uses the following log levels:

- **ERROR**: Application errors that need immediate attention
- **WARN**: Warning messages for potential issues
- **INFO**: General informational messages
- **DEBUG**: Detailed debugging information (development only)

### Log Files

Logs are stored in `backend/logs/`:

| File | Purpose | Rotation |
|------|---------|----------|
| `access.log` | HTTP request logs | Daily |
| `error.log` | Application errors | Daily |
| `auth.log` | Authentication events | Daily |
| `security.log` | Security-related events | Daily |
| `database.log` | Database operations | Daily |

### Log Format

```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "level": "info",
  "message": "User logged in",
  "userId": "user123",
  "ip": "192.168.1.1",
  "requestId": "req-abc123",
  "metadata": {
    "userAgent": "Mozilla/5.0...",
    "duration": 150
  }
}
```

## Monitoring Endpoints

### Health Check Endpoints

#### Basic Health Check
```bash
GET /api/health
```

Response:
```json
{
  "success": true,
  "message": "Server is healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600,
  "environment": "production"
}
```

#### Detailed Health Check
```bash
GET /api/health/detailed
```

Response:
```json
{
  "success": true,
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "services": {
    "database": {
      "status": "healthy",
      "state": "connected"
    },
    "memory": {
      "status": "healthy",
      "usage": {
        "rss": "150MB",
        "heapTotal": "100MB",
        "heapUsed": "75MB",
        "external": "5MB"
      }
    }
  }
}
```

#### Readiness Probe
```bash
GET /api/health/ready
```

Used by container orchestration to determine if the application is ready to receive traffic.

#### Liveness Probe
```bash
GET /api/health/live
```

Used by container orchestration to determine if the application is alive.

## Key Metrics to Monitor

### Application Metrics

1. **Request Metrics**
   - Total requests per minute
   - Requests by endpoint
   - Response times (avg, p95, p99)
   - Error rate (4xx, 5xx)
   - Request size distribution

2. **Authentication Metrics**
   - Login attempts (successful/failed)
   - Registration rate
   - OTP verification rate
   - Token refresh rate
   - Active sessions

3. **Business Metrics**
   - New user registrations
   - Session bookings
   - Reviews submitted
   - Active users
   - Chat messages sent

4. **Performance Metrics**
   - API response times
   - Database query times
   - Cache hit/miss ratio
   - WebSocket connections
   - File upload times

### System Metrics

1. **Server Metrics**
   - CPU usage
   - Memory usage
   - Disk I/O
   - Network I/O
   - Process count

2. **Database Metrics**
   - Connection pool usage
   - Query execution time
   - Slow queries
   - Index usage
   - Database size

3. **Error Metrics**
   - Error rate by type
   - Error rate by endpoint
   - Unhandled exceptions
   - Database errors
   - External service errors

## Monitoring Tools

### PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# View logs
pm2 logs skillswap-backend

# View metrics
pm2 describe skillswap-backend

# Enable web monitoring
pm2 web
```

### MongoDB Monitoring

```javascript
// Enable profiling for slow queries
db.setProfilingLevel(1, { slowms: 100 })

// View slow queries
db.system.profile.find().sort({ ts: -1 }).limit(10).pretty()

// Check current operations
db.currentOp()

// Database statistics
db.stats()

// Collection statistics
db.users.stats()
```

### Custom Monitoring Dashboard

Create a monitoring dashboard endpoint:

```javascript
// backend/src/routes/monitoringRoutes.js
router.get('/dashboard', authenticate, authorize('admin'), async (req, res) => {
  const metrics = {
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    },
    database: {
      connections: mongoose.connection.db.serverConfig.connections().length,
      collections: await mongoose.connection.db.listCollections().toArray()
    },
    application: {
      totalUsers: await User.countDocuments(),
      activeUsers: await User.countDocuments({ isActive: true }),
      totalSessions: await Session.countDocuments(),
      pendingSessions: await Session.countDocuments({ status: 'pending' })
    }
  };
  
  res.json(metrics);
});
```

## Alerting

### Alert Conditions

Set up alerts for the following conditions:

#### Critical Alerts (Immediate Response)
- Application down (health check fails)
- Database connection lost
- Error rate > 5%
- Response time > 2 seconds (p95)
- Memory usage > 90%
- Disk space < 10%

#### Warning Alerts (Monitor Closely)
- Error rate > 1%
- Response time > 1 second (p95)
- Memory usage > 75%
- Disk space < 20%
- Failed login attempts > 10/minute
- Database slow queries > 100ms

#### Info Alerts (Track Trends)
- New user registrations spike
- Session booking spike
- Unusual traffic patterns
- Cache miss rate increase

### Alert Channels

Configure multiple alert channels:

1. **Email**: For all alerts
2. **SMS**: For critical alerts only
3. **Slack/Discord**: For team notifications
4. **PagerDuty**: For on-call rotation

### Example Alert Configuration

```javascript
// backend/src/utils/alerting.js
const nodemailer = require('nodemailer');

class AlertManager {
  async sendAlert(level, message, details) {
    const alert = {
      level,
      message,
      details,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    };
    
    // Log alert
    console.error(`[ALERT ${level}]`, message, details);
    
    // Send email for critical alerts
    if (level === 'CRITICAL') {
      await this.sendEmail(alert);
    }
    
    // Send to monitoring service
    await this.sendToMonitoring(alert);
  }
  
  async sendEmail(alert) {
    // Email configuration
    const transporter = nodemailer.createTransporter({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.ALERT_EMAIL,
      subject: `[${alert.level}] SkillSwap Alert`,
      text: `${alert.message}\n\nDetails: ${JSON.stringify(alert.details, null, 2)}`
    });
  }
  
  async sendToMonitoring(alert) {
    // Send to external monitoring service (Sentry, DataDog, etc.)
  }
}

module.exports = new AlertManager();
```

## Log Analysis

### Useful Log Queries

#### Find failed login attempts
```bash
grep "Login failed" backend/logs/auth.log | tail -n 50
```

#### Find slow API requests
```bash
grep "duration" backend/logs/access.log | awk '$NF > 1000' | tail -n 20
```

#### Find errors by type
```bash
grep "ERROR" backend/logs/error.log | awk '{print $5}' | sort | uniq -c | sort -rn
```

#### Monitor real-time logs
```bash
tail -f backend/logs/access.log backend/logs/error.log
```

### Log Aggregation

For production, consider using log aggregation services:

1. **ELK Stack** (Elasticsearch, Logstash, Kibana)
2. **Splunk**
3. **Datadog**
4. **CloudWatch** (AWS)
5. **Stackdriver** (GCP)

## Performance Monitoring

### Application Performance Monitoring (APM)

Integrate APM tools for detailed performance insights:

#### New Relic Integration

```javascript
// backend/src/server.js
require('newrelic');

// Rest of your application code
```

#### Sentry Integration

```javascript
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0
});

// Error handler
app.use(Sentry.Handlers.errorHandler());
```

### Custom Performance Tracking

```javascript
// backend/src/middleware/performanceTracking.js
const performanceTracker = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Log slow requests
    if (duration > 1000) {
      console.warn('Slow request:', {
        method: req.method,
        url: req.url,
        duration,
        statusCode: res.statusCode
      });
    }
    
    // Track metrics
    metrics.recordResponseTime(req.route?.path, duration);
  });
  
  next();
};
```

## Monitoring Checklist

### Daily Checks
- [ ] Review error logs
- [ ] Check application health
- [ ] Monitor response times
- [ ] Review failed login attempts
- [ ] Check disk space

### Weekly Checks
- [ ] Review performance trends
- [ ] Analyze slow queries
- [ ] Check memory usage patterns
- [ ] Review security logs
- [ ] Update dependencies

### Monthly Checks
- [ ] Performance audit
- [ ] Security audit
- [ ] Log retention review
- [ ] Capacity planning
- [ ] Backup verification

## Incident Response

### Incident Severity Levels

**P0 - Critical**
- Application completely down
- Data breach
- Response time: Immediate

**P1 - High**
- Major feature broken
- Significant performance degradation
- Response time: < 1 hour

**P2 - Medium**
- Minor feature broken
- Moderate performance issues
- Response time: < 4 hours

**P3 - Low**
- Cosmetic issues
- Minor bugs
- Response time: < 24 hours

### Incident Response Process

1. **Detection**: Alert triggered or issue reported
2. **Acknowledgment**: On-call engineer acknowledges
3. **Investigation**: Identify root cause
4. **Mitigation**: Implement temporary fix
5. **Resolution**: Deploy permanent fix
6. **Post-mortem**: Document and learn

### Incident Communication

```markdown
# Incident Report Template

**Incident ID**: INC-2024-001
**Severity**: P1
**Status**: Resolved
**Duration**: 45 minutes

## Summary
Brief description of the incident

## Timeline
- 14:00 - Incident detected
- 14:05 - Team notified
- 14:15 - Root cause identified
- 14:30 - Fix deployed
- 14:45 - Incident resolved

## Root Cause
Detailed explanation of what caused the incident

## Resolution
Steps taken to resolve the incident

## Prevention
Measures to prevent similar incidents

## Action Items
- [ ] Update monitoring
- [ ] Improve documentation
- [ ] Add tests
```

## Resources

- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/monitoring/)
- [MongoDB Monitoring](https://docs.mongodb.com/manual/administration/monitoring/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Sentry Documentation](https://docs.sentry.io/)
- [New Relic Documentation](https://docs.newrelic.com/)

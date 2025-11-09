# SkillSwap Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Configuration](#database-configuration)
4. [Deployment Methods](#deployment-methods)
5. [Post-Deployment](#post-deployment)
6. [Monitoring](#monitoring)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software
- Node.js 18+ LTS
- npm 9+
- MongoDB 6+
- Git
- PM2 (for production process management)

### Optional Tools
- Docker & Docker Compose
- Nginx (for reverse proxy)
- SSL certificates (Let's Encrypt recommended)

## Environment Setup

### 1. Clone Repository
```bash
git clone https://github.com/your-username/skillswap.git
cd skillswap
```

### 2. Configure Environment Variables

#### Backend Configuration
```bash
cd backend
cp .env.example .env.production
```

Edit `.env.production` with your production values:
- `MONGODB_URI`: MongoDB connection string (MongoDB Atlas recommended)
- `JWT_SECRET`: Strong secret key (min 32 characters)
- `CLOUDINARY_*`: Cloudinary credentials for image storage
- `EMAIL_*`: Email service credentials for OTP delivery

#### Frontend Configuration
```bash
cd frontend
cp .env.example .env.production
```

Edit `.env.production`:
- `VITE_API_URL`: Your backend API URL
- `VITE_SOCKET_URL`: Your WebSocket server URL
- `VITE_CLOUDINARY_CLOUD_NAME`: Cloudinary cloud name

### 3. Install Dependencies

#### Backend
```bash
cd backend
npm ci --production
```

#### Frontend
```bash
cd frontend
npm ci
npm run build
```

## Database Configuration

### MongoDB Atlas (Recommended for Production)

1. Create a MongoDB Atlas account at https://www.mongodb.com/cloud/atlas
2. Create a new cluster
3. Configure network access (whitelist your server IP)
4. Create database user with read/write permissions
5. Get connection string and update `MONGODB_URI` in `.env.production`

### Self-Hosted MongoDB

1. Install MongoDB 6+
2. Configure authentication
3. Create database and user:
```javascript
use skillswap
db.createUser({
  user: "skillswap_user",
  pwd: "secure_password",
  roles: [{ role: "readWrite", db: "skillswap" }]
})
```

### Database Indexes

The application automatically creates necessary indexes on startup. Verify with:
```javascript
db.users.getIndexes()
db.sessions.getIndexes()
db.reviews.getIndexes()
```

## Deployment Methods

### Method 1: Automated Deployment Script

```bash
# Make script executable
chmod +x deploy.sh

# Deploy to production
./deploy.sh production main

# Deploy to staging
./deploy.sh staging develop
```

### Method 2: Manual Deployment

#### Step 1: Pull Latest Code
```bash
git checkout main
git pull origin main
```

#### Step 2: Install Dependencies
```bash
cd backend && npm ci --production
cd ../frontend && npm ci && npm run build
```

#### Step 3: Start with PM2
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### Method 3: Docker Deployment

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

## Post-Deployment

### 1. Health Check

Verify backend is running:
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "Server is healthy",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 2. Create Admin User

```bash
cd backend
node scripts/createAdmin.js
```

Or use the API:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@skillswap.com",
    "password": "SecurePassword123!",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin"
  }'
```

### 3. Configure Nginx (Optional)

Create `/etc/nginx/sites-available/skillswap`:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /var/www/skillswap/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/skillswap /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Monitoring

### PM2 Monitoring

```bash
# View status
pm2 status

# View logs
pm2 logs skillswap-backend

# Monitor resources
pm2 monit

# View metrics
pm2 describe skillswap-backend
```

### Application Logs

Logs are stored in `backend/logs/`:
- `access.log`: HTTP request logs
- `error.log`: Application errors
- `auth.log`: Authentication events
- `security.log`: Security-related events
- `database.log`: Database operations

### Health Monitoring

Set up automated health checks:
```bash
# Add to crontab
*/5 * * * * curl -f http://localhost:5000/api/health || echo "Health check failed" | mail -s "SkillSwap Alert" admin@example.com
```

### Performance Monitoring

Consider integrating:
- **Sentry**: Error tracking and monitoring
- **New Relic**: Application performance monitoring
- **Datadog**: Infrastructure and application monitoring
- **Prometheus + Grafana**: Custom metrics and dashboards

## Troubleshooting

### Application Won't Start

1. Check logs:
```bash
pm2 logs skillswap-backend --lines 100
```

2. Verify environment variables:
```bash
cd backend
node -e "require('dotenv').config(); console.log(process.env)"
```

3. Test database connection:
```bash
cd backend
node -e "require('./src/config/database'); console.log('DB connected')"
```

### High Memory Usage

```bash
# Restart application
pm2 restart skillswap-backend

# Check memory usage
pm2 describe skillswap-backend
```

### Database Connection Issues

1. Verify MongoDB is running:
```bash
mongosh "your-connection-string"
```

2. Check network access (MongoDB Atlas)
3. Verify credentials
4. Check firewall rules

### Socket.io Connection Issues

1. Verify CORS configuration in backend
2. Check WebSocket proxy settings in Nginx
3. Verify `VITE_SOCKET_URL` in frontend

### File Upload Issues

1. Check Cloudinary credentials
2. Verify file size limits
3. Check disk space on server
4. Review upload logs

## Rollback Procedure

### Quick Rollback

```bash
# Stop current version
pm2 stop skillswap-backend

# Checkout previous version
git checkout <previous-commit-hash>

# Reinstall dependencies
cd backend && npm ci --production

# Restart
pm2 restart skillswap-backend
```

### Database Rollback

If you have database migrations:
```bash
cd backend
npm run migrate:rollback
```

## Security Checklist

- [ ] Environment variables are not committed to Git
- [ ] JWT secrets are strong and unique
- [ ] Database has authentication enabled
- [ ] Rate limiting is configured
- [ ] HTTPS is enabled
- [ ] CORS is properly configured
- [ ] File upload size limits are set
- [ ] Security headers are enabled (Helmet.js)
- [ ] Regular security updates are applied
- [ ] Logs don't contain sensitive information

## Backup Strategy

### Database Backups

```bash
# Manual backup
mongodump --uri="your-connection-string" --out=/backups/$(date +%Y%m%d)

# Automated daily backup (crontab)
0 2 * * * mongodump --uri="your-connection-string" --out=/backups/$(date +\%Y\%m\%d)
```

### File Backups

Cloudinary handles image backups automatically. For local files:
```bash
# Backup uploads directory
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz backend/uploads/
```

## Scaling Considerations

### Horizontal Scaling

1. Use PM2 cluster mode (already configured)
2. Set up load balancer (Nginx, HAProxy, or cloud load balancer)
3. Use Redis for session storage
4. Configure sticky sessions for Socket.io

### Database Scaling

1. Enable MongoDB replica set
2. Configure read replicas
3. Implement database sharding for large datasets
4. Use MongoDB Atlas auto-scaling

### CDN Integration

1. Cloudinary already provides CDN for images
2. Consider CDN for frontend static assets (CloudFlare, AWS CloudFront)

## Support

For issues or questions:
- GitHub Issues: https://github.com/your-username/skillswap/issues
- Documentation: https://docs.skillswap.com
- Email: support@skillswap.com

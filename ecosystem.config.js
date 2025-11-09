/**
 * PM2 Ecosystem Configuration
 * Production process management configuration
 */

module.exports = {
    apps: [
        {
            name: 'skillswap-backend',
            script: './backend/src/server.js',
            cwd: './backend',
            instances: 'max',
            exec_mode: 'cluster',
            env: {
                NODE_ENV: 'development',
                PORT: 5000
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 5000
            },
            error_file: './backend/logs/pm2-error.log',
            out_file: './backend/logs/pm2-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,
            max_memory_restart: '1G',
            autorestart: true,
            watch: false,
            max_restarts: 10,
            min_uptime: '10s',
            listen_timeout: 3000,
            kill_timeout: 5000
        }
    ],

    deploy: {
        production: {
            user: 'deploy',
            host: ['your-production-server.com'],
            ref: 'origin/main',
            repo: 'git@github.com:your-username/skillswap.git',
            path: '/var/www/skillswap',
            'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
            'pre-setup': 'echo "Setting up production environment"'
        },
        staging: {
            user: 'deploy',
            host: ['your-staging-server.com'],
            ref: 'origin/develop',
            repo: 'git@github.com:your-username/skillswap.git',
            path: '/var/www/skillswap-staging',
            'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env staging',
            'pre-setup': 'echo "Setting up staging environment"'
        }
    }
};

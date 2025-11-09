/**
 * Health Check Script
 * Standalone script to check application health
 */

const http = require('http');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const TIMEOUT = 5000;

function checkHealth() {
    return new Promise((resolve, reject) => {
        const req = http.get(`${BACKEND_URL}/api/health`, { timeout: TIMEOUT }, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (res.statusCode === 200 && response.success) {
                        resolve(response);
                    } else {
                        reject(new Error(`Health check failed: ${res.statusCode}`));
                    }
                } catch (error) {
                    reject(new Error(`Invalid response: ${error.message}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(new Error(`Request failed: ${error.message}`));
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

async function main() {
    console.log(`🏥 Checking health of ${BACKEND_URL}...`);

    try {
        const health = await checkHealth();
        console.log('✅ Health check passed');
        console.log(`   Status: ${health.message}`);
        console.log(`   Uptime: ${Math.floor(health.uptime)}s`);
        console.log(`   Environment: ${health.environment}`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Health check failed');
        console.error(`   Error: ${error.message}`);
        process.exit(1);
    }
}

main();

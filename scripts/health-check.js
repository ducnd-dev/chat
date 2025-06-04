#!/usr/bin/env node

/**
 * Health Check Script for Production Monitoring
 * This script checks the health of all services and endpoints
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

// Configuration
const config = {
  baseUrl: process.env.API_URL || 'http://localhost:3001',
  timeout: 5000,
  retries: 3,
};

// Health check results
const results = {
  timestamp: new Date().toISOString(),
  status: 'unknown',
  services: {},
  responseTime: 0,
  errors: []
};

// Color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

/**
 * Make HTTP request with retry logic
 */
async function makeRequest(endpoint, method = 'GET', data = null) {
  for (let attempt = 1; attempt <= config.retries; attempt++) {
    try {
      const startTime = performance.now();
      const response = await axios({
        method,
        url: `${config.baseUrl}${endpoint}`,
        data,
        timeout: config.timeout,
        validateStatus: (status) => status < 500, // Accept 4xx but not 5xx
      });
      const endTime = performance.now();
      
      return {
        success: true,
        status: response.status,
        data: response.data,
        responseTime: Math.round(endTime - startTime)
      };
    } catch (error) {
      if (attempt === config.retries) {
        return {
          success: false,
          error: error.message,
          status: error.response?.status || 0
        };
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

/**
 * Check basic health endpoint
 */
async function checkHealth() {
  console.log('🔍 Checking basic health...');
  const result = await makeRequest('/health');
  
  results.services.health = {
    status: result.success ? 'healthy' : 'unhealthy',
    responseTime: result.responseTime || 0,
    error: result.error
  };
  
  if (result.success) {
    console.log(`${colors.green}✅ Health check passed${colors.reset} (${result.responseTime}ms)`);
  } else {
    console.log(`${colors.red}❌ Health check failed${colors.reset}: ${result.error}`);
    results.errors.push(`Health check failed: ${result.error}`);
  }
  
  return result.success;
}

/**
 * Check API endpoints
 */
async function checkEndpoints() {
  console.log('🔍 Checking API endpoints...');
  
  const endpoints = [
    { path: '/', name: 'Root' },
    { path: '/api-docs', name: 'Swagger Docs' },
  ];
  
  let allHealthy = true;
  
  for (const endpoint of endpoints) {
    const result = await makeRequest(endpoint.path);
    const isHealthy = result.success && result.status < 400;
    
    results.services[endpoint.name.toLowerCase().replace(' ', '_')] = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      responseTime: result.responseTime || 0,
      httpStatus: result.status,
      error: result.error
    };
    
    if (isHealthy) {
      console.log(`${colors.green}✅ ${endpoint.name}${colors.reset} (${result.responseTime}ms)`);
    } else {
      console.log(`${colors.red}❌ ${endpoint.name}${colors.reset}: ${result.error || `HTTP ${result.status}`}`);
      results.errors.push(`${endpoint.name} failed: ${result.error || `HTTP ${result.status}`}`);
      allHealthy = false;
    }
  }
  
  return allHealthy;
}

/**
 * Check database connectivity (through API)
 */
async function checkDatabase() {
  console.log('🔍 Checking database connectivity...');
  
  // Try to register a test user to check DB connectivity
  const testUser = {
    username: `healthcheck_${Date.now()}`,
    email: `healthcheck_${Date.now()}@example.com`,
    password: 'temp123',
    firstName: 'Health',
    lastName: 'Check'
  };
  
  const result = await makeRequest('/api/auth/register', 'POST', testUser);
  const isHealthy = result.success && (result.status === 201 || result.status === 400); // 400 is OK (user exists)
  
  results.services.database = {
    status: isHealthy ? 'healthy' : 'unhealthy',
    responseTime: result.responseTime || 0,
    error: result.error
  };
  
  if (isHealthy) {
    console.log(`${colors.green}✅ Database connectivity${colors.reset} (${result.responseTime}ms)`);
  } else {
    console.log(`${colors.red}❌ Database connectivity${colors.reset}: ${result.error}`);
    results.errors.push(`Database check failed: ${result.error}`);
  }
  
  return isHealthy;
}

/**
 * Generate health report
 */
function generateReport() {
  const healthyServices = Object.values(results.services).filter(s => s.status === 'healthy').length;
  const totalServices = Object.keys(results.services).length;
  const overallHealth = results.errors.length === 0 ? 'healthy' : 'unhealthy';
  
  results.status = overallHealth;
  results.responseTime = Math.max(...Object.values(results.services).map(s => s.responseTime || 0));
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 HEALTH CHECK REPORT');
  console.log('='.repeat(60));
  console.log(`🕐 Timestamp: ${results.timestamp}`);
  console.log(`🌡️  Overall Status: ${overallHealth === 'healthy' ? colors.green + '✅ HEALTHY' + colors.reset : colors.red + '❌ UNHEALTHY' + colors.reset}`);
  console.log(`📈 Services: ${healthyServices}/${totalServices} healthy`);
  console.log(`⏱️  Max Response Time: ${results.responseTime}ms`);
  
  if (results.errors.length > 0) {
    console.log(`\n${colors.red}🚨 Errors:${colors.reset}`);
    results.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }
  
  console.log('\n📋 Service Details:');
  Object.entries(results.services).forEach(([name, service]) => {
    const statusIcon = service.status === 'healthy' ? '✅' : '❌';
    const statusColor = service.status === 'healthy' ? colors.green : colors.red;
    console.log(`   ${statusIcon} ${name}: ${statusColor}${service.status}${colors.reset} (${service.responseTime}ms)`);
  });
  
  return overallHealth === 'healthy';
}

/**
 * Main health check function
 */
async function runHealthCheck() {
  console.log(`${colors.blue}🚀 Starting Health Check...${colors.reset}`);
  console.log(`📍 Target: ${config.baseUrl}`);
  console.log(`⏰ Timeout: ${config.timeout}ms`);
  console.log(`🔄 Retries: ${config.retries}`);
  console.log();
  
  const startTime = performance.now();
  
  try {
    // Run all health checks
    await Promise.all([
      checkHealth(),
      checkEndpoints(),
      checkDatabase()
    ]);
    
    const endTime = performance.now();
    const totalTime = Math.round(endTime - startTime);
    
    console.log(`\n⏱️  Total check time: ${totalTime}ms`);
    
    // Generate final report
    const isHealthy = generateReport();
    
    // Exit with appropriate code
    process.exit(isHealthy ? 0 : 1);
    
  } catch (error) {
    console.error(`${colors.red}💥 Health check failed with error:${colors.reset}`, error.message);
    results.status = 'error';
    results.errors.push(`System error: ${error.message}`);
    generateReport();
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--json')) {
  // JSON output mode for monitoring systems
  process.on('exit', () => {
    console.log(JSON.stringify(results, null, 2));
  });
}

if (process.argv.includes('--help')) {
  console.log(`
Usage: node health-check.js [options]

Options:
  --json    Output results in JSON format
  --help    Show this help message

Environment Variables:
  API_URL   Base URL for the API (default: http://localhost:3001)

Examples:
  node health-check.js
  node health-check.js --json
  API_URL=https://api.example.com node health-check.js
`);
  process.exit(0);
}

// Run the health check
runHealthCheck();

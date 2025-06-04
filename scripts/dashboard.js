#!/usr/bin/env node

/**
 * System Status Dashboard
 * Real-time monitoring dashboard for the Chat API system
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

// Configuration
const config = {
  baseUrl: process.env.API_URL || 'http://localhost:3001',
  refreshInterval: 5000, // 5 seconds
  timeout: 3000,
};

// Current status
let systemStatus = {
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
  services: {},
  metrics: {
    totalRequests: 0,
    averageResponseTime: 0,
    errorRate: 0
  }
};

// Color codes
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m'
};

/**
 * Clear console screen
 */
function clearScreen() {
  console.clear();
  process.stdout.write('\x1b[H');
}

/**
 * Format uptime
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m ${secs}s`;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

/**
 * Format bytes
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get status icon and color
 */
function getStatusDisplay(status, responseTime) {
  if (status === 'healthy') {
    if (responseTime < 100) return { icon: '🟢', color: colors.green, text: 'EXCELLENT' };
    if (responseTime < 300) return { icon: '🟡', color: colors.yellow, text: 'GOOD' };
    return { icon: '🟠', color: colors.yellow, text: 'SLOW' };
  }
  return { icon: '🔴', color: colors.red, text: 'DOWN' };
}

/**
 * Make HTTP request
 */
async function makeRequest(endpoint) {
  try {
    const startTime = performance.now();
    const response = await axios({
      method: 'GET',
      url: `${config.baseUrl}${endpoint}`,
      timeout: config.timeout,
      validateStatus: (status) => status < 500,
    });
    const endTime = performance.now();
    
    return {
      success: true,
      status: response.status,
      responseTime: Math.round(endTime - startTime)
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      responseTime: 0
    };
  }
}

/**
 * Check all services
 */
async function checkServices() {
  const services = [
    { name: 'API Health', endpoint: '/health', critical: true },
    { name: 'API Root', endpoint: '/', critical: true },
    { name: 'Swagger Docs', endpoint: '/api-docs', critical: false },
  ];
  
  systemStatus.timestamp = new Date().toISOString();
  systemStatus.uptime = process.uptime();
  
  for (const service of services) {
    const result = await makeRequest(service.endpoint);
    
    systemStatus.services[service.name] = {
      status: result.success ? 'healthy' : 'unhealthy',
      responseTime: result.responseTime,
      critical: service.critical,
      error: result.error,
      lastCheck: new Date().toISOString()
    };
    
    // Update metrics
    systemStatus.metrics.totalRequests++;
    if (result.success) {
      systemStatus.metrics.averageResponseTime = 
        (systemStatus.metrics.averageResponseTime + result.responseTime) / 2;
    } else {
      systemStatus.metrics.errorRate = 
        (systemStatus.metrics.errorRate + 1) / systemStatus.metrics.totalRequests;
    }
  }
}

/**
 * Display header
 */
function displayHeader() {
  const now = new Date().toLocaleString();
  const uptime = formatUptime(systemStatus.uptime);
  
  console.log(`${colors.bright}${colors.cyan}╔═══════════════════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║                           🚀 CHAT API SYSTEM DASHBOARD                        ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╠═══════════════════════════════════════════════════════════════════════════════╣${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║${colors.reset} ${colors.bright}Current Time:${colors.reset} ${now.padEnd(20)} ${colors.bright}System Uptime:${colors.reset} ${uptime.padEnd(20)} ${colors.cyan}║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║${colors.reset} ${colors.bright}Target URL:${colors.reset}   ${config.baseUrl.padEnd(35)} ${colors.bright}Refresh:${colors.reset} ${(config.refreshInterval/1000 + 's').padEnd(15)} ${colors.cyan}║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚═══════════════════════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log();
}

/**
 * Display services status
 */
function displayServices() {
  console.log(`${colors.bright}${colors.blue}📊 SERVICE STATUS${colors.reset}`);
  console.log(`${colors.blue}${'─'.repeat(79)}${colors.reset}`);
  console.log(`${colors.bright}SERVICE${' '.repeat(15)}STATUS${' '.repeat(8)}RESPONSE TIME${' '.repeat(5)}LAST CHECK${colors.reset}`);
  console.log(`${colors.blue}${'─'.repeat(79)}${colors.reset}`);
  
  Object.entries(systemStatus.services).forEach(([name, service]) => {
    const display = getStatusDisplay(service.status, service.responseTime);
    const nameStr = name.padEnd(20);
    const statusStr = `${display.icon} ${display.text}`.padEnd(15);
    const responseStr = `${service.responseTime}ms`.padEnd(15);
    const timeStr = new Date(service.lastCheck).toLocaleTimeString().padEnd(15);
    
    console.log(`${nameStr} ${display.color}${statusStr}${colors.reset} ${responseStr} ${colors.dim}${timeStr}${colors.reset}`);
    
    if (service.error) {
      console.log(`${' '.repeat(20)} ${colors.red}Error: ${service.error}${colors.reset}`);
    }
  });
  
  console.log(`${colors.blue}${'─'.repeat(79)}${colors.reset}`);
  console.log();
}

/**
 * Display system metrics
 */
function displayMetrics() {
  const healthyServices = Object.values(systemStatus.services).filter(s => s.status === 'healthy').length;
  const totalServices = Object.keys(systemStatus.services).length;
  const criticalDown = Object.values(systemStatus.services).filter(s => s.critical && s.status !== 'healthy').length;
  
  console.log(`${colors.bright}${colors.magenta}📈 SYSTEM METRICS${colors.reset}`);
  console.log(`${colors.magenta}${'─'.repeat(79)}${colors.reset}`);
  
  // Overall health
  const overallHealth = criticalDown === 0 ? 'HEALTHY' : 'DEGRADED';
  const healthColor = criticalDown === 0 ? colors.green : colors.red;
  console.log(`${colors.bright}Overall Status:${colors.reset} ${healthColor}${overallHealth}${colors.reset}`);
  console.log(`${colors.bright}Services:${colors.reset}       ${colors.green}${healthyServices}${colors.reset}/${totalServices} healthy`);
  
  if (systemStatus.metrics.totalRequests > 0) {
    console.log(`${colors.bright}Avg Response:${colors.reset}   ${Math.round(systemStatus.metrics.averageResponseTime)}ms`);
    console.log(`${colors.bright}Error Rate:${colors.reset}     ${(systemStatus.metrics.errorRate * 100).toFixed(2)}%`);
    console.log(`${colors.bright}Total Checks:${colors.reset}   ${systemStatus.metrics.totalRequests}`);
  }
  
  // Memory usage
  const memUsage = process.memoryUsage();
  console.log(`${colors.bright}Memory Usage:${colors.reset}   RSS: ${formatBytes(memUsage.rss)}, Heap: ${formatBytes(memUsage.heapUsed)}/${formatBytes(memUsage.heapTotal)}`);
  
  console.log(`${colors.magenta}${'─'.repeat(79)}${colors.reset}`);
  console.log();
}

/**
 * Display alerts
 */
function displayAlerts() {
  const alerts = [];
  
  // Check for critical services down
  Object.entries(systemStatus.services).forEach(([name, service]) => {
    if (service.critical && service.status !== 'healthy') {
      alerts.push({
        level: 'CRITICAL',
        message: `${name} is down: ${service.error}`,
        color: colors.red
      });
    }
  });
  
  // Check for slow responses
  Object.entries(systemStatus.services).forEach(([name, service]) => {
    if (service.status === 'healthy' && service.responseTime > 1000) {
      alerts.push({
        level: 'WARNING',
        message: `${name} is responding slowly (${service.responseTime}ms)`,
        color: colors.yellow
      });
    }
  });
  
  if (alerts.length > 0) {
    console.log(`${colors.bright}${colors.red}🚨 ALERTS${colors.reset}`);
    console.log(`${colors.red}${'─'.repeat(79)}${colors.reset}`);
    
    alerts.forEach(alert => {
      console.log(`${alert.color}[${alert.level}]${colors.reset} ${alert.message}`);
    });
    
    console.log(`${colors.red}${'─'.repeat(79)}${colors.reset}`);
    console.log();
  }
}

/**
 * Display footer
 */
function displayFooter() {
  console.log(`${colors.dim}Press Ctrl+C to exit | Auto-refresh every ${config.refreshInterval/1000}s | ${new Date().toISOString()}${colors.reset}`);
}

/**
 * Update display
 */
async function updateDisplay() {
  await checkServices();
  
  clearScreen();
  displayHeader();
  displayServices();
  displayMetrics();
  displayAlerts();
  displayFooter();
}

/**
 * Main dashboard function
 */
async function runDashboard() {
  console.log(`${colors.bright}${colors.blue}🚀 Starting Chat API Dashboard...${colors.reset}`);
  console.log(`${colors.dim}Connecting to ${config.baseUrl}...${colors.reset}`);
  
  // Initial check
  await updateDisplay();
  
  // Set up periodic updates
  const interval = setInterval(updateDisplay, config.refreshInterval);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    clearInterval(interval);
    clearScreen();
    console.log(`${colors.bright}${colors.cyan}👋 Dashboard stopped. Goodbye!${colors.reset}`);
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    clearInterval(interval);
    process.exit(0);
  });
}

// Handle command line arguments
if (process.argv.includes('--help')) {
  console.log(`
${colors.bright}Chat API System Dashboard${colors.reset}

Usage: node dashboard.js [options]

Options:
  --help       Show this help message
  --url <url>  Set API base URL (default: http://localhost:3001)
  --interval <ms>  Set refresh interval in milliseconds (default: 5000)

Environment Variables:
  API_URL      Base URL for the API

Examples:
  node dashboard.js
  node dashboard.js --url https://api.example.com
  API_URL=https://api.example.com node dashboard.js
`);
  process.exit(0);
}

// Parse command line arguments
const urlIndex = process.argv.indexOf('--url');
if (urlIndex !== -1 && process.argv[urlIndex + 1]) {
  config.baseUrl = process.argv[urlIndex + 1];
}

const intervalIndex = process.argv.indexOf('--interval');
if (intervalIndex !== -1 && process.argv[intervalIndex + 1]) {
  config.refreshInterval = parseInt(process.argv[intervalIndex + 1]);
}

// Run the dashboard
runDashboard().catch(error => {
  console.error(`${colors.red}💥 Dashboard failed to start:${colors.reset}`, error.message);
  process.exit(1);
});

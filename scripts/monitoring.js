#!/usr/bin/env node

/**
 * Advanced Monitoring and Alerting System
 * Comprehensive monitoring with metrics collection, alerting, and reporting
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { performance } = require('perf_hooks');
const nodemailer = require('nodemailer');
const { createPrometheusRegistry } = require('prom-client');

// Configuration
const config = {
  baseUrl: process.env.API_URL || 'http://localhost:3001',
  checkInterval: 30000, // 30 seconds
  alertCooldown: 300000, // 5 minutes
  thresholds: {
    responseTime: 1000, // ms
    errorRate: 0.05, // 5%
    memoryUsage: 0.85, // 85%
    cpuUsage: 0.80, // 80%
    diskUsage: 0.90, // 90%
  },
  notifications: {
    email: {
      enabled: process.env.EMAIL_ALERTS === 'true',
      smtp: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      },
      from: process.env.ALERT_FROM_EMAIL || 'alerts@chatapi.com',
      to: process.env.ALERT_TO_EMAIL || 'admin@chatapi.com'
    },
    webhook: {
      enabled: process.env.WEBHOOK_ALERTS === 'true',
      url: process.env.WEBHOOK_URL,
      secret: process.env.WEBHOOK_SECRET
    }
  },
  persistence: {
    metricsFile: path.join(__dirname, '..', 'monitoring', 'metrics.json'),
    alertsFile: path.join(__dirname, '..', 'monitoring', 'alerts.json'),
    logsDir: path.join(__dirname, '..', 'logs', 'monitoring')
  }
};

// System state
const systemState = {
  services: {},
  metrics: {
    uptime: 0,
    totalChecks: 0,
    successfulChecks: 0,
    averageResponseTime: 0,
    errorRate: 0,
    alerts: []
  },
  lastAlerts: new Map(),
  startTime: Date.now()
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
 * Ensure monitoring directories exist
 */
function ensureDirectories() {
  const dirs = [
    path.dirname(config.persistence.metricsFile),
    path.dirname(config.persistence.alertsFile),
    config.persistence.logsDir
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

/**
 * Make HTTP request with timeout
 */
async function makeRequest(endpoint, timeout = 5000) {
  const startTime = performance.now();
  
  try {
    const response = await axios.get(`${config.baseUrl}${endpoint}`, {
      timeout,
      validateStatus: () => true // Don't throw on HTTP errors
    });
    
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);
    
    return {
      success: response.status < 400,
      status: response.status,
      responseTime,
      data: response.data,
      headers: response.headers
    };
  } catch (error) {
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);
    
    return {
      success: false,
      status: 0,
      responseTime,
      error: error.message,
      code: error.code
    };
  }
}

/**
 * Check individual service
 */
async function checkService(name, endpoint, critical = true) {
  const result = await makeRequest(endpoint);
  
  const service = {
    name,
    endpoint,
    critical,
    status: result.success ? 'healthy' : 'unhealthy',
    responseTime: result.responseTime,
    httpStatus: result.status,
    error: result.error,
    lastCheck: new Date().toISOString(),
    uptime: systemState.services[name]?.uptime || 0
  };
  
  // Update uptime
  if (result.success) {
    service.uptime += config.checkInterval / 1000;
  }
  
  // Check for alerts
  await checkServiceAlerts(service);
  
  return service;
}

/**
 * Check all services
 */
async function checkAllServices() {
  const services = [
    { name: 'API Health', endpoint: '/health', critical: true },
    { name: 'API Root', endpoint: '/', critical: true },
    { name: 'Swagger Docs', endpoint: '/api-docs', critical: false },
    { name: 'Auth Endpoint', endpoint: '/api/auth', critical: true },
    { name: 'Rooms Endpoint', endpoint: '/api/rooms', critical: true },
    { name: 'Messages Endpoint', endpoint: '/api/messages', critical: true }
  ];
  
  console.log(`${colors.blue}🔍 Checking ${services.length} services...${colors.reset}`);
  
  const results = await Promise.all(
    services.map(service => checkService(service.name, service.endpoint, service.critical))
  );
  
  // Update system state
  results.forEach(service => {
    systemState.services[service.name] = service;
  });
  
  // Update global metrics
  updateGlobalMetrics();
  
  return results;
}

/**
 * Update global metrics
 */
function updateGlobalMetrics() {
  const services = Object.values(systemState.services);
  const healthyServices = services.filter(s => s.status === 'healthy');
  
  systemState.metrics.totalChecks++;
  systemState.metrics.successfulChecks = healthyServices.length;
  systemState.metrics.uptime = Math.floor((Date.now() - systemState.startTime) / 1000);
  
  // Calculate average response time
  const responseTimes = services.map(s => s.responseTime).filter(t => t > 0);
  if (responseTimes.length > 0) {
    systemState.metrics.averageResponseTime = Math.round(
      responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
    );
  }
  
  // Calculate error rate
  const totalServices = services.length;
  const unhealthyServices = totalServices - healthyServices.length;
  systemState.metrics.errorRate = totalServices > 0 ? unhealthyServices / totalServices : 0;
}

/**
 * Check for service alerts
 */
async function checkServiceAlerts(service) {
  const alerts = [];
  
  // Service down alert
  if (service.critical && service.status === 'unhealthy') {
    alerts.push({
      type: 'service_down',
      severity: 'critical',
      service: service.name,
      message: `Critical service ${service.name} is down: ${service.error}`,
      timestamp: new Date().toISOString()
    });
  }
  
  // High response time alert
  if (service.status === 'healthy' && service.responseTime > config.thresholds.responseTime) {
    alerts.push({
      type: 'high_response_time',
      severity: 'warning',
      service: service.name,
      message: `Service ${service.name} has high response time: ${service.responseTime}ms`,
      timestamp: new Date().toISOString()
    });
  }
  
  // Process alerts
  for (const alert of alerts) {
    await processAlert(alert);
  }
}

/**
 * Check system metrics alerts
 */
async function checkSystemAlerts() {
  const alerts = [];
  
  // High error rate
  if (systemState.metrics.errorRate > config.thresholds.errorRate) {
    alerts.push({
      type: 'high_error_rate',
      severity: 'critical',
      service: 'system',
      message: `System error rate is high: ${(systemState.metrics.errorRate * 100).toFixed(2)}%`,
      timestamp: new Date().toISOString()
    });
  }
  
  // Memory usage (if available)
  const memUsage = process.memoryUsage();
  const memoryUsagePercent = memUsage.heapUsed / memUsage.heapTotal;
  
  if (memoryUsagePercent > config.thresholds.memoryUsage) {
    alerts.push({
      type: 'high_memory_usage',
      severity: 'warning',
      service: 'system',
      message: `High memory usage: ${(memoryUsagePercent * 100).toFixed(2)}%`,
      timestamp: new Date().toISOString()
    });
  }
  
  // Process alerts
  for (const alert of alerts) {
    await processAlert(alert);
  }
}

/**
 * Process and handle alerts
 */
async function processAlert(alert) {
  const alertKey = `${alert.type}_${alert.service}`;
  const now = Date.now();
  const lastAlert = systemState.lastAlerts.get(alertKey);
  
  // Check cooldown period
  if (lastAlert && (now - lastAlert) < config.alertCooldown) {
    return;
  }
  
  // Update last alert time
  systemState.lastAlerts.set(alertKey, now);
  
  // Add to metrics
  systemState.metrics.alerts.push(alert);
  
  // Keep only last 100 alerts
  if (systemState.metrics.alerts.length > 100) {
    systemState.metrics.alerts = systemState.metrics.alerts.slice(-100);
  }
  
  // Log alert
  logAlert(alert);
  
  // Send notifications
  await sendNotifications(alert);
  
  console.log(`${getSeverityColor(alert.severity)}🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.message}${colors.reset}`);
}

/**
 * Get color for alert severity
 */
function getSeverityColor(severity) {
  switch (severity) {
    case 'critical': return colors.red;
    case 'warning': return colors.yellow;
    case 'info': return colors.blue;
    default: return colors.reset;
  }
}

/**
 * Log alert to file
 */
function logAlert(alert) {
  const logFile = path.join(config.persistence.logsDir, `alerts-${new Date().toISOString().split('T')[0]}.log`);
  const logEntry = `${alert.timestamp} [${alert.severity.toUpperCase()}] ${alert.type}: ${alert.message}\n`;
  
  try {
    fs.appendFileSync(logFile, logEntry);
  } catch (error) {
    console.error(`${colors.red}Failed to log alert:${colors.reset}`, error.message);
  }
}

/**
 * Send email notification
 */
async function sendEmailNotification(alert) {
  if (!config.notifications.email.enabled || !config.notifications.email.smtp.auth.user) {
    return;
  }
  
  try {
    const transporter = nodemailer.createTransporter(config.notifications.email.smtp);
    
    const mailOptions = {
      from: config.notifications.email.from,
      to: config.notifications.email.to,
      subject: `[${alert.severity.toUpperCase()}] Chat API Alert: ${alert.type}`,
      html: `
        <h2>🚨 Chat API Alert</h2>
        <table style="border-collapse: collapse; width: 100%;">
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">Severity:</td>
            <td style="border: 1px solid #ddd; padding: 8px; color: ${alert.severity === 'critical' ? 'red' : alert.severity === 'warning' ? 'orange' : 'blue'};">${alert.severity.toUpperCase()}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">Service:</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${alert.service}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">Type:</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${alert.type}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">Message:</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${alert.message}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">Timestamp:</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${alert.timestamp}</td>
          </tr>
        </table>
        <br>
        <p>Please check the system status and take appropriate action.</p>
        <p><a href="${config.baseUrl}/health">System Health Check</a></p>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`${colors.green}📧 Email notification sent${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}Failed to send email notification:${colors.reset}`, error.message);
  }
}

/**
 * Send webhook notification
 */
async function sendWebhookNotification(alert) {
  if (!config.notifications.webhook.enabled || !config.notifications.webhook.url) {
    return;
  }
  
  try {
    const payload = {
      alert,
      system: {
        uptime: systemState.metrics.uptime,
        errorRate: systemState.metrics.errorRate,
        averageResponseTime: systemState.metrics.averageResponseTime
      },
      timestamp: new Date().toISOString()
    };
    
    await axios.post(config.notifications.webhook.url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': config.notifications.webhook.secret
      },
      timeout: 5000
    });
    
    console.log(`${colors.green}🔗 Webhook notification sent${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}Failed to send webhook notification:${colors.reset}`, error.message);
  }
}

/**
 * Send notifications
 */
async function sendNotifications(alert) {
  await Promise.all([
    sendEmailNotification(alert),
    sendWebhookNotification(alert)
  ]);
}

/**
 * Save metrics to file
 */
function saveMetrics() {
  try {
    const data = {
      timestamp: new Date().toISOString(),
      services: systemState.services,
      metrics: systemState.metrics
    };
    
    fs.writeFileSync(config.persistence.metricsFile, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`${colors.red}Failed to save metrics:${colors.reset}`, error.message);
  }
}

/**
 * Load metrics from file
 */
function loadMetrics() {
  try {
    if (fs.existsSync(config.persistence.metricsFile)) {
      const data = JSON.parse(fs.readFileSync(config.persistence.metricsFile, 'utf8'));
      if (data.services) {
        systemState.services = data.services;
      }
      if (data.metrics) {
        systemState.metrics = { ...systemState.metrics, ...data.metrics };
      }
    }
  } catch (error) {
    console.error(`${colors.red}Failed to load metrics:${colors.reset}`, error.message);
  }
}

/**
 * Display monitoring dashboard
 */
function displayDashboard() {
  console.clear();
  
  // Header
  console.log(`${colors.bright}${colors.cyan}🔍 ADVANCED MONITORING DASHBOARD${colors.reset}`);
  console.log('='.repeat(80));
  console.log(`${colors.dim}Last updated: ${new Date().toLocaleString()}${colors.reset}`);
  console.log();
  
  // System overview
  const healthyServices = Object.values(systemState.services).filter(s => s.status === 'healthy').length;
  const totalServices = Object.keys(systemState.services).length;
  const criticalDown = Object.values(systemState.services).filter(s => s.critical && s.status !== 'healthy').length;
  
  console.log(`${colors.bright}${colors.blue}📊 SYSTEM OVERVIEW${colors.reset}`);
  console.log(`${colors.blue}${'─'.repeat(80)}${colors.reset}`);
  
  const overallStatus = criticalDown === 0 ? 'HEALTHY' : 'DEGRADED';
  const statusColor = criticalDown === 0 ? colors.green : colors.red;
  
  console.log(`${colors.bright}Status:${colors.reset}           ${statusColor}${overallStatus}${colors.reset}`);
  console.log(`${colors.bright}Services:${colors.reset}         ${colors.green}${healthyServices}${colors.reset}/${totalServices} healthy`);
  console.log(`${colors.bright}Uptime:${colors.reset}           ${Math.floor(systemState.metrics.uptime / 3600)}h ${Math.floor((systemState.metrics.uptime % 3600) / 60)}m`);
  console.log(`${colors.bright}Avg Response:${colors.reset}     ${systemState.metrics.averageResponseTime}ms`);
  console.log(`${colors.bright}Error Rate:${colors.reset}       ${(systemState.metrics.errorRate * 100).toFixed(2)}%`);
  console.log();
  
  // Services status
  console.log(`${colors.bright}${colors.blue}🔧 SERVICE STATUS${colors.reset}`);
  console.log(`${colors.blue}${'─'.repeat(80)}${colors.reset}`);
  console.log(`${colors.bright}SERVICE${' '.repeat(15)}STATUS${' '.repeat(8)}RESPONSE${' '.repeat(5)}UPTIME${colors.reset}`);
  console.log(`${colors.blue}${'─'.repeat(80)}${colors.reset}`);
  
  Object.values(systemState.services).forEach(service => {
    const nameStr = service.name.padEnd(20);
    const statusIcon = service.status === 'healthy' ? '✅' : '❌';
    const statusColor = service.status === 'healthy' ? colors.green : colors.red;
    const statusStr = `${statusIcon} ${service.status}`.padEnd(15);
    const responseStr = `${service.responseTime}ms`.padEnd(12);
    const uptimeStr = `${Math.floor(service.uptime / 3600)}h ${Math.floor((service.uptime % 3600) / 60)}m`.padEnd(10);
    
    console.log(`${nameStr} ${statusColor}${statusStr}${colors.reset} ${responseStr} ${colors.dim}${uptimeStr}${colors.reset}`);
  });
  
  console.log();
  
  // Recent alerts
  const recentAlerts = systemState.metrics.alerts.slice(-5);
  if (recentAlerts.length > 0) {
    console.log(`${colors.bright}${colors.red}🚨 RECENT ALERTS (Last 5)${colors.reset}`);
    console.log(`${colors.red}${'─'.repeat(80)}${colors.reset}`);
    
    recentAlerts.forEach(alert => {
      const timestamp = new Date(alert.timestamp).toLocaleTimeString();
      const severityColor = getSeverityColor(alert.severity);
      console.log(`${colors.dim}[${timestamp}]${colors.reset} ${severityColor}[${alert.severity.toUpperCase()}]${colors.reset} ${alert.message}`);
    });
    
    console.log();
  }
  
  // Controls
  console.log(`${colors.dim}Press Ctrl+C to stop monitoring${colors.reset}`);
}

/**
 * Main monitoring function
 */
async function runMonitoring() {
  console.log(`${colors.bright}${colors.blue}🚀 Starting Advanced Monitoring System...${colors.reset}`);
  console.log('='.repeat(60));
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`Check Interval: ${config.checkInterval / 1000}s`);
  console.log(`Alert Cooldown: ${config.alertCooldown / 1000}s`);
  console.log();
  
  // Ensure directories exist
  ensureDirectories();
  
  // Load previous metrics
  loadMetrics();
  
  // Initial check
  await checkAllServices();
  await checkSystemAlerts();
  displayDashboard();
  
  // Set up periodic monitoring
  const interval = setInterval(async () => {
    try {
      await checkAllServices();
      await checkSystemAlerts();
      saveMetrics();
      displayDashboard();
    } catch (error) {
      console.error(`${colors.red}💥 Monitoring error:${colors.reset}`, error.message);
    }
  }, config.checkInterval);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    clearInterval(interval);
    saveMetrics();
    console.log(`\n${colors.bright}${colors.cyan}👋 Monitoring stopped. Metrics saved.${colors.reset}`);
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    clearInterval(interval);
    saveMetrics();
    process.exit(0);
  });
}

// Handle command line arguments
if (process.argv.includes('--help')) {
  console.log(`
Usage: node monitoring.js [options]

Options:
  --interval <ms>    Check interval in milliseconds (default: 30000)
  --help            Show this help message

Environment Variables:
  API_URL           Base URL for the API (default: http://localhost:3001)
  EMAIL_ALERTS      Enable email alerts (true/false)
  SMTP_HOST         SMTP server host
  SMTP_PORT         SMTP server port
  SMTP_USER         SMTP username
  SMTP_PASS         SMTP password
  ALERT_FROM_EMAIL  Alert sender email
  ALERT_TO_EMAIL    Alert recipient email
  WEBHOOK_ALERTS    Enable webhook alerts (true/false)
  WEBHOOK_URL       Webhook URL
  WEBHOOK_SECRET    Webhook secret

Examples:
  node monitoring.js
  node monitoring.js --interval 60000
  EMAIL_ALERTS=true SMTP_USER=user@gmail.com node monitoring.js
`);
  process.exit(0);
}

// Override interval from command line
const intervalIndex = process.argv.indexOf('--interval');
if (intervalIndex !== -1 && process.argv[intervalIndex + 1]) {
  config.checkInterval = parseInt(process.argv[intervalIndex + 1]);
}

// Run monitoring system
if (require.main === module) {
  runMonitoring().catch(error => {
    console.error(`${colors.red}💥 Monitoring failed to start:${colors.reset}`, error.message);
    process.exit(1);
  });
}

module.exports = {
  runMonitoring,
  checkAllServices,
  processAlert,
  systemState
};

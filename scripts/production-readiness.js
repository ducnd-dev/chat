#!/usr/bin/env node

/**
 * Production Readiness Checker
 * Comprehensive system verification for production deployment
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execSync } = require('child_process');
const crypto = require('crypto');

// Configuration
const config = {
  baseUrl: process.env.API_URL || 'http://localhost:3001',
  checks: {
    security: true,
    performance: true,
    monitoring: true,
    backup: true,
    ssl: true,
    database: true,
    documentation: true,
    cicd: true
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

// Check results storage
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  details: [],
  categories: {}
};

/**
 * Log check result
 */
function logResult(category, name, status, message, severity = 'info') {
  const result = {
    category,
    name,
    status,
    message,
    severity,
    timestamp: new Date().toISOString()
  };
  
  results.details.push(result);
  
  if (!results.categories[category]) {
    results.categories[category] = { passed: 0, failed: 0, warnings: 0 };
  }
  
  if (status === 'pass') {
    results.passed++;
    results.categories[category].passed++;
    console.log(`   ${colors.green}✅ ${name}${colors.reset} - ${message}`);
  } else if (status === 'fail') {
    results.failed++;
    results.categories[category].failed++;
    console.log(`   ${colors.red}❌ ${name}${colors.reset} - ${message}`);
  } else if (status === 'warn') {
    results.warnings++;
    results.categories[category].warnings++;
    console.log(`   ${colors.yellow}⚠️  ${name}${colors.reset} - ${message}`);
  }
}

/**
 * Check if file exists
 */
function fileExists(filePath) {
  return fs.existsSync(path.resolve(filePath));
}

/**
 * Check environment variables
 */
function checkEnvironmentVariables() {
  console.log(`\n${colors.bright}${colors.blue}🔐 ENVIRONMENT & SECURITY CHECKS${colors.reset}`);
  
  const requiredVars = [
    'NODE_ENV',
    'MONGODB_URI',
    'JWT_SECRET',
    'REDIS_HOST',
    'RABBITMQ_URL'
  ];
  
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      logResult('security', `${varName} exists`, 'pass', 'Environment variable is set');
    } else {
      logResult('security', `${varName} missing`, 'fail', 'Required environment variable not set');
    }
  });
  
  // Check JWT secret strength
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret && jwtSecret.length >= 32) {
    logResult('security', 'JWT Secret Strength', 'pass', `Strong secret (${jwtSecret.length} chars)`);
  } else if (jwtSecret) {
    logResult('security', 'JWT Secret Strength', 'warn', `Weak secret (${jwtSecret.length} chars), recommend 32+`);
  }
  
  // Check NODE_ENV
  if (process.env.NODE_ENV === 'production') {
    logResult('security', 'Production Environment', 'pass', 'NODE_ENV set to production');
  } else {
    logResult('security', 'Production Environment', 'warn', `NODE_ENV is ${process.env.NODE_ENV}, should be 'production'`);
  }
}

/**
 * Check security configurations
 */
function checkSecurityConfiguration() {
  console.log(`\n${colors.bright}${colors.blue}🛡️  SECURITY CONFIGURATION${colors.reset}`);
  
  // Check for security middleware in package.json
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const securityPackages = ['helmet', 'express-rate-limit', 'bcryptjs', 'jsonwebtoken'];
  
  securityPackages.forEach(pkg => {
    if (packageJson.dependencies[pkg] || packageJson.devDependencies[pkg]) {
      logResult('security', `${pkg} installed`, 'pass', 'Security package is installed');
    } else {
      logResult('security', `${pkg} missing`, 'fail', 'Security package not installed');
    }
  });
  
  // Check for default passwords
  const envContent = fs.readFileSync('.env', 'utf8').toLowerCase();
  const defaultPasswords = ['password123', 'admin123', 'changeme', 'default'];
  
  defaultPasswords.forEach(defaultPwd => {
    if (envContent.includes(defaultPwd)) {
      logResult('security', 'Default Passwords', 'fail', `Found default password: ${defaultPwd}`);
    }
  });
}

/**
 * Check SSL/TLS configuration
 */
function checkSSLConfiguration() {
  console.log(`\n${colors.bright}${colors.blue}🔐 SSL/TLS CONFIGURATION${colors.reset}`);
  
  // Check SSL directory
  const sslDir = path.join('nginx', 'ssl');
  if (fileExists(sslDir)) {
    logResult('ssl', 'SSL Directory', 'pass', 'SSL directory exists');
    
    // Check for certificate files
    const certFiles = ['server.crt', 'server.key'];
    certFiles.forEach(file => {
      if (fileExists(path.join(sslDir, file))) {
        logResult('ssl', `${file}`, 'pass', 'SSL certificate file exists');
      } else {
        logResult('ssl', `${file}`, 'warn', 'SSL certificate file missing (use npm run ssl:setup)');
      }
    });
  } else {
    logResult('ssl', 'SSL Directory', 'warn', 'SSL directory not found (run npm run ssl:setup)');
  }
  
  // Check SSL configuration
  if (fileExists(path.join(sslDir, 'ssl-config.conf'))) {
    logResult('ssl', 'SSL Configuration', 'pass', 'SSL configuration file exists');
  } else {
    logResult('ssl', 'SSL Configuration', 'warn', 'SSL configuration missing');
  }
}

/**
 * Check database configuration
 */
async function checkDatabaseConfiguration() {
  console.log(`\n${colors.bright}${colors.blue}🗄️  DATABASE CONFIGURATION${colors.reset}`);
  
  try {
    // Check database connectivity via health endpoint
    const response = await axios.get(`${config.baseUrl}/health`, { timeout: 5000 });
    if (response.status === 200) {
      logResult('database', 'Database Connectivity', 'pass', 'Database connection successful');
    }
  } catch (error) {
    logResult('database', 'Database Connectivity', 'fail', `Database connection failed: ${error.message}`);
  }
  
  // Check for database initialization script
  if (fileExists('mongo-init.js')) {
    logResult('database', 'Database Initialization', 'pass', 'Database init script exists');
  } else {
    logResult('database', 'Database Initialization', 'warn', 'Database init script missing');
  }
}

/**
 * Check backup system
 */
function checkBackupSystem() {
  console.log(`\n${colors.bright}${colors.blue}💾 BACKUP SYSTEM${colors.reset}`);
  
  // Check backup script
  if (fileExists('scripts/backup.js')) {
    logResult('backup', 'Backup Script', 'pass', 'Backup script exists');
  } else {
    logResult('backup', 'Backup Script', 'fail', 'Backup script missing');
  }
  
  // Check backup directory
  if (fileExists('backups')) {
    logResult('backup', 'Backup Directory', 'pass', 'Backup directory exists');
    
    // Check for existing backups
    const backupFiles = fs.readdirSync('backups').filter(f => f.endsWith('.gz'));
    if (backupFiles.length > 0) {
      logResult('backup', 'Backup Files', 'pass', `${backupFiles.length} backup files found`);
    } else {
      logResult('backup', 'Backup Files', 'warn', 'No backup files found (run npm run backup:create)');
    }
  } else {
    logResult('backup', 'Backup Directory', 'warn', 'Backup directory not found');
  }
}

/**
 * Check monitoring system
 */
function checkMonitoringSystem() {
  console.log(`\n${colors.bright}${colors.blue}📊 MONITORING SYSTEM${colors.reset}`);
  
  // Check monitoring scripts
  const monitoringFiles = ['scripts/monitoring.js', 'scripts/dashboard.js'];
  monitoringFiles.forEach(file => {
    if (fileExists(file)) {
      logResult('monitoring', path.basename(file), 'pass', 'Monitoring script exists');
    } else {
      logResult('monitoring', path.basename(file), 'fail', 'Monitoring script missing');
    }
  });
  
  // Check Prometheus configuration
  if (fileExists('monitoring/prometheus.yml')) {
    logResult('monitoring', 'Prometheus Config', 'pass', 'Prometheus configuration exists');
  } else {
    logResult('monitoring', 'Prometheus Config', 'warn', 'Prometheus configuration missing');
  }
  
  // Check monitoring directory
  if (fileExists('monitoring')) {
    logResult('monitoring', 'Monitoring Directory', 'pass', 'Monitoring directory exists');
  } else {
    logResult('monitoring', 'Monitoring Directory', 'warn', 'Monitoring directory missing');
  }
}

/**
 * Check Docker configuration
 */
function checkDockerConfiguration() {
  console.log(`\n${colors.bright}${colors.blue}🐳 DOCKER CONFIGURATION${colors.reset}`);
  
  // Check Docker files
  const dockerFiles = ['Dockerfile', 'docker-compose.yml', 'docker-compose.prod.yml', '.dockerignore'];
  dockerFiles.forEach(file => {
    if (fileExists(file)) {
      logResult('docker', file, 'pass', 'Docker file exists');
    } else {
      logResult('docker', file, 'fail', 'Docker file missing');
    }
  });
  
  // Check multi-stage Dockerfile
  if (fileExists('Dockerfile')) {
    const dockerfileContent = fs.readFileSync('Dockerfile', 'utf8');
    if (dockerfileContent.includes('FROM node') && dockerfileContent.includes('as production')) {
      logResult('docker', 'Multi-stage Build', 'pass', 'Multi-stage Dockerfile detected');
    } else {
      logResult('docker', 'Multi-stage Build', 'warn', 'Consider using multi-stage Docker build');
    }
  }
}

/**
 * Check CI/CD pipeline
 */
function checkCICDPipeline() {
  console.log(`\n${colors.bright}${colors.blue}🚀 CI/CD PIPELINE${colors.reset}`);
  
  // Check GitHub Actions
  if (fileExists('.github/workflows/ci-cd.yml')) {
    logResult('cicd', 'GitHub Actions', 'pass', 'CI/CD pipeline exists');
    
    const cicdContent = fs.readFileSync('.github/workflows/ci-cd.yml', 'utf8');
    const features = [
      { name: 'Code Quality', pattern: 'lint' },
      { name: 'Testing', pattern: 'test' },
      { name: 'Security Scan', pattern: 'audit' },
      { name: 'Docker Build', pattern: 'docker' },
      { name: 'Performance Test', pattern: 'k6' },
    ];
    
    features.forEach(feature => {
      if (cicdContent.includes(feature.pattern)) {
        logResult('cicd', feature.name, 'pass', 'CI/CD feature implemented');
      } else {
        logResult('cicd', feature.name, 'warn', 'CI/CD feature missing');
      }
    });
  } else {
    logResult('cicd', 'GitHub Actions', 'fail', 'CI/CD pipeline missing');
  }
}

/**
 * Check Kubernetes configuration
 */
function checkKubernetesConfiguration() {
  console.log(`\n${colors.bright}${colors.blue}☸️  KUBERNETES CONFIGURATION${colors.reset}`);
  
  // Check K8s files
  if (fileExists('k8s/production.yaml')) {
    logResult('kubernetes', 'Production Manifests', 'pass', 'Kubernetes manifests exist');
  } else {
    logResult('kubernetes', 'Production Manifests', 'warn', 'Kubernetes manifests missing');
  }
  
  if (fileExists('.env.k8s')) {
    logResult('kubernetes', 'K8s Environment', 'pass', 'Kubernetes environment config exists');
  } else {
    logResult('kubernetes', 'K8s Environment', 'warn', 'Kubernetes environment config missing');
  }
}

/**
 * Check documentation
 */
function checkDocumentation() {
  console.log(`\n${colors.bright}${colors.blue}📚 DOCUMENTATION${colors.reset}`);
  
  // Check README
  if (fileExists('README.md')) {
    const readmeContent = fs.readFileSync('README.md', 'utf8');
    const sections = [
      'Installation',
      'API Documentation',
      'Environment Variables',
      'Docker',
      'Production Deployment'
    ];
    
    sections.forEach(section => {
      if (readmeContent.toLowerCase().includes(section.toLowerCase())) {
        logResult('documentation', section, 'pass', 'Documentation section exists');
      } else {
        logResult('documentation', section, 'warn', 'Documentation section missing');
      }
    });
  } else {
    logResult('documentation', 'README', 'fail', 'README.md missing');
  }
  
  // Check API documentation
  if (fileExists('docs') || fs.readFileSync('README.md', 'utf8').includes('swagger')) {
    logResult('documentation', 'API Docs', 'pass', 'API documentation available');
  } else {
    logResult('documentation', 'API Docs', 'warn', 'API documentation missing');
  }
}

/**
 * Perform performance checks
 */
async function checkPerformance() {
  console.log(`\n${colors.bright}${colors.blue}⚡ PERFORMANCE CHECKS${colors.reset}`);
  
  try {
    // Test response time
    const start = Date.now();
    const response = await axios.get(`${config.baseUrl}/health`, { timeout: 10000 });
    const responseTime = Date.now() - start;
    
    if (responseTime < 500) {
      logResult('performance', 'Response Time', 'pass', `${responseTime}ms (excellent)`);
    } else if (responseTime < 1000) {
      logResult('performance', 'Response Time', 'warn', `${responseTime}ms (acceptable)`);
    } else {
      logResult('performance', 'Response Time', 'fail', `${responseTime}ms (too slow)`);
    }
    
    // Check for performance optimizations
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const perfPackages = ['compression', 'cluster'];
    
    perfPackages.forEach(pkg => {
      if (packageJson.dependencies[pkg] || packageJson.devDependencies[pkg]) {
        logResult('performance', `${pkg} optimization`, 'pass', 'Performance package installed');
      } else {
        logResult('performance', `${pkg} optimization`, 'warn', 'Performance package not installed');
      }
    });
    
  } catch (error) {
    logResult('performance', 'API Availability', 'fail', `API not accessible: ${error.message}`);
  }
}

/**
 * Generate production readiness report
 */
function generateReport() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`${colors.bright}${colors.cyan}📋 PRODUCTION READINESS REPORT${colors.reset}`);
  console.log(`${'='.repeat(80)}`);
  
  // Overall score
  const totalChecks = results.passed + results.failed + results.warnings;
  const score = Math.round((results.passed / totalChecks) * 100);
  
  let scoreColor = colors.green;
  if (score < 70) scoreColor = colors.red;
  else if (score < 90) scoreColor = colors.yellow;
  
  console.log(`${colors.bright}Overall Score:${colors.reset} ${scoreColor}${score}%${colors.reset} (${results.passed}/${totalChecks} checks passed)`);
  console.log(`${colors.green}✅ Passed: ${results.passed}${colors.reset} | ${colors.yellow}⚠️  Warnings: ${results.warnings}${colors.reset} | ${colors.red}❌ Failed: ${results.failed}${colors.reset}`);
  
  // Category breakdown
  console.log(`\n${colors.bright}Category Breakdown:${colors.reset}`);
  Object.entries(results.categories).forEach(([category, stats]) => {
    const total = stats.passed + stats.failed + stats.warnings;
    const categoryScore = Math.round((stats.passed / total) * 100);
    let categoryColor = colors.green;
    if (categoryScore < 70) categoryColor = colors.red;
    else if (categoryScore < 90) categoryColor = colors.yellow;
    
    console.log(`   ${category.padEnd(15)} ${categoryColor}${categoryScore}%${colors.reset} (${stats.passed}/${total})`);
  });
  
  // Recommendations
  console.log(`\n${colors.bright}${colors.cyan}🎯 RECOMMENDATIONS${colors.reset}`);
  
  if (results.failed > 0) {
    console.log(`${colors.red}🚨 Critical Issues (Must Fix):${colors.reset}`);
    results.details.filter(r => r.status === 'fail').forEach(r => {
      console.log(`   • ${r.category}: ${r.name} - ${r.message}`);
    });
    console.log();
  }
  
  if (results.warnings > 0) {
    console.log(`${colors.yellow}⚠️  Warnings (Recommended):${colors.reset}`);
    results.details.filter(r => r.status === 'warn').slice(0, 5).forEach(r => {
      console.log(`   • ${r.category}: ${r.name} - ${r.message}`);
    });
    if (results.warnings > 5) {
      console.log(`   ... and ${results.warnings - 5} more warnings`);
    }
    console.log();
  }
  
  // Production readiness verdict
  console.log(`${colors.bright}${colors.cyan}🏭 PRODUCTION READINESS VERDICT${colors.reset}`);
  if (score >= 95 && results.failed === 0) {
    console.log(`${colors.green}🎉 EXCELLENT! System is production-ready.${colors.reset}`);
  } else if (score >= 85 && results.failed <= 2) {
    console.log(`${colors.yellow}✨ GOOD! System is mostly production-ready with minor issues.${colors.reset}`);
  } else if (score >= 70) {
    console.log(`${colors.yellow}⚠️  ACCEPTABLE! System needs improvements before production.${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ NOT READY! System requires significant work before production.${colors.reset}`);
  }
  
  // Save report
  const reportData = {
    timestamp: new Date().toISOString(),
    score,
    summary: { passed: results.passed, warnings: results.warnings, failed: results.failed },
    categories: results.categories,
    details: results.details
  };
  
  fs.writeFileSync('production-readiness-report.json', JSON.stringify(reportData, null, 2));
  console.log(`\n${colors.dim}📄 Detailed report saved to: production-readiness-report.json${colors.reset}`);
}

/**
 * Main function
 */
async function runProductionReadinessCheck() {
  console.log(`${colors.bright}${colors.blue}🔍 PRODUCTION READINESS CHECKER${colors.reset}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`${colors.dim}Timestamp: ${new Date().toISOString()}${colors.reset}`);
  console.log(`${colors.dim}Base URL: ${config.baseUrl}${colors.reset}`);
  
  try {
    // Run all checks
    checkEnvironmentVariables();
    checkSecurityConfiguration();
    checkSSLConfiguration();
    await checkDatabaseConfiguration();
    checkBackupSystem();
    checkMonitoringSystem();
    checkDockerConfiguration();
    checkCICDPipeline();
    checkKubernetesConfiguration();
    checkDocumentation();
    await checkPerformance();
    
    // Generate final report
    generateReport();
    
  } catch (error) {
    console.error(`${colors.red}💥 Error during production readiness check:${colors.reset}`, error.message);
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help')) {
  console.log(`
${colors.bright}Production Readiness Checker${colors.reset}

Usage: node production-readiness.js [options]

Options:
  --help              Show this help message
  --category <name>   Run checks for specific category only

Categories:
  security, ssl, database, backup, monitoring, docker, cicd, kubernetes, documentation, performance

Examples:
  node production-readiness.js
  node production-readiness.js --category security
`);
  process.exit(0);
}

// Run specific category if requested
const categoryIndex = process.argv.indexOf('--category');
if (categoryIndex !== -1 && process.argv[categoryIndex + 1]) {
  const category = process.argv[categoryIndex + 1];
  console.log(`Running checks for category: ${category}`);
  // Implement category-specific checks here
}

// Run the checker
if (require.main === module) {
  runProductionReadinessCheck();
}

module.exports = {
  runProductionReadinessCheck,
  results
};

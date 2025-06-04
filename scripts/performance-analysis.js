#!/usr/bin/env node

/**
 * Performance Optimization and Benchmarking Tool
 * Comprehensive performance analysis and optimization recommendations
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { performance } = require('perf_hooks');
const { execSync } = require('child_process');

// Performance configuration
const perfConfig = {
  baseUrl: process.env.API_URL || 'http://localhost:3001',
  loadTestDuration: 30000, // 30 seconds
  concurrentUsers: 10,
  thresholds: {
    responseTime: 500, // ms
    errorRate: 0.05, // 5%
    throughput: 100, // requests per second
    memoryUsage: 0.8, // 80% of available
    cpuUsage: 0.7 // 70%
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

// Performance results
const perfResults = {
  metrics: {
    responseTime: { min: 0, max: 0, avg: 0, p95: 0, p99: 0 },
    throughput: 0,
    errorRate: 0,
    memoryUsage: { used: 0, total: 0, percentage: 0 },
    cpuUsage: 0,
    requests: { total: 0, successful: 0, failed: 0 }
  },
  optimizations: [],
  recommendations: [],
  score: 0
};

/**
 * Log performance result
 */
function logPerfResult(category, title, value, threshold, unit = '', status = 'info') {
  let statusColor = colors.blue;
  let icon = 'ℹ️ ';
  
  if (status === 'good') {
    statusColor = colors.green;
    icon = '✅ ';
  } else if (status === 'warning') {
    statusColor = colors.yellow;
    icon = '⚠️ ';
  } else if (status === 'poor') {
    statusColor = colors.red;
    icon = '❌ ';
  }
  
  console.log(`   ${icon}${statusColor}${title}:${colors.reset} ${value}${unit} ${threshold ? `(threshold: ${threshold}${unit})` : ''}`);
}

/**
 * Add optimization recommendation
 */
function addRecommendation(category, title, description, priority = 'medium', implementation = '') {
  const recommendation = {
    category,
    title,
    description,
    priority,
    implementation,
    timestamp: new Date().toISOString()
  };
  
  perfResults.recommendations.push(recommendation);
  
  let priorityColor = colors.yellow;
  if (priority === 'high') priorityColor = colors.red;
  else if (priority === 'low') priorityColor = colors.blue;
  
  console.log(`   💡 ${priorityColor}${priority.toUpperCase()}${colors.reset}: ${title}`);
  console.log(`      ${colors.dim}${description}${colors.reset}`);
  if (implementation) {
    console.log(`      ${colors.bright}Implementation:${colors.reset} ${implementation}`);
  }
}

/**
 * Make HTTP request with timing
 */
async function makeTimedRequest(url, timeout = 5000) {
  const start = performance.now();
  try {
    const response = await axios.get(url, { timeout });
    const duration = performance.now() - start;
    return {
      success: true,
      duration,
      status: response.status,
      size: JSON.stringify(response.data).length
    };
  } catch (error) {
    const duration = performance.now() - start;
    return {
      success: false,
      duration,
      error: error.message
    };
  }
}

/**
 * Run basic performance tests
 */
async function runBasicPerformanceTests() {
  console.log(`\n${colors.bright}${colors.blue}⚡ BASIC PERFORMANCE TESTS${colors.reset}`);
  
  const endpoints = [
    { name: 'Health Check', url: '/health' },
    { name: 'API Root', url: '/' },
    { name: 'Swagger Docs', url: '/api-docs' }
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    console.log(`\n   Testing ${endpoint.name}...`);
    const url = `${perfConfig.baseUrl}${endpoint.url}`;
    
    // Run multiple requests to get average
    const testResults = [];
    for (let i = 0; i < 10; i++) {
      const result = await makeTimedRequest(url);
      testResults.push(result);
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
    }
    
    // Calculate statistics
    const durations = testResults.filter(r => r.success).map(r => r.duration);
    const errorCount = testResults.filter(r => !r.success).length;
    
    if (durations.length > 0) {
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);
      
      results.push({
        endpoint: endpoint.name,
        avgDuration,
        maxDuration,
        minDuration,
        errorRate: errorCount / testResults.length,
        successRate: (testResults.length - errorCount) / testResults.length
      });
      
      // Log results
      const status = avgDuration < perfConfig.thresholds.responseTime ? 'good' : 
                    avgDuration < perfConfig.thresholds.responseTime * 2 ? 'warning' : 'poor';
      
      logPerfResult('response', `Avg Response Time`, Math.round(avgDuration), perfConfig.thresholds.responseTime, 'ms', status);
      logPerfResult('response', `Max Response Time`, Math.round(maxDuration), null, 'ms');
      logPerfResult('response', `Success Rate`, Math.round((1 - errorCount / testResults.length) * 100), 95, '%', errorCount === 0 ? 'good' : 'poor');
    } else {
      logPerfResult('response', 'All Requests Failed', '100%', '0%', '', 'poor');
    }
  }
  
  return results;
}

/**
 * Run load testing
 */
async function runLoadTest() {
  console.log(`\n${colors.bright}${colors.blue}🏋️  LOAD TESTING${colors.reset}`);
  console.log(`   Users: ${perfConfig.concurrentUsers}, Duration: ${perfConfig.loadTestDuration / 1000}s`);
  
  const startTime = Date.now();
  const endTime = startTime + perfConfig.loadTestDuration;
  const requests = [];
  
  // Create concurrent users
  const userPromises = [];
  for (let i = 0; i < perfConfig.concurrentUsers; i++) {
    const userPromise = (async () => {
      while (Date.now() < endTime) {
        const result = await makeTimedRequest(`${perfConfig.baseUrl}/health`);
        requests.push({
          ...result,
          timestamp: Date.now(),
          user: i
        });
        
        // Random delay between requests (100ms to 1s)
        await new Promise(resolve => setTimeout(resolve, Math.random() * 900 + 100));
      }
    })();
    
    userPromises.push(userPromise);
  }
  
  await Promise.all(userPromises);
  
  // Analyze results
  const successfulRequests = requests.filter(r => r.success);
  const failedRequests = requests.filter(r => !r.success);
  const durations = successfulRequests.map(r => r.duration);
  
  if (durations.length > 0) {
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const sortedDurations = durations.sort((a, b) => a - b);
    const p95 = sortedDurations[Math.floor(sortedDurations.length * 0.95)];
    const p99 = sortedDurations[Math.floor(sortedDurations.length * 0.99)];
    const throughput = successfulRequests.length / (perfConfig.loadTestDuration / 1000);
    const errorRate = failedRequests.length / requests.length;
    
    // Update results
    perfResults.metrics.responseTime = {
      min: Math.min(...durations),
      max: Math.max(...durations),
      avg: avgDuration,
      p95,
      p99
    };
    perfResults.metrics.throughput = throughput;
    perfResults.metrics.errorRate = errorRate;
    perfResults.metrics.requests = {
      total: requests.length,
      successful: successfulRequests.length,
      failed: failedRequests.length
    };
    
    // Log results
    logPerfResult('load', 'Average Response Time', Math.round(avgDuration), perfConfig.thresholds.responseTime, 'ms', 
                  avgDuration < perfConfig.thresholds.responseTime ? 'good' : 'poor');
    logPerfResult('load', '95th Percentile', Math.round(p95), perfConfig.thresholds.responseTime * 2, 'ms');
    logPerfResult('load', '99th Percentile', Math.round(p99), perfConfig.thresholds.responseTime * 3, 'ms');
    logPerfResult('load', 'Throughput', Math.round(throughput), perfConfig.thresholds.throughput, ' req/s',
                  throughput >= perfConfig.thresholds.throughput ? 'good' : 'poor');
    logPerfResult('load', 'Error Rate', (errorRate * 100).toFixed(2), (perfConfig.thresholds.errorRate * 100), '%',
                  errorRate < perfConfig.thresholds.errorRate ? 'good' : 'poor');
  } else {
    console.log(`   ${colors.red}❌ Load test failed - no successful requests${colors.reset}`);
  }
}

/**
 * Analyze system resources
 */
function analyzeSystemResources() {
  console.log(`\n${colors.bright}${colors.blue}🖥️  SYSTEM RESOURCE ANALYSIS${colors.reset}`);
  
  try {
    // Memory analysis
    const memUsage = process.memoryUsage();
    const totalMem = require('os').totalmem();
    const freeMem = require('os').freemem();
    const usedMem = totalMem - freeMem;
    const memPercentage = (usedMem / totalMem) * 100;
    
    perfResults.metrics.memoryUsage = {
      used: usedMem,
      total: totalMem,
      percentage: memPercentage / 100
    };
    
    logPerfResult('memory', 'Process Memory (RSS)', Math.round(memUsage.rss / 1024 / 1024), null, 'MB');
    logPerfResult('memory', 'Process Memory (Heap)', Math.round(memUsage.heapUsed / 1024 / 1024), null, 'MB');
    logPerfResult('memory', 'System Memory Usage', memPercentage.toFixed(1), perfConfig.thresholds.memoryUsage * 100, '%',
                  memPercentage < perfConfig.thresholds.memoryUsage * 100 ? 'good' : 'warning');
    
    // CPU analysis (basic)
    const cpuUsage = process.cpuUsage();
    const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
    
    logPerfResult('cpu', 'Process CPU Time', cpuPercent.toFixed(2), null, 's');
    
  } catch (error) {
    console.log(`   ${colors.yellow}⚠️  Could not analyze system resources: ${error.message}${colors.reset}`);
  }
}

/**
 * Analyze application configuration
 */
function analyzeApplicationConfig() {
  console.log(`\n${colors.bright}${colors.blue}⚙️  APPLICATION CONFIGURATION ANALYSIS${colors.reset}`);
  
  // Check package.json for performance packages
  if (fs.existsSync('package.json')) {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    // Performance-related packages
    const perfPackages = [
      { name: 'compression', benefit: 'Reduces response size by 60-80%' },
      { name: 'cluster', benefit: 'Utilizes multi-core processors' },
      { name: 'redis', benefit: 'Fast caching and session storage' },
      { name: 'helmet', benefit: 'Security headers with minimal overhead' },
      { name: 'express-rate-limit', benefit: 'Prevents abuse and improves stability' }
    ];
    
    perfPackages.forEach(pkg => {
      if (allDeps[pkg.name]) {
        console.log(`   ✅ ${pkg.name}: ${colors.dim}${pkg.benefit}${colors.reset}`);
      } else {
        addRecommendation(
          'packages',
          `Install ${pkg.name}`,
          pkg.benefit,
          'medium',
          `npm install ${pkg.name}`
        );
      }
    });
  }
  
  // Check TypeScript configuration
  if (fs.existsSync('tsconfig.json')) {
    const tsConfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
    
    if (tsConfig.compilerOptions) {
      const { target, module, strict } = tsConfig.compilerOptions;
      
      if (target && target.toLowerCase().includes('es2020') || target.toLowerCase().includes('es2021')) {
        console.log(`   ✅ Modern TypeScript target: ${target}`);
      } else {
        addRecommendation(
          'config',
          'Update TypeScript Target',
          'Use ES2020+ for better performance',
          'low',
          'Set target: "ES2021" in tsconfig.json'
        );
      }
      
      if (strict) {
        console.log(`   ✅ Strict mode enabled: Better optimization`);
      }
    }
  }
  
  // Check environment configuration
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === 'production') {
    console.log(`   ✅ Production environment detected`);
  } else {
    addRecommendation(
      'config',
      'Set Production Environment',
      'NODE_ENV=production enables optimizations',
      'high',
      'Set NODE_ENV=production'
    );
  }
}

/**
 * Analyze database performance
 */
async function analyzeDatabasePerformance() {
  console.log(`\n${colors.bright}${colors.blue}🗄️  DATABASE PERFORMANCE ANALYSIS${colors.reset}`);
  
  try {
    // Test database connection speed
    const dbTests = [
      { name: 'Health Check', endpoint: '/health' }
    ];
    
    for (const test of dbTests) {
      const result = await makeTimedRequest(`${perfConfig.baseUrl}${test.endpoint}`);
      if (result.success) {
        const status = result.duration < 200 ? 'good' : result.duration < 500 ? 'warning' : 'poor';
        logPerfResult('database', test.name, Math.round(result.duration), 200, 'ms', status);
        
        if (result.duration > 500) {
          addRecommendation(
            'database',
            'Optimize Database Queries',
            'Database response time is slow',
            'high',
            'Add indexes, optimize queries, consider connection pooling'
          );
        }
      }
    }
    
    // Check for MongoDB optimizations
    if (process.env.MONGODB_URI) {
      if (process.env.MONGODB_URI.includes('poolSize')) {
        console.log(`   ✅ Connection pooling configured`);
      } else {
        addRecommendation(
          'database',
          'Configure Connection Pooling',
          'Connection pooling improves database performance',
          'medium',
          'Add poolSize parameter to MongoDB URI'
        );
      }
    }
    
  } catch (error) {
    console.log(`   ${colors.yellow}⚠️  Could not analyze database performance: ${error.message}${colors.reset}`);
  }
}

/**
 * Analyze caching strategies
 */
function analyzeCaching() {
  console.log(`\n${colors.bright}${colors.blue}🚀 CACHING ANALYSIS${colors.reset}`);
  
  // Check for Redis
  if (process.env.REDIS_HOST) {
    console.log(`   ✅ Redis caching configured`);
  } else {
    addRecommendation(
      'caching',
      'Implement Redis Caching',
      'Redis can significantly improve response times',
      'high',
      'Set up Redis for session storage and API caching'
    );
  }
  
  // Check application code for caching middleware
  const serverFile = path.join('src', 'server.ts');
  if (fs.existsSync(serverFile)) {
    const serverContent = fs.readFileSync(serverFile, 'utf8');
    
    if (serverContent.includes('cache') || serverContent.includes('Cache')) {
      console.log(`   ✅ Application-level caching detected`);
    } else {
      addRecommendation(
        'caching',
        'Implement Application Caching',
        'Add caching middleware for frequently accessed data',
        'medium',
        'Use express-cache-middleware or custom caching logic'
      );
    }
  }
  
  // Check for CDN configuration
  if (fs.existsSync('nginx') || fs.existsSync('nginx.conf')) {
    console.log(`   ✅ Nginx proxy configured (can serve static files)`);
  } else {
    addRecommendation(
      'caching',
      'Configure Reverse Proxy',
      'Nginx can cache static content and improve performance',
      'medium',
      'Set up Nginx for static file serving and caching'
    );
  }
}

/**
 * Calculate performance score
 */
function calculatePerformanceScore() {
  let score = 100;
  
  // Response time score (30%)
  if (perfResults.metrics.responseTime.avg > 0) {
    const responseScore = Math.max(0, 30 - (perfResults.metrics.responseTime.avg / perfConfig.thresholds.responseTime) * 10);
    score = score - 30 + responseScore;
  }
  
  // Throughput score (25%)
  if (perfResults.metrics.throughput > 0) {
    const throughputScore = Math.min(25, (perfResults.metrics.throughput / perfConfig.thresholds.throughput) * 25);
    score = score - 25 + throughputScore;
  }
  
  // Error rate score (20%)
  const errorScore = Math.max(0, 20 - (perfResults.metrics.errorRate / perfConfig.thresholds.errorRate) * 20);
  score = score - 20 + errorScore;
  
  // Configuration score (25%)
  const highPriorityRecs = perfResults.recommendations.filter(r => r.priority === 'high').length;
  const configScore = Math.max(0, 25 - highPriorityRecs * 5);
  score = score - 25 + configScore;
  
  perfResults.score = Math.max(0, Math.round(score));
  return perfResults.score;
}

/**
 * Generate performance report
 */
function generatePerformanceReport() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`${colors.bright}${colors.cyan}⚡ PERFORMANCE ANALYSIS REPORT${colors.reset}`);
  console.log(`${'='.repeat(80)}`);
  
  const score = calculatePerformanceScore();
  let scoreColor = colors.green;
  if (score < 60) scoreColor = colors.red;
  else if (score < 80) scoreColor = colors.yellow;
  
  console.log(`${colors.bright}Performance Score:${colors.reset} ${scoreColor}${score}/100${colors.reset}`);
  
  // Performance metrics summary
  if (perfResults.metrics.responseTime.avg > 0) {
    console.log(`\n${colors.bright}Performance Metrics:${colors.reset}`);
    console.log(`   Average Response Time: ${Math.round(perfResults.metrics.responseTime.avg)}ms`);
    console.log(`   95th Percentile: ${Math.round(perfResults.metrics.responseTime.p95)}ms`);
    console.log(`   Throughput: ${Math.round(perfResults.metrics.throughput)} req/s`);
    console.log(`   Error Rate: ${(perfResults.metrics.errorRate * 100).toFixed(2)}%`);
    console.log(`   Total Requests: ${perfResults.metrics.requests.total}`);
  }
  
  // Priority recommendations
  const highPriority = perfResults.recommendations.filter(r => r.priority === 'high');
  const mediumPriority = perfResults.recommendations.filter(r => r.priority === 'medium');
  
  if (highPriority.length > 0) {
    console.log(`\n${colors.red}🚨 HIGH PRIORITY OPTIMIZATIONS${colors.reset}`);
    highPriority.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec.title}`);
      console.log(`      ${colors.dim}${rec.description}${colors.reset}`);
      if (rec.implementation) {
        console.log(`      ${colors.bright}Action:${colors.reset} ${rec.implementation}`);
      }
      console.log();
    });
  }
  
  if (mediumPriority.length > 0) {
    console.log(`\n${colors.yellow}⚠️  RECOMMENDED OPTIMIZATIONS${colors.reset}`);
    mediumPriority.slice(0, 5).forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec.title}`);
      console.log(`      ${colors.dim}${rec.description}${colors.reset}`);
      console.log();
    });
    
    if (mediumPriority.length > 5) {
      console.log(`   ... and ${mediumPriority.length - 5} more recommendations`);
    }
  }
  
  // Performance verdict
  console.log(`\n${colors.bright}${colors.cyan}🏁 PERFORMANCE VERDICT${colors.reset}`);
  if (score >= 90) {
    console.log(`${colors.green}🎉 EXCELLENT! Application has outstanding performance.${colors.reset}`);
  } else if (score >= 75) {
    console.log(`${colors.green}✨ GOOD! Performance is solid with room for minor improvements.${colors.reset}`);
  } else if (score >= 60) {
    console.log(`${colors.yellow}⚠️  ACCEPTABLE! Performance needs optimization before production.${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ POOR! Significant performance improvements required.${colors.reset}`);
  }
  
  // Save detailed report
  const reportData = {
    timestamp: new Date().toISOString(),
    score,
    metrics: perfResults.metrics,
    recommendations: perfResults.recommendations,
    summary: {
      totalRecommendations: perfResults.recommendations.length,
      highPriority: highPriority.length,
      mediumPriority: mediumPriority.length
    }
  };
  
  fs.writeFileSync('performance-analysis-report.json', JSON.stringify(reportData, null, 2));
  console.log(`\n${colors.dim}📄 Detailed performance report saved to: performance-analysis-report.json${colors.reset}`);
}

/**
 * Main performance analysis function
 */
async function runPerformanceAnalysis() {
  console.log(`${colors.bright}${colors.blue}⚡ COMPREHENSIVE PERFORMANCE ANALYSIS${colors.reset}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`${colors.dim}Timestamp: ${new Date().toISOString()}${colors.reset}`);
  console.log(`${colors.dim}Target: ${perfConfig.baseUrl}${colors.reset}`);
  
  try {
    await runBasicPerformanceTests();
    await runLoadTest();
    analyzeSystemResources();
    analyzeApplicationConfig();
    await analyzeDatabasePerformance();
    analyzeCaching();
    
    generatePerformanceReport();
    
  } catch (error) {
    console.error(`${colors.red}💥 Error during performance analysis:${colors.reset}`, error.message);
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help')) {
  console.log(`
${colors.bright}Performance Analysis Tool${colors.reset}

Usage: node performance-analysis.js [options]

Options:
  --help              Show this help message
  --duration <ms>     Load test duration in milliseconds (default: 30000)
  --users <number>    Concurrent users for load test (default: 10)
  --url <url>         Base URL to test (default: http://localhost:3001)

Examples:
  node performance-analysis.js
  node performance-analysis.js --duration 60000 --users 20
  node performance-analysis.js --url https://api.example.com
`);
  process.exit(0);
}

// Parse command line arguments
const durationIndex = process.argv.indexOf('--duration');
if (durationIndex !== -1 && process.argv[durationIndex + 1]) {
  perfConfig.loadTestDuration = parseInt(process.argv[durationIndex + 1]);
}

const usersIndex = process.argv.indexOf('--users');
if (usersIndex !== -1 && process.argv[usersIndex + 1]) {
  perfConfig.concurrentUsers = parseInt(process.argv[usersIndex + 1]);
}

const urlIndex = process.argv.indexOf('--url');
if (urlIndex !== -1 && process.argv[urlIndex + 1]) {
  perfConfig.baseUrl = process.argv[urlIndex + 1];
}

// Run the performance analysis
if (require.main === module) {
  runPerformanceAnalysis();
}

module.exports = {
  runPerformanceAnalysis,
  perfResults
};

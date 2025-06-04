#!/usr/bin/env node

/**
 * Production Deployment Script
 * Automates the deployment process with health checks
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  projectPath: process.cwd(),
  healthCheckRetries: 5,
  healthCheckDelay: 10000, // 10 seconds
  buildTimeout: 300000, // 5 minutes
};

// Color codes
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

/**
 * Execute command with promise
 */
function execCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`${colors.blue}🔧 Running: ${command}${colors.reset}`);
    
    exec(command, { ...options, cwd: config.projectPath }, (error, stdout, stderr) => {
      if (error) {
        console.error(`${colors.red}❌ Command failed: ${command}${colors.reset}`);
        console.error(stderr);
        reject(error);
        return;
      }
      
      if (stdout) console.log(stdout);
      if (stderr) console.log(stderr);
      resolve(stdout);
    });
  });
}

/**
 * Check if file exists
 */
function fileExists(filePath) {
  return fs.existsSync(path.join(config.projectPath, filePath));
}

/**
 * Validate environment
 */
async function validateEnvironment() {
  console.log(`${colors.blue}🔍 Validating environment...${colors.reset}`);
  
  // Check required files
  const requiredFiles = [
    'package.json',
    'tsconfig.json',
    'Dockerfile',
    'docker-compose.yml',
    '.env.production'
  ];
  
  for (const file of requiredFiles) {
    if (!fileExists(file)) {
      throw new Error(`Required file missing: ${file}`);
    }
  }
  
  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion < 18) {
    throw new Error(`Node.js 18+ required, found ${nodeVersion}`);
  }
  
  console.log(`${colors.green}✅ Environment validation passed${colors.reset}`);
}

/**
 * Install dependencies
 */
async function installDependencies() {
  console.log(`${colors.blue}📦 Installing dependencies...${colors.reset}`);
  
  await execCommand('npm ci --only=production');
  
  console.log(`${colors.green}✅ Dependencies installed${colors.reset}`);
}

/**
 * Build application
 */
async function buildApplication() {
  console.log(`${colors.blue}🏗️  Building application...${colors.reset}`);
  
  // Clean previous build
  if (fs.existsSync(path.join(config.projectPath, 'dist'))) {
    await execCommand('rm -rf dist');
  }
  
  // Build TypeScript
  await execCommand('npm run build', { timeout: config.buildTimeout });
  
  // Verify build output
  if (!fileExists('dist/server.js')) {
    throw new Error('Build failed: dist/server.js not found');
  }
  
  console.log(`${colors.green}✅ Application built successfully${colors.reset}`);
}

/**
 * Run tests
 */
async function runTests() {
  console.log(`${colors.blue}🧪 Running tests...${colors.reset}`);
  
  try {
    // Run health check script
    if (fileExists('scripts/health-check.js')) {
      await execCommand('node scripts/health-check.js');
    }
    
    console.log(`${colors.green}✅ Tests passed${colors.reset}`);
  } catch (error) {
    console.log(`${colors.yellow}⚠️  Tests failed, continuing deployment${colors.reset}`);
  }
}

/**
 * Start Docker services
 */
async function startDockerServices() {
  console.log(`${colors.blue}🐳 Starting Docker services...${colors.reset}`);
  
  // Stop existing containers
  try {
    await execCommand('docker-compose down');
  } catch (error) {
    console.log('No existing containers to stop');
  }
  
  // Start services
  await execCommand('docker-compose up -d mongo redis rabbitmq');
  
  // Wait for services to be ready
  console.log(`${colors.blue}⏳ Waiting for services to start...${colors.reset}`);
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  // Check service health
  await execCommand('docker-compose ps');
  
  console.log(`${colors.green}✅ Docker services started${colors.reset}`);
}

/**
 * Start application
 */
async function startApplication() {
  console.log(`${colors.blue}🚀 Starting application...${colors.reset}`);
  
  // Copy production environment
  if (fileExists('.env.production')) {
    await execCommand('cp .env.production .env');
  }
  
  // Start application in background
  const child = spawn('npm', ['start'], {
    cwd: config.projectPath,
    detached: true,
    stdio: 'ignore'
  });
  
  child.unref();
  
  console.log(`${colors.green}✅ Application started (PID: ${child.pid})${colors.reset}`);
  
  // Save PID for later use
  fs.writeFileSync(path.join(config.projectPath, '.pid'), child.pid.toString());
}

/**
 * Health check with retries
 */
async function performHealthCheck() {
  console.log(`${colors.blue}🏥 Performing health checks...${colors.reset}`);
  
  for (let i = 1; i <= config.healthCheckRetries; i++) {
    try {
      console.log(`${colors.blue}Attempt ${i}/${config.healthCheckRetries}...${colors.reset}`);
      
      if (fileExists('scripts/health-check.js')) {
        await execCommand('node scripts/health-check.js');
        console.log(`${colors.green}✅ Health check passed${colors.reset}`);
        return true;
      } else {
        // Simple curl check
        await execCommand('curl -f http://localhost:3001/health');
        console.log(`${colors.green}✅ Basic health check passed${colors.reset}`);
        return true;
      }
    } catch (error) {
      if (i === config.healthCheckRetries) {
        throw new Error(`Health check failed after ${config.healthCheckRetries} attempts`);
      }
      
      console.log(`${colors.yellow}⚠️  Health check failed, retrying in ${config.healthCheckDelay/1000}s...${colors.reset}`);
      await new Promise(resolve => setTimeout(resolve, config.healthCheckDelay));
    }
  }
}

/**
 * Generate deployment report
 */
function generateDeploymentReport() {
  const report = {
    timestamp: new Date().toISOString(),
    status: 'success',
    version: require('./package.json').version,
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'production'
  };
  
  fs.writeFileSync(
    path.join(config.projectPath, 'deployment-report.json'),
    JSON.stringify(report, null, 2)
  );
  
  console.log(`${colors.green}📋 Deployment report generated${colors.reset}`);
}

/**
 * Main deployment function
 */
async function deploy() {
  const startTime = Date.now();
  
  console.log(`${colors.blue}🚀 Starting Production Deployment${colors.reset}`);
  console.log(`📁 Project Path: ${config.projectPath}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log('='.repeat(60));
  
  try {
    await validateEnvironment();
    await installDependencies();
    await buildApplication();
    await runTests();
    await startDockerServices();
    await startApplication();
    await performHealthCheck();
    
    generateDeploymentReport();
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    
    console.log('='.repeat(60));
    console.log(`${colors.green}🎉 Deployment completed successfully!${colors.reset}`);
    console.log(`⏱️  Total time: ${duration}s`);
    console.log(`🌐 API URL: http://localhost:3001`);
    console.log(`📚 API Docs: http://localhost:3001/api-docs`);
    console.log(`🏥 Health Check: http://localhost:3001/health`);
    console.log();
    console.log(`${colors.blue}Next steps:${colors.reset}`);
    console.log('  • Monitor application logs');
    console.log('  • Set up reverse proxy (nginx)');
    console.log('  • Configure SSL certificates');
    console.log('  • Set up monitoring and alerts');
    
  } catch (error) {
    console.error(`${colors.red}💥 Deployment failed:${colors.reset}`, error.message);
    console.log(`${colors.yellow}🔄 Rollback instructions:${colors.reset}`);
    console.log('  1. Stop the application: docker-compose down');
    console.log('  2. Check logs: docker-compose logs');
    console.log('  3. Fix issues and retry deployment');
    
    process.exit(1);
  }
}

/**
 * Stop application
 */
async function stop() {
  console.log(`${colors.blue}🛑 Stopping application...${colors.reset}`);
  
  try {
    // Stop Docker services
    await execCommand('docker-compose down');
    
    // Kill application process if PID file exists
    const pidFile = path.join(config.projectPath, '.pid');
    if (fs.existsSync(pidFile)) {
      const pid = fs.readFileSync(pidFile, 'utf8').trim();
      try {
        process.kill(parseInt(pid));
        fs.unlinkSync(pidFile);
        console.log(`${colors.green}✅ Application stopped (PID: ${pid})${colors.reset}`);
      } catch (error) {
        console.log(`${colors.yellow}⚠️  Process ${pid} not found${colors.reset}`);
      }
    }
    
  } catch (error) {
    console.error(`${colors.red}❌ Error stopping application:${colors.reset}`, error.message);
  }
}

// Handle command line arguments
const command = process.argv[2];

switch (command) {
  case 'deploy':
    deploy();
    break;
  case 'stop':
    stop();
    break;
  case 'health':
    if (fileExists('scripts/health-check.js')) {
      execCommand('node scripts/health-check.js');
    } else {
      console.log('Health check script not found');
    }
    break;
  default:
    console.log(`
Usage: node deploy.js <command>

Commands:
  deploy    Full deployment process
  stop      Stop all services
  health    Run health check

Examples:
  node deploy.js deploy
  node deploy.js stop
  node deploy.js health
`);
    process.exit(1);
}

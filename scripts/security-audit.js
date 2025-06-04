#!/usr/bin/env node

/**
 * Security Audit Script
 * Comprehensive security analysis and vulnerability assessment
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// Security configuration
const securityConfig = {
  minimumPasswordLength: 12,
  requiredSecurityHeaders: [
    'X-Frame-Options',
    'X-Content-Type-Options',
    'X-XSS-Protection',
    'Strict-Transport-Security',
    'Content-Security-Policy'
  ],
  bannedDependencies: [
    'eval',
    'vm2',
    'serialize-javascript'
  ],
  sensitiveFiles: [
    '.env',
    '.env.local',
    '.env.production',
    'private.key',
    'server.key'
  ]
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

// Security audit results
const securityResults = {
  critical: [],
  high: [],
  medium: [],
  low: [],
  info: [],
  passed: 0,
  failed: 0
};

/**
 * Log security finding
 */
function logSecurityFinding(severity, title, description, recommendation = '', file = '') {
  const finding = {
    severity,
    title,
    description,
    recommendation,
    file,
    timestamp: new Date().toISOString()
  };
  
  securityResults[severity].push(finding);
  
  let severityColor = colors.blue;
  let icon = 'ℹ️ ';
  
  switch (severity) {
    case 'critical':
      severityColor = colors.red;
      icon = '🚨 ';
      securityResults.failed++;
      break;
    case 'high':
      severityColor = colors.red;
      icon = '⚠️ ';
      securityResults.failed++;
      break;
    case 'medium':
      severityColor = colors.yellow;
      icon = '⚠️ ';
      break;
    case 'low':
      severityColor = colors.yellow;
      icon = '💡 ';
      break;
    case 'info':
      severityColor = colors.green;
      icon = '✅ ';
      securityResults.passed++;
      break;
  }
  
  console.log(`   ${icon}${severityColor}${severity.toUpperCase()}${colors.reset}: ${title}`);
  if (description) console.log(`      ${colors.dim}${description}${colors.reset}`);
  if (file) console.log(`      ${colors.dim}File: ${file}${colors.reset}`);
}

/**
 * Check environment variables security
 */
function checkEnvironmentSecurity() {
  console.log(`\n${colors.bright}${colors.blue}🔐 ENVIRONMENT SECURITY AUDIT${colors.reset}`);
  
  const envFiles = ['.env', '.env.production', '.env.local', '.env.k8s'];
  
  envFiles.forEach(envFile => {
    if (fs.existsSync(envFile)) {
      const content = fs.readFileSync(envFile, 'utf8');
      
      // Check for weak passwords
      const weakPasswords = ['password', '123456', 'admin', 'changeme', 'default'];
      weakPasswords.forEach(weakPwd => {
        if (content.toLowerCase().includes(weakPwd)) {
          logSecurityFinding(
            'high',
            'Weak Password Detected',
            `Potential weak password "${weakPwd}" found in environment file`,
            'Use strong, randomly generated passwords',
            envFile
          );
        }
      });
      
      // Check JWT secret strength
      const jwtMatch = content.match(/JWT_SECRET\s*=\s*(.+)/);
      if (jwtMatch) {
        const jwtSecret = jwtMatch[1].trim().replace(/["']/g, '');
        if (jwtSecret.length < 32) {
          logSecurityFinding(
            'medium',
            'Weak JWT Secret',
            `JWT secret is only ${jwtSecret.length} characters`,
            'Use at least 32 characters for JWT secret',
            envFile
          );
        } else {
          logSecurityFinding(
            'info',
            'Strong JWT Secret',
            'JWT secret meets minimum length requirements',
            '',
            envFile
          );
        }
      }
      
      // Check for exposed secrets
      const secretPatterns = [
        { name: 'API Key', pattern: /api_key\s*=\s*[a-zA-Z0-9]{20,}/i },
        { name: 'Access Token', pattern: /access_token\s*=\s*[a-zA-Z0-9]{20,}/i },
        { name: 'Private Key', pattern: /-----BEGIN (RSA )?PRIVATE KEY-----/ }
      ];
      
      secretPatterns.forEach(({ name, pattern }) => {
        if (pattern.test(content)) {
          logSecurityFinding(
            'critical',
            `${name} Exposed`,
            `${name} found in environment file`,
            'Store secrets securely and never commit to version control',
            envFile
          );
        }
      });
    }
  });
}

/**
 * Check dependency security
 */
function checkDependencySecurity() {
  console.log(`\n${colors.bright}${colors.blue}📦 DEPENDENCY SECURITY AUDIT${colors.reset}`);
  
  if (!fs.existsSync('package.json')) {
    logSecurityFinding('high', 'No Package.json', 'package.json file not found');
    return;
  }
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  // Check for banned dependencies
  const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  securityConfig.bannedDependencies.forEach(bannedPkg => {
    if (allDeps[bannedPkg]) {
      logSecurityFinding(
        'high',
        'Dangerous Dependency',
        `Package "${bannedPkg}" is known to have security risks`,
        'Remove or replace with safer alternatives'
      );
    }
  });
  
  // Run npm audit
  try {
    const auditResult = execSync('npm audit --json', { encoding: 'utf8' });
    const audit = JSON.parse(auditResult);
    
    if (audit.metadata && audit.metadata.vulnerabilities) {
      const vulns = audit.metadata.vulnerabilities;
      
      if (vulns.critical > 0) {
        logSecurityFinding(
          'critical',
          'Critical Vulnerabilities',
          `${vulns.critical} critical vulnerabilities found`,
          'Run "npm audit fix" to resolve'
        );
      }
      
      if (vulns.high > 0) {
        logSecurityFinding(
          'high',
          'High Severity Vulnerabilities',
          `${vulns.high} high severity vulnerabilities found`,
          'Run "npm audit fix" to resolve'
        );
      }
      
      if (vulns.moderate > 0) {
        logSecurityFinding(
          'medium',
          'Moderate Vulnerabilities',
          `${vulns.moderate} moderate vulnerabilities found`,
          'Consider updating dependencies'
        );
      }
      
      if (vulns.critical === 0 && vulns.high === 0 && vulns.moderate === 0) {
        logSecurityFinding(
          'info',
          'No Known Vulnerabilities',
          'Dependencies appear to be secure'
        );
      }
    }
  } catch (error) {
    logSecurityFinding(
      'medium',
      'Audit Check Failed',
      'Could not run npm audit',
      'Manually verify dependency security'
    );
  }
  
  // Check for security-focused packages
  const securityPackages = [
    'helmet',
    'express-rate-limit',
    'bcryptjs',
    'jsonwebtoken',
    'cors'
  ];
  
  securityPackages.forEach(pkg => {
    if (allDeps[pkg]) {
      logSecurityFinding(
        'info',
        'Security Package Installed',
        `Security package "${pkg}" is installed`
      );
    } else {
      logSecurityFinding(
        'medium',
        'Missing Security Package',
        `Consider installing "${pkg}" for better security`,
        `npm install ${pkg}`
      );
    }
  });
}

/**
 * Check file permissions and sensitive files
 */
function checkFilePermissions() {
  console.log(`\n${colors.bright}${colors.blue}📁 FILE SECURITY AUDIT${colors.reset}`);
  
  // Check sensitive files
  securityConfig.sensitiveFiles.forEach(file => {
    if (fs.existsSync(file)) {
      try {
        const stats = fs.statSync(file);
        const mode = stats.mode & parseInt('777', 8);
        
        if (mode & parseInt('044', 8)) { // World readable
          logSecurityFinding(
            'high',
            'Sensitive File World Readable',
            `File "${file}" is readable by others`,
            'Change permissions: chmod 600',
            file
          );
        } else {
          logSecurityFinding(
            'info',
            'Secure File Permissions',
            `File "${file}" has appropriate permissions`,
            '',
            file
          );
        }
      } catch (error) {
        logSecurityFinding(
          'medium',
          'Cannot Check Permissions',
          `Could not check permissions for "${file}"`,
          '',
          file
        );
      }
    }
  });
  
  // Check for accidentally committed secrets
  try {
    const gitignoreContent = fs.readFileSync('.gitignore', 'utf8');
    
    securityConfig.sensitiveFiles.forEach(file => {
      if (!gitignoreContent.includes(file)) {
        logSecurityFinding(
          'medium',
          'Sensitive File Not Ignored',
          `"${file}" should be in .gitignore`,
          'Add to .gitignore to prevent accidental commits',
          '.gitignore'
        );
      }
    });
  } catch (error) {
    logSecurityFinding(
      'medium',
      'No .gitignore File',
      '.gitignore file not found',
      'Create .gitignore to prevent sensitive file commits'
    );
  }
}

/**
 * Check SSL/TLS configuration
 */
function checkSSLSecurity() {
  console.log(`\n${colors.bright}${colors.blue}🔒 SSL/TLS SECURITY AUDIT${colors.reset}`);
  
  const sslDir = path.join('nginx', 'ssl');
  
  if (fs.existsSync(sslDir)) {
    const sslFiles = fs.readdirSync(sslDir);
    
    // Check for private key protection
    const keyFiles = sslFiles.filter(f => f.endsWith('.key'));
    keyFiles.forEach(keyFile => {
      const keyPath = path.join(sslDir, keyFile);
      try {
        const stats = fs.statSync(keyPath);
        const mode = stats.mode & parseInt('777', 8);
        
        if (mode & parseInt('044', 8)) {
          logSecurityFinding(
            'critical',
            'SSL Private Key Exposed',
            `Private key "${keyFile}" is readable by others`,
            'Change permissions: chmod 600',
            keyPath
          );
        } else {
          logSecurityFinding(
            'info',
            'SSL Private Key Secured',
            `Private key "${keyFile}" has secure permissions`,
            '',
            keyPath
          );
        }
      } catch (error) {
        logSecurityFinding(
          'medium',
          'Cannot Check SSL Key Permissions',
          `Could not verify permissions for ${keyFile}`,
          '',
          keyPath
        );
      }
    });
    
    // Check SSL configuration
    const configFile = path.join(sslDir, 'ssl-config.conf');
    if (fs.existsSync(configFile)) {
      const configContent = fs.readFileSync(configFile, 'utf8');
      
      // Check for weak SSL protocols
      if (configContent.includes('TLSv1 ') || configContent.includes('SSLv')) {
        logSecurityFinding(
          'medium',
          'Weak SSL Protocols',
          'Configuration allows weak SSL/TLS protocols',
          'Use only TLSv1.2 and TLSv1.3'
        );
      } else {
        logSecurityFinding(
          'info',
          'Strong SSL Protocols',
          'SSL configuration uses strong protocols'
        );
      }
      
      // Check for HSTS
      if (configContent.includes('Strict-Transport-Security')) {
        logSecurityFinding(
          'info',
          'HSTS Enabled',
          'HTTP Strict Transport Security is configured'
        );
      } else {
        logSecurityFinding(
          'medium',
          'HSTS Not Configured',
          'HTTP Strict Transport Security not found',
          'Add HSTS header for better security'
        );
      }
    }
  } else {
    logSecurityFinding(
      'medium',
      'No SSL Configuration',
      'SSL directory not found',
      'Run "npm run ssl:setup" to configure SSL'
    );
  }
}

/**
 * Check application security configuration
 */
function checkApplicationSecurity() {
  console.log(`\n${colors.bright}${colors.blue}🛡️  APPLICATION SECURITY AUDIT${colors.reset}`);
  
  // Check TypeScript files for security issues
  const srcDir = 'src';
  if (fs.existsSync(srcDir)) {
    const checkFile = (filePath) => {
      if (fs.statSync(filePath).isDirectory()) {
        fs.readdirSync(filePath).forEach(file => {
          checkFile(path.join(filePath, file));
        });
        return;
      }
      
      if (!filePath.endsWith('.ts') && !filePath.endsWith('.js')) return;
      
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for dangerous functions
      const dangerousPatterns = [
        { name: 'eval()', pattern: /eval\s*\(/, severity: 'critical' },
        { name: 'Function constructor', pattern: /new\s+Function\s*\(/, severity: 'high' },
        { name: 'innerHTML', pattern: /innerHTML\s*=/, severity: 'medium' },
        { name: 'document.write', pattern: /document\.write\s*\(/, severity: 'medium' }
      ];
      
      dangerousPatterns.forEach(({ name, pattern, severity }) => {
        if (pattern.test(content)) {
          logSecurityFinding(
            severity,
            `Dangerous Function: ${name}`,
            `Potentially unsafe function found`,
            'Review usage and ensure input is properly sanitized',
            filePath
          );
        }
      });
      
      // Check for hardcoded secrets
      const secretPatterns = [
        /password\s*[:=]\s*["'][^"']{8,}["']/i,
        /api_key\s*[:=]\s*["'][^"']{16,}["']/i,
        /secret\s*[:=]\s*["'][^"']{16,}["']/i
      ];
      
      secretPatterns.forEach(pattern => {
        if (pattern.test(content)) {
          logSecurityFinding(
            'high',
            'Hardcoded Secret',
            'Potential hardcoded secret found',
            'Move secrets to environment variables',
            filePath
          );
        }
      });
    };
    
    checkFile(srcDir);
  }
  
  // Check middleware configuration
  const serverFile = path.join('src', 'server.ts');
  if (fs.existsSync(serverFile)) {
    const serverContent = fs.readFileSync(serverFile, 'utf8');
    
    // Check for security middleware
    const securityMiddleware = [
      { name: 'helmet', pattern: /helmet\s*\(/ },
      { name: 'cors', pattern: /cors\s*\(/ },
      { name: 'rate limiting', pattern: /rateLimit|rate-limit/ },
      { name: 'compression', pattern: /compression\s*\(/ }
    ];
    
    securityMiddleware.forEach(({ name, pattern }) => {
      if (pattern.test(serverContent)) {
        logSecurityFinding(
          'info',
          `${name} Middleware`,
          `${name} security middleware is configured`
        );
      } else {
        logSecurityFinding(
          'medium',
          `Missing ${name} Middleware`,
          `${name} middleware not found`,
          `Consider adding ${name} for better security`
        );
      }
    });
  }
}

/**
 * Check Docker security
 */
function checkDockerSecurity() {
  console.log(`\n${colors.bright}${colors.blue}🐳 DOCKER SECURITY AUDIT${colors.reset}`);
  
  if (fs.existsSync('Dockerfile')) {
    const dockerContent = fs.readFileSync('Dockerfile', 'utf8');
    
    // Check for running as root
    if (!dockerContent.includes('USER ') || dockerContent.includes('USER 0') || dockerContent.includes('USER root')) {
      logSecurityFinding(
        'high',
        'Docker Running as Root',
        'Container runs as root user',
        'Add non-root user: USER node'
      );
    } else {
      logSecurityFinding(
        'info',
        'Docker Non-Root User',
        'Container uses non-root user'
      );
    }
    
    // Check for COPY vs ADD
    if (dockerContent.includes('ADD ')) {
      logSecurityFinding(
        'medium',
        'Docker ADD Command',
        'ADD command can be dangerous',
        'Use COPY instead of ADD when possible'
      );
    }
    
    // Check for specific version tags
    const fromLines = dockerContent.match(/FROM\s+([^\s]+)/g);
    if (fromLines) {
      fromLines.forEach(line => {
        if (line.includes(':latest')) {
          logSecurityFinding(
            'medium',
            'Docker Latest Tag',
            'Using :latest tag is not recommended',
            'Use specific version tags for reproducibility'
          );
        }
      });
    }
    
    // Check for multi-stage builds
    if (dockerContent.includes('as ') || dockerContent.split('FROM ').length > 2) {
      logSecurityFinding(
        'info',
        'Multi-Stage Build',
        'Using multi-stage Docker build for security'
      );
    }
  }
  
  // Check .dockerignore
  if (fs.existsSync('.dockerignore')) {
    const dockerignoreContent = fs.readFileSync('.dockerignore', 'utf8');
    
    const sensitivePatterns = ['.env', '*.key', 'node_modules'];
    sensitivePatterns.forEach(pattern => {
      if (dockerignoreContent.includes(pattern)) {
        logSecurityFinding(
          'info',
          'Dockerignore Security',
          `Sensitive pattern "${pattern}" is ignored`
        );
      } else {
        logSecurityFinding(
          'medium',
          'Missing Dockerignore Pattern',
          `Consider adding "${pattern}" to .dockerignore`,
          'Prevent sensitive files from being included in image'
        );
      }
    });
  } else {
    logSecurityFinding(
      'medium',
      'No .dockerignore',
      '.dockerignore file not found',
      'Create .dockerignore to exclude sensitive files'
    );
  }
}

/**
 * Generate security report
 */
function generateSecurityReport() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`${colors.bright}${colors.cyan}🛡️  SECURITY AUDIT REPORT${colors.reset}`);
  console.log(`${'='.repeat(80)}`);
  
  const totalFindings = securityResults.critical.length + 
                       securityResults.high.length + 
                       securityResults.medium.length + 
                       securityResults.low.length + 
                       securityResults.info.length;
  
  // Security score calculation
  let score = 100;
  score -= securityResults.critical.length * 20;
  score -= securityResults.high.length * 10;
  score -= securityResults.medium.length * 5;
  score -= securityResults.low.length * 2;
  score = Math.max(0, score);
  
  let scoreColor = colors.green;
  if (score < 60) scoreColor = colors.red;
  else if (score < 80) scoreColor = colors.yellow;
  
  console.log(`${colors.bright}Security Score:${colors.reset} ${scoreColor}${score}/100${colors.reset}`);
  console.log(`${colors.bright}Total Findings:${colors.reset} ${totalFindings}`);
  
  // Findings breakdown
  console.log(`\n${colors.bright}Findings Breakdown:${colors.reset}`);
  console.log(`   ${colors.red}🚨 Critical: ${securityResults.critical.length}${colors.reset}`);
  console.log(`   ${colors.red}⚠️  High: ${securityResults.high.length}${colors.reset}`);
  console.log(`   ${colors.yellow}⚠️  Medium: ${securityResults.medium.length}${colors.reset}`);
  console.log(`   ${colors.yellow}💡 Low: ${securityResults.low.length}${colors.reset}`);
  console.log(`   ${colors.green}✅ Passed: ${securityResults.info.length}${colors.reset}`);
  
  // Critical issues
  if (securityResults.critical.length > 0) {
    console.log(`\n${colors.red}🚨 CRITICAL SECURITY ISSUES (Fix Immediately)${colors.reset}`);
    securityResults.critical.forEach((finding, index) => {
      console.log(`   ${index + 1}. ${finding.title}`);
      console.log(`      ${colors.dim}${finding.description}${colors.reset}`);
      if (finding.recommendation) {
        console.log(`      ${colors.bright}Fix:${colors.reset} ${finding.recommendation}`);
      }
      if (finding.file) {
        console.log(`      ${colors.dim}File: ${finding.file}${colors.reset}`);
      }
      console.log();
    });
  }
  
  // High priority issues
  if (securityResults.high.length > 0) {
    console.log(`\n${colors.red}⚠️  HIGH PRIORITY ISSUES${colors.reset}`);
    securityResults.high.slice(0, 5).forEach((finding, index) => {
      console.log(`   ${index + 1}. ${finding.title}`);
      console.log(`      ${colors.dim}${finding.description}${colors.reset}`);
      if (finding.recommendation) {
        console.log(`      ${colors.bright}Fix:${colors.reset} ${finding.recommendation}`);
      }
      console.log();
    });
    
    if (securityResults.high.length > 5) {
      console.log(`   ... and ${securityResults.high.length - 5} more high priority issues`);
    }
  }
  
  // Security recommendations
  console.log(`\n${colors.bright}${colors.cyan}🎯 SECURITY RECOMMENDATIONS${colors.reset}`);
  
  if (score >= 90) {
    console.log(`${colors.green}🎉 Excellent security posture! Consider regular security audits.${colors.reset}`);
  } else if (score >= 70) {
    console.log(`${colors.yellow}✨ Good security, but address high/critical issues before production.${colors.reset}`);
  } else {
    console.log(`${colors.red}🚨 Security requires immediate attention before production deployment.${colors.reset}`);
  }
  
  console.log(`\n${colors.bright}General Recommendations:${colors.reset}`);
  console.log('   • Regular dependency updates and security audits');
  console.log('   • Implement automated security scanning in CI/CD');
  console.log('   • Use secrets management (e.g., HashiCorp Vault, AWS Secrets Manager)');
  console.log('   • Enable logging and monitoring for security events');
  console.log('   • Regular penetration testing');
  console.log('   • Security headers testing (https://securityheaders.com/)');
  
  // Save detailed report
  const reportData = {
    timestamp: new Date().toISOString(),
    score,
    summary: {
      critical: securityResults.critical.length,
      high: securityResults.high.length,
      medium: securityResults.medium.length,
      low: securityResults.low.length,
      passed: securityResults.info.length
    },
    findings: {
      critical: securityResults.critical,
      high: securityResults.high,
      medium: securityResults.medium,
      low: securityResults.low,
      info: securityResults.info
    }
  };
  
  fs.writeFileSync('security-audit-report.json', JSON.stringify(reportData, null, 2));
  console.log(`\n${colors.dim}📄 Detailed security report saved to: security-audit-report.json${colors.reset}`);
}

/**
 * Main security audit function
 */
async function runSecurityAudit() {
  console.log(`${colors.bright}${colors.blue}🛡️  COMPREHENSIVE SECURITY AUDIT${colors.reset}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`${colors.dim}Timestamp: ${new Date().toISOString()}${colors.reset}`);
  
  try {
    checkEnvironmentSecurity();
    checkDependencySecurity();
    checkFilePermissions();
    checkSSLSecurity();
    checkApplicationSecurity();
    checkDockerSecurity();
    
    generateSecurityReport();
    
  } catch (error) {
    console.error(`${colors.red}💥 Error during security audit:${colors.reset}`, error.message);
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help')) {
  console.log(`
${colors.bright}Security Audit Tool${colors.reset}

Usage: node security-audit.js [options]

Options:
  --help              Show this help message
  --category <name>   Run specific security checks only

Categories:
  environment, dependencies, files, ssl, application, docker

Examples:
  node security-audit.js
  node security-audit.js --category dependencies
`);
  process.exit(0);
}

// Run specific category if requested
const categoryIndex = process.argv.indexOf('--category');
if (categoryIndex !== -1 && process.argv[categoryIndex + 1]) {
  const category = process.argv[categoryIndex + 1];
  console.log(`Running security checks for category: ${category}`);
}

// Run the security audit
if (require.main === module) {
  runSecurityAudit();
}

module.exports = {
  runSecurityAudit,
  securityResults
};

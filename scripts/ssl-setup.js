#!/usr/bin/env node

/**
 * SSL Certificate Setup Script
 * Generates self-signed certificates for development and provides production guidance
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const crypto = require('crypto');

// Configuration
const config = {
  sslDir: path.join(__dirname, '..', 'nginx', 'ssl'),
  domain: process.env.DOMAIN || 'localhost',
  country: 'US',
  state: 'CA',
  city: 'San Francisco',
  organization: 'Chat API',
  organizationUnit: 'IT Department',
  email: 'admin@chatapi.com'
};

// Color codes
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

/**
 * Execute command with promise
 */
function execCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

/**
 * Ensure SSL directory exists
 */
function ensureSSLDirectory() {
  if (!fs.existsSync(config.sslDir)) {
    fs.mkdirSync(config.sslDir, { recursive: true });
    console.log(`${colors.green}✅ Created SSL directory: ${config.sslDir}${colors.reset}`);
  }
}

/**
 * Generate self-signed certificate
 */
async function generateSelfSignedCert() {
  console.log(`${colors.blue}🔐 Generating self-signed SSL certificate...${colors.reset}`);
  
  const certPath = path.join(config.sslDir, 'cert.pem');
  const keyPath = path.join(config.sslDir, 'key.pem');
  
  // Create certificate configuration
  const subject = `/C=${config.country}/ST=${config.state}/L=${config.city}/O=${config.organization}/OU=${config.organizationUnit}/CN=${config.domain}/emailAddress=${config.email}`;
  
  const opensslCommand = `openssl req -x509 -newkey rsa:4096 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "${subject}" -extensions v3_req -config <(echo "[req]"; echo "distinguished_name=req"; echo "[v3_req]"; echo "subjectAltName=@alt_names"; echo "[alt_names]"; echo "DNS.1=${config.domain}"; echo "DNS.2=*.${config.domain}"; echo "DNS.3=localhost"; echo "IP.1=127.0.0.1")`;
  
  try {
    // For Windows, use a simpler approach
    const simpleCommand = `openssl req -x509 -newkey rsa:4096 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "${subject}"`;
    
    await execCommand(simpleCommand);
    
    console.log(`${colors.green}✅ SSL certificate generated successfully${colors.reset}`);
    console.log(`   Certificate: ${certPath}`);
    console.log(`   Private key: ${keyPath}`);
    
    return { certPath, keyPath };
  } catch (error) {
    throw new Error(`Failed to generate SSL certificate: ${error.message}`);
  }
}

/**
 * Generate DH parameters for stronger SSL security
 */
async function generateDHParams() {
  console.log(`${colors.blue}🔒 Generating Diffie-Hellman parameters...${colors.reset}`);
  
  const dhPath = path.join(config.sslDir, 'dhparam.pem');
  
  try {
    await execCommand(`openssl dhparam -out "${dhPath}" 2048`);
    console.log(`${colors.green}✅ DH parameters generated: ${dhPath}${colors.reset}`);
    return dhPath;
  } catch (error) {
    console.log(`${colors.yellow}⚠️  Failed to generate DH parameters: ${error.message}${colors.reset}`);
    return null;
  }
}

/**
 * Create SSL configuration for nginx
 */
function createSSLConfig(certPath, keyPath, dhPath) {
  const sslConfig = `
# SSL Configuration for production
# Add this to your nginx server block

ssl_certificate ${certPath};
ssl_certificate_key ${keyPath};

# SSL Security Settings
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_session_tickets off;

# HSTS (HTTP Strict Transport Security)
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

# OCSP Stapling
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;

${dhPath ? `# Diffie-Hellman parameters\nssl_dhparam ${dhPath};` : ''}

# Additional Security Headers
add_header X-Frame-Options DENY always;
add_header X-Content-Type-Options nosniff always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;
`;

  const configPath = path.join(config.sslDir, 'ssl-config.conf');
  fs.writeFileSync(configPath, sslConfig.trim());
  
  console.log(`${colors.green}✅ SSL configuration saved: ${configPath}${colors.reset}`);
  return configPath;
}

/**
 * Validate certificate
 */
async function validateCertificate(certPath) {
  console.log(`${colors.blue}🔍 Validating certificate...${colors.reset}`);
  
  try {
    const result = await execCommand(`openssl x509 -in "${certPath}" -text -noout`);
    console.log(`${colors.green}✅ Certificate is valid${colors.reset}`);
    
    // Extract certificate info
    const certInfo = result.stdout;
    const subjectMatch = certInfo.match(/Subject: (.+)/);
    const validFromMatch = certInfo.match(/Not Before: (.+)/);
    const validToMatch = certInfo.match(/Not After : (.+)/);
    
    if (subjectMatch) console.log(`   Subject: ${subjectMatch[1].trim()}`);
    if (validFromMatch) console.log(`   Valid from: ${validFromMatch[1].trim()}`);
    if (validToMatch) console.log(`   Valid to: ${validToMatch[1].trim()}`);
    
    return true;
  } catch (error) {
    console.log(`${colors.red}❌ Certificate validation failed: ${error.message}${colors.reset}`);
    return false;
  }
}

/**
 * Display production SSL guidance
 */
function displayProductionGuidance() {
  console.log(`\n${colors.bright}${colors.cyan}🏭 PRODUCTION SSL SETUP GUIDANCE${colors.reset}`);
  console.log('='.repeat(60));
  
  console.log(`${colors.bright}For production environments, use proper SSL certificates:${colors.reset}`);
  console.log();
  
  console.log(`${colors.yellow}1. Let's Encrypt (Free):${colors.reset}`);
  console.log('   • Install certbot: https://certbot.eff.org/');
  console.log('   • Generate cert: certbot --nginx -d yourdomain.com');
  console.log('   • Auto-renewal: Add to crontab');
  console.log();
  
  console.log(`${colors.yellow}2. Commercial SSL Provider:${colors.reset}`);
  console.log('   • Purchase from: DigiCert, GlobalSign, Comodo');
  console.log('   • Generate CSR: openssl req -new -newkey rsa:2048 -nodes -keyout domain.key -out domain.csr');
  console.log('   • Install provided certificate files');
  console.log();
  
  console.log(`${colors.yellow}3. Cloud Provider SSL:${colors.reset}`);
  console.log('   • AWS Certificate Manager (ACM)');
  console.log('   • Google Cloud SSL Certificates');
  console.log('   • Azure Key Vault Certificates');
  console.log();
  
  console.log(`${colors.bright}Security Best Practices:${colors.reset}`);
  console.log('   • Use strong cipher suites');
  console.log('   • Enable HSTS headers');
  console.log('   • Implement OCSP stapling');
  console.log('   • Regular certificate renewal');
  console.log('   • Monitor certificate expiration');
  console.log();
  
  console.log(`${colors.bright}Testing SSL Configuration:${colors.reset}`);
  console.log('   • SSL Labs Test: https://www.ssllabs.com/ssltest/');
  console.log('   • Mozilla Observatory: https://observatory.mozilla.org/');
  console.log('   • Security Headers: https://securityheaders.com/');
}

/**
 * Main SSL setup function
 */
async function setupSSL() {
  console.log(`${colors.bright}${colors.blue}🔐 SSL Certificate Setup${colors.reset}`);
  console.log('='.repeat(50));
  console.log(`Domain: ${config.domain}`);
  console.log(`SSL Directory: ${config.sslDir}`);
  console.log();
  
  try {
    // Ensure SSL directory exists
    ensureSSLDirectory();
    
    // Generate self-signed certificate
    const { certPath, keyPath } = await generateSelfSignedCert();
    
    // Generate DH parameters (optional)
    const dhPath = await generateDHParams();
    
    // Create SSL configuration
    const configPath = createSSLConfig(certPath, keyPath, dhPath);
    
    // Validate certificate
    await validateCertificate(certPath);
    
    console.log(`\n${colors.green}🎉 SSL setup completed successfully!${colors.reset}`);
    console.log(`\n${colors.bright}Files generated:${colors.reset}`);
    console.log(`   📜 Certificate: ${certPath}`);
    console.log(`   🔑 Private key: ${keyPath}`);
    console.log(`   ⚙️  SSL config: ${configPath}`);
    if (dhPath) console.log(`   🔒 DH params: ${dhPath}`);
    
    // Display production guidance
    displayProductionGuidance();
    
  } catch (error) {
    console.error(`${colors.red}💥 SSL setup failed:${colors.reset}`, error.message);
    console.log(`\n${colors.yellow}Troubleshooting:${colors.reset}`);
    console.log('   • Install OpenSSL: https://www.openssl.org/');
    console.log('   • Check permissions on SSL directory');
    console.log('   • Verify domain configuration');
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help')) {
  console.log(`
Usage: node ssl-setup.js [options]

Options:
  --domain <domain>    Domain name for the certificate (default: localhost)
  --help              Show this help message

Environment Variables:
  DOMAIN              Domain name for the certificate

Examples:
  node ssl-setup.js
  node ssl-setup.js --domain api.example.com
  DOMAIN=api.example.com node ssl-setup.js
`);
  process.exit(0);
}

// Override domain from command line
const domainIndex = process.argv.indexOf('--domain');
if (domainIndex !== -1 && process.argv[domainIndex + 1]) {
  config.domain = process.argv[domainIndex + 1];
}

// Run SSL setup
setupSSL().catch(error => {
  console.error(`${colors.red}💥 Setup failed:${colors.reset}`, error.message);
  process.exit(1);
});

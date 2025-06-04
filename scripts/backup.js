#!/usr/bin/env node

/**
 * Database Backup and Recovery System
 * Automated backup solution for MongoDB with recovery procedures
 */

const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const cron = require('node-cron');

// Configuration
const config = {
  backupDir: path.join(__dirname, '..', 'backups'),
  mongoUri: process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27017/chatdb?authSource=admin',
  database: 'chatdb',
  retentionDays: 7,
  schedules: {
    hourly: '0 * * * *',     // Every hour
    daily: '0 2 * * *',      // 2 AM daily
    weekly: '0 2 * * 0',     // 2 AM every Sunday
    monthly: '0 2 1 * *'     // 2 AM on 1st of every month
  }
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
function execCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    exec(command, options, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

/**
 * Ensure backup directory exists
 */
function ensureBackupDirectory() {
  if (!fs.existsSync(config.backupDir)) {
    fs.mkdirSync(config.backupDir, { recursive: true });
    console.log(`${colors.green}✅ Created backup directory: ${config.backupDir}${colors.reset}`);
  }
}

/**
 * Generate backup filename
 */
function generateBackupFilename(type = 'manual') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${config.database}-${type}-${timestamp}.gz`;
}

/**
 * Create MongoDB backup
 */
async function createBackup(type = 'manual') {
  console.log(`${colors.blue}📦 Creating ${type} backup...${colors.reset}`);
  
  const filename = generateBackupFilename(type);
  const backupPath = path.join(config.backupDir, filename);
  
  try {
    // Extract connection details from URI
    const uri = new URL(config.mongoUri);
    const host = uri.hostname;
    const port = uri.port || 27017;
    const username = uri.username;
    const password = uri.password;
    const authSource = uri.searchParams.get('authSource') || 'admin';
    
    // Build mongodump command
    let command = `mongodump --host ${host}:${port} --db ${config.database}`;
    
    if (username && password) {
      command += ` --username ${username} --password ${password} --authenticationDatabase ${authSource}`;
    }
    
    command += ` --archive="${backupPath}" --gzip`;
    
    const startTime = Date.now();
    await execCommand(command);
    const duration = Date.now() - startTime;
    
    // Get backup file size
    const stats = fs.statSync(backupPath);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log(`${colors.green}✅ Backup created successfully${colors.reset}`);
    console.log(`   File: ${filename}`);
    console.log(`   Size: ${sizeInMB} MB`);
    console.log(`   Duration: ${duration}ms`);
    
    // Create backup metadata
    const metadata = {
      filename,
      type,
      database: config.database,
      timestamp: new Date().toISOString(),
      size: stats.size,
      duration,
      checksum: await calculateChecksum(backupPath)
    };
    
    const metadataPath = backupPath.replace('.gz', '.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    
    return { backupPath, metadata };
    
  } catch (error) {
    throw new Error(`Backup failed: ${error.message}`);
  }
}

/**
 * Calculate file checksum
 */
async function calculateChecksum(filePath) {
  try {
    const result = await execCommand(`certutil -hashfile "${filePath}" SHA256`);
    const lines = result.stdout.split('\n');
    return lines[1]?.trim() || 'unknown';
  } catch (error) {
    return 'unknown';
  }
}

/**
 * Restore from backup
 */
async function restoreBackup(backupPath, targetDatabase = null) {
  console.log(`${colors.yellow}🔄 Restoring from backup: ${backupPath}${colors.reset}`);
  
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${backupPath}`);
  }
  
  try {
    // Extract connection details from URI
    const uri = new URL(config.mongoUri);
    const host = uri.hostname;
    const port = uri.port || 27017;
    const username = uri.username;
    const password = uri.password;
    const authSource = uri.searchParams.get('authSource') || 'admin';
    const database = targetDatabase || config.database;
    
    // Build mongorestore command
    let command = `mongorestore --host ${host}:${port} --db ${database}`;
    
    if (username && password) {
      command += ` --username ${username} --password ${password} --authenticationDatabase ${authSource}`;
    }
    
    command += ` --archive="${backupPath}" --gzip --drop`;
    
    const startTime = Date.now();
    await execCommand(command);
    const duration = Date.now() - startTime;
    
    console.log(`${colors.green}✅ Restore completed successfully${colors.reset}`);
    console.log(`   Database: ${database}`);
    console.log(`   Duration: ${duration}ms`);
    
    return { database, duration };
    
  } catch (error) {
    throw new Error(`Restore failed: ${error.message}`);
  }
}

/**
 * List available backups
 */
function listBackups() {
  console.log(`${colors.blue}📋 Available backups:${colors.reset}`);
  
  if (!fs.existsSync(config.backupDir)) {
    console.log(`${colors.yellow}No backups found${colors.reset}`);
    return [];
  }
  
  const backupFiles = fs.readdirSync(config.backupDir)
    .filter(file => file.endsWith('.gz'))
    .sort()
    .reverse();
  
  const backups = backupFiles.map(filename => {
    const backupPath = path.join(config.backupDir, filename);
    const metadataPath = backupPath.replace('.gz', '.json');
    
    let metadata = {};
    if (fs.existsSync(metadataPath)) {
      try {
        metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      } catch (error) {
        console.log(`${colors.yellow}⚠️  Could not read metadata for ${filename}${colors.reset}`);
      }
    }
    
    const stats = fs.statSync(backupPath);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    const age = Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      filename,
      path: backupPath,
      size: sizeInMB,
      age,
      type: metadata.type || 'unknown',
      timestamp: metadata.timestamp || stats.mtime.toISOString(),
      checksum: metadata.checksum
    };
  });
  
  if (backups.length === 0) {
    console.log(`${colors.yellow}No backups found${colors.reset}`);
    return [];
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('FILENAME'.padEnd(35) + 'TYPE'.padEnd(10) + 'SIZE'.padEnd(10) + 'AGE'.padEnd(10) + 'DATE');
  console.log('='.repeat(80));
  
  backups.forEach(backup => {
    const filename = backup.filename.padEnd(35);
    const type = backup.type.padEnd(10);
    const size = `${backup.size}MB`.padEnd(10);
    const age = `${backup.age}d`.padEnd(10);
    const date = new Date(backup.timestamp).toLocaleString().padEnd(20);
    
    console.log(`${filename}${type}${size}${age}${date}`);
  });
  
  console.log('='.repeat(80));
  console.log(`\nTotal backups: ${backups.length}`);
  
  return backups;
}

/**
 * Cleanup old backups
 */
function cleanupOldBackups() {
  console.log(`${colors.blue}🧹 Cleaning up backups older than ${config.retentionDays} days...${colors.reset}`);
  
  if (!fs.existsSync(config.backupDir)) {
    console.log(`${colors.yellow}No backup directory found${colors.reset}`);
    return;
  }
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - config.retentionDays);
  
  const files = fs.readdirSync(config.backupDir);
  let deletedCount = 0;
  
  files.forEach(filename => {
    const filePath = path.join(config.backupDir, filename);
    const stats = fs.statSync(filePath);
    
    if (stats.mtime < cutoffDate) {
      fs.unlinkSync(filePath);
      deletedCount++;
      console.log(`${colors.yellow}🗑️  Deleted: ${filename}${colors.reset}`);
    }
  });
  
  if (deletedCount === 0) {
    console.log(`${colors.green}✅ No old backups to clean up${colors.reset}`);
  } else {
    console.log(`${colors.green}✅ Cleaned up ${deletedCount} old backup files${colors.reset}`);
  }
}

/**
 * Verify backup integrity
 */
async function verifyBackup(backupPath) {
  console.log(`${colors.blue}🔍 Verifying backup integrity: ${backupPath}${colors.reset}`);
  
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${backupPath}`);
  }
  
  try {
    // Check if it's a valid gzip file
    await execCommand(`gzip -t "${backupPath}"`);
    
    // Calculate current checksum
    const currentChecksum = await calculateChecksum(backupPath);
    
    // Check metadata
    const metadataPath = backupPath.replace('.gz', '.json');
    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      
      if (metadata.checksum && metadata.checksum !== 'unknown') {
        if (currentChecksum === metadata.checksum) {
          console.log(`${colors.green}✅ Backup integrity verified${colors.reset}`);
          return true;
        } else {
          console.log(`${colors.red}❌ Checksum mismatch - backup may be corrupted${colors.reset}`);
          return false;
        }
      }
    }
    
    console.log(`${colors.green}✅ Backup file structure is valid${colors.reset}`);
    return true;
    
  } catch (error) {
    console.log(`${colors.red}❌ Backup verification failed: ${error.message}${colors.reset}`);
    return false;
  }
}

/**
 * Schedule automated backups
 */
function scheduleBackups() {
  console.log(`${colors.blue}⏰ Setting up backup schedules...${colors.reset}`);
  
  // Daily backup at 2 AM
  cron.schedule(config.schedules.daily, () => {
    console.log(`${colors.blue}🕐 Running scheduled daily backup...${colors.reset}`);
    createBackup('daily').catch(error => {
      console.error(`${colors.red}❌ Scheduled backup failed:${colors.reset}`, error.message);
    });
  });
  
  // Weekly cleanup
  cron.schedule(config.schedules.weekly, () => {
    console.log(`${colors.blue}🕐 Running scheduled cleanup...${colors.reset}`);
    cleanupOldBackups();
  });
  
  console.log(`${colors.green}✅ Backup schedules configured${colors.reset}`);
  console.log(`   Daily backup: ${config.schedules.daily}`);
  console.log(`   Weekly cleanup: ${config.schedules.weekly}`);
}

/**
 * Display backup status
 */
function displayStatus() {
  console.log(`${colors.bright}${colors.cyan}📊 BACKUP SYSTEM STATUS${colors.reset}`);
  console.log('='.repeat(50));
  console.log(`Backup Directory: ${config.backupDir}`);
  console.log(`Database: ${config.database}`);
  console.log(`Retention: ${config.retentionDays} days`);
  console.log();
  
  const backups = listBackups();
  
  if (backups.length > 0) {
    const totalSize = backups.reduce((sum, backup) => sum + parseFloat(backup.size), 0);
    const latestBackup = backups[0];
    
    console.log(`\n${colors.bright}Summary:${colors.reset}`);
    console.log(`   Total backups: ${backups.length}`);
    console.log(`   Total size: ${totalSize.toFixed(2)} MB`);
    console.log(`   Latest backup: ${latestBackup.filename}`);
    console.log(`   Latest backup age: ${latestBackup.age} days`);
  }
}

/**
 * Main backup function
 */
async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];
  
  console.log(`${colors.bright}${colors.blue}💾 Database Backup System${colors.reset}`);
  console.log('='.repeat(40));
  
  try {
    ensureBackupDirectory();
    
    switch (command) {
      case 'create':
      case 'backup':
        await createBackup(arg || 'manual');
        break;
        
      case 'restore':
        if (!arg) {
          console.log(`${colors.red}❌ Please specify backup file path${colors.reset}`);
          process.exit(1);
        }
        await restoreBackup(arg);
        break;
        
      case 'list':
        listBackups();
        break;
        
      case 'cleanup':
        cleanupOldBackups();
        break;
        
      case 'verify':
        if (!arg) {
          console.log(`${colors.red}❌ Please specify backup file path${colors.reset}`);
          process.exit(1);
        }
        await verifyBackup(arg);
        break;
        
      case 'schedule':
        scheduleBackups();
        console.log(`${colors.green}✅ Backup scheduler is running...${colors.reset}`);
        console.log(`${colors.yellow}Press Ctrl+C to stop${colors.reset}`);
        // Keep the process running
        process.stdin.resume();
        break;
        
      case 'status':
        displayStatus();
        break;
        
      default:
        console.log(`
Usage: node backup.js <command> [options]

Commands:
  create [type]     Create a backup (type: manual, daily, weekly)
  restore <file>    Restore from backup file
  list             List all available backups
  cleanup          Remove old backups (older than ${config.retentionDays} days)
  verify <file>    Verify backup integrity
  schedule         Start automated backup scheduler
  status           Show backup system status

Examples:
  node backup.js create
  node backup.js create daily
  node backup.js restore ./backups/chatdb-manual-2025-06-04.gz
  node backup.js list
  node backup.js cleanup
  node backup.js verify ./backups/chatdb-manual-2025-06-04.gz
  node backup.js schedule
  node backup.js status
        `);
        break;
    }
    
  } catch (error) {
    console.error(`${colors.red}💥 Operation failed:${colors.reset}`, error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}👋 Backup system stopped${colors.reset}`);
  process.exit(0);
});

process.on('SIGTERM', () => {
  process.exit(0);
});

// Run main function
if (require.main === module) {
  main();
}

module.exports = {
  createBackup,
  restoreBackup,
  listBackups,
  cleanupOldBackups,
  verifyBackup,
  scheduleBackups
};

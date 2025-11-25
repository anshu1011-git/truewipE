/**
 * Setup Script for TrueWipe Data Destruction System
 * Initializes the environment and installs dependencies
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function setupEnvironment() {
    console.log('🔥 TrueWipe Setup Script 🔥');
    console.log('========================\n');
    
    try {
        // Check Node.js version
        const nodeVersion = process.version;
        console.log(`Node.js version: ${nodeVersion}`);
        
        if (parseInt(nodeVersion.substring(1)) < 12) {
            console.warn('Warning: Node.js version 12 or higher is recommended');
        }
        
        // Create necessary directories
        console.log('Creating directories...');
        await createDirectories();
        
        // Install dependencies
        console.log('Installing dependencies...');
        await installDependencies();
        
        // Create configuration files
        console.log('Creating configuration files...');
        await createConfigFiles();
        
        // Verify installation
        console.log('Verifying installation...');
        await verifyInstallation();
        
        console.log('\n✅ Setup completed successfully!');
        console.log('\nNext steps:');
        console.log('1. Start the admin panel: npm run admin');
        console.log('2. Start a client: npm run client');
        console.log('3. Run a test: node test_real_wipe.js');
        console.log('4. For advanced usage: node truewipe.js --advanced');
        console.log('   (Default wipe method: 7-pass for enhanced security)');
        
    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    }
}

async function createDirectories() {
    const dirs = [
        'logs',
        'reports',
        'temp'
    ];
    
    for (const dir of dirs) {
        try {
            await fs.mkdir(dir, { recursive: true });
            console.log(`  Created directory: ${dir}`);
        } catch (error) {
            console.warn(`  Warning: Could not create directory ${dir}: ${error.message}`);
        }
    }
}

async function installDependencies() {
    try {
        // Check if we're in the root directory by looking for package.json
        await fs.access('package.json');
        
        // Install main dependencies
        console.log('  Installing main dependencies...');
        await execAsync('npm install', { cwd: '.' });
        
        // Install client dependencies
        console.log('  Installing client dependencies...');
        await execAsync('npm install', { cwd: './client' });
        
        // Install admin panel dependencies
        console.log('  Installing admin panel dependencies...');
        await execAsync('npm install', { cwd: './admin-panel' });
        
        console.log('  Dependencies installed successfully');
    } catch (error) {
        console.warn(`  Warning: Could not install dependencies: ${error.message}`);
        console.log('  Please run "npm install" manually in each directory');
    }
}

async function createConfigFiles() {
    // Create default configuration for admin panel
    const adminConfig = {
        port: 3000,
        secret: 'truewipe-secret-key-change-in-production',
        logLevel: 'info'
    };
    
    try {
        await fs.writeFile(
            path.join('admin-panel', 'config.json'),
            JSON.stringify(adminConfig, null, 2)
        );
        console.log('  Created admin panel config');
    } catch (error) {
        console.warn(`  Warning: Could not create admin config: ${error.message}`);
    }
    
    // Create default configuration for client
    const clientConfig = {
        adminUrl: 'http://localhost:3000',
        reconnectInterval: 5000,
        logLevel: 'info'
    };
    
    try {
        await fs.writeFile(
            path.join('client', 'config.json'),
            JSON.stringify(clientConfig, null, 2)
        );
        console.log('  Created client config');
    } catch (error) {
        console.warn(`  Warning: Could not create client config: ${error.message}`);
    }
    
    // Create .env file with default values
    const envContent = `
# TrueWipe Environment Configuration

# Admin Panel Settings
ADMIN_PORT=3000
ADMIN_SECRET=truewipe-secret-key-change-in-production

# Client Settings
CLIENT_ADMIN_URL=http://localhost:3000
CLIENT_RECONNECT_INTERVAL=5000

# Logging
LOG_LEVEL=info
`;
    
    try {
        await fs.writeFile('.env', envContent.trim());
        console.log('  Created .env file');
    } catch (error) {
        console.warn(`  Warning: Could not create .env file: ${error.message}`);
    }
}

async function verifyInstallation() {
    // Check if required files exist
    const requiredFiles = [
        'truewipe.js',
        'engine/overwrite.js',
        'engine/partition_detector.js',
        'engine/verifier.js',
        'client/client.js',
        'admin-panel/server.js'
    ];
    
    console.log('  Checking required files...');
    for (const file of requiredFiles) {
        try {
            await fs.access(file);
            console.log(`    ✓ ${file}`);
        } catch (error) {
            console.warn(`    ✗ ${file} (missing)`);
        }
    }
    
    // Check if dependencies are installed
    console.log('  Checking dependencies...');
    try {
        // Try to require key dependencies
        require('express');
        require('socket.io');
        require('sqlite3');
        console.log('    ✓ Core dependencies available');
    } catch (error) {
        console.warn(`    ✗ Some dependencies may be missing: ${error.message}`);
    }
    
    // Check if client dependencies are installed
    try {
        // Try to require client dependencies
        require('./client/node_modules/socket.io-client');
        console.log('    ✓ Client dependencies available');
    } catch (error) {
        console.warn(`    ✗ Client dependencies may be missing: ${error.message}`);
    }
}

// Run setup if this script is executed directly
if (require.main === module) {
    setupEnvironment();
}

module.exports = {
    setupEnvironment,
    createDirectories,
    installDependencies,
    createConfigFiles,
    verifyInstallation
};
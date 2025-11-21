/**
 * Setup script for TrueWipe Data Destruction System
 * This script helps users install and configure the system
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔥 TrueWipe Setup Script 🔥');
console.log('==========================\n');

// Check if Node.js is installed
try {
    const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
    console.log(`✅ Node.js installed: ${nodeVersion}`);
} catch (error) {
    console.error('❌ Node.js is not installed. Please install Node.js first.');
    process.exit(1);
}

// Check if npm is installed
try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    console.log(`✅ npm installed: ${npmVersion}`);
} catch (error) {
    console.error('❌ npm is not installed. Please install npm first.');
    process.exit(1);
}

// Install dependencies
console.log('\n📦 Installing dependencies...');
try {
    execSync('npm run install-all', { stdio: 'inherit' });
    console.log('✅ All dependencies installed successfully!');
} catch (error) {
    console.error('❌ Failed to install dependencies:', error.message);
    process.exit(1);
}

// Create necessary directories
const dirs = ['logs', 'reports', 'temp'];
dirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath);
        console.log(`✅ Created directory: ${dir}`);
    }
});

// Create default configuration files
const configFiles = {
    'admin-panel/.env': 'PORT=3000\nJWT_SECRET=truewipe_secret_key\n',
    'client/.env': 'ADMIN_PANEL_URL=http://localhost:3000\nCLIENT_NAME=DefaultClient\n'
};

Object.entries(configFiles).forEach(([file, content]) => {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ Created config file: ${file}`);
    }
});

console.log('\n🎉 Setup completed successfully!');
console.log('\n🚀 To get started:');
console.log('   1. Start the admin panel: npm run admin');
console.log('   2. Start a client: npm run client');
console.log('   3. Run a demo: npm start');
console.log('   4. Run advanced demo: npm run advanced-demo');
console.log('   5. Test real wipe: npm test');
console.log('\n🔐 Default admin credentials:');
console.log('   Username: admin');
console.log('   Password: admin123');
console.log('\n⚠️  Remember to change the default password in production!');
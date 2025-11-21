const io = require('socket.io-client');
const os = require('os');
const { exec, spawn } = require('child_process');
const path = require('path');
const TrueWipe = require('../truewipe');

// Configuration
const ADMIN_PANEL_URL = process.env.ADMIN_PANEL_URL || 'http://localhost:3000';
const CLIENT_NAME = process.env.CLIENT_NAME || os.hostname();
const DEVICE_ID_FILE = path.join(__dirname, '.device_id');

// Connect to admin panel
const socket = io(ADMIN_PANEL_URL);

let deviceId = null;
let currentJobId = null;
let truewipe = new TrueWipe();

console.log(`TrueWipe Client starting...`);
console.log(`Connecting to admin panel at ${ADMIN_PANEL_URL}`);

// Register with admin panel when connected
socket.on('connect', () => {
    console.log('Connected to admin panel');
    
    // Get MAC address for unique identification
    const macAddress = getMacAddress();
    
    // Register device
    socket.emit('register_device', {
        name: CLIENT_NAME,
        ipAddress: getIpAddress(),
        macAddress: macAddress
    });
});

// Handle registration response
socket.on('registered', (data) => {
    deviceId = data.deviceId;
    console.log(`Device registered with ID: ${deviceId}`);
    
    // Save device ID to file for persistence
    require('fs').writeFileSync(DEVICE_ID_FILE, deviceId.toString());
});

socket.on('registration_error', (data) => {
    console.error('Registration error:', data.error);
});

// Handle wipe command from admin panel
socket.on('wipe_command', async (data) => {
    console.log(`Received wipe command for job ${data.jobId} with method ${data.method}`);
    
    currentJobId = data.jobId;
    
    // Update job status to in-progress
    socket.emit('job_status_update', {
        jobId: currentJobId,
        status: 'in-progress',
        progress: 0
    });
    
    try {
        // Execute the wipe process using TrueWipe
        await executeWipeWithTrueWipe(data.method, data.verificationLevel);
        
        // Report completion
        socket.emit('job_status_update', {
            jobId: currentJobId,
            status: 'completed',
            progress: 100,
            result: {
                message: 'Data wipe completed successfully',
                timestamp: new Date().toISOString()
            }
        });
        
        console.log('Wipe process completed successfully');
    } catch (error) {
        console.error('Wipe process failed:', error);
        
        // Report failure
        socket.emit('job_status_update', {
            jobId: currentJobId,
            status: 'failed',
            progress: 0,
            result: {
                message: `Data wipe failed: ${error.message}`,
                error: error.message,
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Get MAC address for device identification
function getMacAddress() {
    const interfaces = os.networkInterfaces();
    
    for (let interfaceName in interfaces) {
        const interface = interfaces[interfaceName];
        
        for (let i = 0; i < interface.length; i++) {
            const alias = interface[i];
            
            // Skip internal and IPv6 addresses
            if (alias.internal || alias.mac === '00:00:00:00:00:00') {
                continue;
            }
            
            return alias.mac;
        }
    }
    
    return 'unknown';
}

// Get IP address
function getIpAddress() {
    const interfaces = os.networkInterfaces();
    
    for (let interfaceName in interfaces) {
        const interface = interfaces[interfaceName];
        
        for (let i = 0; i < interface.length; i++) {
            const alias = interface[i];
            
            // Skip internal addresses
            if (alias.internal || alias.family !== 'IPv4') {
                continue;
            }
            
            return alias.address;
        }
    }
    
    return 'unknown';
}

// Execute the actual wipe process using TrueWipe
async function executeWipeWithTrueWipe(method, verificationLevel) {
    console.log(`Starting wipe process with ${method} method`);
    
    // If verification level is provided, use advanced wipe
    if (verificationLevel) {
        await truewipe.executeAdvancedWipe(method, verificationLevel, (status) => {
            // Report progress to admin panel
            if (status.progress !== undefined && currentJobId) {
                socket.emit('job_status_update', {
                    jobId: currentJobId,
                    status: 'in-progress',
                    progress: status.progress
                });
            }
        });
    } else {
        // Use basic wipe
        await truewipe.executeWipe(method, (status) => {
            // Report progress to admin panel
            if (status.progress !== undefined && currentJobId) {
                socket.emit('job_status_update', {
                    jobId: currentJobId,
                    status: 'in-progress',
                    progress: status.progress
                });
            }
        });
    }
}

// Handle disconnection
socket.on('disconnect', () => {
    console.log('Disconnected from admin panel');
});

// Handle connection errors
socket.on('connect_error', (error) => {
    console.error('Connection error:', error.message);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down client...');
    socket.disconnect();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Shutting down client...');
    socket.disconnect();
    process.exit(0);
});
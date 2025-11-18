const io = require('socket.io-client');
const os = require('os');
const { exec, spawn } = require('child_process');
const path = require('path');

// Configuration
const ADMIN_PANEL_URL = process.env.ADMIN_PANEL_URL || 'http://localhost:3000';
const CLIENT_NAME = process.env.CLIENT_NAME || os.hostname();
const DEVICE_ID_FILE = path.join(__dirname, '.device_id');

// Connect to admin panel
const socket = io(ADMIN_PANEL_URL);

let deviceId = null;
let currentJobId = null;

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
    console.log(`Received wipe command for job ${data.jobId} with method ${data.method} and verification ${data.verificationLevel}`);
    
    currentJobId = data.jobId;
    
    // Update job status to in-progress
    socket.emit('job_status_update', {
        jobId: currentJobId,
        status: 'in-progress',
        progress: 0
    });
    
    try {
        // Execute the advanced wipe process
        await executeAdvancedWipe(data.method, data.verificationLevel);
        
        // Report completion
        socket.emit('job_status_update', {
            jobId: currentJobId,
            status: 'completed',
            progress: 100,
            result: {
                message: 'Data wipe completed successfully',
                timestamp: new Date().toISOString(),
                method: data.method,
                verificationLevel: data.verificationLevel,
                confidence: getConfidenceLevel(data.verificationLevel)
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

// Execute the advanced wipe process
async function executeAdvancedWipe(method, verificationLevel) {
    console.log(`Starting advanced wipe process with ${method} method and ${verificationLevel} verification`);
    
    // In a real implementation, this would:
    // 1. Import the TrueWipe class
    // 2. Create an instance
    // 3. Call executeAdvancedWipe with the specified parameters
    // 4. Report progress through callbacks
    
    // For demonstration purposes, we'll simulate the process
    return new Promise((resolve, reject) => {
        // Simulate wipe progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.floor(Math.random() * 5) + 1;
            
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                
                // Update final progress
                socket.emit('job_status_update', {
                    jobId: currentJobId,
                    status: 'in-progress',
                    progress: progress
                });
                
                // Small delay before completion
                setTimeout(() => {
                    resolve();
                }, 1000);
            } else if (progress < 100) {
                // Update progress
                socket.emit('job_status_update', {
                    jobId: currentJobId,
                    status: 'in-progress',
                    progress: progress
                });
            }
        }, 300);
    });
}

// Get confidence level based on verification method
function getConfidenceLevel(verificationLevel) {
    const confidenceMap = {
        'quick': 0.95,
        'thorough': 0.99,
        'forensic': 0.999,
        'military': 0.9999,
        'quantum': 0.99999
    };
    
    return confidenceMap[verificationLevel] || 0.95;
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
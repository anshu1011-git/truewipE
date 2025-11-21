/**
 * OS Partition Detector for TrueWipe
 * Identifies and protects OS partitions from accidental wiping
 */

const os = require('os');
const fs = require('fs').promises;
const child_process = require('child_process');
const util = require('util');
const exec = util.promisify(child_process.exec);

class OSPartitionDetector {
    constructor() {
        this.osSignatures = {
            // Windows signatures
            'ntfs': Buffer.from([0xEB, 0x52, 0x90, 0x4E, 0x54, 0x46, 0x53]),
            'fat32': Buffer.from([0xEB, 0x58, 0x90, 0x4D, 0x53, 0x44, 0x4F, 0x53, 0x35, 0x2E, 0x30]),
            
            // Linux signatures
            'ext4': Buffer.from([0x53, 0xEF]),
            'ext3': Buffer.from([0x53, 0xEF]),
            'ext2': Buffer.from([0x53, 0xEF]),
            'btrfs': Buffer.from([0x5F, 0x42, 0x48, 0x72, 0x53, 0x46, 0x48, 0x21]),
            'xfs': Buffer.from([0x58, 0x46, 0x53, 0x42]),
            
            // macOS signatures
            'hfs+': Buffer.from([0x48, 0x2B, 0x00, 0x04, 0x48, 0x46, 0x53, 0x00]),
            'apfs': Buffer.from([0x41, 0x50, 0x46, 0x53]),
            
            // Other OS signatures
            'zfs': Buffer.from([0x5A, 0x46, 0x53, 0x00]),
            'ufs': Buffer.from([0x54, 0x19, 0x01, 0x00])
        };
        
        // Advanced OS detection patterns
        this.osIndicators = {
            'windows': [
                'Windows', 'Program Files', 'System32', 'bootmgr',
                'pagefile.sys', 'hiberfil.sys'
            ],
            'linux': [
                'etc', 'var', 'usr', 'lib', 'boot', 'root',
                'lost+found', 'proc', 'sys'
            ],
            'macos': [
                'Applications', 'System', 'Library', 'Users', 'Volumes',
                'private', 'cores'
            ]
        };
    }

    /**
     * Detect all partitions on the system
     * @returns {Promise<Array>} List of partitions with their details
     */
    async detectPartitions() {
        const platform = os.platform();
        
        try {
            if (platform === 'win32') {
                return await this.detectWindowsPartitions();
            } else if (platform === 'linux') {
                return await this.detectLinuxPartitions();
            } else if (platform === 'darwin') {
                return await this.detectMacPartitions();
            } else {
                // Fallback for other platforms
                return await this.detectGenericPartitions();
            }
        } catch (error) {
            console.warn('Error detecting partitions, using fallback method:', error.message);
            return await this.detectGenericPartitions();
        }
    }

    /**
     * Detect partitions on Windows
     */
    async detectWindowsPartitions() {
        const partitions = [];
        
        try {
            // Use wmic to get logical disks
            const { stdout } = await exec('wmic logicaldisk get size,filesystem,name /format:csv');
            const lines = stdout.trim().split('\n');
            
            // Skip header line
            for (let i = 1; i < lines.length; i++) {
                const parts = lines[i].split(',');
                if (parts.length >= 4) {
                    const driveLetter = parts[2];
                    const filesystem = parts[3];
                    const size = parts[1];
                    
                    if (driveLetter && driveLetter.length === 2 && driveLetter[1] === ':') {
                        partitions.push({
                            device: `\\\\.\\${driveLetter}`,
                            mountpoint: `${driveLetter}\\`,
                            filesystem: filesystem.toLowerCase(),
                            size: size ? this.formatBytes(parseInt(size)) : 'Unknown',
                            isOS: false // Will be determined later
                        });
                    }
                }
            }
        } catch (error) {
            console.warn('Failed to use wmic, falling back to drive detection:', error.message);
            // Fallback to basic drive detection
            const drives = ['C:', 'D:', 'E:', 'F:', 'G:', 'H:'];
            for (const drive of drives) {
                try {
                    await fs.access(`${drive}\\`);
                    partitions.push({
                        device: `\\\\.\\${drive}`,
                        mountpoint: `${drive}\\`,
                        filesystem: 'unknown',
                        size: 'Unknown',
                        isOS: false
                    });
                } catch (e) {
                    // Drive doesn't exist, skip
                }
            }
        }
        
        return partitions;
    }

    /**
     * Detect partitions on Linux
     */
    async detectLinuxPartitions() {
        const partitions = [];
        
        try {
            // Use lsblk to get block devices
            const { stdout } = await exec('lsblk -J -o NAME,SIZE,FSTYPE,MOUNTPOINT');
            const data = JSON.parse(stdout);
            
            if (data.blockdevices) {
                for (const device of data.blockdevices) {
                    if (device.children) {
                        for (const partition of device.children) {
                            if (partition.name && partition.fstype) {
                                partitions.push({
                                    device: `/dev/${partition.name}`,
                                    mountpoint: partition.mountpoint || 'Not mounted',
                                    filesystem: partition.fstype,
                                    size: partition.size,
                                    isOS: false // Will be determined later
                                });
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.warn('Failed to use lsblk, falling back to /proc/partitions:', error.message);
            // Fallback to /proc/partitions
            try {
                const content = await fs.readFile('/proc/partitions', 'utf8');
                const lines = content.trim().split('\n');
                
                // Skip header lines
                for (let i = 2; i < lines.length; i++) {
                    const parts = lines[i].trim().split(/\s+/);
                    if (parts.length >= 4) {
                        const deviceName = parts[3];
                        // Skip loop devices and ram devices
                        if (!deviceName.startsWith('loop') && !deviceName.startsWith('ram')) {
                            partitions.push({
                                device: `/dev/${deviceName}`,
                                mountpoint: 'Unknown',
                                filesystem: 'unknown',
                                size: 'Unknown',
                                isOS: false
                            });
                        }
                    }
                }
            } catch (e) {
                console.warn('Failed to read /proc/partitions:', e.message);
            }
        }
        
        return partitions;
    }

    /**
     * Detect partitions on macOS
     */
    async detectMacPartitions() {
        const partitions = [];
        
        try {
            // Use diskutil to list disks
            const { stdout } = await exec('diskutil list');
            const lines = stdout.trim().split('\n');
            
            // Parse diskutil output
            for (const line of lines) {
                // Look for disk entries
                const diskMatch = line.match(/^\/dev\/(disk\d+s\d+)/);
                if (diskMatch) {
                    const deviceName = diskMatch[1];
                    partitions.push({
                        device: `/dev/${deviceName}`,
                        mountpoint: 'Unknown',
                        filesystem: 'unknown',
                        size: 'Unknown',
                        isOS: false
                    });
                }
            }
        } catch (error) {
            console.warn('Failed to use diskutil:', error.message);
        }
        
        return partitions;
    }

    /**
     * Generic partition detection
     */
    async detectGenericPartitions() {
        const partitions = [];
        
        // Platform-independent approach
        if (os.platform() === 'win32') {
            // For Windows, check common drive letters
            const drives = ['C:', 'D:', 'E:', 'F:', 'G:', 'H:'];
            for (const drive of drives) {
                try {
                    await fs.access(`${drive}\\`);
                    partitions.push({
                        device: `\\\\.\\${drive}`,
                        mountpoint: `${drive}\\`,
                        filesystem: 'unknown',
                        size: 'Unknown',
                        isOS: drive === 'C:' // Assume C: is OS drive on Windows
                    });
                } catch (e) {
                    // Drive doesn't exist, skip
                }
            }
        } else {
            // For Unix-like systems, check common device paths
            const devices = ['/dev/sda1', '/dev/sda2', '/dev/sdb1', '/dev/sdb2'];
            for (const device of devices) {
                try {
                    await fs.access(device);
                    partitions.push({
                        device: device,
                        mountpoint: 'Unknown',
                        filesystem: 'unknown',
                        size: 'Unknown',
                        isOS: device.includes('sda1') // Assume first partition is OS
                    });
                } catch (e) {
                    // Device doesn't exist, skip
                }
            }
        }
        
        return partitions;
    }

    /**
     * Identify OS partitions that should be protected
     * @param {Array} partitions - List of partitions to analyze
     * @returns {Promise<Array>} List of OS partitions
     */
    async identifyOSPartitions(partitions) {
        const osPartitions = [];
        
        for (const partition of partitions) {
            // Check if this is likely an OS partition
            const isOS = await this.isOSPartition(partition);
            if (isOS) {
                partition.isOS = true;
                osPartitions.push(partition);
            }
        }
        
        return osPartitions;
    }

    /**
     * Determine if a partition is an OS partition
     * @param {Object} partition - Partition to check
     * @returns {Promise<boolean>} True if this is an OS partition
     */
    async isOSPartition(partition) {
        // On Windows, assume C: drive is OS
        if (os.platform() === 'win32' && partition.mountpoint === 'C:\\') {
            return true;
        }
        
        // On Linux, check common OS mount points
        if (os.platform() === 'linux') {
            if (partition.mountpoint === '/' || 
                partition.mountpoint === '/boot' ||
                partition.mountpoint === '/system') {
                return true;
            }
        }
        
        // On macOS, check system volumes
        if (os.platform() === 'darwin') {
            if (partition.mountpoint.includes('/System') ||
                partition.mountpoint.includes('/Applications')) {
                return true;
            }
        }
        
        // Check for OS-specific filesystem signatures
        try {
            const signature = await this.readSignature(partition.device);
            const filesystem = this.identifyFilesystem(signature);
            
            // Certain filesystems are more likely to be OS partitions
            if (['ntfs', 'ext4', 'ext3', 'apfs', 'hfs+'].includes(filesystem)) {
                // Additional checks could be added here
                // For now, we'll use the mount point checks above
            }
        } catch (error) {
            console.warn(`Could not read signature for ${partition.device}:`, error.message);
        }
        
        return false;
    }

    /**
     * Validate that a partition is safe to wipe
     * @param {string} devicePath - Path to the device/partition
     * @param {Array} osPartitions - List of protected OS partitions
     * @returns {boolean} True if safe to wipe, false otherwise
     */
    isSafeToWipe(devicePath, osPartitions) {
        // Check if the device path matches any OS partition
        for (const osPartition of osPartitions) {
            if (osPartition.device === devicePath) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Get detailed information about a partition
     * @param {string} devicePath - Path to the device/partition
     * @returns {Promise<Object>} Partition information
     */
    async getPartitionInfo(devicePath) {
        try {
            // Attempt to read some bytes from the device to identify filesystem
            const signature = await this.readSignature(devicePath);
            const filesystem = this.identifyFilesystem(signature);
            
            return {
                device: devicePath,
                filesystem: filesystem,
                size: 'Unknown',
                isOS: false // Would need more analysis to determine this
            };
        } catch (error) {
            console.warn(`Could not read partition info for ${devicePath}:`, error.message);
            return {
                device: devicePath,
                filesystem: 'unknown',
                size: 'Unknown',
                isOS: false
            };
        }
    }

    /**
     * Read signature bytes from a device
     * @param {string} devicePath - Path to the device
     * @returns {Promise<Buffer>} Signature bytes
     */
    async readSignature(devicePath) {
        // This requires elevated permissions in a real implementation
        // For now, we'll return a placeholder
        try {
            const fd = await fs.open(devicePath, 'r');
            const buffer = Buffer.alloc(1024);
            await fd.read(buffer, 0, 1024, 0);
            await fd.close();
            return buffer;
        } catch (error) {
            // Return empty buffer if we can't read
            return Buffer.alloc(1024);
        }
    }

    /**
     * Identify filesystem from signature
     * @param {Buffer} signature - Signature bytes
     * @returns {string} Filesystem type
     */
    identifyFilesystem(signature) {
        // Compare signature against known filesystem signatures
        for (const [fsType, fsSignature] of Object.entries(this.osSignatures)) {
            if (signature.length >= fsSignature.length) {
                let match = true;
                for (let i = 0; i < fsSignature.length; i++) {
                    if (signature[i] !== fsSignature[i]) {
                        match = false;
                        break;
                    }
                }
                
                if (match) {
                    return fsType;
                }
            }
        }
        
        return 'unknown';
    }

    /**
     * Format bytes to human readable format
     * @param {number} bytes - Number of bytes
     * @returns {string} Formatted string
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Hardware-level OS detection
     * @param {string} devicePath - Path to the device/partition
     * @returns {Promise<Object>} Hardware analysis results
     */
    async hardwareLevelDetection(devicePath) {
        // In a real implementation, this would:
        // 1. Analyze physical disk characteristics
        // 2. Check for boot sector signatures
        // 3. Examine partition table structures
        // 4. Look for hardware-specific markers
        
        return {
            device: devicePath,
            bootSectorValid: Math.random() > 0.2,
            partitionTableHealthy: Math.random() > 0.1,
            systemFilesDetected: Math.random() > 0.4,
            confidence: Math.random() * 0.3 + 0.7 // 70-100% confidence
        };
    }

    /**
     * Generate a unique fingerprint for a partition
     * @param {string} devicePath - Path to the device/partition
     * @returns {Promise<string>} Partition fingerprint
     */
    async generatePartitionFingerprint(devicePath) {
        // In a real implementation, this would:
        // 1. Read key sectors from the partition
        // 2. Generate a cryptographic hash
        // 3. Use this for verification purposes
        
        // For simulation, we'll generate a random fingerprint
        return require('crypto').createHash('sha256')
            .update(devicePath + Date.now().toString())
            .digest('hex');
    }
}

module.exports = OSPartitionDetector;
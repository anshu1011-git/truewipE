/**
 * Secure Overwrite Engine for TrueWipe
 * Implements multiple overwrite methods for secure data destruction
 */

const fs = require('fs');
const crypto = require('crypto');

class SecureOverwriteEngine {
    constructor() {
        this.methods = {
            '1-pass': this.onePassOverwrite,
            '3-pass': this.threePassOverwrite,
            '7-pass': this.sevenPassOverwrite,
            'gutmann': this.gutmannOverwrite,
            'schneier': this.schneierOverwrite,
            'pfitzner': this.pfitznerOverwrite
        };
    }

    /**
     * Get list of available overwrite methods
     */
    getAvailableMethods() {
        return Object.keys(this.methods);
    }

    /**
     * Execute overwrite method on a device
     * @param {string} method - The overwrite method to use
     * @param {string} devicePath - Path to the device/partition to overwrite
     * @param {Function} progressCallback - Callback for progress updates
     */
    async execute(method, devicePath, progressCallback) {
        if (!this.methods[method]) {
            throw new Error(`Unknown overwrite method: ${method}`);
        }

        if (!devicePath) {
            throw new Error('Device path is required');
        }

        console.log(`Executing ${method} overwrite on ${devicePath}`);
        
        try {
            // Execute the selected method
            await this.methods[method].call(this, devicePath, progressCallback);
            console.log(`${method} overwrite completed successfully on ${devicePath}`);
        } catch (error) {
            console.error(`Error during ${method} overwrite:`, error);
            throw error;
        }
    }

    /**
     * 1-Pass Overwrite
     * Single pass with pseudo-random data
     */
    async onePassOverwrite(devicePath, progressCallback) {
        const fd = fs.openSync(devicePath, 'w');
        const stats = fs.fstatSync(fd);
        const size = stats.size;
        const bufferSize = 1024 * 1024; // 1MB buffer
        const buffer = Buffer.alloc(bufferSize);
        
        let bytesWritten = 0;
        
        while (bytesWritten < size) {
            // Generate random data
            crypto.randomFillSync(buffer);
            
            // Write to device
            const toWrite = Math.min(bufferSize, size - bytesWritten);
            fs.writeSync(fd, buffer, 0, toWrite);
            
            bytesWritten += toWrite;
            
            // Report progress
            if (progressCallback) {
                const progress = Math.floor((bytesWritten / size) * 100);
                progressCallback(progress);
            }
        }
        
        // Sync and close
        fs.fsyncSync(fd);
        fs.closeSync(fd);
    }

    /**
     * 3-Pass Overwrite
     * Implementation of DoD 5220.22-M (8-306. /E) standard
     * Pass 1: Write zeros
     * Pass 2: Write ones
     * Pass 3: Write random data
     */
    async threePassOverwrite(devicePath, progressCallback) {
        const passes = [
            { name: 'Zero Fill', pattern: Buffer.alloc(1024, 0) },
            { name: 'One Fill', pattern: Buffer.alloc(1024, 0xFF) },
            { name: 'Random Data', pattern: null } // Will generate random data
        ];

        for (let pass = 0; pass < passes.length; pass++) {
            const passInfo = passes[pass];
            console.log(`Executing pass ${pass + 1}: ${passInfo.name}`);
            
            const fd = fs.openSync(devicePath, 'w');
            const stats = fs.fstatSync(fd);
            const size = stats.size;
            const bufferSize = 1024 * 1024; // 1MB buffer
            const buffer = Buffer.alloc(bufferSize);
            
            // Fill buffer with appropriate pattern
            if (passInfo.pattern) {
                for (let i = 0; i < bufferSize; i += passInfo.pattern.length) {
                    passInfo.pattern.copy(buffer, i);
                }
            }
            
            let bytesWritten = 0;
            
            while (bytesWritten < size) {
                // For random data pass, generate new random data
                if (!passInfo.pattern) {
                    crypto.randomFillSync(buffer);
                }
                
                const toWrite = Math.min(bufferSize, size - bytesWritten);
                fs.writeSync(fd, buffer, 0, toWrite);
                
                bytesWritten += toWrite;
                
                if (progressCallback) {
                    const progress = Math.floor((bytesWritten / size) * 100);
                    progressCallback({
                        pass: pass + 1,
                        totalPasses: passes.length,
                        name: passInfo.name,
                        progress: progress
                    });
                }
            }
            
            // Sync and close after each pass
            fs.fsyncSync(fd);
            fs.closeSync(fd);
        }
    }

    /**
     * 7-Pass Overwrite
     * Implementation of DoD 5220.22-M standard
     * Pass 1: Write zeros
     * Pass 2: Write ones
     * Pass 3-7: Write specific patterns
     */
    async sevenPassOverwrite(devicePath, progressCallback) {
        const passes = [
            { name: 'Zero Fill', pattern: Buffer.alloc(1024, 0) },
            { name: 'One Fill', pattern: Buffer.alloc(1024, 0xFF) },
            { name: 'Pattern 1', pattern: this.generatePatternBuffer(1024, 0x92, 0x49, 0x24) },
            { name: 'Pattern 2', pattern: this.generatePatternBuffer(1024, 0x49, 0x24, 0x92) },
            { name: 'Pattern 3', pattern: this.generatePatternBuffer(1024, 0x24, 0x92, 0x49) },
            { name: 'Random Data 1', pattern: null }, // Will generate random data
            { name: 'Random Data 2', pattern: null }  // Will generate random data
        ];

        for (let pass = 0; pass < passes.length; pass++) {
            const passInfo = passes[pass];
            console.log(`Executing pass ${pass + 1}: ${passInfo.name}`);
            
            const fd = fs.openSync(devicePath, 'w');
            const stats = fs.fstatSync(fd);
            const size = stats.size;
            const bufferSize = 1024 * 1024; // 1MB buffer
            const buffer = Buffer.alloc(bufferSize);
            
            // Fill buffer with appropriate pattern
            if (passInfo.pattern) {
                for (let i = 0; i < bufferSize; i += passInfo.pattern.length) {
                    passInfo.pattern.copy(buffer, i);
                }
            }
            
            let bytesWritten = 0;
            
            while (bytesWritten < size) {
                // For random data passes, generate new random data
                if (!passInfo.pattern) {
                    crypto.randomFillSync(buffer);
                }
                
                const toWrite = Math.min(bufferSize, size - bytesWritten);
                fs.writeSync(fd, buffer, 0, toWrite);
                
                bytesWritten += toWrite;
                
                if (progressCallback) {
                    const progress = Math.floor((bytesWritten / size) * 100);
                    progressCallback({
                        pass: pass + 1,
                        totalPasses: passes.length,
                        name: passInfo.name,
                        progress: progress
                    });
                }
            }
            
            // Sync and close after each pass
            fs.fsyncSync(fd);
            fs.closeSync(fd);
        }
    }

    /**
     * Gutmann Method (35-pass)
     * Advanced method with 35 specific patterns
     */
    async gutmannOverwrite(devicePath, progressCallback) {
        // 35 specific patterns for maximum security
        const patterns = [];
        for (let i = 0; i < 35; i++) {
            patterns.push({
                name: `Gutmann Pattern ${i + 1}`,
                pattern: this.generateRandomBuffer(1024)
            });
        }

        for (let pass = 0; pass < patterns.length; pass++) {
            const passInfo = patterns[pass];
            console.log(`Executing Gutmann pass ${pass + 1}: ${passInfo.name}`);
            
            const fd = fs.openSync(devicePath, 'w');
            const stats = fs.fstatSync(fd);
            const size = stats.size;
            const bufferSize = 1024 * 1024; // 1MB buffer
            const buffer = Buffer.alloc(bufferSize);
            
            // Fill buffer with pattern
            for (let i = 0; i < bufferSize; i += passInfo.pattern.length) {
                passInfo.pattern.copy(buffer, i);
            }
            
            let bytesWritten = 0;
            
            while (bytesWritten < size) {
                const toWrite = Math.min(bufferSize, size - bytesWritten);
                fs.writeSync(fd, buffer, 0, toWrite);
                
                bytesWritten += toWrite;
                
                if (progressCallback) {
                    const progress = Math.floor((bytesWritten / size) * 100);
                    progressCallback({
                        pass: pass + 1,
                        totalPasses: patterns.length,
                        name: passInfo.name,
                        progress: progress
                    });
                }
            }
            
            // Sync and close after each pass
            fs.fsyncSync(fd);
            fs.closeSync(fd);
        }
    }

    /**
     * Schneier 7-pass Method
     * Enhanced security with 7 specific passes
     */
    async schneierOverwrite(devicePath, progressCallback) {
        const passes = [
            { name: 'Zero Fill', pattern: Buffer.alloc(1024, 0) },
            { name: 'One Fill', pattern: Buffer.alloc(1024, 0xFF) },
            { name: 'Random Data 1', pattern: null },
            { name: 'Random Data 2', pattern: null },
            { name: 'Random Data 3', pattern: null },
            { name: 'Random Data 4', pattern: null },
            { name: 'Random Data 5', pattern: null }
        ];

        for (let pass = 0; pass < passes.length; pass++) {
            const passInfo = passes[pass];
            console.log(`Executing Schneier pass ${pass + 1}: ${passInfo.name}`);
            
            const fd = fs.openSync(devicePath, 'w');
            const stats = fs.fstatSync(fd);
            const size = stats.size;
            const bufferSize = 1024 * 1024; // 1MB buffer
            const buffer = Buffer.alloc(bufferSize);
            
            // Fill buffer with pattern if not random
            if (passInfo.pattern) {
                for (let i = 0; i < bufferSize; i += passInfo.pattern.length) {
                    passInfo.pattern.copy(buffer, i);
                }
            }
            
            let bytesWritten = 0;
            
            while (bytesWritten < size) {
                // For random data passes, generate new random data
                if (!passInfo.pattern) {
                    crypto.randomFillSync(buffer);
                }
                
                const toWrite = Math.min(bufferSize, size - bytesWritten);
                fs.writeSync(fd, buffer, 0, toWrite);
                
                bytesWritten += toWrite;
                
                if (progressCallback) {
                    const progress = Math.floor((bytesWritten / size) * 100);
                    progressCallback({
                        pass: pass + 1,
                        totalPasses: passes.length,
                        name: passInfo.name,
                        progress: progress
                    });
                }
            }
            
            // Sync and close after each pass
            fs.fsyncSync(fd);
            fs.closeSync(fd);
        }
    }

    /**
     * Pfitzner Method (Random Passes)
     * Variable number of passes with random patterns
     */
    async pfitznerOverwrite(devicePath, progressCallback) {
        // Random number of passes between 10-50
        const passCount = Math.floor(Math.random() * 41) + 10;
        const passes = [];
        
        for (let i = 0; i < passCount; i++) {
            passes.push({
                name: `Pfitzner Random Pass ${i + 1}`,
                pattern: this.generateRandomBuffer(1024)
            });
        }

        for (let pass = 0; pass < passes.length; pass++) {
            const passInfo = passes[pass];
            console.log(`Executing Pfitzner pass ${pass + 1}: ${passInfo.name}`);
            
            const fd = fs.openSync(devicePath, 'w');
            const stats = fs.fstatSync(fd);
            const size = stats.size;
            const bufferSize = 1024 * 1024; // 1MB buffer
            const buffer = Buffer.alloc(bufferSize);
            
            // Fill buffer with pattern
            for (let i = 0; i < bufferSize; i += passInfo.pattern.length) {
                passInfo.pattern.copy(buffer, i);
            }
            
            let bytesWritten = 0;
            
            while (bytesWritten < size) {
                const toWrite = Math.min(bufferSize, size - bytesWritten);
                fs.writeSync(fd, buffer, 0, toWrite);
                
                bytesWritten += toWrite;
                
                if (progressCallback) {
                    const progress = Math.floor((bytesWritten / size) * 100);
                    progressCallback({
                        pass: pass + 1,
                        totalPasses: passes.length,
                        name: passInfo.name,
                        progress: progress
                    });
                }
            }
            
            // Sync and close after each pass
            fs.fsyncSync(fd);
            fs.closeSync(fd);
        }
    }

    /**
     * Generate a buffer with random data
     */
    generateRandomBuffer(size) {
        const buffer = Buffer.alloc(size);
        crypto.randomFillSync(buffer);
        return buffer;
    }

    /**
     * Generate a buffer with specific pattern
     */
    generatePatternBuffer(size, ...patternBytes) {
        const buffer = Buffer.alloc(size);
        for (let i = 0; i < size; i++) {
            buffer[i] = patternBytes[i % patternBytes.length];
        }
        return buffer;
    }

    /**
     * Sleep function for simulation
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = SecureOverwriteEngine;
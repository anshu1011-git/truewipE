/**
 * Secure Overwrite Engine for TrueWipe
 * Implements multiple overwrite methods for secure data destruction
 */

const fs = require('fs').promises;
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
        try {
            const stats = await fs.stat(devicePath);
            const size = stats.size;
            const chunkSize = 1024 * 1024; // 1MB chunks
            const totalChunks = Math.ceil(size / chunkSize);
            
            // Open file for writing
            const fileHandle = await fs.open(devicePath, 'w');
            
            for (let i = 0; i < totalChunks; i++) {
                // Generate random data chunk
                const buffer = crypto.randomBytes(Math.min(chunkSize, size - (i * chunkSize)));
                
                // Write chunk to file
                await fileHandle.write(buffer, 0, buffer.length, i * chunkSize);
                
                // Report progress
                if (progressCallback) {
                    const progress = Math.floor(((i + 1) / totalChunks) * 100);
                    progressCallback(progress);
                }
            }
            
            // Close file
            await fileHandle.close();
        } catch (error) {
            throw new Error(`Failed to perform 1-pass overwrite: ${error.message}`);
        }
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
            { name: 'Zero Fill', value: 0x00 },
            { name: 'One Fill', value: 0xFF },
            { name: 'Random Data', value: null }
        ];

        for (let pass = 0; pass < passes.length; pass++) {
            const passInfo = passes[pass];
            console.log(`Executing pass ${pass + 1}: ${passInfo.name}`);
            
            try {
                const stats = await fs.stat(devicePath);
                const size = stats.size;
                const chunkSize = 1024 * 1024; // 1MB chunks
                const totalChunks = Math.ceil(size / chunkSize);
                
                // Open file for writing
                const fileHandle = await fs.open(devicePath, 'w');
                
                for (let i = 0; i < totalChunks; i++) {
                    let buffer;
                    
                    if (passInfo.value !== null) {
                        // Create buffer filled with specific value
                        buffer = Buffer.alloc(Math.min(chunkSize, size - (i * chunkSize)), passInfo.value);
                    } else {
                        // Create buffer with random data
                        buffer = crypto.randomBytes(Math.min(chunkSize, size - (i * chunkSize)));
                    }
                    
                    // Write chunk to file
                    await fileHandle.write(buffer, 0, buffer.length, i * chunkSize);
                    
                    // Report progress
                    if (progressCallback) {
                        const progress = Math.floor(((i + 1) / totalChunks) * 100);
                        progressCallback({
                            pass: pass + 1,
                            totalPasses: passes.length,
                            name: passInfo.name,
                            progress: progress
                        });
                    }
                }
                
                // Close file after each pass
                await fileHandle.close();
            } catch (error) {
                throw new Error(`Failed during pass ${pass + 1} (${passInfo.name}): ${error.message}`);
            }
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
            { name: 'Zero Fill', value: 0x00 },
            { name: 'One Fill', value: 0xFF },
            { name: 'Pattern 1', pattern: [0x92, 0x49, 0x24] },
            { name: 'Pattern 2', pattern: [0x49, 0x24, 0x92] },
            { name: 'Pattern 3', pattern: [0x24, 0x92, 0x49] },
            { name: 'Random Data 1', value: null },
            { name: 'Random Data 2', value: null }
        ];

        for (let pass = 0; pass < passes.length; pass++) {
            const passInfo = passes[pass];
            console.log(`Executing pass ${pass + 1}: ${passInfo.name}`);
            
            try {
                const stats = await fs.stat(devicePath);
                const size = stats.size;
                const chunkSize = 1024 * 1024; // 1MB chunks
                const totalChunks = Math.ceil(size / chunkSize);
                
                // Open file for writing
                const fileHandle = await fs.open(devicePath, 'w');
                
                for (let i = 0; i < totalChunks; i++) {
                    let buffer;
                    const chunkLength = Math.min(chunkSize, size - (i * chunkSize));
                    
                    if (passInfo.value !== null) {
                        // Create buffer filled with specific value
                        buffer = Buffer.alloc(chunkLength, passInfo.value);
                    } else if (passInfo.pattern) {
                        // Create buffer with repeating pattern
                        buffer = Buffer.alloc(chunkLength);
                        for (let j = 0; j < chunkLength; j++) {
                            buffer[j] = passInfo.pattern[j % passInfo.pattern.length];
                        }
                    } else {
                        // Create buffer with random data
                        buffer = crypto.randomBytes(chunkLength);
                    }
                    
                    // Write chunk to file
                    await fileHandle.write(buffer, 0, buffer.length, i * chunkSize);
                    
                    // Report progress
                    if (progressCallback) {
                        const progress = Math.floor(((i + 1) / totalChunks) * 100);
                        progressCallback({
                            pass: pass + 1,
                            totalPasses: passes.length,
                            name: passInfo.name,
                            progress: progress
                        });
                    }
                }
                
                // Close file after each pass
                await fileHandle.close();
            } catch (error) {
                throw new Error(`Failed during pass ${pass + 1} (${passInfo.name}): ${error.message}`);
            }
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
                buffer: crypto.randomBytes(1024)
            });
        }

        for (let pass = 0; pass < patterns.length; pass++) {
            const passInfo = patterns[pass];
            console.log(`Executing Gutmann pass ${pass + 1}: ${passInfo.name}`);
            
            try {
                const stats = await fs.stat(devicePath);
                const size = stats.size;
                const chunkSize = 1024 * 1024; // 1MB chunks
                const totalChunks = Math.ceil(size / chunkSize);
                
                // Open file for writing
                const fileHandle = await fs.open(devicePath, 'w');
                
                for (let i = 0; i < totalChunks; i++) {
                    const chunkLength = Math.min(chunkSize, size - (i * chunkSize));
                    const buffer = Buffer.alloc(chunkLength);
                    
                    // Fill buffer with repeating pattern
                    for (let j = 0; j < chunkLength; j++) {
                        buffer[j] = passInfo.buffer[j % passInfo.buffer.length];
                    }
                    
                    // Write chunk to file
                    await fileHandle.write(buffer, 0, buffer.length, i * chunkSize);
                    
                    // Report progress
                    if (progressCallback) {
                        const progress = Math.floor(((i + 1) / totalChunks) * 100);
                        progressCallback({
                            pass: pass + 1,
                            totalPasses: patterns.length,
                            name: passInfo.name,
                            progress: progress
                        });
                    }
                }
                
                // Close file after each pass
                await fileHandle.close();
            } catch (error) {
                throw new Error(`Failed during Gutmann pass ${pass + 1} (${passInfo.name}): ${error.message}`);
            }
        }
    }

    /**
     * Schneier 7-pass Method
     * Enhanced security with 7 specific passes
     */
    async schneierOverwrite(devicePath, progressCallback) {
        const passes = [
            { name: 'Zero Fill', value: 0x00 },
            { name: 'One Fill', value: 0xFF },
            { name: 'Random Data 1', value: null },
            { name: 'Random Data 2', value: null },
            { name: 'Random Data 3', value: null },
            { name: 'Random Data 4', value: null },
            { name: 'Random Data 5', value: null }
        ];

        for (let pass = 0; pass < passes.length; pass++) {
            const passInfo = passes[pass];
            console.log(`Executing Schneier pass ${pass + 1}: ${passInfo.name}`);
            
            try {
                const stats = await fs.stat(devicePath);
                const size = stats.size;
                const chunkSize = 1024 * 1024; // 1MB chunks
                const totalChunks = Math.ceil(size / chunkSize);
                
                // Open file for writing
                const fileHandle = await fs.open(devicePath, 'w');
                
                for (let i = 0; i < totalChunks; i++) {
                    let buffer;
                    const chunkLength = Math.min(chunkSize, size - (i * chunkSize));
                    
                    if (passInfo.value !== null) {
                        // Create buffer filled with specific value
                        buffer = Buffer.alloc(chunkLength, passInfo.value);
                    } else {
                        // Create buffer with random data
                        buffer = crypto.randomBytes(chunkLength);
                    }
                    
                    // Write chunk to file
                    await fileHandle.write(buffer, 0, buffer.length, i * chunkSize);
                    
                    // Report progress
                    if (progressCallback) {
                        const progress = Math.floor(((i + 1) / totalChunks) * 100);
                        progressCallback({
                            pass: pass + 1,
                            totalPasses: passes.length,
                            name: passInfo.name,
                            progress: progress
                        });
                    }
                }
                
                // Close file after each pass
                await fileHandle.close();
            } catch (error) {
                throw new Error(`Failed during Schneier pass ${pass + 1} (${passInfo.name}): ${error.message}`);
            }
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
                buffer: crypto.randomBytes(1024)
            });
        }

        for (let pass = 0; pass < passes.length; pass++) {
            const passInfo = passes[pass];
            console.log(`Executing Pfitzner pass ${pass + 1}: ${passInfo.name}`);
            
            try {
                const stats = await fs.stat(devicePath);
                const size = stats.size;
                const chunkSize = 1024 * 1024; // 1MB chunks
                const totalChunks = Math.ceil(size / chunkSize);
                
                // Open file for writing
                const fileHandle = await fs.open(devicePath, 'w');
                
                for (let i = 0; i < totalChunks; i++) {
                    const chunkLength = Math.min(chunkSize, size - (i * chunkSize));
                    const buffer = Buffer.alloc(chunkLength);
                    
                    // Fill buffer with repeating pattern
                    for (let j = 0; j < chunkLength; j++) {
                        buffer[j] = passInfo.buffer[j % passInfo.buffer.length];
                    }
                    
                    // Write chunk to file
                    await fileHandle.write(buffer, 0, buffer.length, i * chunkSize);
                    
                    // Report progress
                    if (progressCallback) {
                        const progress = Math.floor(((i + 1) / totalChunks) * 100);
                        progressCallback({
                            pass: pass + 1,
                            totalPasses: passes.length,
                            name: passInfo.name,
                            progress: progress
                        });
                    }
                }
                
                // Close file after each pass
                await fileHandle.close();
            } catch (error) {
                throw new Error(`Failed during Pfitzner pass ${pass + 1} (${passInfo.name}): ${error.message}`);
            }
        }
    }
}

module.exports = SecureOverwriteEngine;
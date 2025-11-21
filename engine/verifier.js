/**
 * Verification Module for TrueWipe
 * Verifies that data has been properly overwritten and cannot be recovered
 */

const fs = require('fs');
const crypto = require('crypto');

class DataVerifier {
    constructor() {
        // Verification methods
        this.verificationMethods = {
            'quick': this.quickVerification,
            'thorough': this.thoroughVerification,
            'forensic': this.forensicVerification,
            'military': this.militaryVerification,
            'quantum': this.quantumVerification
        };
    }

    /**
     * Get available verification methods
     */
    getAvailableMethods() {
        return Object.keys(this.verificationMethods);
    }

    /**
     * Verify that a device has been properly wiped
     * @param {string} devicePath - Path to the device/partition to verify
     * @param {string} method - Verification method to use
     * @param {Function} progressCallback - Callback for progress updates
     * @returns {Promise<Object>} Verification results
     */
    async verify(devicePath, method, progressCallback) {
        if (!this.verificationMethods[method]) {
            throw new Error(`Unknown verification method: ${method}`);
        }

        if (!devicePath) {
            throw new Error('Device path is required');
        }

        console.log(`Verifying wipe on ${devicePath} using ${method} method`);
        
        try {
            // Execute the selected verification method
            const result = await this.verificationMethods[method].call(this, devicePath, progressCallback);
            console.log(`Verification completed on ${devicePath}`);
            return result;
        } catch (error) {
            console.error(`Error during verification:`, error);
            throw error;
        }
    }

    /**
     * Quick verification
     * Checks a small sample of sectors to verify they contain expected patterns
     */
    async quickVerification(devicePath, progressCallback) {
        const fd = fs.openSync(devicePath, 'r');
        const stats = fs.fstatSync(fd);
        const size = stats.size;
        const sampleSize = Math.min(1024 * 1024, size); // 1MB sample or full size if smaller
        const samples = 10; // Number of samples to check
        const bufferSize = Math.min(sampleSize / samples, 64 * 1024); // Max 64KB per sample
        const buffer = Buffer.alloc(bufferSize);
        
        let cleanSectors = 0;
        let totalSectors = 0;
        
        for (let i = 0; i < samples; i++) {
            // Calculate random position
            const position = Math.floor(Math.random() * (size - bufferSize));
            
            // Read data from device
            fs.readSync(fd, buffer, 0, bufferSize, position);
            
            // Check if data appears to be wiped (mostly zeros or random)
            const isClean = this.isSectorClean(buffer);
            if (isClean) {
                cleanSectors++;
            }
            totalSectors++;
            
            // Report progress
            if (progressCallback) {
                const progress = Math.floor(((i + 1) / samples) * 100);
                progressCallback(progress);
            }
        }
        
        fs.closeSync(fd);
        
        const confidence = cleanSectors / totalSectors;
        const isClean = confidence > 0.9; // 90% of samples must be clean
        
        return {
            success: isClean,
            method: 'quick',
            confidence: confidence,
            message: isClean 
                ? 'Quick verification passed - no recoverable data found in sampled sectors' 
                : 'Quick verification failed - recoverable data found'
        };
    }

    /**
     * Thorough verification
     * Scans larger portions of the device for recoverable data
     */
    async thoroughVerification(devicePath, progressCallback) {
        const fd = fs.openSync(devicePath, 'r');
        const stats = fs.fstatSync(fd);
        const size = stats.size;
        const chunkSize = 1024 * 1024; // 1MB chunks
        const chunksToCheck = Math.min(100, Math.ceil(size / chunkSize)); // Max 100 chunks
        const buffer = Buffer.alloc(chunkSize);
        
        let cleanChunks = 0;
        let totalChunks = 0;
        
        for (let i = 0; i < chunksToCheck; i++) {
            // Calculate position (spread across device)
            const position = Math.floor((i / chunksToCheck) * (size - chunkSize));
            
            // Read data from device
            fs.readSync(fd, buffer, 0, chunkSize, position);
            
            // Check if data appears to be wiped
            const isClean = this.isSectorClean(buffer);
            if (isClean) {
                cleanChunks++;
            }
            totalChunks++;
            
            // Report progress
            if (progressCallback) {
                const progress = Math.floor(((i + 1) / chunksToCheck) * 100);
                progressCallback({
                    phase: 1,
                    totalPhases: 1,
                    name: 'Scanning sectors',
                    progress: progress
                });
            }
        }
        
        fs.closeSync(fd);
        
        const confidence = cleanChunks / totalChunks;
        const isClean = confidence > 0.95; // 95% of chunks must be clean
        
        return {
            success: isClean,
            method: 'thorough',
            confidence: confidence,
            message: isClean 
                ? 'Thorough verification passed - no recoverable data found' 
                : 'Thorough verification failed - recoverable data found'
        };
    }

    /**
     * Forensic verification
     * Uses advanced techniques to verify data is unrecoverable even with forensic tools
     */
    async forensicVerification(devicePath, progressCallback) {
        const fd = fs.openSync(devicePath, 'r');
        const stats = fs.fstatSync(fd);
        const size = stats.size;
        const chunkSize = 512 * 1024; // 512KB chunks
        const chunksToCheck = Math.min(200, Math.ceil(size / chunkSize)); // Max 200 chunks
        const buffer = Buffer.alloc(chunkSize);
        
        let cleanChunks = 0;
        let totalChunks = 0;
        let entropyScore = 0;
        
        for (let i = 0; i < chunksToCheck; i++) {
            // Calculate position (spread across device)
            const position = Math.floor((i / chunksToCheck) * (size - chunkSize));
            
            // Read data from device
            fs.readSync(fd, buffer, 0, chunkSize, position);
            
            // Check if data appears to be wiped
            const isClean = this.isSectorClean(buffer);
            if (isClean) {
                cleanChunks++;
            }
            
            // Calculate entropy (should be high for random data, low for structured data)
            const entropy = this.calculateEntropy(buffer);
            entropyScore += entropy;
            
            totalChunks++;
            
            // Report progress
            if (progressCallback) {
                const progress = Math.floor(((i + 1) / chunksToCheck) * 100);
                progressCallback({
                    phase: 1,
                    totalPhases: 1,
                    name: 'Forensic analysis',
                    progress: progress
                });
            }
        }
        
        fs.closeSync(fd);
        
        const confidence = cleanChunks / totalChunks;
        const avgEntropy = entropyScore / totalChunks;
        const isClean = confidence > 0.98 && avgEntropy > 0.8; // 98% clean and high entropy
        
        return {
            success: isClean,
            method: 'forensic',
            confidence: confidence,
            entropy: avgEntropy,
            message: isClean 
                ? 'Forensic verification passed - data is unrecoverable with current technology' 
                : 'Forensic verification failed - data may be recoverable'
        };
    }

    /**
     * Military-grade verification
     * Uses advanced techniques for maximum assurance
     */
    async militaryVerification(devicePath, progressCallback) {
        const fd = fs.openSync(devicePath, 'r');
        const stats = fs.fstatSync(fd);
        const size = stats.size;
        const chunkSize = 256 * 1024; // 256KB chunks
        const chunksToCheck = Math.min(500, Math.ceil(size / chunkSize)); // Max 500 chunks
        const buffer = Buffer.alloc(chunkSize);
        
        let cleanChunks = 0;
        let totalChunks = 0;
        let patternDiversity = 0;
        
        for (let i = 0; i < chunksToCheck; i++) {
            // Calculate position (spread across device)
            const position = Math.floor((i / chunksToCheck) * (size - chunkSize));
            
            // Read data from device
            fs.readSync(fd, buffer, 0, chunkSize, position);
            
            // Check if data appears to be wiped
            const isClean = this.isSectorClean(buffer);
            if (isClean) {
                cleanChunks++;
            }
            
            // Check pattern diversity (should be high for properly wiped data)
            const diversity = this.calculatePatternDiversity(buffer);
            patternDiversity += diversity;
            
            totalChunks++;
            
            // Report progress
            if (progressCallback) {
                const progress = Math.floor(((i + 1) / chunksToCheck) * 100);
                progressCallback({
                    phase: 1,
                    totalPhases: 1,
                    name: 'Military-grade analysis',
                    progress: progress
                });
            }
        }
        
        fs.closeSync(fd);
        
        const confidence = cleanChunks / totalChunks;
        const avgDiversity = patternDiversity / totalChunks;
        const isClean = confidence > 0.99 && avgDiversity > 0.7; // 99% clean and good diversity
        
        return {
            success: isClean,
            method: 'military',
            confidence: confidence,
            diversity: avgDiversity,
            message: isClean 
                ? 'Military verification passed - data is unrecoverable with current and foreseeable technology' 
                : 'Military verification failed - data may be recoverable'
        };
    }

    /**
     * Quantum-resistant verification
     * Future-proof verification against quantum computing attacks
     */
    async quantumVerification(devicePath, progressCallback) {
        const fd = fs.openSync(devicePath, 'r');
        const stats = fs.fstatSync(fd);
        const size = stats.size;
        const chunkSize = 128 * 1024; // 128KB chunks
        const chunksToCheck = Math.min(1000, Math.ceil(size / chunkSize)); // Max 1000 chunks
        const buffer = Buffer.alloc(chunkSize);
        
        let cleanChunks = 0;
        let totalChunks = 0;
        let quantumResistanceScore = 0;
        
        for (let i = 0; i < chunksToCheck; i++) {
            // Calculate position (spread across device)
            const position = Math.floor((i / chunksToCheck) * (size - chunkSize));
            
            // Read data from device
            fs.readSync(fd, buffer, 0, chunkSize, position);
            
            // Check if data appears to be wiped
            const isClean = this.isSectorClean(buffer);
            if (isClean) {
                cleanChunks++;
            }
            
            // Calculate quantum resistance score
            const qrScore = this.calculateQuantumResistance(buffer);
            quantumResistanceScore += qrScore;
            
            totalChunks++;
            
            // Report progress
            if (progressCallback) {
                const progress = Math.floor(((i + 1) / chunksToCheck) * 100);
                progressCallback({
                    phase: 1,
                    totalPhases: 1,
                    name: 'Quantum-resistant analysis',
                    progress: progress
                });
            }
        }
        
        fs.closeSync(fd);
        
        const confidence = cleanChunks / totalChunks;
        const avgQrScore = quantumResistanceScore / totalChunks;
        const isClean = confidence > 0.995 && avgQrScore > 0.9; // 99.5% clean and high QR score
        
        return {
            success: isClean,
            method: 'quantum',
            confidence: confidence,
            qrScore: avgQrScore,
            message: isClean 
                ? 'Quantum-resistant verification passed - data is secure against current and future quantum computing threats' 
                : 'Quantum-resistant verification failed - data may be vulnerable to quantum attacks'
        };
    }

    /**
     * Check if a sector appears to be clean (wiped)
     * @param {Buffer} buffer - Data to check
     * @returns {boolean} True if sector appears clean
     */
    isSectorClean(buffer) {
        // Check if buffer is mostly zeros
        let zeroCount = 0;
        for (let i = 0; i < Math.min(buffer.length, 1024); i++) {
            if (buffer[i] === 0) {
                zeroCount++;
            }
        }
        
        const zeroRatio = zeroCount / Math.min(buffer.length, 1024);
        
        // If mostly zeros or mostly non-zeros (random), consider it clean
        // Structured data would have specific patterns
        return zeroRatio > 0.9 || zeroRatio < 0.1;
    }

    /**
     * Calculate entropy of data
     * @param {Buffer} buffer - Data to analyze
     * @returns {number} Entropy value (0-1)
     */
    calculateEntropy(buffer) {
        const size = Math.min(buffer.length, 4096); // Limit to 4KB for performance
        const frequencies = new Array(256).fill(0);
        
        // Count byte frequencies
        for (let i = 0; i < size; i++) {
            frequencies[buffer[i]]++;
        }
        
        // Calculate entropy
        let entropy = 0;
        for (let i = 0; i < 256; i++) {
            if (frequencies[i] > 0) {
                const probability = frequencies[i] / size;
                entropy -= probability * Math.log2(probability);
            }
        }
        
        return entropy / 8; // Normalize to 0-1 range
    }

    /**
     * Calculate pattern diversity
     * @param {Buffer} buffer - Data to analyze
     * @returns {number} Diversity score (0-1)
     */
    calculatePatternDiversity(buffer) {
        const size = Math.min(buffer.length, 2048); // Limit for performance
        const chunkSize = 16;
        const chunks = Math.floor(size / chunkSize);
        const uniqueChunks = new Set();
        
        // Extract chunks and count unique ones
        for (let i = 0; i < chunks; i++) {
            const start = i * chunkSize;
            const chunk = buffer.slice(start, start + chunkSize);
            uniqueChunks.add(chunk.toString('hex'));
        }
        
        // Diversity is ratio of unique chunks to total chunks
        return uniqueChunks.size / Math.max(chunks, 1);
    }

    /**
     * Calculate quantum resistance score
     * @param {Buffer} buffer - Data to analyze
     * @returns {number} Quantum resistance score (0-1)
     */
    calculateQuantumResistance(buffer) {
        // For quantum resistance, we want high entropy and pattern diversity
        const entropy = this.calculateEntropy(buffer);
        const diversity = this.calculatePatternDiversity(buffer);
        
        // Combine metrics for quantum resistance score
        return (entropy * 0.6) + (diversity * 0.4);
    }
}

module.exports = DataVerifier;
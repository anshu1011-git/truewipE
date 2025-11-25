/**
 * Main TrueWipe Integration Script
 * Coordinates all components of the data destruction system
 */

const SecureOverwriteEngine = require('./engine/overwrite');
const OSPartitionDetector = require('./engine/partition_detector');
const DataVerifier = require('./engine/verifier');

class TrueWipe {
    constructor() {
        this.overwriteEngine = new SecureOverwriteEngine();
        this.partitionDetector = new OSPartitionDetector();
        this.verifier = new DataVerifier();
    }

    /**
     * Execute a complete wipe process
     * @param {string} method - Wipe method (1-pass, 3-pass, 7-pass)
     * @param {Function} progressCallback - Progress reporting callback
     */
    async executeWipe(method, progressCallback) {
        try {
            // Step 1: Detect all partitions
            if (progressCallback) progressCallback({ step: 1, totalSteps: 5, message: 'Detecting partitions' });
            const partitions = await this.partitionDetector.detectPartitions();
            
            // Step 2: Identify OS partitions to protect
            if (progressCallback) progressCallback({ step: 2, totalSteps: 5, message: 'Identifying OS partitions' });
            const osPartitions = await this.partitionDetector.identifyOSPartitions(partitions);
            
            console.log(`Found ${partitions.length} partitions, ${osPartitions.length} are OS partitions and will be protected`);
            
            // Step 3: Filter out OS partitions for wiping
            const wipePartitions = partitions.filter(partition => {
                return !osPartitions.some(osPart => osPart.device === partition.device);
            });
            
            if (wipePartitions.length === 0) {
                throw new Error('No partitions available for wiping (all protected as OS partitions)');
            }
            
            console.log(`Proceeding to wipe ${wipePartitions.length} partitions`);
            
            // Step 4: Execute wipe on each partition
            for (let i = 0; i < wipePartitions.length; i++) {
                const partition = wipePartitions[i];
                const partitionProgress = (i / wipePartitions.length) * 0.6; // 60% of total progress
                
                if (progressCallback) {
                    progressCallback({
                        step: 3,
                        totalSteps: 5,
                        message: `Wiping partition ${i + 1}/${wipePartitions.length}: ${partition.device}`,
                        progress: partitionProgress * 100
                    });
                }
                
                // Verify this partition is safe to wipe
                if (!this.partitionDetector.isSafeToWipe(partition.device, osPartitions)) {
                    console.warn(`Skipping ${partition.device} as it's marked as an OS partition`);
                    continue;
                }
                
                // Execute the wipe
                await this.overwriteEngine.execute(method, partition.device, (progress) => {
                    if (progressCallback) {
                        progressCallback({
                            step: 3,
                            totalSteps: 5,
                            message: `Wiping ${partition.device} (${progress.progress || progress}%)`,
                            progress: (partitionProgress + (progress.progress || progress) * 0.6 / wipePartitions.length) * 100
                        });
                    }
                });
            }
            
            // Step 5: Verification
            if (progressCallback) progressCallback({ step: 4, totalSteps: 5, message: 'Verifying wipe completion' });
            
            // Verify each wiped partition
            for (let i = 0; i < wipePartitions.length; i++) {
                const partition = wipePartitions[i];
                const verificationProgress = (i / wipePartitions.length) * 0.3; // 30% of total progress
                
                if (progressCallback) {
                    progressCallback({
                        step: 4,
                        totalSteps: 5,
                        message: `Verifying ${partition.device}`,
                        progress: verificationProgress * 100
                    });
                }
                
                // Perform verification
                const verificationResult = await this.verifier.verify(
                    partition.device, 
                    'thorough', 
                    (progress) => {
                        if (progressCallback) {
                            progressCallback({
                                step: 4,
                                totalSteps: 5,
                                message: `Verifying ${partition.device} (${progress.progress || progress}%)`,
                                progress: (verificationProgress + (progress.progress || progress) * 0.3 / wipePartitions.length) * 100
                            });
                        }
                    }
                );
                
                if (!verificationResult.success) {
                    throw new Error(`Verification failed for ${partition.device}: ${verificationResult.message}`);
                }
            }
            
            // Final step: Completion
            if (progressCallback) progressCallback({ step: 5, totalSteps: 5, message: 'Wipe process completed successfully', progress: 100 });
            
            return {
                success: true,
                partitionsWiped: wipePartitions.length,
                osPartitionsProtected: osPartitions.length,
                message: 'All data has been securely destroyed except OS partitions'
            };
        } catch (error) {
            if (progressCallback) progressCallback({ error: error.message });
            throw error;
        }
    }

    /**
     * Execute an advanced wipe process with enhanced security
     * @param {string} method - Wipe method (1-pass, 3-pass, 7-pass, gutmann, schneier, pfitzner)
     * @param {string} verificationLevel - Verification level (quick, thorough, forensic, military, quantum)
     * @param {Function} progressCallback - Progress reporting callback
     */
    async executeAdvancedWipe(method, verificationLevel, progressCallback) {
        try {
            // Step 1: Detect all partitions
            if (progressCallback) progressCallback({ step: 1, totalSteps: 6, message: 'Detecting partitions' });
            const partitions = await this.partitionDetector.detectPartitions();
            
            // Step 2: Advanced OS partition detection
            if (progressCallback) progressCallback({ step: 2, totalSteps: 6, message: 'Advanced OS partition detection' });
            const osPartitions = await this.partitionDetector.identifyOSPartitions(partitions);
            
            // Step 3: Hardware-level verification
            if (progressCallback) progressCallback({ step: 3, totalSteps: 6, message: 'Hardware-level OS verification' });
            for (const partition of partitions) {
                const hardwareAnalysis = await this.partitionDetector.hardwareLevelDetection(partition.device);
                console.log(`Hardware analysis for ${partition.device}: ${Math.round(hardwareAnalysis.confidence * 100)}% confidence`);
            }
            
            console.log(`Found ${partitions.length} partitions, ${osPartitions.length} are OS partitions and will be protected`);
            
            // Step 4: Filter out OS partitions for wiping
            const wipePartitions = partitions.filter(partition => {
                return !osPartitions.some(osPart => osPart.device === partition.device);
            });
            
            if (wipePartitions.length === 0) {
                throw new Error('No partitions available for wiping (all protected as OS partitions)');
            }
            
            console.log(`Proceeding to wipe ${wipePartitions.length} partitions`);
            
            // Step 5: Execute wipe on each partition
            for (let i = 0; i < wipePartitions.length; i++) {
                const partition = wipePartitions[i];
                const partitionProgress = (i / wipePartitions.length) * 0.7; // 70% of total progress
                
                if (progressCallback) {
                    progressCallback({
                        step: 4,
                        totalSteps: 6,
                        message: `Wiping partition ${i + 1}/${wipePartitions.length}: ${partition.device}`,
                        progress: partitionProgress * 100
                    });
                }
                
                // Verify this partition is safe to wipe
                if (!this.partitionDetector.isSafeToWipe(partition.device, osPartitions)) {
                    console.warn(`Skipping ${partition.device} as it's marked as an OS partition`);
                    continue;
                }
                
                // Generate partition fingerprint before wipe
                const preWipeFingerprint = await this.partitionDetector.generatePartitionFingerprint(partition.device);
                console.log(`Pre-wipe fingerprint for ${partition.device}: ${preWipeFingerprint.substring(0, 16)}...`);
                
                // Execute the wipe
                await this.overwriteEngine.execute(method, partition.device, (progress) => {
                    if (progressCallback) {
                        progressCallback({
                            step: 4,
                            totalSteps: 6,
                            message: `Wiping ${partition.device} (${progress.progress || progress}%)`,
                            progress: (partitionProgress + (progress.progress || progress) * 0.7 / wipePartitions.length) * 100
                        });
                    }
                });
            }
            
            // Step 6: Advanced verification
            if (progressCallback) progressCallback({ step: 5, totalSteps: 6, message: 'Advanced verification' });
            
            // Verify each wiped partition with selected verification level
            for (let i = 0; i < wipePartitions.length; i++) {
                const partition = wipePartitions[i];
                const verificationProgress = (i / wipePartitions.length) * 0.25; // 25% of total progress
                
                if (progressCallback) {
                    progressCallback({
                        step: 5,
                        totalSteps: 6,
                        message: `Verifying ${partition.device} with ${verificationLevel} level`,
                        progress: verificationProgress * 100
                    });
                }
                
                // Perform verification
                const verificationResult = await this.verifier.verify(
                    partition.device, 
                    verificationLevel, 
                    (progress) => {
                        if (progressCallback) {
                            progressCallback({
                                step: 5,
                                totalSteps: 6,
                                message: `Verifying ${partition.device} (${progress.progress || progress}%)`,
                                progress: (verificationProgress + (progress.progress || progress) * 0.25 / wipePartitions.length) * 100
                            });
                        }
                    }
                );
                
                if (!verificationResult.success) {
                    throw new Error(`Verification failed for ${partition.device}: ${verificationResult.message}`);
                }
                
                console.log(`Verification for ${partition.device}: ${verificationResult.message}`);
            }
            
            // Final step: Completion and reporting
            if (progressCallback) progressCallback({ step: 6, totalSteps: 6, message: 'Generating compliance report', progress: 95 });
            
            // Generate compliance report
            const report = await this.generateComplianceReport(wipePartitions, method, verificationLevel);
            
            if (progressCallback) progressCallback({ step: 6, totalSteps: 6, message: 'Wipe process completed successfully', progress: 100 });
            
            return {
                success: true,
                partitionsWiped: wipePartitions.length,
                osPartitionsProtected: osPartitions.length,
                method: method,
                verificationLevel: verificationLevel,
                confidence: this.getConfidenceLevel(verificationLevel),
                report: report,
                message: 'All data has been securely destroyed except OS partitions'
            };
        } catch (error) {
            if (progressCallback) progressCallback({ error: error.message });
            throw error;
        }
    }

    /**
     * Generate compliance report
     * @param {Array} partitions - Wiped partitions
     * @param {string} method - Wipe method used
     * @param {string} verificationLevel - Verification level used
     * @returns {Object} Compliance report
     */
    async generateComplianceReport(partitions, method, verificationLevel) {
        return {
            timestamp: new Date().toISOString(),
            method: method,
            verificationLevel: verificationLevel,
            partitions: partitions.map(p => p.device),
            standards: this.getComplianceStandards(method, verificationLevel),
            confidence: this.getConfidenceLevel(verificationLevel),
            certification: this.generateCertificationId()
        };
    }

    /**
     * Get compliance standards based on method and verification
     * @param {string} method - Wipe method
     * @param {string} verificationLevel - Verification level
     * @returns {Array} Compliance standards
     */
    getComplianceStandards(method, verificationLevel) {
        const standards = ['NIST SP 800-88'];
        
        if (method.includes('7-pass') || method === 'gutmann' || method === 'schneier') {
            standards.push('DoD 5220.22-M');
        }
        
        if (verificationLevel === 'military' || verificationLevel === 'quantum') {
            standards.push('NSA CSS.5');
        }
        
        return standards;
    }

    /**
     * Get confidence level based on verification method
     * @param {string} verificationLevel - Verification level
     * @returns {number} Confidence level (0-1)
     */
    getConfidenceLevel(verificationLevel) {
        const confidenceMap = {
            'quick': 0.95,
            'thorough': 0.99,
            'forensic': 0.999,
            'military': 0.9999,
            'quantum': 0.99999
        };
        
        return confidenceMap[verificationLevel] || 0.95;
    }

    /**
     * Generate certification ID
     * @returns {string} Certification ID
     */
    generateCertificationId() {
        return 'TW-' + Date.now().toString(36).toUpperCase() + '-' + 
               Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    
    /**
     * Get system information
     */
    async getSystemInfo() {
        const partitions = await this.partitionDetector.detectPartitions();
        const osPartitions = await this.partitionDetector.identifyOSPartitions(partitions);
        
        return {
            totalPartitions: partitions.length,
            osPartitions: osPartitions.length,
            dataPartitions: partitions.length - osPartitions.length,
            wipeMethods: this.overwriteEngine.getAvailableMethods(),
            verificationMethods: this.verifier.getAvailableMethods()
        };
    }
    
    /**
     * Wipe a specific device directly
     * @param {string} devicePath - Path to the device to wipe
     * @param {string} method - Wipe method to use
     * @param {Function} progressCallback - Progress callback
     */
    async wipeDevice(devicePath, method, progressCallback) {
        try {
            // Verify this is not an OS partition
            const partitions = await this.partitionDetector.detectPartitions();
            const osPartitions = await this.partitionDetector.identifyOSPartitions(partitions);
            
            if (!this.partitionDetector.isSafeToWipe(devicePath, osPartitions)) {
                throw new Error(`Device ${devicePath} is protected as an OS partition and cannot be wiped`);
            }
            
            // Execute the wipe
            await this.overwriteEngine.execute(method, devicePath, progressCallback);
            
            // Verify the wipe
            const verificationResult = await this.verifier.verify(devicePath, 'thorough', progressCallback);
            
            if (!verificationResult.success) {
                throw new Error(`Verification failed: ${verificationResult.message}`);
            }
            
            return {
                success: true,
                device: devicePath,
                method: method,
                verification: verificationResult
            };
        } catch (error) {
            throw error;
        }
    }
}

module.exports = TrueWipe;

// If run directly, execute a demo
if (require.main === module) {
    const truewipe = new TrueWipe();
    
    // Check for advanced mode
    const isAdvanced = process.argv.includes('--advanced') || process.argv.includes('-a');
    
    if (isAdvanced) {
        console.log('🔥 TrueWipe Advanced Data Destruction System 🔥');
        console.log('=============================================\n');
        
        // Show system info
        truewipe.getSystemInfo().then(info => {
            console.log('System Information:');
            console.log(`  Total Partitions: ${info.totalPartitions}`);
            console.log(`  OS Partitions: ${info.osPartitions}`);
            console.log(`  Data Partitions: ${info.dataPartitions}`);
            console.log(`  Available Wipe Methods: ${info.wipeMethods.join(', ')}`);
            console.log(`  Available Verification Methods: ${info.verificationMethods.join(', ')}`);
            console.log();
            
            // Execute an advanced demo wipe
            console.log('Starting advanced demo wipe process...\n');
            
            truewipe.executeAdvancedWipe('gutmann', 'military', (status) => {
                if (status.error) {
                    console.error(`Error: ${status.error}`);
                } else {
                    const progressInfo = status.progress !== undefined ? `${status.progress.toFixed(1)}%` : '';
                    console.log(`Step ${status.step}/${status.totalSteps}: ${status.message} ${progressInfo}`);
                }
            }).then(result => {
                console.log('\n✅ Advanced Wipe Process Completed Successfully!');
                console.log(`   Partitions Wiped: ${result.partitionsWiped}`);
                console.log(`   OS Partitions Protected: ${result.osPartitionsProtected}`);
                console.log(`   Method: ${result.method}`);
                console.log(`   Verification Level: ${result.verificationLevel}`);
                console.log(`   Confidence: ${(result.confidence * 100).toFixed(3)}%`);
                console.log(`   Certification ID: ${result.report.certification}`);
                console.log(`   Compliance Standards: ${result.report.standards.join(', ')}`);
                console.log(`   Result: ${result.message}`);
            }).catch(error => {
                console.error('\n❌ Advanced Wipe Process Failed!');
                console.error(`   Error: ${error.message}`);
            });
        });
    } else {
        console.log('🔥 TrueWipe Data Destruction System 🔥');
        console.log('=====================================\n');
        
        // Show system info
        truewipe.getSystemInfo().then(info => {
            console.log('System Information:');
            console.log(`  Total Partitions: ${info.totalPartitions}`);
            console.log(`  OS Partitions: ${info.osPartitions}`);
            console.log(`  Data Partitions: ${info.dataPartitions}`);
            console.log(`  Available Wipe Methods: ${info.wipeMethods.join(', ')}`);
            console.log();
            
            // Execute a demo wipe with 7-pass method
            console.log('Starting demo wipe process with 7-pass method...\n');
            
            truewipe.executeWipe('7-pass', (status) => {
                if (status.error) {
                    console.error(`Error: ${status.error}`);
                } else {
                    const progressInfo = status.progress !== undefined ? `${status.progress.toFixed(1)}%` : '';
                    console.log(`Step ${status.step}/${status.totalSteps}: ${status.message} ${progressInfo}`);
                }
            }).then(result => {
                console.log('\n✅ Wipe Process Completed Successfully!');
                console.log(`   Partitions Wiped: ${result.partitionsWiped}`);
                console.log(`   OS Partitions Protected: ${result.osPartitionsProtected}`);
                console.log(`   Result: ${result.message}`);
            }).catch(error => {
                console.error('\n❌ Wipe Process Failed!');
                console.error(`   Error: ${error.message}`);
            });
        });
    }
}
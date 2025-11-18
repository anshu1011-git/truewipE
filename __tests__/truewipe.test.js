/**
 * Test suite for TrueWipe Data Destruction System
 */

const TrueWipe = require('../truewipe');

describe('TrueWipe', () => {
    let truewipe;

    beforeEach(() => {
        truewipe = new TrueWipe();
    });

    test('should create TrueWipe instance', () => {
        expect(truewipe).toBeInstanceOf(TrueWipe);
        expect(truewipe.overwriteEngine).toBeDefined();
        expect(truewipe.partitionDetector).toBeDefined();
        expect(truewipe.verifier).toBeDefined();
    });

    test('should get system information', async () => {
        const info = await truewipe.getSystemInfo();
        
        expect(info).toHaveProperty('totalPartitions');
        expect(info).toHaveProperty('osPartitions');
        expect(info).toHaveProperty('dataPartitions');
        expect(info).toHaveProperty('wipeMethods');
        expect(info).toHaveProperty('verificationMethods');
        
        expect(Array.isArray(info.wipeMethods)).toBe(true);
        expect(Array.isArray(info.verificationMethods)).toBe(true);
    });

    test('should have at least one wipe method', async () => {
        const info = await truewipe.getSystemInfo();
        expect(info.wipeMethods.length).toBeGreaterThan(0);
    });

    test('should have at least one verification method', async () => {
        const info = await truewipe.getSystemInfo();
        expect(info.verificationMethods.length).toBeGreaterThan(0);
    });
});
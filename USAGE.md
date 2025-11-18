# TrueWipe Usage Guide

## Overview
TrueWipe is a comprehensive data destruction system that securely erases all data on a machine except the operating system. It provides multiple wiping methods, remote control capabilities, and ensures compliance with international data destruction standards.

## System Components

### 1. Admin Panel
Web-based interface for managing remote wipes across multiple devices.

### 2. Client Software
Runs on target machines to receive wipe commands and report status.

### 3. Bootable Environment
Standalone environment that can be run from USB/ISO to perform wipes independently of the installed OS.

### 4. Secure Overwrite Engine
Implements multiple overwrite algorithms (1-pass, 3-pass, 7-pass).

### 5. OS Partition Protection
Automatically detects and protects OS partitions from accidental wiping.

### 6. Verification System
Confirms that data has been properly destroyed and is unrecoverable.

## Installation

### Prerequisites
- Node.js v14 or higher
- npm package manager
- SQLite (included with the application)

### Installation Steps

1. Clone or download the TrueWipe repository
2. Install dependencies for all components:
   ```bash
   npm run install-all
   ```

## Running the System

### Starting the Admin Panel
```bash
npm run admin
```
The admin panel will be available at http://localhost:3000

Default credentials:
- Username: admin
- Password: admin123

### Starting a Client
```bash
npm run client
```

### Running a Demo Wipe
```bash
npm start
```

## Using the Admin Panel

1. Navigate to http://localhost:3000 in your web browser
2. Log in with admin credentials
3. View registered devices in the dashboard
4. Select a device and click "Wipe Data"
5. Choose the wipe method (1-pass, 3-pass, or 7-pass)
6. Confirm the wipe operation
7. Monitor progress in real-time
8. View results and logs after completion

## Creating a Bootable USB/ISO

1. Use a tool like Rufus (Windows) or dd (Linux/macOS) to create a bootable USB
2. Copy the contents of the [bootable](bootable/) directory to the USB/ISO
3. Boot target machines from the USB/ISO
4. Follow the on-screen instructions to perform the wipe

## Wipe Methods

### 1-Pass Overwrite
- Single pass with pseudo-random data
- Fastest method
- Suitable for most use cases

### 3-Pass Overwrite
- Implementation of DoD 5220.22-M (8-306. /E) standard
- Pass 1: Write zeros
- Pass 2: Write ones
- Pass 3: Write random data
- Suitable for sensitive data

### 7-Pass Overwrite
- Implementation of DoD 5220.22-M standard
- Multiple passes with specific patterns
- Most secure method
- Suitable for highly classified data

## Security Features

### OS Protection
- Automatically detects OS partitions
- Prevents any writes to OS partitions
- Maintains machine bootability

### Verification
- Multiple verification methods
- Confidence reporting
- Detailed logs

### Network Security
- Encrypted communications
- Authentication required
- Works only within controlled environments

## Compliance

TrueWipe meets or exceeds the following standards:
- DoD 5220.22-M
- NIST SP 800-88
- GDPR data disposal requirements

## Troubleshooting

### Client Not Appearing in Admin Panel
1. Check network connectivity between client and admin panel
2. Verify the admin panel URL is correctly configured
3. Check firewall settings

### Wipe Process Fails
1. Check system logs for error messages
2. Verify sufficient permissions for disk access
3. Ensure no other processes are accessing the target disks

### Bootable Environment Issues
1. Verify USB/ISO was created correctly
2. Check BIOS/UEFI boot settings
3. Ensure target machine supports the bootable media

## Support

For issues, questions, or feature requests, please contact the TrueWipe development team.
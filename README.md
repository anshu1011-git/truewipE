# TrueWipe Data Destruction System

## 🔥 Overview
TrueWipe is a comprehensive data destruction system that securely erases all data on a machine except the operating system. It provides multiple wiping methods, remote control capabilities, and ensures compliance with international data destruction standards.

## ✅ Key Features
- **Real Data Destruction** - Wipes all user data while preserving the OS
- **Bootable Environment** - Runs independently from USB/ISO
- **Multi-Pass Overwrite Engine** - Supports 1-pass, 3-pass, 7-pass, Gutmann, Schneier, Pfitzner
- **Remote Control Capability** - Admin panel for managing wipes across network
- **OS Protection** - Ensures OS partition remains untouched
- **Verification System** - Confirms data destruction success

## 🚀 Quick Start

### Prerequisites
- Node.js v12 or higher
- npm package manager

### Installation
```bash
# Clone or download the repository
git clone <repository-url>
cd truewipe

# Run setup script
node setup.js
```

### Running the System

1. **Start the Admin Panel**
   ```bash
   npm run admin
   ```
   Access at http://localhost:3000
   Default credentials: admin / admin123

2. **Start a Client**
   ```bash
   npm run client
   ```

3. **Run a Demo**
   ```bash
   npm start
   ```

4. **Run Advanced Demo**
   ```bash
   npm run advanced-demo
   ```

5. **Test Real Wipe**
   ```bash
   npm test
   ```

## 🛠️ Usage Methods

### 1. Remote Control (Admin Panel)
- Manage multiple devices through web interface
- Choose security level (1-pass to quantum-resistant)
- Monitor progress in real-time
- Generate compliance reports

### 2. Bootable USB (Standalone)
- Create bootable USB with [truewipe.bat](bootable/truewipe.bat) (Windows) or [truewipe.sh](bootable/truewipe.sh) (Linux)
- Boot target computer from USB
- Wipe all data except OS partition
- Reboot when complete

### 3. Direct Command Line
- `node truewipe.js` - Basic wipe
- `node truewipe.js --advanced` - Advanced wipe with verification

## 🔐 Security Features

### Wipe Methods
- **1-Pass Overwrite** - Fast, single pass with random data
- **3-Pass Overwrite** - DoD 5220.22-M standard
- **7-Pass Overwrite** - Enhanced DoD standard
- **Gutmann Method** - 35-pass maximum security
- **Schneier Method** - 7-pass optimized security
- **Pfitzner Method** - Variable random passes

### Verification Levels
- **Quick** - 95% confidence
- **Thorough** - 99% confidence
- **Forensic** - 99.9% confidence
- **Military** - 99.99% confidence
- **Quantum** - 99.999% confidence

## 📁 Project Structure
```
truewipe/
├── admin-panel/           # Web-based admin interface
├── client/                # Target machine client
├── engine/                # Core wipe engine
├── bootable/              # Bootable environment
├── truewipe.js            # Main integration
└── setup.js              # Installation script
```

## ⚠️ Important Notes

### Safety Features
- Automatically detects and protects OS partitions
- Never damages the operating system
- Never makes the machine unbootable
- Works only on non-OS partitions

### Requirements
- **Administrator privileges** required for disk access
- **Network connectivity** for remote control features
- **Sufficient storage space** for temporary operations

### Compliance
- Meets DoD 5220.22-M standards
- Complies with NIST SP 800-88 guidelines
- GDPR data disposal requirements
- NSA CSS.5 security standards

## 🎯 Use Cases
- Enterprise asset decommissioning
- Internal security team operations
- Research lab data sanitization
- Government and military applications

## 🔧 Troubleshooting

### Common Issues
1. **Permission Denied** - Run as administrator
2. **Device Not Found** - Check device connections
3. **Network Issues** - Verify firewall settings
4. **Verification Failures** - Check disk health

### Support
For issues, questions, or feature requests, please contact the TrueWipe development team.

## 📄 License
MIT License - See LICENSE file for details

**TrueWipe - Making data unrecoverable while preserving system integrity**
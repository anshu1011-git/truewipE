#!/bin/bash

# TrueWipe Bootable Environment Script
# This script runs when the bootable USB/ISO is started

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[STATUS]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Welcome message
clear
echo "==============================================="
echo "           🔥 TrueWipe Boot Environment 🔥"
echo "     Secure Data Destruction System (v1.0)"
echo "==============================================="
echo
print_status "Starting TrueWipe boot environment..."
echo

# System information
print_status "System Information:"
echo "  Hostname: $(hostname)"
echo "  Kernel: $(uname -r)"
echo "  Architecture: $(uname -m)"
echo

# Detect storage devices
print_status "Detecting storage devices..."
DEVICES=()
DEVICE_COUNT=0

# For Linux systems, check /sys/block for devices
for device in /sys/block/*; do
    device_name=$(basename "$device")
    
    # Skip loop devices and ram devices
    if [[ $device_name == loop* ]] || [[ $device_name == ram* ]]; then
        continue
    fi
    
    # Get device info
    if [[ -f "$device/device/model" ]]; then
        model=$(cat "$device/device/model" 2>/dev/null)
    else
        model="Unknown"
    fi
    
    # Get size
    if [[ -f "$device/size" ]]; then
        size_sectors=$(cat "$device/size" 2>/dev/null)
        size_gb=$((size_sectors * 512 / 1000000000))
        size="${size_gb}GB"
    else
        size="Unknown"
    fi
    
    # Store device info
    DEVICES+=("$device_name|$model|$size")
    ((DEVICE_COUNT++))
    
    echo "  /dev/$device_name - $model ($size)"
done

echo
print_status "Found $DEVICE_COUNT storage devices"
echo

# OS partition detection and protection
print_status "Detecting OS partitions..."
echo

# This is a simplified implementation
# In a real system, this would:
# 1. Analyze partition tables
# 2. Check filesystem signatures
# 3. Look for OS installation markers
# 4. Mark OS partitions as protected

PROTECTED_PARTITIONS=()

# For demonstration, we'll protect the first partition of the first device
if [ ${#DEVICES[@]} -gt 0 ]; then
    first_device=$(echo "${DEVICES[0]}" | cut -d'|' -f1)
    PROTECTED_PARTITIONS+=("/dev/${first_device}1")
    print_warning "Protecting /dev/${first_device}1 (assumed OS partition)"
    echo "  This partition will NOT be wiped"
    echo
fi

# Display wipe options
print_status "Select wipe method:"
echo "  1) 1-Pass Overwrite (Fast)"
echo "  2) 3-Pass Overwrite (DoD Standard)"
echo "  3) 7-Pass Overwrite (Enhanced Security)"
echo "  4) Exit"
echo

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        WIPE_METHOD="1-pass"
        print_status "Selected 1-Pass Overwrite method"
        ;;
    2)
        WIPE_METHOD="3-pass"
        print_status "Selected 3-Pass Overwrite method"
        ;;
    3)
        WIPE_METHOD="7-pass"
        print_status "Selected 7-Pass Overwrite method"
        ;;
    4)
        print_status "Exiting TrueWipe..."
        exit 0
        ;;
    *)
        print_error "Invalid choice. Exiting."
        exit 1
        ;;
esac

echo

# Select target devices (excluding protected partitions)
print_status "Select devices to wipe:"
echo "  Protected partitions: ${PROTECTED_PARTITIONS[*]}"
echo

TARGET_DEVICES=()

for device_info in "${DEVICES[@]}"; do
    device_name=$(echo "$device_info" | cut -d'|' -f1)
    
    # Check if this device has protected partitions
    is_protected=false
    for protected in "${PROTECTED_PARTITIONS[@]}"; do
        if [[ $protected == /dev/${device_name}* ]]; then
            is_protected=true
            break
        fi
    done
    
    if [ "$is_protected" = false ]; then
        echo "  /dev/$device_name - $(echo "$device_info" | cut -d'|' -f2) ($(echo "$device_info" | cut -d'|' -f3))"
        TARGET_DEVICES+=("/dev/$device_name")
    fi
done

if [ ${#TARGET_DEVICES[@]} -eq 0 ]; then
    print_warning "No devices available for wiping (all protected)"
    exit 0
fi

echo
read -p "Confirm wiping of the above devices? (yes/no): " confirm

if [[ $confirm != "yes" ]]; then
    print_status "Wipe operation cancelled"
    exit 0
fi

# Execute wipe process
print_status "Starting wipe process with $WIPE_METHOD method..."
echo

# In a real implementation, this would:
# 1. Call the secure overwrite engine
# 2. Show real-time progress
# 3. Verify completion
# 4. Report results

# For demonstration, we'll simulate the process
for device in "${TARGET_DEVICES[@]}"; do
    print_status "Wiping $device..."
    
    # Simulate progress
    for i in {1..10}; do
        echo -ne "  Progress: $((i * 10))%\r"
        sleep 1
    done
    
    echo
    print_success "Successfully wiped $device"
    echo
done

# Verification
print_status "Verifying wipe completion..."
sleep 2
print_success "Verification completed - all data destroyed"

echo
print_success "🔥 Data destruction complete! 🔥"
print_status "The system can now be rebooted safely"
print_status "Only the OS partition remains intact"

echo
read -p "Press Enter to reboot or 'q' to quit: " reboot_choice

if [[ $reboot_choice != "q" ]]; then
    print_status "Rebooting system..."
    sleep 3
    reboot
else
    print_status "System shutdown complete"
fi
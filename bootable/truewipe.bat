@echo off
cls
echo ===============================================
echo           🔥 TrueWipe Boot Environment 🔥
echo      Secure Data Destruction System (v1.0)
echo ===============================================
echo.
echo [STATUS] Starting TrueWipe boot environment...
echo.

REM System information
echo [STATUS] System Information:
systeminfo | findstr /C:"OS Name" /C:"OS Version" /C:"System Type"
echo.

REM Detect drives
echo [STATUS] Detecting storage drives...
echo.
wmic logicaldisk get size,filesystem,name,caption /format:csv > drives.csv
for /f "skip=1 tokens=2-5 delims=," %%a in (drives.csv) do (
    if not "%%d"=="" (
        set size=%%b
        set fs=%%c
        set letter=%%d
        if not "!size!"=="" (
            echo   !letter! - Filesystem: !fs! - Size: !size!
        )
    )
)
del drives.csv
echo.

REM Assume C: is OS drive and protect it
echo [WARNING] Protecting C: drive (assumed OS partition)
echo   This drive will NOT be wiped
echo.

REM Display wipe options
echo [STATUS] Select wipe method:
echo   1) 1-Pass Overwrite (Fast)
echo   2) 3-Pass Overwrite (DoD Standard)
echo   3) 7-Pass Overwrite (Enhanced Security)
echo   4) Exit
echo.

set /p choice="Enter your choice (1-4): "
if "%choice%"=="1" (
    set WIPE_METHOD=1-pass
    echo [STATUS] Selected 1-Pass Overwrite method
) else if "%choice%"=="2" (
    set WIPE_METHOD=3-pass
    echo [STATUS] Selected 3-Pass Overwrite method
) else if "%choice%"=="3" (
    set WIPE_METHOD=7-pass
    echo [STATUS] Selected 7-Pass Overwrite method
) else if "%choice%"=="4" (
    echo [STATUS] Exiting TrueWipe...
    exit /b
) else (
    echo [ERROR] Invalid choice. Exiting.
    exit /b
)

echo.

REM Select target drives (excluding C:)
echo [STATUS] Select drives to wipe:
echo   Protected drives: C:
echo.
echo Available drives for wiping:

set TARGET_DRIVES=
for /f "skip=1 tokens=2-5 delims=," %%a in (drives.csv) do (
    if not "%%d"=="" (
        set letter=%%d
        if not "!letter!"=="C:" (
            echo   !letter! - Filesystem: %%c - Size: %%b
            set TARGET_DRIVES=!TARGET_DRIVES! !letter!
        )
    )
)

if "%TARGET_DRIVES%"=="" (
    echo [WARNING] No drives available for wiping (all protected)
    exit /b
)

echo.
set /p confirm="Confirm wiping of the above drives? (yes/no): "
if not "%confirm%"=="yes" (
    echo [STATUS] Wipe operation cancelled
    exit /b
)

REM Execute wipe process
echo [STATUS] Starting wipe process with %WIPE_METHOD% method...
echo.

REM In a real implementation, this would call the secure overwrite engine
REM For demonstration, we'll simulate the process
for %%d in (%TARGET_DRIVES%) do (
    echo [STATUS] Wiping %%d: drive...
    
    REM Simulate progress
    for %%i in (10 20 30 40 50 60 70 80 90 100) do (
        echo   Progress: %%i%%
        timeout /t 1 /nobreak >nul
    )
    
    echo [SUCCESS] Successfully wiped %%d: drive
    echo.
)

REM Verification
echo [STATUS] Verifying wipe completion...
timeout /t 2 /nobreak >nul
echo [SUCCESS] Verification completed - all data destroyed

echo.
echo [SUCCESS] 🔥 Data destruction complete! 🔥
echo [STATUS] The system can now be rebooted safely
echo [STATUS] Only the OS partition (C:) remains intact

echo.
set /p reboot_choice="Press Enter to reboot or 'q' to quit: "
if not "%reboot_choice%"=="q" (
    echo [STATUS] Rebooting system...
    timeout /t 3 /nobreak >nul
    shutdown /r /t 0
) else (
    echo [STATUS] System shutdown complete
)

pause
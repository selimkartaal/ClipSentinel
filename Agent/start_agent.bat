chcp 65001
@echo off
:: ============================================================
::  ClipSentinel Agent Launcher
::  Duzenle: FORMAT, PROTOCOL, TARGET 
:: ============================================================

:: json, cef
SET FORMAT=cef

:: tcp , udp
SET PROTOCOL=udp

:: IP:PORT  
SET TARGET=127.0.0.1:5600

:: Discovery portu
SET DISCOVERY_PORT=5000

:: Clipboard port
SET DATA_PORT=5001

:: ============================================================

python --version >nul 2>&1
IF ERRORLEVEL 1 (
    echo [HATA] Python bulunamadı. Python yukleyin.
    pause
    exit /b 1
)

cd /d "%~dp0"

echo ============================================================
echo  ClipSentinel Agent Başlatılıyor
echo  Format       : %FORMAT%
echo  Protokol     : %PROTOCOL%
echo  Hedef        : %TARGET%
echo  Discovery    : localhost:%DISCOVERY_PORT%
echo  Data Port    : localhost:%DATA_PORT%
echo ============================================================
echo.

python clipsentinel_agent.py ^
    --format %FORMAT% ^
    --protocol %PROTOCOL% ^
    --target %TARGET% ^
    --discovery-port %DISCOVERY_PORT% ^
    --data-port %DATA_PORT%

if ERRORLEVEL 1 (
    echo.
    echo [HATA] Agent beklenmedik şekilde kapandı.
    pause
)
@echo off
title Cadence Studio Launcher

echo Starting Cadence Python Backend...
start /B python backend/server.py

echo Starting Cadence Desktop Window...
call npx tauri dev

echo Shutting down backend...
taskkill /F /IM python.exe >nul 2>&1
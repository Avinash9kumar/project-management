@echo off
setlocal enabledelayedexpansion

echo ========================================
echo  Project Timeline Tracker - LOCAL API
echo ========================================

set PHP_EXE=

if not "%PHP_EXE%"=="" goto :found
where php >nul 2>&1 && set PHP_EXE=php

if not "%PHP_EXE%"=="" goto :found
if exist "C:\xampp\php\php.exe" set PHP_EXE=C:\xampp\php\php.exe

if not "%PHP_EXE%"=="" goto :found
for /d %%D in ("C:\laragon\bin\php\php-*") do (
    if exist "%%D\php.exe" set PHP_EXE=%%D\php.exe
)

if not "%PHP_EXE%"=="" goto :found
for /d %%D in ("C:\wamp64\bin\php\php*") do (
    if exist "%%D\php.exe" set PHP_EXE=%%D\php.exe
)

:found
if "%PHP_EXE%"=="" (
    echo.
    echo ERROR: PHP is not installed or not found!
    echo.
    echo FIX OPTION 1 - Install XAMPP:
    echo   1. Download: https://www.apachefriends.org/
    echo   2. Install and start XAMPP
    echo   3. Run this script again
    echo.
    echo FIX OPTION 2 - Use Hostinger API locally:
    echo   Edit frontend\.env.local and set:
    echo   NEXT_PUBLIC_API_URL=https://dash-bot.net/project-management/api
    echo   Then restart: npm run dev
    echo.
    pause
    exit /b 1
)

echo Using PHP: %PHP_EXE%
echo API will run at: http://localhost:8000
echo Keep this window OPEN while using the app.
echo ========================================
cd /d "%~dp0..\api"
"%PHP_EXE%" -S localhost:8000 router.php

@echo off
echo ========================================
echo  Project Timeline Tracker - LOCAL Frontend
echo  App: http://localhost:3000
echo  Login: avinash / avinash@11#11
echo ========================================
cd /d "%~dp0..\frontend"
if not exist .env.local copy .env.local.example .env.local
call npm run dev

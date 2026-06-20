@echo off
echo Building frontend for Hostinger...
cd /d "%~dp0..\frontend"
call npm install
call npm run build
echo.
echo ========================================
echo  BUILD DONE!
echo  Upload frontend\out\ to Hostinger:
echo  public_html\project-management\
echo ========================================
pause

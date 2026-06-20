@echo off
echo [0/4] Building frontend for Hostinger...
cd /d "%~dp0..\frontend"
set NEXT_PUBLIC_BASE_PATH=/project-management
set NEXT_PUBLIC_API_URL=https://dash-bot.net/project-management/api
call npm run build
if errorlevel 1 (
    echo BUILD FAILED!
    pause
    exit /b 1
)

echo Preparing Hostinger upload folder...
set "DEST=%~dp0..\hostinger-upload"
set "SRC=%~dp0.."

if exist "%DEST%" rmdir /s /q "%DEST%"
mkdir "%DEST%"

echo [1/4] Copying frontend build...
xcopy "%SRC%\frontend\out\*" "%DEST%\" /E /I /Y /Q

echo [2/4] Copying API files...
mkdir "%DEST%\api\config"
mkdir "%DEST%\api\routes"
copy /Y "%SRC%\api\index.php" "%DEST%\api\" >nul
copy /Y "%SRC%\api\router.php" "%DEST%\api\" >nul
copy /Y "%SRC%\api\config\database.php" "%DEST%\api\config\" >nul
copy /Y "%SRC%\api\config\helpers.php" "%DEST%\api\config\" >nul
copy /Y "%SRC%\api\config\constants.php" "%DEST%\api\config\" >nul
copy /Y "%SRC%\api\config\auth.php" "%DEST%\api\config\" >nul
copy /Y "%SRC%\api\config\mailer.php" "%DEST%\api\config\" >nul
copy /Y "%SRC%\api\config\reminders.php" "%DEST%\api\config\" >nul
copy /Y "%SRC%\api\config\config.hostinger.example.php" "%DEST%\api\config\config.local.php" >nul
copy /Y "%SRC%\api\routes\auth.php" "%DEST%\api\routes\" >nul
copy /Y "%SRC%\api\routes\projects.php" "%DEST%\api\routes\" >nul
copy /Y "%SRC%\api\routes\timeline.php" "%DEST%\api\routes\" >nul
copy /Y "%SRC%\api\routes\custom-fields.php" "%DEST%\api\routes\" >nul
copy /Y "%SRC%\api\routes\export.php" "%DEST%\api\routes\" >nul
copy /Y "%SRC%\api\routes\cron.php" "%DEST%\api\routes\" >nul

echo [3/4] Copying .htaccess files...
copy /Y "%SRC%\deploy\project-management.htaccess" "%DEST%\.htaccess" >nul
copy /Y "%SRC%\deploy\api.htaccess" "%DEST%\api\.htaccess" >nul

echo [4/4] Done!
echo.
echo ========================================
echo  UPLOAD THIS FOLDER TO HOSTINGER:
echo  %DEST%
echo.
echo  Upload to: public_html/project-management/
echo  URL: https://dash-bot.net/project-management
echo ========================================

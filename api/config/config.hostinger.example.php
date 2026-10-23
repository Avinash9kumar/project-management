<?php
/**
 * FINAL Hostinger config for dash-bot.net
 * ==========================================
 * On Hostinger: copy this file to config.local.php inside api/config/
 * Do NOT use this file on your PC (use config.local.php with project_timeline instead)
 *
 * MySQL (hPanel):
 *   Host:     localhost
 *   Database: u511101901_project_manage
 *   Username: u511101901_project_manage
 *
 * Cron (every 5 minutes):
 */

// */5 * * * * curl -s "https://dash-bot.net/project-management/api/cron/reminders?key=YOUR_CRON_SECRET"

return [
    'host' => 'localhost',
    'database' => 'u511101901_project_manage',
    'username' => 'u511101901_project_manage',
    'password' => '',
    'charset' => 'utf8mb4',

    'base_path' => '/project-management',
    'auth_secret' => 'change-this-to-a-long-random-string',
    'cron_secret' => 'change-this-cron-secret',
    'timezone' => 'Asia/Kolkata',

    'auth_users' => [
        'Avinash' => 'Avinash@@11##11',
        'Paritosh' => 'Paritosh@@11##11',
    ],

    'mail' => [
        'enabled' => true,
        'from_email' => 'projects@dash-bot.net',
        'from_name' => 'Project Timeline Tracker',
        'app_url' => 'https://dash-bot.net/project-management',
        'smtp_host' => 'smtp.hostinger.com',
        'smtp_port' => 465,
        'smtp_username' => 'projects@dash-bot.net',
        'smtp_password' => '',
        'self_email' => 'avinash@ae-research.com',
        'status_notify_email' => 'avinash@ae-research.com',
        'user_emails' => [
            'Avinash' => 'avinash@ae-research.com',
            'Paritosh' => 'paritosh@ae-research.com',
        ],
        'reminder_thresholds' => [75],
    ],
];

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

// */5 * * * * curl -s "https://dash-bot.net/project-management/api/cron/reminders?key=dash-bot-cron-reminders-2026"

return [
    'host' => 'localhost',
    'database' => 'u511101901_project_manage',
    'username' => 'u511101901_project_manage',
    'password' => 'Project_manage!11@11#11',
    'charset' => 'utf8mb4',

    'base_path' => '/project-management',
    'auth_secret' => 'dash-bot-project-mgmt-secret-2026',
    'cron_secret' => 'dash-bot-cron-reminders-2026',
    'timezone' => 'Asia/Kolkata',

    'users' => [
        'avinash' => 'avinash@11#11',
    ],

    'mail' => [
        'enabled' => true,
        'from_email' => 'avinash@ae-research.com',
        'from_name' => 'Project Timeline Tracker',
        'app_url' => 'https://dash-bot.net/project-management',
        'self_email' => 'avinash@ae-research.com',
        'status_notify_email' => 'avinash@ae-research.com',
        'user_emails' => [
            'avinash' => 'avinash@ae-research.com',
        ],
        'reminder_thresholds' => [75],
    ],
];

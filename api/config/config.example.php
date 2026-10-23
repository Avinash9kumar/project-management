<?php
/**
 * Copy this file to config.local.php and fill in your settings.
 *
 * LOCAL:      base_path = ''  (empty)
 * HOSTINGER:  base_path = '/project-management'
 */

return [
    // MySQL (create database in Hostinger hPanel first)
    'host' => 'localhost',
    'database' => 'u511101901_project_manage',
    'username' => 'u511101901_project_manage',
    'password' => '',
    'charset' => 'utf8mb4',

    // App URL path (empty for local, /project-management for Hostinger)
    'base_path' => '',

    // Token signing secret (change to a long random string on Hostinger)
    'auth_secret' => 'change-this-to-a-random-secret-key',
    'cron_secret' => 'change-this-cron-secret-key',

    // Main app login — only these users (case-insensitive username)
    'auth_users' => [
        'Avinash' => 'Avinash@@11##11',
        'Paritosh' => 'Paritosh@@11##11',
    ],

    // Email invites and timeline reminders
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

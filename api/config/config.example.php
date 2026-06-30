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
    'password' => 'Project_manage!11@11#11',
    'charset' => 'utf8mb4',

    // App URL path (empty for local, /project-management for Hostinger)
    'base_path' => '',

    // Token signing secret (change to a long random string on Hostinger)
    'auth_secret' => 'change-this-to-a-random-secret-key',
    'cron_secret' => 'change-this-cron-secret-key',

    // Login: any username works; password must be {username}@11#11 (no user list needed)

    // Email invites and timeline reminders
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

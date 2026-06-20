<?php

declare(strict_types=1);

function handleCronRoute(array $segments): void
{
    if (($segments[1] ?? '') !== 'reminders') {
        jsonResponse(['error' => 'Not found'], 404);
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        jsonResponse(['error' => 'Method not allowed'], 405);
    }

    $config = getAppConfig();
    $expectedKey = (string) ($config['cron_secret'] ?? '');
    $providedKey = (string) ($_GET['key'] ?? '');

    if ($expectedKey === '' || !hash_equals($expectedKey, $providedKey)) {
        jsonResponse(['error' => 'Unauthorized'], 401);
    }

    $db = Database::getConnection();
    $debug = isset($_GET['debug']) && (string) $_GET['debug'] === '1';

    if ($debug) {
        jsonResponse([
            'ok' => true,
            'ran_at' => gmdate('c'),
            'timezone' => date_default_timezone_get(),
            'thresholds' => getReminderThresholds(),
            'note' => 'Debug only — no emails sent. Remove debug=1 or use the cron job URL without debug to send reminders.',
            'diagnostics' => getReminderDiagnostics($db),
        ]);
    }

    $summary = processTimelineReminders($db);

    jsonResponse([
        'ok' => true,
        'ran_at' => gmdate('c'),
        'summary' => $summary,
    ]);
}

<?php

declare(strict_types=1);

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/config/helpers.php';
require_once __DIR__ . '/config/constants.php';
require_once __DIR__ . '/config/auth.php';
require_once __DIR__ . '/config/mailer.php';
require_once __DIR__ . '/config/reminders.php';
require_once __DIR__ . '/routes/auth.php';
require_once __DIR__ . '/routes/projects.php';
require_once __DIR__ . '/routes/timeline.php';
require_once __DIR__ . '/routes/custom-fields.php';
require_once __DIR__ . '/routes/export.php';
require_once __DIR__ . '/routes/cron.php';
require_once __DIR__ . '/routes/assignees.php';

$appConfig = getAppConfig();
$timezone = $appConfig['timezone'] ?? 'Asia/Kolkata';
if (is_string($timezone) && $timezone !== '') {
    date_default_timezone_set($timezone);
}

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = $uri ?? '/';
$config = $appConfig;
$basePath = $config['base_path'] ?? '';

if ($basePath !== '' && str_starts_with($path, $basePath)) {
    $path = substr($path, strlen($basePath));
} elseif ($basePath === '' && preg_match('#/project-management/api(/|$)#', $path)) {
    $path = preg_replace('#^.*/project-management/api#', '', $path) ?: '/';
}

if (str_starts_with($path, '/api')) {
    $path = substr($path, strlen('/api'));
}

$path = '/' . trim($path, '/');
$segments = array_values(array_filter(explode('/', $path)));

if (!empty($segments) && $segments[0] === 'timeline' && ($segments[1] ?? '') === 'complete') {
    handleTimelineCompleteRoute();
}

sendCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

try {
    if (empty($segments)) {
        jsonResponse([
            'name' => 'Project Timeline Tracker API',
            'version' => '2.1',
            'base_path' => $basePath,
        ]);
    }

    if (!isPublicRoute($segments)) {
        requireAuth();
    }

    $resource = $segments[0];

    switch ($resource) {
        case 'auth':
            handleAuthRoute($segments);
            break;
        case 'projects':
            handleProjectsRoute($segments);
            break;
        case 'timeline':
            handleTimelineRoute($segments);
            break;
        case 'custom-fields':
            handleCustomFieldsRoute($segments);
            break;
        case 'export':
            handleExportRoute($segments);
            break;
        case 'cron':
            handleCronRoute($segments);
            break;
        case 'assignees':
            handleAssigneesRoute($segments);
            break;
        default:
            jsonResponse(['error' => 'Not found'], 404);
    }
} catch (PDOException $e) {
    jsonResponse(['error' => 'Database error', 'message' => $e->getMessage()], 500);
} catch (Throwable $e) {
    jsonResponse(['error' => 'Server error', 'message' => $e->getMessage()], 500);
}

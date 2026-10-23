<?php

declare(strict_types=1);

function getAppConfig(): array
{
    static $config = null;
    if ($config === null) {
        $configPath = __DIR__ . '/config.local.php';
        if (!file_exists($configPath)) {
            $configPath = __DIR__ . '/config.example.php';
        }
        $config = require $configPath;
    }
    return $config;
}

function getAuthSecret(): string
{
    return getAppConfig()['auth_secret'] ?? 'change-this-secret-key-in-production';
}

function getAuthUsers(): array
{
    $config = getAppConfig();
    $users = $config['auth_users'] ?? [
        'Avinash' => 'Avinash@@11##11',
        'Paritosh' => 'Paritosh@@11##11',
    ];

    return is_array($users) ? $users : [];
}

function resolveAuthUsername(string $username): ?string
{
    $username = trim($username);
    if ($username === '') {
        return null;
    }

    foreach (getAuthUsers() as $allowedUser => $_password) {
        if (strcasecmp((string) $allowedUser, $username) === 0) {
            return (string) $allowedUser;
        }
    }

    return null;
}

function verifyCredentials(string $username, string $password): bool
{
    $canonical = resolveAuthUsername($username);
    if ($canonical === null) {
        return false;
    }

    $users = getAuthUsers();
    $expected = (string) ($users[$canonical] ?? '');

    return $expected !== '' && hash_equals($expected, $password);
}

function getEmployeeExpectedPassword(string $username): string
{
    return strtolower(trim($username)) . '@11#11';
}

function verifyEmployeeCredentials(string $username, string $password): bool
{
    $username = trim($username);
    if ($username === '') {
        return false;
    }

    if (resolveUsernameToAssigneeEmail($username) === null) {
        return false;
    }

    return hash_equals(getEmployeeExpectedPassword($username), $password);
}

function resolveEmployeeUsername(string $username): ?string
{
    $email = resolveUsernameToAssigneeEmail($username);
    if ($email === null) {
        return null;
    }

    $local = strstr($email, '@', true);

    return $local !== false ? $local : $email;
}

function authenticateLogin(string $username, string $password, string $loginMode = 'main'): ?array
{
    $username = trim($username);
    if ($username === '' || $password === '') {
        return null;
    }

    if (verifyCredentials($username, $password)) {
        return [
            'username' => resolveAuthUsername($username) ?? $username,
            'role' => 'main',
        ];
    }

    if ($loginMode !== 'employee') {
        return null;
    }

    if (!verifyEmployeeCredentials($username, $password)) {
        return null;
    }

    return [
        'username' => resolveEmployeeUsername($username) ?? $username,
        'role' => 'employee',
    ];
}

function generateToken(string $username, string $role = 'main'): string
{
    // No expiry — the browser keeps this token until the user clicks Logout.
    $payload = [
        'user_id' => 1,
        'username' => $username,
        'role' => $role,
    ];

    $payloadB64 = base64_encode(json_encode($payload));
    $signature = hash_hmac('sha256', $payloadB64, getAuthSecret());

    return $payloadB64 . '.' . $signature;
}

function verifyToken(string $token): ?array
{
    $parts = explode('.', $token);
    if (count($parts) !== 2) {
        return null;
    }

    [$payloadB64, $signature] = $parts;
    $expected = hash_hmac('sha256', $payloadB64, getAuthSecret());

    if (!hash_equals($expected, $signature)) {
        return null;
    }

    $payload = json_decode(base64_decode($payloadB64), true);
    if (!is_array($payload) || !isset($payload['username'])) {
        return null;
    }

    if (!isset($payload['role'])) {
        $payload['role'] = 'main';
    }

    return $payload;
}

function generateCompleteToken(int $itemId): string
{
    $payload = [
        'item_id' => $itemId,
        'action' => 'complete',
        'exp' => time() + (90 * 24 * 60 * 60),
    ];

    $payloadB64 = base64_encode(json_encode($payload));
    $signature = hash_hmac('sha256', $payloadB64, getAuthSecret());

    return $payloadB64 . '.' . $signature;
}

function verifyCompleteToken(string $token): ?int
{
    $parts = explode('.', $token);
    if (count($parts) !== 2) {
        return null;
    }

    [$payloadB64, $signature] = $parts;
    $expected = hash_hmac('sha256', $payloadB64, getAuthSecret());

    if (!hash_equals($expected, $signature)) {
        return null;
    }

    $payload = json_decode(base64_decode($payloadB64), true);
    if (!is_array($payload) || ($payload['action'] ?? '') !== 'complete') {
        return null;
    }

    if (!isset($payload['item_id'], $payload['exp']) || (int) $payload['exp'] < time()) {
        return null;
    }

    return (int) $payload['item_id'];
}

function generateEmployeeReportToken(string $email): string
{
    $email = strtolower(trim($email));
    $payload = [
        'email' => $email,
        'action' => 'employee_report',
        'exp' => time() + (10 * 365 * 24 * 60 * 60),
    ];

    $payloadB64 = base64_encode(json_encode($payload));
    $signature = hash_hmac('sha256', $payloadB64, getAuthSecret());

    return $payloadB64 . '.' . $signature;
}

function verifyEmployeeReportToken(string $token): ?string
{
    $parts = explode('.', $token);
    if (count($parts) !== 2) {
        return null;
    }

    [$payloadB64, $signature] = $parts;
    $expected = hash_hmac('sha256', $payloadB64, getAuthSecret());

    if (!hash_equals($expected, $signature)) {
        return null;
    }

    $payload = json_decode(base64_decode($payloadB64), true);
    if (
        !is_array($payload)
        || ($payload['action'] ?? '') !== 'employee_report'
        || !isset($payload['email'], $payload['exp'])
    ) {
        return null;
    }

    if ((int) $payload['exp'] < time()) {
        return null;
    }

    $email = strtolower(trim((string) $payload['email']));
    if ($email === '' || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
        return null;
    }

    return $email;
}

function buildEmployeeReportUrl(string $email): string
{
    $config = getAppConfig();
    $appUrl = rtrim((string) ($config['mail']['app_url'] ?? ''), '/');
    if ($appUrl === '') {
        $appUrl = 'http://localhost:3000';
    }

    $token = generateEmployeeReportToken($email);

    return $appUrl . '/employee/view/?token=' . rawurlencode($token);
}

function resolveUsernameToAssigneeEmail(string $username): ?string
{
    $username = trim($username);
    if ($username === '') {
        return null;
    }

    $mailConfig = getMailConfig();
    $userEmails = $mailConfig['user_emails'] ?? [];
    if (is_array($userEmails)) {
        foreach ($userEmails as $key => $mapped) {
            if (strcasecmp((string) $key, $username) === 0) {
                $email = strtolower(trim((string) $mapped));
                if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    return $email;
                }
            }
        }
    }

    if (filter_var($username, FILTER_VALIDATE_EMAIL)) {
        return strtolower($username);
    }

    try {
        $db = Database::getConnection();
        $stmt = $db->query('SELECT value FROM assignees ORDER BY sort_order ASC, value ASC');
        $rows = $stmt !== false ? $stmt->fetchAll() : [];
        $local = strtolower($username);

        foreach ($rows as $row) {
            $email = strtolower(trim((string) ($row['value'] ?? '')));
            if ($email === '' || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
                continue;
            }

            if ($email === $local || str_starts_with($email, $local . '@')) {
                return $email;
            }
        }
    } catch (Throwable $e) {
        // Assignee lookup unavailable.
    }

    return null;
}

function employeeReportTokenMatchesUser(string $token, array $authUser): ?string
{
    $tokenEmail = verifyEmployeeReportToken($token);
    if ($tokenEmail === null) {
        return null;
    }

    $username = trim((string) ($authUser['username'] ?? ''));
    $userEmail = resolveUsernameToAssigneeEmail($username);
    if ($userEmail === null || strcasecmp($userEmail, $tokenEmail) !== 0) {
        return null;
    }

    return $tokenEmail;
}

function getBearerToken(): ?string
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';

    if (preg_match('/Bearer\s+(\S+)/i', $header, $matches)) {
        return $matches[1];
    }

    return null;
}

function getAuthUser(): ?array
{
    $token = getBearerToken();
    if ($token === null) {
        return null;
    }

    return verifyToken($token);
}

function requireAuth(): array
{
    $payload = getAuthUser();
    if ($payload === null) {
        jsonResponse(['error' => 'Authentication required'], 401);
    }

    return $payload;
}

function requireMainAuth(): array
{
    $payload = requireAuth();
    if (($payload['role'] ?? 'main') !== 'main') {
        jsonResponse(['error' => 'Admin access required'], 403);
    }

    return $payload;
}

function isEmployeeReportRoute(array $segments): bool
{
    return !empty($segments)
        && $segments[0] === 'timeline'
        && ($segments[1] ?? '') === 'employee-report';
}

function isPublicRoute(array $segments): bool
{
    return !empty($segments) && in_array($segments[0], PUBLIC_ROUTES, true);
}

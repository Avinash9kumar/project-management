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

function getConfigUsers(): array
{
    return getAppConfig()['users'] ?? [];
}

function verifyCredentials(string $username, string $password): bool
{
    $users = getConfigUsers();
    if (!isset($users[$username])) {
        return false;
    }
    return hash_equals($users[$username], $password);
}

function generateToken(string $username): string
{
    $payload = [
        'user_id' => 1,
        'username' => $username,
        'exp' => time() + (7 * 24 * 60 * 60),
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
    if (!is_array($payload) || !isset($payload['username'], $payload['exp'])) {
        return null;
    }

    if ($payload['exp'] < time()) {
        return null;
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

function isPublicRoute(array $segments): bool
{
    return !empty($segments) && in_array($segments[0], PUBLIC_ROUTES, true);
}

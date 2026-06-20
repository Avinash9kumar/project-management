<?php

declare(strict_types=1);

function sendCorsHeaders(): void
{
    $allowedOrigins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://dash-bot.net',
        'http://dash-bot.net',
    ];

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (in_array($origin, $allowedOrigins, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
    } else {
        // Same-origin or production: allow all for shared hosting simplicity
        header('Access-Control-Allow-Origin: *');
    }

    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Content-Type: application/json; charset=utf-8');
}

function jsonResponse(array $data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function getJsonInput(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function requireMethod(string $method): void
{
    if ($_SERVER['REQUEST_METHOD'] !== $method) {
        jsonResponse(['error' => 'Method not allowed'], 405);
    }
}

function timelineTypeAllowed(string $type): bool
{
    if ($type === '') {
        return false;
    }

    if (function_exists('isValidTimelineType') && isValidTimelineType($type)) {
        return true;
    }

    return strlen($type) <= 50 && (bool) preg_match('/^[a-z][a-z0-9_]*$/', $type);
}

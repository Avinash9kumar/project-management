<?php

declare(strict_types=1);

function handleAuthRoute(array $segments): void
{
    $method = $_SERVER['REQUEST_METHOD'];
    $action = $segments[1] ?? '';

    if ($action === 'login' && $method === 'POST') {
        $input = getJsonInput();
        $username = trim($input['username'] ?? '');
        $password = $input['password'] ?? '';

        if ($username === '' || $password === '') {
            jsonResponse(['error' => 'Username and password are required'], 400);
        }

        if (!verifyCredentials($username, $password)) {
            jsonResponse(['error' => 'Invalid username or password'], 401);
        }

        $token = generateToken($username);

        jsonResponse([
            'token' => $token,
            'user' => [
                'id' => 1,
                'username' => $username,
            ],
        ]);
    }

    if ($action === 'me' && $method === 'GET') {
        $auth = requireAuth();

        jsonResponse([
            'user' => [
                'id' => (int) ($auth['user_id'] ?? 1),
                'username' => $auth['username'],
            ],
        ]);
    }

    jsonResponse(['error' => 'Not found'], 404);
}
